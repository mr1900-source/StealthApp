from sqlalchemy import Column, Integer, DateTime, ForeignKey, Enum, UniqueConstraint, func
from sqlalchemy.orm import relationship
from ..database import Base
import enum


class FriendshipStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class Friendship(Base):
    __tablename__ = "friendships"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Who sent the request
    friend_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Who received it
    status = Column(Enum(FriendshipStatus), default=FriendshipStatus.PENDING)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Prevent duplicate requests
    __table_args__ = (
        UniqueConstraint("user_id", "friend_id", name="unique_friendship"),
    )
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="sent_requests")
    friend = relationship("User", foreign_keys=[friend_id], back_populates="received_requests")
