"""Aggregates data from multiple sources and filters/ranks results."""

from typing import Dict, List, Any, Optional
from datetime import datetime
from ..data_sources import GooglePlacesAPI, YelpAPI, EventbriteAPI, WeatherAPI


class DataAggregator:
    """Combines and filters data from multiple travel APIs."""
    
    def __init__(self):
        self.google_places = GooglePlacesAPI()
        self.yelp = YelpAPI()
        self.eventbrite = EventbriteAPI()
        self.weather = WeatherAPI()
    
    def gather_travel_data(self, 
                          destination: str,
                          interests: List[str] = None,
                          budget: str = None,
                          duration: str = None,
                          start_date: str = None) -> Dict[str, Any]:
        """
        Gather all relevant travel data from multiple sources.
        
        Args:
            destination: City or location
            interests: List of interest keywords (e.g., ["food", "museums", "nightlife"])
            budget: Budget level ("low", "medium", "high")
            duration: Trip duration for context
            start_date: When the trip starts (ISO format)
        
        Returns:
            Dictionary with categorized results from all sources
        """
        results = {
            "destination": destination,
            "restaurants": [],
            "attractions": [],
            "events": [],
            "cafes": [],
            "nightlife": [],
            "weather": None,
            "metadata": {
                "sources_used": [],
                "total_results": 0,
                "timestamp": datetime.now().isoformat()
            }
        }
        
        # Convert budget to price filters
        price_yelp = self._budget_to_yelp_price(budget)
        
        # Gather restaurants
        restaurants = []
        
        # Yelp restaurants
        yelp_restaurants = self.yelp.search(
            location=destination,
            categories="restaurants",
            limit=15,
            price=price_yelp
        )
        if yelp_restaurants:
            restaurants.extend(yelp_restaurants)
            results["metadata"]["sources_used"].append("yelp_restaurants")
        
        # Google restaurants
        google_restaurants = self.google_places.search(
            location=destination,
            type="restaurant",
            query="best restaurants",
            radius=10000
        )
        if google_restaurants:
            restaurants.extend(google_restaurants[:10])
            results["metadata"]["sources_used"].append("google_restaurants")
        
        # Filter by interests if provided
        if interests:
            restaurants = self._filter_by_interests(restaurants, interests)
        
        results["restaurants"] = self._deduplicate_and_rank(restaurants, limit=10)
        
        # Gather cafes
        cafes = []
        
        yelp_cafes = self.yelp.search(
            location=destination,
            categories="coffee,cafes",
            limit=10
        )
        if yelp_cafes:
            cafes.extend(yelp_cafes)
            results["metadata"]["sources_used"].append("yelp_cafes")
        
        google_cafes = self.google_places.search(
            location=destination,
            type="cafe",
            radius=10000
        )
        if google_cafes:
            cafes.extend(google_cafes[:5])
            results["metadata"]["sources_used"].append("google_cafes")
        
        results["cafes"] = self._deduplicate_and_rank(cafes, limit=5)
        
        # Gather attractions
        attractions = []
        
        google_attractions = self.google_places.search(
            location=destination,
            type="tourist_attraction",
            radius=15000
        )
        if google_attractions:
            attractions.extend(google_attractions)
            results["metadata"]["sources_used"].append("google_attractions")
        
        # Also search for museums, parks, etc.
        if interests:
            for interest in interests:
                if any(keyword in interest.lower() for keyword in ["museum", "art", "history", "culture"]):
                    museums = self.google_places.search(
                        location=destination,
                        type="museum",
                        radius=15000
                    )
                    attractions.extend(museums)
        
        results["attractions"] = self._deduplicate_and_rank(attractions, limit=10)
        
        # Gather nightlife
        if interests and any(keyword in " ".join(interests).lower() for keyword in ["nightlife", "bars", "drinks", "club"]):
            nightlife = []
            
            yelp_nightlife = self.yelp.search(
                location=destination,
                categories="bars,nightlife",
                limit=10
            )
            if yelp_nightlife:
                nightlife.extend(yelp_nightlife)
                results["metadata"]["sources_used"].append("yelp_nightlife")
            
            results["nightlife"] = self._deduplicate_and_rank(nightlife, limit=5)
        
        # Gather events
        events = []
        
        # Yelp events
        yelp_events = self.yelp.search_events(location=destination, limit=10)
        if yelp_events:
            events.extend(yelp_events)
            results["metadata"]["sources_used"].append("yelp_events")
        
        # Eventbrite events
        eventbrite_events = self.eventbrite.search(
            location=destination,
            start_date=start_date,
            limit=15
        )
        if eventbrite_events:
            events.extend(eventbrite_events)
            results["metadata"]["sources_used"].append("eventbrite")
        
        if interests:
            events = self._filter_by_interests(events, interests)
        
        results["events"] = self._deduplicate_and_rank(events, limit=8)
        
        # Get weather forecast
        weather = self.weather.get_forecast(destination, days=5)
        if weather:
            results["weather"] = weather
            results["metadata"]["sources_used"].append("openweather")
        
        # Calculate total results
        results["metadata"]["total_results"] = (
            len(results["restaurants"]) +
            len(results["attractions"]) +
            len(results["events"]) +
            len(results["cafes"]) +
            len(results["nightlife"])
        )
        
        return results
    
    def _budget_to_yelp_price(self, budget: Optional[str]) -> Optional[str]:
        """Convert budget level to Yelp price filter."""
        if not budget:
            return None
        
        budget_map = {
            "low": "1,2",
            "medium": "2,3",
            "high": "3,4",
            "any": "1,2,3,4"
        }
        
        return budget_map.get(budget.lower())
    
    def _filter_by_interests(self, items: List[Dict], interests: List[str]) -> List[Dict]:
        """Filter items based on user interests."""
        if not interests:
            return items
        
        interest_keywords = [i.lower() for i in interests]
        filtered = []
        
        for item in items:
            # Check name, categories, description
            text_to_check = " ".join([
                item.get("name", "").lower(),
                " ".join(item.get("categories", [])).lower(),
                item.get("description", "").lower()
            ])
            
            # If any interest keyword matches, include it
            if any(keyword in text_to_check for keyword in interest_keywords):
                filtered.append(item)
        
        # If filtering removes everything, return original (don't over-filter)
        return filtered if filtered else items
    
    def _deduplicate_and_rank(self, items: List[Dict], limit: int = 10) -> List[Dict]:
        """
        Remove duplicates and rank by quality signals.
        
        Ranking factors:
        - Rating (higher is better)
        - Review count (more reviews = more reliable)
        - Source (Google and Yelp are weighted equally)
        """
        if not items:
            return []
        
        # Deduplicate by name (case-insensitive)
        seen_names = set()
        unique_items = []
        
        for item in items:
            name_lower = item.get("name", "").lower().strip()
            if name_lower and name_lower not in seen_names:
                seen_names.add(name_lower)
                unique_items.append(item)
        
        # Calculate ranking score
        for item in unique_items:
            rating = item.get("rating") or item.get("user_ratings_total", 0) / 1000  # Normalize
            review_count = (
                item.get("review_count") or 
                item.get("user_ratings_total") or 
                0
            )
            
            # Normalize review count (log scale to prevent domination)
            import math
            normalized_reviews = math.log(review_count + 1) if review_count > 0 else 0
            
            # Calculate score (rating weighted 70%, reviews 30%)
            score = (rating or 0) * 0.7 + normalized_reviews * 0.3
            item["_score"] = score
        
        # Sort by score descending
        ranked = sorted(unique_items, key=lambda x: x.get("_score", 0), reverse=True)
        
        # Remove score before returning
        for item in ranked:
            item.pop("_score", None)
        
        return ranked[:limit]