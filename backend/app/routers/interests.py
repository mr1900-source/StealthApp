from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, func
from typing import List
from ..database import get_db
from ..models.user import User
from ..models.save import Save, SaveVisibility
from ..models.interest import Interest
from ..models.friendship import Friendship, FriendshipStatus
from ..schemas.interest import InterestResponse, MatchResponse
from ..schemas.save import SaveResponse
from ..schemas.user import UserPublic
from ..utils.auth import get_current_user

router = APIRouter(prefix="/interests", tags=["interests"])


def get_friend_ids(db: Session, user_id: int) -> set:
    """Helper to get all friend IDs for a user."""
    friendships = db.query(Friendship).filter(
        Friendship.status == FriendshipStatus.ACCEPTED,
        or_(
            Friendship.user_id == user_id,
            Friendship.friend_id == user_id
        )
    ).all()
    
    friend_ids = set()
    for f in friendships:
        if f.user_id == user_id:
            friend_ids.add(f.friend_id)
        else:
            friend_ids.add(f.user_id)
    
    return friend_ids


@router.post("/{save_id}", status_code=status.HTTP_201_CREATED)
def add_interest(
    save_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark 'I'm down' on a save."""
    # Verify save exists and user has access
    save = db.query(Save).filter(Save.id == save_id).first()
    
    if not save:
        raise HTTPException(status_code=404, detail="Save not found")
    
    # Check if user owns the save or is friends with owner
    if save.user_id != current_user.id:
        friend_ids = get_friend_ids(db, current_user.id)
        if save.user_id not in friend_ids and save.visibility != SaveVisibility.PUBLIC:
            raise HTTPException(status_code=403, detail="Cannot access this save")
    
    # Check for existing interest
    existing = db.query(Interest).filter(
        Interest.user_id == current_user.id,
        Interest.save_id == save_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Already marked as interested")
    
    # Create interest
    interest = Interest(user_id=current_user.id, save_id=save_id)
    db.add(interest)
    db.commit()
    
    return {"message": "Interest added"}


@router.delete("/{save_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_interest(
    save_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove 'I'm down' from a save."""
    interest = db.query(Interest).filter(
        Interest.user_id == current_user.id,
        Interest.save_id == save_id
    ).first()
    
    if not interest:
        raise HTTPException(status_code=404, detail="Interest not found")
    
    db.delete(interest)
    db.commit()


@router.get("/{save_id}/users", response_model=List[UserPublic])
def get_interested_users(
    save_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all users interested in a save."""
    save = db.query(Save).filter(Save.id == save_id).first()
    
    if not save:
        raise HTTPException(status_code=404, detail="Save not found")
    
    # Get interests with user info
    interests = db.query(Interest).options(
        joinedload(Interest.user)
    ).filter(Interest.save_id == save_id).all()
    
    return [
        UserPublic(id=i.user.id, username=i.user.username, name=i.user.name)
        for i in interests
    ]


@router.get("/matches", response_model=List[MatchResponse])
def get_matches(
    min_interested: int = 2,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get saves where the current user and at least one friend are both interested.
    This is the core "match" functionality - finding shared intent.
    """
    friend_ids = get_friend_ids(db, current_user.id)
    
    if not friend_ids:
        return []
    
    # Find saves where current user is interested
    my_interests = db.query(Interest.save_id).filter(
        Interest.user_id == current_user.id
    ).subquery()
    
    # Find saves where at least one friend is also interested
    saves_with_friend_interest = db.query(Save).options(
        joinedload(Save.interests).joinedload(Interest.user),
        joinedload(Save.user)
    ).join(
        Interest, Save.id == Interest.save_id
    ).filter(
        Save.id.in_(my_interests),
        Interest.user_id.in_(friend_ids)
    ).distinct().all()
    
    # Build response with interested friends info
    matches = []
    for save in saves_with_friend_interest:
        interested_friends = [
            UserPublic(id=i.user.id, username=i.user.username, name=i.user.name)
            for i in save.interests
            if i.user_id in friend_ids
        ]
        
        total_interested = len(save.interests)
        
        if len(interested_friends) >= (min_interested - 1):  # -1 because user is also interested
            matches.append(MatchResponse(
                save=SaveResponse(
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
                    interest_count=total_interested,
                    user_interested=True,
                    user=UserPublic(id=save.user.id, username=save.user.username, name=save.user.name)
                ),
                interested_friends=interested_friends,
                total_interested=total_interested
            ))
    
    # Sort by number of interested friends
    matches.sort(key=lambda m: len(m.interested_friends), reverse=True)
    
    return matches


@router.get("/my", response_model=List[SaveResponse])
def get_my_interests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all saves the current user is interested in."""
    interests = db.query(Interest).options(
        joinedload(Interest.save).joinedload(Save.user),
        joinedload(Interest.save).joinedload(Save.interests)
    ).filter(Interest.user_id == current_user.id).all()
    
    result = []
    for interest in interests:
        save = interest.save
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
            user_interested=True,
            user=UserPublic(id=save.user.id, username=save.user.username, name=save.user.name) if save.user else None
        ))
    
    return result
