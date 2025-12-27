import httpx
from typing import Optional, Dict, Any, List
from ..config import get_settings

settings = get_settings()


class PlacesService:
    """Service for interacting with Google Places API."""
    
    BASE_URL = "https://maps.googleapis.com/maps/api/place"
    
    @classmethod
    async def search_nearby(
        cls,
        lat: float,
        lng: float,
        radius: int = 1000,
        keyword: Optional[str] = None,
        place_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Search for places near a location."""
        if not settings.google_places_api_key:
            return []
        
        params = {
            "location": f"{lat},{lng}",
            "radius": radius,
            "key": settings.google_places_api_key
        }
        
        if keyword:
            params["keyword"] = keyword
        if place_type:
            params["type"] = place_type
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{cls.BASE_URL}/nearbysearch/json",
                    params=params,
                    timeout=10
                )
                data = response.json()
                
                if data.get("status") == "OK":
                    return data.get("results", [])
                return []
                
        except Exception:
            return []
    
    @classmethod
    async def get_place_details(cls, place_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed info about a specific place."""
        if not settings.google_places_api_key:
            return None
        
        params = {
            "place_id": place_id,
            "fields": "name,formatted_address,geometry,photos,types,rating,price_level,opening_hours",
            "key": settings.google_places_api_key
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{cls.BASE_URL}/details/json",
                    params=params,
                    timeout=10
                )
                data = response.json()
                
                if data.get("status") == "OK":
                    return data.get("result")
                return None
                
        except Exception:
            return None
    
    @classmethod
    async def autocomplete(
        cls,
        query: str,
        lat: Optional[float] = None,
        lng: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """Get place autocomplete suggestions."""
        if not settings.google_places_api_key:
            return []
        
        params = {
            "input": query,
            "key": settings.google_places_api_key
        }
        
        if lat and lng:
            params["location"] = f"{lat},{lng}"
            params["radius"] = 50000  # 50km bias
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{cls.BASE_URL}/autocomplete/json",
                    params=params,
                    timeout=10
                )
                data = response.json()
                
                if data.get("status") == "OK":
                    return data.get("predictions", [])
                return []
                
        except Exception:
            return []
    
    @classmethod
    def get_photo_url(cls, photo_reference: str, max_width: int = 400) -> str:
        """Generate a URL for a place photo."""
        if not settings.google_places_api_key:
            return ""
        
        return (
            f"{cls.BASE_URL}/photo"
            f"?maxwidth={max_width}"
            f"&photo_reference={photo_reference}"
            f"&key={settings.google_places_api_key}"
        )
