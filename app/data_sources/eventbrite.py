"""Eventbrite API integration for events and activities."""

import os
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from .base import DataSourceBase


class EventbriteAPI(DataSourceBase):
    """Eventbrite API client."""
    
    BASE_URL = "https://www.eventbriteapi.com/v3"
    
    def __init__(self):
        api_key = os.environ.get('EVENTBRITE_API_KEY')
        super().__init__(api_key)
    
    def search(self, location: str = None, query: str = None, 
               start_date: str = None, end_date: str = None,
               categories: List[str] = None, price: str = "free,paid",
               limit: int = 20) -> List[Dict[str, Any]]:
        """
        Search for events on Eventbrite.
        
        Args:
            location: City or address (e.g., "New York, NY")
            query: Search keywords
            start_date: ISO format date (e.g., "2025-01-01T00:00:00Z")
            end_date: ISO format date
            categories: List of category IDs
            price: "free", "paid", or "free,paid"
            limit: Number of results
        
        Returns:
            List of event dictionaries
        """
        if not self.api_key:
            print("Warning: EVENTBRITE_API_KEY not set")
            return []
        
        # Default to events in next 7 days
        if not start_date:
            start_date = datetime.now().isoformat() + "Z"
        if not end_date:
            end_date = (datetime.now() + timedelta(days=7)).isoformat() + "Z"
        
        cache_key = self._get_cache_key(location=location, query=query, start_date=start_date, categories=categories)
        cached = self._get_cached(cache_key)
        if cached:
            return cached
        
        url = f"{self.BASE_URL}/events/search/"
        headers = {"Authorization": f"Bearer {self.api_key}"}
        params = {
            "expand": "venue,organizer",
            "start_date.range_start": start_date,
            "start_date.range_end": end_date,
            "page_size": min(limit, 50)
        }
        
        if location:
            params["location.address"] = location
        if query:
            params["q"] = query
        if categories:
            params["categories"] = ",".join(categories)
        if price:
            params["price"] = price
        
        data = self._make_request(url, params, headers)
        
        if not data or "events" not in data:
            return []
        
        results = self._format_events(data["events"])
        self._set_cache(cache_key, results)
        return results
    
    def _format_events(self, events: List[Dict]) -> List[Dict[str, Any]]:
        """Format Eventbrite event data into standardized format."""
        formatted = []
        for event in events:
            formatted.append({
                "source": "eventbrite",
                "event_id": event.get("id"),
                "name": event.get("name", {}).get("text"),
                "description": event.get("description", {}).get("text", "")[:300],  # Truncate
                "start_time": event.get("start", {}).get("local"),
                "end_time": event.get("end", {}).get("local"),
                "is_free": event.get("is_free", False),
                "url": event.get("url"),
                "image_url": event.get("logo", {}).get("url") if event.get("logo") else None,
                "venue_name": event.get("venue", {}).get("name") if event.get("venue") else "Online",
                "venue_address": event.get("venue", {}).get("address", {}).get("localized_address_display") if event.get("venue") else None,
                "organizer": event.get("organizer", {}).get("name"),
                "category": event.get("category", {}).get("name"),
                "type": "event"
            })
        return formatted