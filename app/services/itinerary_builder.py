"""Uses Gemini AI to curate and format itineraries from aggregated data."""

import json
from typing import Dict, List, Any
from ..itinerary import _call_gemini_api, ItineraryError


class ItineraryBuilder:
    """Builds intelligent itineraries using AI and real-time data."""
    
    def build_itinerary(self, 
                       user_request: Dict[str, Any],
                       travel_data: Dict[str, Any]) -> str:
        """
        Create a curated itinerary using Gemini AI and real-time data.
        
        Args:
            user_request: User's original request (destination, interests, etc.)
            travel_data: Aggregated data from DataAggregator
        
        Returns:
            Formatted itinerary string
        """
        # Build context-rich prompt for Gemini
        prompt = self._build_enhanced_prompt(user_request, travel_data)
        
        # Call Gemini with the enriched prompt
        api_params = {
            "system_instruction": self._get_system_instruction(),
            "user_content": prompt
        }
        
        try:
            itinerary = _call_gemini_api(api_params)
            return itinerary
        except ItineraryError as e:
            raise ItineraryError(f"Failed to build itinerary: {e}") from e
    
    def _build_enhanced_prompt(self, user_request: Dict[str, Any], travel_data: Dict[str, Any]) -> str:
        """Build a detailed prompt with real-time data."""
        destination = user_request.get("destination", "")
        duration = user_request.get("duration", "")
        interests = user_request.get("interests", "")
        budget = user_request.get("budget", "")
        travelers = user_request.get("travelers", "")
        
        prompt_parts = [
            f"Create a detailed itinerary for {destination}.",
            f"Duration: {duration}",
        ]
        
        if travelers:
            prompt_parts.append(f"Number of travelers: {travelers}")
        
        if budget:
            prompt_parts.append(f"Budget: ${budget} total")
        
        if interests:
            prompt_parts.append(f"Interests: {interests}")
        
        # Add real-time data context
        prompt_parts.append("\n\nREAL-TIME DATA AVAILABLE:")
        
        # Restaurants
        if travel_data.get("restaurants"):
            prompt_parts.append(f"\n**TOP RESTAURANTS** (choose 2-3 best for this itinerary):")
            for i, restaurant in enumerate(travel_data["restaurants"][:8], 1):
                name = restaurant.get("name")
                rating = restaurant.get("rating")
                reviews = restaurant.get("review_count") or restaurant.get("user_ratings_total")
                price = restaurant.get("price") or restaurant.get("price_level")
                categories = ", ".join(restaurant.get("categories", [])[:2])
                
                prompt_parts.append(
                    f"{i}. {name} ({rating}★, {reviews} reviews) - {price} - {categories}"
                )
        
        # Cafes
        if travel_data.get("cafes"):
            prompt_parts.append(f"\n**CAFES** (choose 1-2 if appropriate):")
            for i, cafe in enumerate(travel_data["cafes"][:5], 1):
                name = cafe.get("name")
                rating = cafe.get("rating")
                prompt_parts.append(f"{i}. {name} ({rating}★)")
        
        # Attractions
        if travel_data.get("attractions"):
            prompt_parts.append(f"\n**ATTRACTIONS** (choose 2-4 best):")
            for i, attraction in enumerate(travel_data["attractions"][:10], 1):
                name = attraction.get("name")
                rating = attraction.get("rating")
                types = ", ".join(attraction.get("types", [])[:2]) if attraction.get("types") else ""
                
                prompt_parts.append(f"{i}. {name} ({rating}★) - {types}")
        
        # Events
        if travel_data.get("events"):
            prompt_parts.append(f"\n**CURRENT EVENTS** (include 1-2 if timing works):")
            for i, event in enumerate(travel_data["events"][:5], 1):
                name = event.get("name")
                time = event.get("start_time") or event.get("time_start", "")
                is_free = "FREE" if event.get("is_free") else "Paid"
                
                prompt_parts.append(f"{i}. {name} - {time} - {is_free}")
        
        # Nightlife
        if travel_data.get("nightlife"):
            prompt_parts.append(f"\n**NIGHTLIFE** (if requested):")
            for i, venue in enumerate(travel_data["nightlife"][:5], 1):
                name = venue.get("name")
                rating = venue.get("rating")
                prompt_parts.append(f"{i}. {name} ({rating}★)")
        
        # Weather
        if travel_data.get("weather"):
            prompt_parts.append(f"\n**WEATHER FORECAST:**")
            for day in travel_data["weather"][:3]:
                date = day.get("date")
                temp_max = day.get("temp_max")
                temp_min = day.get("temp_min")
                description = day.get("description")
                prompt_parts.append(
                    f"{date}: {temp_min:.0f}°F - {temp_max:.0f}°F, {description}"
                )
            prompt_parts.append("(Consider weather when planning outdoor vs indoor activities)")
        
        prompt_parts.append(
            "\n\nIMPORTANT: Use the ACTUAL venue names and details provided above. "
            "These are real, currently operating businesses with verified ratings. "
            "Include specific times, estimated costs, and durations for each stop."
        )
        
        return "\n".join(prompt_parts)
    
    def _get_system_instruction(self) -> str:
        """Get the system instruction for Gemini."""
        return (
            "You are an expert travel planner with access to REAL-TIME data about "
            "restaurants, attractions, and events. Create detailed, realistic itineraries.\n\n"
            "FORMAT YOUR RESPONSE EXACTLY LIKE THIS:\n\n"
            "STOP: 9:00 AM - Café Name (from the provided list)\n"
            "Brief description of why this place is special. Mention specific details.\n"
            "Cost: $15-20 per person | Duration: 1 hour\n\n"
            "STOP: 10:30 AM - Museum Name (from the provided list)\n"
            "What makes this attraction worth visiting.\n"
            "Cost: $25 admission | Duration: 2 hours\n\n"
            "CRITICAL RULES:\n"
            "1. Use ONLY the venue names provided in the REAL-TIME DATA section\n"
            "2. Each stop starts with 'STOP:' followed by time and venue name\n"
            "3. Include realistic times in 12-hour format\n"
            "4. Mention ratings/reviews when relevant (e.g., 'highly-rated')\n"
            "5. Consider travel time between locations (15-30 min in cities)\n"
            "6. Consider weather when planning indoor vs outdoor activities\n"
            "7. Match suggestions to the user's stated interests\n"
            "8. Respect the budget - don't suggest all expensive places\n"
            "9. Include 2-3 meal stops max per day\n"
            "10. Add 'STOP: EXTRA TIPS' at the end with 3-5 helpful tips\n\n"
            "Make it exciting and realistic!"
        )