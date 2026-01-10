"""
Places Autocomplete Service

Google Places API with caching.
"""

import httpx
import json
import os
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session

from app.models.models import Cache
from app.schemas.schemas import PlacesAutocompleteResponse, PlaceResult


GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")
CACHE_TTL_HOURS = 24


async def places_autocomplete(
    query: str,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    db: Session = None
) -> PlacesAutocompleteResponse:
    """
    Search for places using Google Places API.
    Results are cached for 24 hours.
    """
    
    if not GOOGLE_PLACES_API_KEY:
        print("Warning: GOOGLE_PLACES_API_KEY not set")
        return PlacesAutocompleteResponse(results=[])
    
    # Build cache key
    cache_key = f"places:{query}:{lat}:{lng}"
    
    # Check cache
    if db:
        cached = db.query(Cache).filter(
            Cache.cache_key == cache_key,
            Cache.expires_at > datetime.utcnow()
        ).first()
        
        if cached:
            try:
                results = json.loads(cached.cache_value)
                return PlacesAutocompleteResponse(results=[PlaceResult(**r) for r in results])
            except:
                pass
    
    # Call Google Places API
    try:
        url = "https://maps.googleapis.com/maps/api/place/autocomplete/json"
        params = {
            "input": query,
            "key": GOOGLE_PLACES_API_KEY,
            "types": "establishment|geocode",
        }
        
        # Add location bias if provided
        if lat and lng:
            params["location"] = f"{lat},{lng}"
            params["radius"] = "50000"  # 50km radius
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            data = response.json()
        
        if data.get("status") != "OK":
            print(f"Places API error: {data.get('status')}")
            return PlacesAutocompleteResponse(results=[])
        
        # Parse results
        results = []
        for prediction in data.get("predictions", [])[:5]:
            result = PlaceResult(
                place_id=prediction.get("place_id", ""),
                name=prediction.get("structured_formatting", {}).get("main_text", prediction.get("description", "")),
                address=prediction.get("description", ""),
            )
            results.append(result)
        
        # Get place details for lat/lng (optional, adds API calls)
        # For MVP, skip this to save costs
        
        # Cache results
        if db and results:
            cache_entry = db.query(Cache).filter(Cache.cache_key == cache_key).first()
            
            if cache_entry:
                cache_entry.cache_value = json.dumps([r.model_dump() for r in results])
                cache_entry.expires_at = datetime.utcnow() + timedelta(hours=CACHE_TTL_HOURS)
            else:
                cache_entry = Cache(
                    cache_key=cache_key,
                    cache_value=json.dumps([r.model_dump() for r in results]),
                    expires_at=datetime.utcnow() + timedelta(hours=CACHE_TTL_HOURS)
                )
                db.add(cache_entry)
            
            db.commit()
        
        return PlacesAutocompleteResponse(results=results)
        
    except Exception as e:
        print(f"Places API error: {e}")
        return PlacesAutocompleteResponse(results=[])


async def get_place_details(place_id: str) -> Optional[dict]:
    """
    Get detailed place information including lat/lng.
    Use sparingly - costs more API calls.
    """
    
    if not GOOGLE_PLACES_API_KEY:
        return None
    
    try:
        url = "https://maps.googleapis.com/maps/api/place/details/json"
        params = {
            "place_id": place_id,
            "key": GOOGLE_PLACES_API_KEY,
            "fields": "name,formatted_address,geometry",
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            data = response.json()
        
        if data.get("status") != "OK":
            return None
        
        result = data.get("result", {})
        location = result.get("geometry", {}).get("location", {})
        
        return {
            "name": result.get("name", ""),
            "address": result.get("formatted_address", ""),
            "lat": location.get("lat"),
            "lng": location.get("lng"),
        }
        
    except Exception as e:
        print(f"Place details error: {e}")
        return None
