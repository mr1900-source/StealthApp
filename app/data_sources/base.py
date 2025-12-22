"""Base class for all data source APIs."""

import os
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
import requests
from datetime import datetime, timedelta


class DataSourceBase(ABC):
    """Base class for external data sources."""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self.session = requests.Session()
        self.cache = {}
        self.cache_duration = timedelta(hours=1)
    
    def _get_cache_key(self, **kwargs) -> str:
        """Generate cache key from parameters."""
        return f"{self.__class__.__name__}:{':'.join(f'{k}={v}' for k, v in sorted(kwargs.items()))}"
    
    def _get_cached(self, cache_key: str) -> Optional[Any]:
        """Retrieve cached data if still valid."""
        if cache_key in self.cache:
            data, timestamp = self.cache[cache_key]
            if datetime.now() - timestamp < self.cache_duration:
                return data
        return None
    
    def _set_cache(self, cache_key: str, data: Any) -> None:
        """Store data in cache with timestamp."""
        self.cache[cache_key] = (data, datetime.now())
    
    @abstractmethod
    def search(self, **kwargs) -> List[Dict[str, Any]]:
        """Search for items. Must be implemented by subclasses."""
        pass
    
    def _make_request(self, url: str, params: Dict[str, Any], headers: Dict[str, str] = None) -> Optional[Dict]:
        """Make HTTP request with error handling."""
        try:
            response = self.session.get(url, params=params, headers=headers, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error fetching from {self.__class__.__name__}: {e}")
            return None