"""Utility functions for the application."""

from typing import Optional, Dict, Any


def parse_budget(budget_str: Optional[str]) -> Optional[str]:
    """
    Convert budget string/number to category.
    
    Args:
        budget_str: Budget as string (e.g., "500", "$500", "low")
    
    Returns:
        Budget category: "low", "medium", "high", or None
    """
    if not budget_str:
        return None
    
    # If already a category
    if budget_str.lower() in ["low", "medium", "high"]:
        return budget_str.lower()
    
    # Try to parse as number
    try:
        amount = float(str(budget_str).replace("$", "").replace(",", ""))
        
        # Categorize based on amount
        if amount < 300:
            return "low"
        elif amount < 1000:
            return "medium"
        else:
            return "high"
    except (ValueError, AttributeError):
        return None


def extract_interests_list(interests_str: Optional[str]) -> list:
    """
    Convert interests string to list of keywords.
    
    Args:
        interests_str: Comma or space separated interests
    
    Returns:
        List of interest keywords
    """
    if not interests_str:
        return []
    
    # Split by comma or space
    interests = interests_str.replace(",", " ").split()
    
    # Clean and deduplicate
    cleaned = [i.strip().lower() for i in interests if i.strip()]
    return list(set(cleaned))


def format_duration_for_search(duration: str) -> Dict[str, Any]:
    """
    Convert duration string to search parameters.
    
    Args:
        duration: Duration string (e.g., "weekend", "3-5 days")
    
    Returns:
        Dictionary with 'days' and 'type'
    """
    duration_lower = duration.lower()
    
    duration_map = {
        "half-day": {"days": 0.5, "type": "short"},
        "full-day": {"days": 1, "type": "day-trip"},
        "weekend": {"days": 2, "type": "weekend"},
        "3-5 days": {"days": 4, "type": "short-trip"},
        "week": {"days": 7, "type": "week"},
        "2-weeks": {"days": 14, "type": "long-trip"}
    }
    
    return duration_map.get(duration_lower, {"days": 2, "type": "weekend"})