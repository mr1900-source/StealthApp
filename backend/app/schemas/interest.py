from pydantic import BaseModel
from datetime import datetime
from typing import List
from .user import UserPublic
from .save import SaveResponse


class InterestCreate(BaseModel):
    save_id: int


class InterestResponse(BaseModel):
    id: int
    user_id: int
    save_id: int
    created_at: datetime
    user: UserPublic
    
    class Config:
        from_attributes = True


class MatchResponse(BaseModel):
    """A save where multiple friends are interested."""
    save: SaveResponse
    interested_friends: List[UserPublic]
    total_interested: int
