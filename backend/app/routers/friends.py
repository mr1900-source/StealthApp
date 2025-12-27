from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_
from typing import List
from ..database import get_db
from ..models.user import User
from ..models.save import Save, SaveVisibility
from ..models.friendship import Friendship, FriendshipStatus
from ..schemas.user import UserResponse, UserPublic
from ..schemas.save import SaveResponse
from ..utils.auth import get_current_user

router = APIRouter(prefix="/friends", tags=["friends"])


@router.get("", response_model=List[UserPublic])
def get_friends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of accepted friends."""
    # Find all accepted friendships where user is either sender or receiver
    friendships = db.query(Friendship).filter(
        Friendship.status == FriendshipStatus.ACCEPTED,
        or_(
            Friendship.user_id == current_user.id,
            Friendship.friend_id == current_user.id
        )
    ).all()
    
    # Extract friend user objects
    friend_ids = set()
    for f in friendships:
        if f.user_id == current_user.id:
            friend_ids.add(f.friend_id)
        else:
            friend_ids.add(f.user_id)
    
    friends = db.query(User).filter(User.id.in_(friend_ids)).all()
    
    return [UserPublic(id=f.id, username=f.username, name=f.name) for f in friends]


@router.get("/requests/pending", response_model=List[UserPublic])
def get_pending_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get pending friend requests received."""
    requests = db.query(Friendship).filter(
        Friendship.friend_id == current_user.id,
        Friendship.status == FriendshipStatus.PENDING
    ).all()
    
    requesters = db.query(User).filter(
        User.id.in_([r.user_id for r in requests])
    ).all()
    
    return [UserPublic(id=u.id, username=u.username, name=u.name) for u in requesters]


@router.post("/request/{user_id}", status_code=status.HTTP_201_CREATED)
def send_friend_request(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a friend request to another user."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot friend yourself")
    
    # Check if target user exists
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check for existing friendship/request in either direction
    existing = db.query(Friendship).filter(
        or_(
            and_(Friendship.user_id == current_user.id, Friendship.friend_id == user_id),
            and_(Friendship.user_id == user_id, Friendship.friend_id == current_user.id)
        )
    ).first()
    
    if existing:
        if existing.status == FriendshipStatus.ACCEPTED:
            raise HTTPException(status_code=400, detail="Already friends")
        elif existing.status == FriendshipStatus.PENDING:
            raise HTTPException(status_code=400, detail="Friend request already pending")
        else:
            # Re-send rejected request
            existing.status = FriendshipStatus.PENDING
            db.commit()
            return {"message": "Friend request sent"}
    
    # Create new request
    friendship = Friendship(
        user_id=current_user.id,
        friend_id=user_id,
        status=FriendshipStatus.PENDING
    )
    
    db.add(friendship)
    db.commit()
    
    return {"message": "Friend request sent"}


@router.post("/accept/{user_id}")
def accept_friend_request(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Accept a pending friend request."""
    request = db.query(Friendship).filter(
        Friendship.user_id == user_id,
        Friendship.friend_id == current_user.id,
        Friendship.status == FriendshipStatus.PENDING
    ).first()
    
    if not request:
        raise HTTPException(status_code=404, detail="No pending request from this user")
    
    request.status = FriendshipStatus.ACCEPTED
    db.commit()
    
    return {"message": "Friend request accepted"}


@router.post("/reject/{user_id}")
def reject_friend_request(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reject a pending friend request."""
    request = db.query(Friendship).filter(
        Friendship.user_id == user_id,
        Friendship.friend_id == current_user.id,
        Friendship.status == FriendshipStatus.PENDING
    ).first()
    
    if not request:
        raise HTTPException(status_code=404, detail="No pending request from this user")
    
    request.status = FriendshipStatus.REJECTED
    db.commit()
    
    return {"message": "Friend request rejected"}


@router.delete("/{user_id}")
def remove_friend(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a friend."""
    friendship = db.query(Friendship).filter(
        Friendship.status == FriendshipStatus.ACCEPTED,
        or_(
            and_(Friendship.user_id == current_user.id, Friendship.friend_id == user_id),
            and_(Friendship.user_id == user_id, Friendship.friend_id == current_user.id)
        )
    ).first()
    
    if not friendship:
        raise HTTPException(status_code=404, detail="Friendship not found")
    
    db.delete(friendship)
    db.commit()
    
    return {"message": "Friend removed"}


@router.get("/feed", response_model=List[SaveResponse])
def get_friends_feed(
    limit: int = Query(default=50, le=100),
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get saves from friends (the main feed)."""
    # Get friend IDs
    friendships = db.query(Friendship).filter(
        Friendship.status == FriendshipStatus.ACCEPTED,
        or_(
            Friendship.user_id == current_user.id,
            Friendship.friend_id == current_user.id
        )
    ).all()
    
    friend_ids = set()
    for f in friendships:
        if f.user_id == current_user.id:
            friend_ids.add(f.friend_id)
        else:
            friend_ids.add(f.user_id)
    
    if not friend_ids:
        return []
    
    # Get saves from friends that are visible to friends
    saves = db.query(Save).options(
        joinedload(Save.interests),
        joinedload(Save.user)
    ).filter(
        Save.user_id.in_(friend_ids),
        Save.visibility.in_([SaveVisibility.FRIENDS, SaveVisibility.PUBLIC])
    ).order_by(Save.created_at.desc()).offset(offset).limit(limit).all()
    
    # Convert to response with interest info
    result = []
    for save in saves:
        user_interested = any(i.user_id == current_user.id for i in save.interests)
        result.append(SaveResponse(
            id=save.id,
            user_id=save.user_id,
            title=save.title,
            description=save.description,
            category=save.category,
            location_lat=save.location_lat,
            location_lng=save.location_lng,
            location_name=save.location_name,
            address=save.address,
            source_url=save.source_url,
            source_type=save.source_type,
            image_url=save.image_url,
            event_date=save.event_date,
            tags=save.tags,
            visibility=save.visibility,
            created_at=save.created_at,
            interest_count=len(save.interests),
            user_interested=user_interested,
            user=UserPublic(id=save.user.id, username=save.user.username, name=save.user.name)
        ))
    
    return result


@router.get("/search", response_model=List[UserPublic])
def search_users(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search for users by username or name."""
    users = db.query(User).filter(
        User.id != current_user.id,
        or_(
            User.username.ilike(f"%{q}%"),
            User.name.ilike(f"%{q}%")
        )
    ).limit(20).all()
    
    return [UserPublic(id=u.id, username=u.username, name=u.name) for u in users]
