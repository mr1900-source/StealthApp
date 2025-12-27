from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from ..models.save import SaveCategory, SaveSourceType, SaveVisibility
from .user import UserPublic


class SaveCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: SaveCategory = SaveCategory.OTHER
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    location_name: Optional[str] = None
    address: Optional[str] = None
    source_url: Optional[str] = None
    source_type: SaveSourceType = SaveSourceType.MANUAL
    image_url: Optional[str] = None
    event_date: Optional[datetime] = None
    tags: Optional[str] = None
    visibility: SaveVisibility = SaveVisibility.FRIENDS


class SaveUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[SaveCategory] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    location_name: Optional[str] = None
    address: Optional[str] = None
    image_url: Optional[str] = None
    event_date: Optional[datetime] = None
    tags: Optional[str] = None
    visibility: Optional[SaveVisibility] = None


class SaveResponse(BaseModel):
    id: int
    user_id: int
    title: str
    description: Optional[str]
    category: SaveCategory
    location_lat: Optional[float]
    location_lng: Optional[float]
    location_name: Optional[str]
    address: Optional[str]
    source_url: Optional[str]
    source_type: SaveSourceType
    image_url: Optional[str]
    event_date: Optional[datetime]
    tags: Optional[str]
    visibility: SaveVisibility
    created_at: datetime
    interest_count: int = 0
    user_interested: bool = False  # Whether current user is interested
    user: Optional[UserPublic] = None  # For feed items
    
    class Config:
        from_attributes = True


class ParsedLinkResponse(BaseModel):
    """Response from parsing a URL."""
    success: bool
    source_type: SaveSourceType
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[SaveCategory] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    location_name: Optional[str] = None
    address: Optional[str] = None
    image_url: Optional[str] = None
    event_date: Optional[datetime] = None
    error: Optional[str] = None
