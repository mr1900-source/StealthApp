from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import relationship
from ..database import Base


class Interest(Base):
    __tablename__ = "interests"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    save_id = Column(Integer, ForeignKey("saves.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    
    # Ensure one interest per user per save
    __table_args__ = (
        UniqueConstraint("user_id", "save_id", name="unique_user_save_interest"),
    )
    
    # Relationships
    user = relationship("User", back_populates="interests")
    save = relationship("Save", back_populates="interests")
