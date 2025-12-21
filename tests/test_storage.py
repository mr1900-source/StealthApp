"""Pytest tests for the storage module.

These tests use temporary files to avoid affecting production data.
"""

import pytest
import json
import os
from app import storage

# Used inspiration from Claude to create a temp direct and test file path
@pytest.fixture
def temp_storage(tmp_path, monkeypatch):
    """Create a temporary storage file for testing."""
    test_file = tmp_path / "test_itineraries.json"
    monkeypatch.setattr(storage, 'STORAGE_FILE', str(test_file))
    return str(test_file)

# Tests correct saving of data
def test_save_itinerary(temp_storage):
    """Test saving a new itinerary."""
    title = "Paris Weekend"
    prompt = "3 days in Paris"
    itinerary_text = "Day 1: Eiffel Tower..."
    
    result = storage.save_itinerary(title, prompt, itinerary_text)
    
    assert result['id'] == 1
    assert result['title'] == title
    assert result['prompt'] == prompt
    assert result['itinerary'] == itinerary_text
    assert 'created_at' in result

def test_load_all_itineraries_empty(temp_storage):
    """Test loading when no itineraries exist."""
    result = storage.load_all_itineraries()
    assert result == []

def test_load_all_itineraries(temp_storage):
    """Test loading multiple itineraries."""
    storage.save_itinerary("Trip 1", "prompt 1", "itinerary 1")
    storage.save_itinerary("Trip 2", "prompt 2", "itinerary 2")
    
    result = storage.load_all_itineraries()
    
    assert len(result) == 2
    assert result[0]['title'] == "Trip 2"  # Newest first
    assert result[1]['title'] == "Trip 1"

def test_get_itinerary_by_id(temp_storage):
    """Test retrieving a specific itinerary."""
    saved = storage.save_itinerary("Test Trip", "test prompt", "test itinerary")
    itinerary_id = saved['id']
    
    result = storage.get_itinerary_by_id(itinerary_id)
    
    assert result is not None
    assert result['title'] == "Test Trip"

def test_get_itinerary_by_id_not_found(temp_storage):
    """Test retrieving non-existent itinerary."""
    result = storage.get_itinerary_by_id(999)
    assert result is None

def test_delete_itinerary(temp_storage):
    """Test deleting an itinerary."""
    saved = storage.save_itinerary("To Delete", "prompt", "itinerary")
    itinerary_id = saved['id']
    
    result = storage.delete_itinerary(itinerary_id)
    assert result is True
    
    retrieved = storage.get_itinerary_by_id(itinerary_id)
    assert retrieved is None

def test_delete_itinerary_not_found(temp_storage):
    """Test deleting non-existent itinerary."""
    result = storage.delete_itinerary(999)
    assert result is False

def test_save_multiple_itineraries_increments_id(temp_storage):
    """Test that IDs increment properly."""
    first = storage.save_itinerary("First", "prompt 1", "itinerary 1")
    second = storage.save_itinerary("Second", "prompt 2", "itinerary 2")
    third = storage.save_itinerary("Third", "prompt 3", "itinerary 3")
    
    assert first['id'] == 1
    assert second['id'] == 2
    assert third['id'] == 3