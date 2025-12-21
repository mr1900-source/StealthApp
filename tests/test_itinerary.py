"""Pytest tests for the itinerary generation module.

These tests mock the Gemini call so they run quickly and don't require network.
"""

import pytest
from app import itinerary

# Used Claue for help avoiding a network call by using monkeypatch
def test_generate_itinerary_success(monkeypatch):
    """Test successful itinerary generation."""
    user_prompt = 'date night 6-9pm in downtown Manhattan, Italian, $60pp'

    def fake_call(api_params):
        return 'Day 1\n6:00 PM - Arrival\n6:30 PM - Dinner at Trattoria (approx $50pp)'

    monkeypatch.setattr(itinerary, '_call_gemini_api', fake_call)

    result = itinerary.generate_itinerary(user_prompt)
    assert '6:00 PM' in result or 'dinner' in result.lower()
    assert 'Trattoria' in result

# Test that code is raising correct exceptions to empty prompts
def test_generate_itinerary_empty_prompt():
    """Test that empty prompt raises ItineraryError."""
    with pytest.raises(itinerary.ItineraryError):
        itinerary.generate_itinerary('')

# Test that code is raising correct exceptions to white space prompts
def test_generate_itinerary_whitespace_prompt():
    """Test that whitespace-only prompt raises ItineraryError."""
    with pytest.raises(itinerary.ItineraryError):
        itinerary.generate_itinerary('   ')

# Test function that formats data for API
def test_build_messages():
    """Test that _build_messages creates proper structure."""
    prompt = "Weekend in Paris"
    result = itinerary._build_messages(prompt)
    
    assert 'system_instruction' in result
    assert 'user_content' in result
    assert 'Paris' in result['user_content']
    assert 'itinerary' in result['system_instruction'].lower()

# Test that API key is not missing
def test_call_gemini_api_missing_key(monkeypatch):
    """Test that missing API key raises ItineraryError."""
    monkeypatch.setenv('GEMINI_API_KEY', '')
    monkeypatch.setattr(itinerary, 'GEMINI_API_KEY', '')
    
    api_params = {
        'system_instruction': 'test',
        'user_content': 'test'
    }
    
    with pytest.raises(itinerary.ItineraryError, match='GEMINI_API_KEY not set'):
        itinerary._call_gemini_api(api_params)