"""
Pydantic Schemas

Request and response models for API validation.
"""

from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum


# =============================================================================
# ENUMS (mirroring database enums)
# =============================================================================

class IdeaCategory(str, Enum):
    RESTAURANT = "restaurant"
    BAR = "bar"
    CAFE = "cafe"
    EVENT = "event"
    ACTIVITY = "activity"
    NATURE = "nature"
    TRIP = "trip"
    OTHER = "other"


class IdeaStatus(str, Enum):
    IDEA = "idea"
    PLANNED = "planned"
    COMPLETED = "completed"


class ReactionType(str, Enum):
    INTERESTED = "interested"
    MAYBE = "maybe"
    NO = "no"


class PlanStatus(str, Enum):
    UPCOMING = "upcoming"
    COMPLETED = "completed"
    CANCELED = "canceled"


class FriendshipStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"


# =============================================================================
# USER SCHEMAS
# =============================================================================

class UserBase(BaseModel):
    email: EmailStr
    username: Optional[str] = None
    name: Optional[str] = None


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    username: Optional[str] = None
    name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    username: Optional[str] = None
    name: Optional[str] = None
    profile_photo: Optional[str] = None
    bio: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    notifications_enabled: Optional[bool] = None


class UserResponse(BaseModel):
    id: int
    email: str
    username: Optional[str]
    name: Optional[str]
    profile_photo: Optional[str]
    bio: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserSummary(BaseModel):
    """Minimal user info for lists, avatars, etc."""
    id: int
    name: Optional[str]
    username: Optional[str]
    profile_photo: Optional[str]
    
    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# =============================================================================
# FRIENDSHIP SCHEMAS
# =============================================================================

class FriendRequest(BaseModel):
    friend_username: str


class FriendshipResponse(BaseModel):
    id: int
    user: UserSummary
    friend: UserSummary
    status: FriendshipStatus
    created_at: datetime
    
    class Config:
        from_attributes = True


# =============================================================================
# GROUP SCHEMAS
# =============================================================================

class GroupCreate(BaseModel):
    name: str
    cover_image: Optional[str] = None
    member_ids: Optional[List[int]] = []


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    cover_image: Optional[str] = None


class GroupResponse(BaseModel):
    id: int
    name: str
    cover_image: Optional[str]
    created_by: int
    created_at: datetime
    members: List[UserSummary]
    member_count: int = 0
    
    class Config:
        from_attributes = True


class GroupSummary(BaseModel):
    """Minimal group info for lists."""
    id: int
    name: str
    cover_image: Optional[str]
    member_count: int = 0
    
    class Config:
        from_attributes = True


# =============================================================================
# IDEA SCHEMAS
# =============================================================================

class IdeaImageResponse(BaseModel):
    id: int
    url: str
    position: int
    
    class Config:
        from_attributes = True


class ReactionSummary(BaseModel):
    interested: int = 0
    maybe: int = 0
    no: int = 0


class IdeaCreate(BaseModel):
    title: str
    category: IdeaCategory
    source_link: Optional[str] = None
    notes: Optional[str] = None
    location_name: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    images: Optional[List[str]] = []  # List of image URLs
    
    # Sharing - people first
    share_with_user_ids: Optional[List[int]] = []
    share_with_group_ids: Optional[List[int]] = []


class IdeaUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[IdeaCategory] = None
    source_link: Optional[str] = None
    notes: Optional[str] = None
    location_name: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    images: Optional[List[str]] = None
    
    # Update sharing
    add_user_ids: Optional[List[int]] = []
    remove_user_ids: Optional[List[int]] = []
    add_group_ids: Optional[List[int]] = []
    remove_group_ids: Optional[List[int]] = []


class IdeaResponse(BaseModel):
    id: int
    title: str
    category: IdeaCategory
    source_link: Optional[str]
    notes: Optional[str]
    location_name: Optional[str]
    location_lat: Optional[float]
    location_lng: Optional[float]
    status: IdeaStatus
    created_by: int
    created_at: datetime
    updated_at: datetime
    
    creator: UserSummary
    images: List[IdeaImageResponse]
    reactions: ReactionSummary
    my_reaction: Optional[ReactionType] = None
    audience_count: int = 0
    
    # Which groups this idea is shared with (if any)
    shared_groups: List[GroupSummary] = []
    
    class Config:
        from_attributes = True


class IdeaCard(BaseModel):
    """Compact idea for lists/feeds."""
    id: int
    title: str
    category: IdeaCategory
    location_name: Optional[str]
    status: IdeaStatus
    created_at: datetime
    
    creator: UserSummary
    primary_image: Optional[str] = None
    reactions: ReactionSummary
    my_reaction: Optional[ReactionType] = None
    
    class Config:
        from_attributes = True


# =============================================================================
# REACTION SCHEMAS
# =============================================================================

class ReactionCreate(BaseModel):
    reaction_type: ReactionType


class ReactionResponse(BaseModel):
    id: int
    user_id: int
    idea_id: int
    reaction_type: ReactionType
    created_at: datetime
    
    class Config:
        from_attributes = True


# =============================================================================
# PLAN SCHEMAS
# =============================================================================

class PlanCreate(BaseModel):
    idea_id: int
    date: str  # YYYY-MM-DD
    time: Optional[str] = None  # HH:MM
    group_id: Optional[int] = None
    location_name: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    participant_ids: Optional[List[int]] = []  # Defaults to idea audience if empty
    roles: Optional[dict] = None  # {"driver": "John", "reservation": "Jane"}
    notes: Optional[str] = None


class PlanUpdate(BaseModel):
    date: Optional[str] = None
    time: Optional[str] = None
    location_name: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    participant_ids: Optional[List[int]] = None
    roles: Optional[dict] = None
    notes: Optional[str] = None
    status: Optional[PlanStatus] = None


class PlanResponse(BaseModel):
    id: int
    idea_id: int
    group_id: Optional[int]
    date: str
    time: Optional[str]
    location_name: Optional[str]
    location_lat: Optional[float]
    location_lng: Optional[float]
    notes: Optional[str]
    roles: Optional[dict]
    status: PlanStatus
    created_by: int
    created_at: datetime
    
    idea: IdeaCard
    group: Optional[GroupSummary]
    participants: List[UserSummary]
    
    class Config:
        from_attributes = True


class PlanRatingCreate(BaseModel):
    rating: int  # 1 = thumbs down, 2 = thumbs up
    note: Optional[str] = None


# =============================================================================
# LINK PARSING SCHEMAS
# =============================================================================

class ParsedLinkResponse(BaseModel):
    success: bool
    title: Optional[str] = None
    images: List[str] = []
    location_hint: Optional[str] = None
    source_link: str


# =============================================================================
# PLACES AUTOCOMPLETE SCHEMAS
# =============================================================================

class PlaceResult(BaseModel):
    place_id: str
    name: str
    address: str
    lat: Optional[float] = None
    lng: Optional[float] = None


class PlacesAutocompleteResponse(BaseModel):
    results: List[PlaceResult]


# =============================================================================
# HOME FEED SCHEMAS
# =============================================================================

class HomeFeedFilters(BaseModel):
    filter_type: str = "all"  # "all", "shared_with_me", "group"
    group_id: Optional[int] = None


class HomeFeedResponse(BaseModel):
    ideas: List[IdeaCard]
    has_more: bool = False
