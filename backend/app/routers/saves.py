from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from ..database import get_db
from ..models.user import User
from ..models.save import Save, SaveCategory
from ..models.interest import Interest
from ..schemas.save import SaveCreate, SaveUpdate, SaveResponse, ParsedLinkResponse
from ..schemas.user import UserPublic
from ..utils.auth import get_current_user
from ..services.link_parser import LinkParser

router = APIRouter(prefix="/saves", tags=["saves"])


def _save_to_response(save: Save, current_user_id: int) -> SaveResponse:
    """Convert Save model to SaveResponse with computed fields."""
    user_interested = any(i.user_id == current_user_id for i in save.interests)
    
    return SaveResponse(
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
        user=UserPublic(id=save.user.id, username=save.user.username, name=save.user.name) if save.user else None
    )


@router.post("", response_model=SaveResponse, status_code=status.HTTP_201_CREATED)
def create_save(
    save_data: SaveCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new save."""
    save = Save(
        user_id=current_user.id,
        title=save_data.title,
        description=save_data.description,
        category=save_data.category,
        location_lat=save_data.location_lat,
        location_lng=save_data.location_lng,
        location_name=save_data.location_name,
        address=save_data.address,
        source_url=save_data.source_url,
        source_type=save_data.source_type,
        image_url=save_data.image_url,
        event_date=save_data.event_date,
        tags=save_data.tags,
        visibility=save_data.visibility
    )
    
    db.add(save)
    db.commit()
    db.refresh(save)
    
    return _save_to_response(save, current_user.id)


@router.get("", response_model=List[SaveResponse])
def get_my_saves(
    category: Optional[SaveCategory] = None,
    limit: int = Query(default=50, le=100),
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's saves."""
    query = db.query(Save).options(
        joinedload(Save.interests),
        joinedload(Save.user)
    ).filter(Save.user_id == current_user.id)
    
    if category:
        query = query.filter(Save.category == category)
    
    saves = query.order_by(Save.created_at.desc()).offset(offset).limit(limit).all()
    
    return [_save_to_response(s, current_user.id) for s in saves]


@router.get("/{save_id}", response_model=SaveResponse)
def get_save(
    save_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific save."""
    save = db.query(Save).options(
        joinedload(Save.interests),
        joinedload(Save.user)
    ).filter(Save.id == save_id).first()
    
    if not save:
        raise HTTPException(status_code=404, detail="Save not found")
    
    # Check visibility permissions
    if save.user_id != current_user.id:
        # TODO: Add friend visibility check
        if save.visibility.value == "private":
            raise HTTPException(status_code=403, detail="Not authorized to view this save")
    
    return _save_to_response(save, current_user.id)


@router.patch("/{save_id}", response_model=SaveResponse)
def update_save(
    save_id: int,
    save_data: SaveUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a save."""
    save = db.query(Save).filter(Save.id == save_id, Save.user_id == current_user.id).first()
    
    if not save:
        raise HTTPException(status_code=404, detail="Save not found")
    
    # Update only provided fields
    update_data = save_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(save, field, value)
    
    db.commit()
    db.refresh(save)
    
    return _save_to_response(save, current_user.id)


@router.delete("/{save_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_save(
    save_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a save."""
    save = db.query(Save).filter(Save.id == save_id, Save.user_id == current_user.id).first()
    
    if not save:
        raise HTTPException(status_code=404, detail="Save not found")
    
    db.delete(save)
    db.commit()


@router.post("/parse-link", response_model=ParsedLinkResponse)
async def parse_link(
    url: str,
    current_user: User = Depends(get_current_user)
):
    """Parse a URL to extract place/event information for auto-fill."""
    return await LinkParser.parse(url)
