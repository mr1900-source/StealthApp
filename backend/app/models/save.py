from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, func
from sqlalchemy.orm import relationship
from ..database import Base
import enum


class SaveCategory(str, enum.Enum):
    RESTAURANT = "restaurant"
    BAR = "bar"
    CAFE = "cafe"
    CONCERT = "concert"
    EVENT = "event"
    ACTIVITY = "activity"
    TRIP = "trip"
    OTHER = "other"


class SaveSourceType(str, enum.Enum):
    MANUAL = "manual"
    GOOGLE_MAPS = "google_maps"
    INSTAGRAM = "instagram"
    TIKTOK = "tiktok"
    EVENTBRITE = "eventbrite"
    REDDIT = "reddit"
    OTHER_URL = "other_url"


class SaveVisibility(str, enum.Enum):
    PRIVATE = "private"
    FRIENDS = "friends"
    PUBLIC = "public"


class Save(Base):
    __tablename__ = "saves"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Core info
    title = Column(String, nullable=False)  # "El Centro", "Bad Bunny Concert"
    description = Column(String)  # User's notes
    category = Column(Enum(SaveCategory), default=SaveCategory.OTHER)
    
    # Location
    location_lat = Column(Float)
    location_lng = Column(Float)
    location_name = Column(String)  # "Georgetown, DC"
    address = Column(String)
    
    # Source tracking
    source_url = Column(String)  # Original TikTok, article, etc.
    source_type = Column(Enum(SaveSourceType), default=SaveSourceType.MANUAL)
    
    # Media
    image_url = Column(String)  # Cover image
    
    # Event-specific
    event_date = Column(DateTime)  # For concerts, events with specific dates
    
    # Metadata
    tags = Column(String)  # Comma-separated: "date night,cheap eats,groups"
    visibility = Column(Enum(SaveVisibility), default=SaveVisibility.FRIENDS)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="saves")
    interests = relationship("Interest", back_populates="save", cascade="all, delete-orphan")
    
    @property
    def interest_count(self):
        return len(self.interests)
    
    @property
    def tags_list(self):
        if self.tags:
            return [t.strip() for t in self.tags.split(",")]
        return []
