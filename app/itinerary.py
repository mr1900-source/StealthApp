"""This file contains the functions to interact with the Gemini API to generate itineraries.
This module loads GEMINI_API_KEY from environment variables.
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
        "You are a creative travel itinerary planner. Create detailed, well-structured itineraries. "
        "Format your response where EACH activity is a separate STOP. "
        "Format EXACTLY like this:\n\n"
        "STOP: 9:00 AM - Activity Name\n"
        "Description of activity and what to expect.\n"
        "Cost: $XX | Duration: X hours\n\n"
        "STOP: 11:30 AM - Next Activity\n"
        "Description...\n\n"
        "Each stop should start with 'STOP:' followed by the time and activity name. "
        "Be creative with activities - include unique experiences like picnics in parks, "
        "local markets, hidden gems, not just restaurants and museums. "
        "Vary the types of activities. Don't recommend too many meals - 2-3 per day max. "
        "At the end, you MAY optionally add ONE final section that starts with 'STOP: EXTRA TIPS' with helpful travel advice. "
        "Do NOT include a budget summary section or day headers. "
        "CRITICAL: Every section MUST start with 'STOP:' including the extra tips if you include them."
    )

    user_content = f"Create a detailed itinerary based on: {user_prompt}"

    return {
        "system_instruction": system_instruction,
        "user_content": user_content,
    }

# Used Claude for help with API parameters
def _call_gemini_api(api_params: dict) -> str:
    """Call the Gemini API and return the model's text response."""
    if not GEMINI_API_KEY:
        raise ItineraryError('GEMINI_API_KEY not set in environment')

    try:
        client = genai.Client()
    except Exception as e:
        raise ItineraryError(f'Error creating Gemini client: {e}') from e

    config = types.GenerateContentConfig(
        system_instruction=api_params["system_instruction"],
        max_output_tokens=2000,
        temperature=0.8,  
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