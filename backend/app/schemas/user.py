from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    name: Optional[str] = None
    school: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    name: Optional[str]
    school: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserPublic(BaseModel):
    """Public user info for feed items."""
    id: int
    username: str
    name: Optional[str]
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
