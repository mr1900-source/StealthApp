"""Yelp Fusion API integration for business and event data."""

import os
from typing import Dict, List, Any, Optional
from .base import DataSourceBase


class YelpAPI(DataSourceBase):
    """Yelp Fusion API client."""
    
    BASE_URL = "https://api.yelp.com/v3"
    
    def __init__(self):
        api_key = os.environ.get('YELP_API_KEY')
        super().__init__(api_key)
        
    def search(self, location: str, term: str = None, categories: str = None, 
               limit: int = 20, price: str = None) -> List[Dict[str, Any]]:
        """
        Search for businesses on Yelp.
        
        Args:
            location: City, address, or coordinates
            term: Search term (e.g., "food", "restaurants", "coffee")
            categories: Yelp categories (e.g., "restaurants,bars")
            limit: Number of results (max 50)
            price: Price filter (1, 2, 3, or 4 for $, $$, $$$, $$$$)
        
        Returns:
            List of business dictionaries
        """
        if not self.api_key:
            print("Warning: YELP_API_KEY not set")
            return []
        
        cache_key = self._get_cache_key(location=location, term=term, categories=categories, limit=limit, price=price)
        cached = self._get_cached(cache_key)
        if cached:
            return cached
        
        url = f"{self.BASE_URL}/businesses/search"
        headers = {"Authorization": f"Bearer {self.api_key}"}
        params = {
            "location": location,
            "limit": min(limit, 50),
            "sort_by": "best_match"
        }
        
        if term:
            params["term"] = term
        if categories:
            params["categories"] = categories
        if price:
            params["price"] = price
        
        data = self._make_request(url, params, headers)
        
        if not data or "businesses" not in data:
            return []
        
        results = self._format_businesses(data["businesses"])
        self._set_cache(cache_key, results)
        return results
    
    def search_events(self, location: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Search for events on Yelp.
        
        Args:
            location: City or coordinates
            limit: Number of results
        
        Returns:
            List of event dictionaries
        """
        if not self.api_key:
            return []
        
        cache_key = self._get_cache_key(location=location, type="events", limit=limit)
        cached = self._get_cached(cache_key)
        if cached:
            return cached
        
        url = f"{self.BASE_URL}/events"
        headers = {"Authorization": f"Bearer {self.api_key}"}
        params = {
            "location": location,
            "limit": min(limit, 50)
        }
        
        data = self._make_request(url, params, headers)
        
        if not data or "events" not in data:
            return []
        
        results = self._format_events(data["events"])
        self._set_cache(cache_key, results)
        return results
    
    def _format_businesses(self, businesses: List[Dict]) -> List[Dict[str, Any]]:
        """Format Yelp business data into standardized format."""
        formatted = []
        for biz in businesses:
            formatted.append({
                "source": "yelp",
                "name": biz.get("name"),
                "rating": biz.get("rating"),
                "review_count": biz.get("review_count"),
                "price": biz.get("price", ""),
                "categories": [cat["title"] for cat in biz.get("categories", [])],
                "address": ", ".join(biz.get("location", {}).get("display_address", [])),
                "phone": biz.get("phone", ""),
                "url": biz.get("url"),
                "image_url": biz.get("image_url"),
                "is_closed": biz.get("is_closed", False),
                "coordinates": biz.get("coordinates", {}),
                "type": "business"
            })
        return formatted
    
    def _format_events(self, events: List[Dict]) -> List[Dict[str, Any]]:
        """Format Yelp event data into standardized format."""
        formatted = []
        for event in events:
            formatted.append({
                "source": "yelp",
                "name": event.get("name"),
                "description": event.get("description"),
                "time_start": event.get("time_start"),
                "time_end": event.get("time_end"),
                "is_free": event.get("is_free", False),
                "cost": event.get("cost"),
                "category": event.get("category"),
                "url": event.get("event_site_url"),
                "image_url": event.get("image_url"),
                "location": event.get("location", {}).get("display_address", []),
                "type": "event"
            })
        return formatted