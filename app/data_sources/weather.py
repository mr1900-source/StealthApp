"""OpenWeather API integration for weather forecasting."""

import os
from typing import Dict, List, Any, Optional
from .base import DataSourceBase


class WeatherAPI(DataSourceBase):
    """OpenWeather API client."""
    
    BASE_URL = "https://api.openweathermap.org/data/2.5"
    
    def __init__(self):
        api_key = os.environ.get('OPENWEATHER_API_KEY')
        super().__init__(api_key)
    
    def search(self, location: str, **kwargs) -> List[Dict[str, Any]]:
        """
        Search method to satisfy abstract base class.
        Returns forecast data as a list.
        
        Args:
            location: City name (e.g., "New York,US")
            **kwargs: Additional parameters
        
        Returns:
            List containing current weather (for consistency with other APIs)
        """
        current = self.get_current(location)
        if current:
            return [current]
        return []
    
    def get_current(self, location: str) -> Optional[Dict[str, Any]]:
        """
        Get current weather for a location.
        
        Args:
            location: City name (e.g., "New York,US")
        
        Returns:
            Weather data dictionary
        """
        if not self.api_key:
            print("Warning: OPENWEATHER_API_KEY not set")
            return None
        
        cache_key = self._get_cache_key(location=location, type="current")
        cached = self._get_cached(cache_key)
        if cached:
            return cached
        
        url = f"{self.BASE_URL}/weather"
        params = {
            "q": location,
            "appid": self.api_key,
            "units": "imperial"  # Fahrenheit
        }
        
        data = self._make_request(url, params)
        
        if not data:
            return None
        
        result = self._format_current_weather(data)
        self._set_cache(cache_key, result)
        return result
    
    def get_forecast(self, location: str, days: int = 5) -> List[Dict[str, Any]]:
        """
        Get weather forecast for a location.
        
        Args:
            location: City name
            days: Number of days (max 5 for free tier)
        
        Returns:
            List of daily forecast dictionaries
        """
        if not self.api_key:
            return []
        
        cache_key = self._get_cache_key(location=location, days=days, type="forecast")
        cached = self._get_cached(cache_key)
        if cached:
            return cached
        
        url = f"{self.BASE_URL}/forecast"
        params = {
            "q": location,
            "appid": self.api_key,
            "units": "imperial",
            "cnt": min(days * 8, 40)  # 8 forecasts per day (3-hour intervals)
        }
        
        data = self._make_request(url, params)
        
        if not data or "list" not in data:
            return []
        
        results = self._format_forecast(data["list"])
        self._set_cache(cache_key, results)
        return results
    
    def _format_current_weather(self, data: Dict) -> Dict[str, Any]:
        """Format current weather data."""
        return {
            "source": "openweather",
            "temperature": data.get("main", {}).get("temp"),
            "feels_like": data.get("main", {}).get("feels_like"),
            "temp_min": data.get("main", {}).get("temp_min"),
            "temp_max": data.get("main", {}).get("temp_max"),
            "humidity": data.get("main", {}).get("humidity"),
            "description": data.get("weather", [{}])[0].get("description", "").capitalize(),
            "icon": data.get("weather", [{}])[0].get("icon"),
            "wind_speed": data.get("wind", {}).get("speed"),
            "clouds": data.get("clouds", {}).get("all"),
            "type": "current_weather"
        }
    
    def _format_forecast(self, forecast_list: List[Dict]) -> List[Dict[str, Any]]:
        """Format forecast data (group by day)."""
        daily_forecasts = {}
        
        for item in forecast_list:
            date = item.get("dt_txt", "").split(" ")[0]
            if date not in daily_forecasts:
                daily_forecasts[date] = {
                    "source": "openweather",
                    "date": date,
                    "temps": [],
                    "descriptions": [],
                    "humidity": [],
                    "wind_speed": []
                }
            
            daily_forecasts[date]["temps"].append(item.get("main", {}).get("temp"))
            daily_forecasts[date]["descriptions"].append(
                item.get("weather", [{}])[0].get("description", "")
            )
            daily_forecasts[date]["humidity"].append(item.get("main", {}).get("humidity"))
            daily_forecasts[date]["wind_speed"].append(item.get("wind", {}).get("speed"))
        
        # Aggregate daily data
        formatted = []
        for date, data in daily_forecasts.items():
            formatted.append({
                "source": "openweather",
                "date": date,
                "temp_avg": sum(data["temps"]) / len(data["temps"]),
                "temp_min": min(data["temps"]),
                "temp_max": max(data["temps"]),
                "description": max(set(data["descriptions"]), key=data["descriptions"].count),
                "humidity": sum(data["humidity"]) / len(data["humidity"]),
                "wind_speed": sum(data["wind_speed"]) / len(data["wind_speed"]),
                "type": "forecast_day"
            })
        
        return formatted