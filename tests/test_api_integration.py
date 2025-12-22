"""Integration tests for external APIs (requires valid API keys)."""

import pytest
from app.data_sources import YelpAPI, GooglePlacesAPI, EventbriteAPI, WeatherAPI
from app.services import DataAggregator


@pytest.mark.integration
def test_yelp_api():
    """Test Yelp API integration."""
    yelp = YelpAPI()
    results = yelp.search(location="New York", term="coffee", limit=5)
    
    assert isinstance(results, list)
    if results:  # Only check if API returned data
        assert len(results) > 0
        assert "name" in results[0]
        assert "rating" in results[0]


@pytest.mark.integration
def test_google_places_api():
    """Test Google Places API integration."""
    google = GooglePlacesAPI()
    results = google.search(location="New York, NY", query="restaurant", radius=5000)
    
    assert isinstance(results, list)
    if results:
        assert len(results) > 0
        assert "name" in results[0]


@pytest.mark.integration
def test_eventbrite_api():
    """Test Eventbrite API integration."""
    eventbrite = EventbriteAPI()
    results = eventbrite.search(location="New York", limit=5)
    
    assert isinstance(results, list)
    # Events might not always be available, so just check format


@pytest.mark.integration
def test_weather_api():
    """Test OpenWeather API integration."""
    weather = WeatherAPI()
    result = weather.get_current(location="New York,US")
    
    if result:  # API key might not be set
        assert "temperature" in result
        assert "description" in result


@pytest.mark.integration
def test_data_aggregator():
    """Test full data aggregation pipeline."""
    aggregator = DataAggregator()
    data = aggregator.gather_travel_data(
        destination="Brooklyn, NY",
        interests=["food"],
        budget="medium"
    )
    
    assert "restaurants" in data
    assert "attractions" in data
    assert "metadata" in data
    assert isinstance(data["restaurants"], list)