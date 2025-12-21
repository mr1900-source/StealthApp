"""This file is allows for simple JSON-based storage for saved itineraries.
The file provides functions to save, load, and delete itineraries
using a local JSON file for persistence.
"""
import json
import os
from datetime import datetime
from typing import List, Dict, Optional


STORAGE_FILE = 'saved_itineraries.json'

# Used inspiration from Claude code to work with JSON
class StorageError(Exception):
    """Custom exception for storage-related errors."""
    pass


def _load_data() -> List[Dict]:
    """Load all itineraries from the JSON file.
    
    Returns:
        List of itinerary dictionaries, or empty list if file doesn't exist
    """
    if not os.path.exists(STORAGE_FILE):
        return []
    
    try:
        with open(STORAGE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        raise StorageError(f'Error reading storage file: {e}') from e
    except Exception as e:
        raise StorageError(f'Unexpected error loading data: {e}') from e


def _save_data(data: List[Dict]) -> None:
    """Save itineraries list to the JSON file.
    
    Args:
        data: List of itinerary dictionaries to save
    """
    try:
        with open(STORAGE_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        raise StorageError(f'Error saving data: {e}') from e


def save_itinerary(title: str, prompt: str, itinerary_text: str) -> Dict:
    """Save a new itinerary to storage.
    
    Args:
        title: User-provided title for the itinerary
        prompt: Original prompt used to generate the itinerary
        itinerary_text: The generated itinerary content
        
    Returns:
        Dictionary of the saved itinerary with added id and timestamp
    """
    data = _load_data()
    
    # Generate a new ID 
    new_id = max([item.get('id', 0) for item in data], default=0) + 1
    
    new_itinerary = {
        'id': new_id,
        'title': title,
        'prompt': prompt,
        'itinerary': itinerary_text,
        'created_at': datetime.now().isoformat()
    }
    
    data.append(new_itinerary)
    _save_data(data)
    
    return new_itinerary


def load_all_itineraries() -> List[Dict]:
    """Load all saved itineraries.
    
    Returns:
        List of all itinerary dictionaries, sorted by creation date (newest first)
    """
    data = _load_data()
    return sorted(data, key=lambda x: x.get('created_at', ''), reverse=True)


def get_itinerary_by_id(itinerary_id: int) -> Optional[Dict]:
    """Retrieve a specific itinerary by ID.
    
    Args:
        itinerary_id: The ID of the itinerary to retrieve
        
    Returns:
        Itinerary dictionary if found, None otherwise
    """
    data = _load_data()
    for item in data:
        if item.get('id') == itinerary_id:
            return item
    return None


def delete_itinerary(itinerary_id: int) -> bool:
    """Delete an itinerary by ID.
    
    Args:
        itinerary_id: The ID of the itinerary to delete
        
    Returns:
        True if deleted successfully, False if not found
    """
    data = _load_data()
    original_length = len(data)
    
    # To filter out the itinerary with matching ID
    data = [item for item in data if item.get('id') != itinerary_id]
    
    if len(data) < original_length:
        _save_data(data)
        return True
    return False