"""Google Places API integration for venue and attraction data."""

import os
from typing import Dict, List, Any, Optional
from .base import DataSourceBase


class GooglePlacesAPI(DataSourceBase):
    """Google Places API client."""
    
    BASE_URL = "https://maps.googleapis.com/maps/api/place"
    
    def __init__(self):
        api_key = os.environ.get('GOOGLE_PLACES_API_KEY')
        super().__init__(api_key)
    
    def search(self, location: str, query: str = None, type: str = None, 
               radius: int = 5000, keyword: str = None) -> List[Dict[str, Any]]:
        """
        Search for places using Google Places API.
        
        Args:
            location: Location as "lat,lng" or place name
            query: Free-form search query
            type: Place type (restaurant, cafe, museum, etc.)
            radius: Search radius in meters (max 50000)
            keyword: Additional keyword for filtering
        
        Returns:
            List of place dictionaries
        """
        if not self.api_key:
            print("Warning: GOOGLE_PLACES_API_KEY not set")
            return []
        
        # If location is a place name, geocode it first
        if ',' not in location or not location.replace(',', '').replace('.', '').replace('-', '').replace(' ', '').isdigit():
            coords = self._geocode(location)
            if not coords:
                return []
            location = f"{coords['lat']},{coords['lng']}"
        
        cache_key = self._get_cache_key(location=location, query=query, type=type, radius=radius, keyword=keyword)
        cached = self._get_cached(cache_key)
        if cached:
            return cached
        
        # Use Text Search for better results
        url = f"{self.BASE_URL}/textsearch/json"
        params = {
            "key": self.api_key,
            "location": location,
            "radius": min(radius, 50000)
        }
        
        if query:
            params["query"] = query
        if type:
            params["type"] = type
        if keyword:
            params["keyword"] = keyword
        
        data = self._make_request(url, params)
        
        if not data or "results" not in data:
            return []
        
        results = self._format_places(data["results"])
        self._set_cache(cache_key, results)
        return results
    
    def get_place_details(self, place_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific place."""
        if not self.api_key:
            return None
        
        cache_key = self._get_cache_key(place_id=place_id)
        cached = self._get_cached(cache_key)
        if cached:
            return cached
        
        url = f"{self.BASE_URL}/details/json"
        params = {
            "key": self.api_key,
            "place_id": place_id,
            "fields": "name,rating,formatted_address,formatted_phone_number,opening_hours,website,price_level,photos,reviews"
        }
        
        data = self._make_request(url, params)
        
        if not data or "result" not in data:
            return None
        
        result = self._format_place_details(data["result"])
        self._set_cache(cache_key, result)
        return result
    
    def _geocode(self, address: str) -> Optional[Dict[str, float]]:
        """Convert address to coordinates."""
        if not self.api_key:
            return None
        
        url = "https://maps.googleapis.com/maps/api/geocode/json"
        params = {
            "key": self.api_key,
            "address": address
        }
        
        data = self._make_request(url, params)
        
        if not data or "results" not in data or not data["results"]:
            return None
        
        location = data["results"][0]["geometry"]["location"]
        return {"lat": location["lat"], "lng": location["lng"]}
    
    def _format_places(self, places: List[Dict]) -> List[Dict[str, Any]]:
        """Format Google Places data into standardized format."""
        formatted = []
        for place in places:
            formatted.append({
                "source": "google",
                "place_id": place.get("place_id"),
                "name": place.get("name"),
                "rating": place.get("rating"),
                "user_ratings_total": place.get("user_ratings_total"),
                "price_level": self._format_price_level(place.get("price_level")),
                "types": place.get("types", []),
                "address": place.get("formatted_address"),
                "geometry": place.get("geometry", {}),
                "open_now": place.get("opening_hours", {}).get("open_now"),
                "photos": place.get("photos", []),
                "type": "place"
            })
        return formatted
    
    def _format_place_details(self, place: Dict) -> Dict[str, Any]:
        """Format detailed place information."""
        return {
            "source": "google",
            "name": place.get("name"),
            "rating": place.get("rating"),
            "address": place.get("formatted_address"),
            "phone": place.get("formatted_phone_number"),
            "website": place.get("website"),
            "price_level": self._format_price_level(place.get("price_level")),
            "opening_hours": place.get("opening_hours", {}).get("weekday_text", []),
            "reviews": place.get("reviews", [])[:3],  # Top 3 reviews
            "photos": place.get("photos", []),
            "type": "place_detail"
        }
    
    def _format_price_level(self, level: Optional[int]) -> str:
        """Convert Google's price level (0-4) to dollar signs."""
        if level is None:
            return ""
        return "$" * level if level > 0 else "Free"