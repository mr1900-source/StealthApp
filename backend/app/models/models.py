"""
Database Models

Core entities:
- User
- Idea (core object)
- Audience (internal - set of users who can see an idea)
- Group (optional named shortcut to an audience)
- Plan (action from an idea)
- Reaction (per idea, per user)
- Friendship (user connections)
"""

from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime, 
    ForeignKey, Table, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


# =============================================================================
# ENUMS
# =============================================================================

class IdeaCategory(str, enum.Enum):
    RESTAURANT = "restaurant"
    BAR = "bar"
    CAFE = "cafe"
    EVENT = "event"
    ACTIVITY = "activity"
    NATURE = "nature"
    TRIP = "trip"
    OTHER = "other"


class IdeaStatus(str, enum.Enum):
    IDEA = "idea"
    PLANNED = "planned"
    COMPLETED = "completed"


class ReactionType(str, enum.Enum):
    INTERESTED = "interested"
    MAYBE = "maybe"
    NO = "no"


class PlanStatus(str, enum.Enum):
    UPCOMING = "upcoming"
    COMPLETED = "completed"
    CANCELED = "canceled"


class FriendshipStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"


# =============================================================================
# ASSOCIATION TABLES
# =============================================================================

# Audience members (which users are in an audience)
audience_members = Table(
    "audience_members",
    Base.metadata,
    Column("audience_id", Integer, ForeignKey("audiences.id"), primary_key=True),
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
)

# Group members
group_members = Table(
    "group_members",
    Base.metadata,
    Column("group_id", Integer, ForeignKey("groups.id"), primary_key=True),
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
)

# Plan participants
plan_participants = Table(
    "plan_participants",
    Base.metadata,
    Column("plan_id", Integer, ForeignKey("plans.id"), primary_key=True),
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
)


# =============================================================================
# MODELS
# =============================================================================

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=False)
    name = Column(String(100), nullable=True)
    profile_photo = Column(String(500), nullable=True)
    bio = Column(String(200), nullable=True)
    
    # Preferences (JSON-like, stored as text for simplicity)
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    notifications_enabled = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    created_ideas = relationship("Idea", back_populates="creator")
    reactions = relationship("Reaction", back_populates="user")
    created_groups = relationship("Group", back_populates="creator")
    
    # Friendships (self-referential)
    sent_friend_requests = relationship(
        "Friendship",
        foreign_keys="Friendship.user_id",
        back_populates="user"
    )
    received_friend_requests = relationship(
        "Friendship",
        foreign_keys="Friendship.friend_id",
        back_populates="friend"
    )


class Friendship(Base):
    """
    Friend connections between users.
    user_id sends request to friend_id.
    """
    __tablename__ = "friendships"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    friend_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(SQLEnum(FriendshipStatus), default=FriendshipStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", foreign_keys=[user_id], back_populates="sent_friend_requests")
    friend = relationship("User", foreign_keys=[friend_id], back_populates="received_friend_requests")


class Audience(Base):
    """
    Internal concept - a set of users who can see an idea.
    Users never see this term in the UI.
    May or may not be linked to a named group.
    """
    __tablename__ = "audiences"
    
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    members = relationship("User", secondary=audience_members)
    group = relationship("Group", back_populates="audience")
    idea = relationship("Idea", back_populates="audience", uselist=False)


class Group(Base):
    """
    Optional named shortcut to a persistent audience.
    Groups are explicit, intentional creations - never auto-created.
    """
    __tablename__ = "groups"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    cover_image = Column(String(500), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    creator = relationship("User", back_populates="created_groups")
    members = relationship("User", secondary=group_members)
    audience = relationship("Audience", back_populates="group", uselist=False)
    plans = relationship("Plan", back_populates="group")


class Idea(Base):
    """
    CORE OBJECT - Everything revolves around this.
    
    Ideas can exist:
    - Without a group (private or shared with individuals)
    - With multiple people
    - With or without a named group
    """
    __tablename__ = "ideas"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    source_link = Column(String(1000), nullable=True)
    category = Column(SQLEnum(IdeaCategory), nullable=False)
    notes = Column(Text, nullable=True)
    
    # Location (optional)
    location_name = Column(String(300), nullable=True)
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    
    # Status flow: idea -> planned -> completed
    status = Column(SQLEnum(IdeaStatus), default=IdeaStatus.IDEA)
    
    # Creator
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Audience (who can see this idea)
    audience_id = Column(Integer, ForeignKey("audiences.id"), nullable=False)
    
    # Relationships
    creator = relationship("User", back_populates="created_ideas")
    audience = relationship("Audience", back_populates="idea")
    images = relationship("IdeaImage", back_populates="idea", cascade="all, delete-orphan")
    reactions = relationship("Reaction", back_populates="idea", cascade="all, delete-orphan")
    plans = relationship("Plan", back_populates="idea")


class IdeaImage(Base):
    """
    Images for an idea (can have multiple).
    """
    __tablename__ = "idea_images"
    
    id = Column(Integer, primary_key=True, index=True)
    idea_id = Column(Integer, ForeignKey("ideas.id"), nullable=False)
    url = Column(String(1000), nullable=False)
    position = Column(Integer, default=0)  # For ordering
    
    idea = relationship("Idea", back_populates="images")


class Reaction(Base):
    """
    User reaction to an idea.
    One reaction per user per idea.
    """
    __tablename__ = "reactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    idea_id = Column(Integer, ForeignKey("ideas.id"), nullable=False)
    reaction_type = Column(SQLEnum(ReactionType), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    user = relationship("User", back_populates="reactions")
    idea = relationship("Idea", back_populates="reactions")


class Plan(Base):
    """
    An actionable plan created from an idea.
    Plans are created from ideas + audience, not groups.
    Group is optional (for continuity/history).
    """
    __tablename__ = "plans"
    
    id = Column(Integer, primary_key=True, index=True)
    idea_id = Column(Integer, ForeignKey("ideas.id"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)  # Optional
    
    # Schedule
    date = Column(String(20), nullable=False)  # YYYY-MM-DD
    time = Column(String(10), nullable=True)   # HH:MM
    
    # Location (inherited from idea or edited)
    location_name = Column(String(300), nullable=True)
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    
    # Details
    notes = Column(Text, nullable=True)
    roles = Column(Text, nullable=True)  # JSON string: {"driver": "John", "reservation": "Jane"}
    
    status = Column(SQLEnum(PlanStatus), default=PlanStatus.UPCOMING)
    
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    idea = relationship("Idea", back_populates="plans")
    group = relationship("Group", back_populates="plans")
    participants = relationship("User", secondary=plan_participants)


class PlanRating(Base):
    """
    Post-experience rating for completed plans.
    """
    __tablename__ = "plan_ratings"
    
    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1 = thumbs down, 2 = thumbs up (or 1-5 stars)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# =============================================================================
# CACHE TABLE (for Google Places, link parsing, etc.)
# =============================================================================

class Cache(Base):
    """
    General purpose cache for external API results.
    """
    __tablename__ = "cache"
    
    id = Column(Integer, primary_key=True, index=True)
    cache_key = Column(String(500), unique=True, index=True, nullable=False)
    cache_value = Column(Text, nullable=False)  # JSON string
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
