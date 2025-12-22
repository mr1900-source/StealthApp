"""Functions to interact with the Gemini API to generate itineraries.

This module loads GEMINI_API_KEY from environment variables (use a .env file
during development). It exposes `generate_itinerary(prompt: str) -> str`.

The real network call is isolated here so tests can mock it.
"""
import os
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')


class ItineraryError(Exception):
    """Custom exception for itinerary generation errors."""
    pass


def _build_messages(user_prompt: str) -> dict:
    """Return a dictionary to configure the Gemini API call."""
    system_instruction = (
        "You are an expert travel planner creating detailed, well-structured itineraries. "
        "Format your response EXACTLY like this:\n\n"
        "STOP: 9:00 AM - Morning Coffee at Café Sunrise\n"
        "Start your day with artisanal coffee and fresh pastries in the historic district. "
        "This cozy café is known for its friendly atmosphere and Instagram-worthy latte art.\n"
        "Cost: $15 per person | Duration: 45 minutes\n\n"
        "STOP: 10:00 AM - Walking Tour of Old Town\n"
        "Explore cobblestone streets and medieval architecture with stunning photo opportunities.\n"
        "Cost: Free (self-guided) | Duration: 2 hours\n\n"
        "CRITICAL FORMATTING RULES:\n"
        "1. Every activity MUST start with 'STOP:' followed by time and activity name\n"
        "2. Include specific times in 12-hour format (e.g., 9:00 AM, 2:30 PM)\n"
        "3. Each stop should have: description, cost estimate, and duration\n"
        "4. Be creative and specific - include actual place names when possible\n"
        "5. Vary activities - don't suggest only restaurants\n"
        "6. Consider travel time between locations\n"
        "7. At the end, add 'STOP: EXTRA TIPS' with 3-5 helpful travel tips\n"
        "8. Do NOT include day headers like 'DAY 1' - use continuous stops with times\n"
        "9. Do NOT include budget summaries\n\n"
        "Make the itinerary exciting, realistic, and memorable!"
    )

    user_content = f"Create a detailed itinerary based on: {user_prompt}"

    return {
        "system_instruction": system_instruction,
        "user_content": user_content,
    }


def _call_gemini_api(api_params: dict) -> str:
    """Call the Gemini API and return the model's text response."""
    if not GEMINI_API_KEY:
        raise ItineraryError('GEMINI_API_KEY not set in environment')

    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
    except Exception as e:
        raise ItineraryError(f'Error creating Gemini client: {e}') from e

    config = types.GenerateContentConfig(
        system_instruction=api_params["system_instruction"],
        max_output_tokens=2500,
        temperature=0.85,  # High creativity for interesting suggestions
    )

    try:
        response = client.models.generate_content(
            model='gemini-2.0-flash-exp',
            contents=api_params["user_content"],
            config=config,
        )
        return response.text.strip()
    except Exception as e:
        raise ItineraryError(f"Gemini API call failed: {e}") from e


def generate_itinerary(user_prompt: str) -> str:
    """Public function: given a natural-language prompt return itinerary text."""
    if not user_prompt or not user_prompt.strip():
        raise ItineraryError('Empty prompt provided')

    api_params = _build_messages(user_prompt)
    return _call_gemini_api(api_params)