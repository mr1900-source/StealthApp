"""
Users Router

User profiles, search, friends.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List

from app.database import get_db
from app.models.models import User, Friendship, FriendshipStatus
from app.schemas.schemas import (
    UserResponse, UserUpdate, UserSummary, 
    FriendRequest, FriendshipResponse
)
from app.auth import get_current_user

router = APIRouter()


# =============================================================================
# PROFILE
# =============================================================================

@router.get("/me", response_model=UserResponse)
def get_my_profile(current_user: User = Depends(get_current_user)):
    """Get current user's full profile."""
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_my_profile(
    updates: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's profile."""
    
    # Check username uniqueness if being updated
    if updates.username and updates.username != current_user.username:
        existing = db.query(User).filter(User.username == updates.username).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
    
    # Apply updates
    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    
    return current_user


@router.get("/{user_id}", response_model=UserSummary)
def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a user's public profile."""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


@router.get("/search/{query}", response_model=List[UserSummary])
def search_users(
    query: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search users by username or name."""
    
    if len(query) < 2:
        return []
    
    users = db.query(User).filter(
        User.id != current_user.id,
        or_(
            User.username.ilike(f"%{query}%"),
            User.name.ilike(f"%{query}%")
        )
    ).limit(20).all()
    
    return users


# =============================================================================
# FRIENDS
# =============================================================================

@router.get("/me/friends", response_model=List[UserSummary])
def get_my_friends(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's accepted friends."""
    
    # Get friendships where user is either sender or receiver and status is accepted
    friendships = db.query(Friendship).filter(
        Friendship.status == FriendshipStatus.ACCEPTED,
        or_(
            Friendship.user_id == current_user.id,
            Friendship.friend_id == current_user.id
        )
    ).all()
    
    # Extract the friend (the other person in each friendship)
    friend_ids = set()
    for f in friendships:
        if f.user_id == current_user.id:
            friend_ids.add(f.friend_id)
        else:
            friend_ids.add(f.user_id)
    
    friends = db.query(User).filter(User.id.in_(friend_ids)).all()
    
    return friends


@router.post("/me/friends/request", response_model=FriendshipResponse)
def send_friend_request(
    request: FriendRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a friend request by username."""
    
    # Find the user
    friend = db.query(User).filter(User.username == request.friend_username).first()
    
    if not friend:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if friend.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add yourself as a friend"
        )
    
    # Check if friendship already exists
    existing = db.query(Friendship).filter(
        or_(
            and_(Friendship.user_id == current_user.id, Friendship.friend_id == friend.id),
            and_(Friendship.user_id == friend.id, Friendship.friend_id == current_user.id)
        )
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Friend request already exists"
        )
    
    # Create friendship
    friendship = Friendship(
        user_id=current_user.id,
        friend_id=friend.id,
        status=FriendshipStatus.PENDING
    )
    
    db.add(friendship)
    db.commit()
    db.refresh(friendship)
    
    return friendship


@router.get("/me/friends/requests", response_model=List[FriendshipResponse])
def get_friend_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get pending friend requests received."""
    
    requests = db.query(Friendship).filter(
        Friendship.friend_id == current_user.id,
        Friendship.status == FriendshipStatus.PENDING
    ).all()
    
    return requests


@router.post("/me/friends/accept/{friendship_id}")
def accept_friend_request(
    friendship_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Accept a friend request."""
    
    friendship = db.query(Friendship).filter(
        Friendship.id == friendship_id,
        Friendship.friend_id == current_user.id,
        Friendship.status == FriendshipStatus.PENDING
    ).first()
    
    if not friendship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friend request not found"
        )
    
    friendship.status = FriendshipStatus.ACCEPTED
    db.commit()
    
    return {"message": "Friend request accepted"}


@router.delete("/me/friends/{friend_id}")
def remove_friend(
    friend_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a friend or decline a request."""
    
    friendship = db.query(Friendship).filter(
        or_(
            and_(Friendship.user_id == current_user.id, Friendship.friend_id == friend_id),
            and_(Friendship.user_id == friend_id, Friendship.friend_id == current_user.id)
        )
    ).first()
    
    if not friendship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friendship not found"
        )
    
    db.delete(friendship)
    db.commit()
    
    return {"message": "Friend removed"}
