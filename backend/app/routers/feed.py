"""
Feed Router

Home feed - group-agnostic by default.
Shows all ideas where user is creator or in audience.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional

from app.database import get_db
from app.models.models import (
    User, Idea, Group, audience_members, group_members
)
from app.schemas.schemas import IdeaCard, HomeFeedResponse
from app.auth import get_current_user

router = APIRouter()


def build_idea_card(idea, current_user):
    """Build compact idea card."""
    from app.models.models import ReactionType
    
    primary_image = idea.images[0].url if idea.images else None
    
    # Reaction summary
    interested = sum(1 for r in idea.reactions if r.reaction_type == ReactionType.INTERESTED)
    maybe = sum(1 for r in idea.reactions if r.reaction_type == ReactionType.MAYBE)
    no = sum(1 for r in idea.reactions if r.reaction_type == ReactionType.NO)
    
    # User's reaction
    my_reaction = None
    for r in idea.reactions:
        if r.user_id == current_user.id:
            my_reaction = r.reaction_type
            break
    
    return {
        "id": idea.id,
        "title": idea.title,
        "category": idea.category,
        "location_name": idea.location_name,
        "status": idea.status,
        "created_at": idea.created_at,
        "creator": idea.creator,
        "primary_image": primary_image,
        "reactions": {
            "interested": interested,
            "maybe": maybe,
            "no": no
        },
        "my_reaction": my_reaction
    }


@router.get("/", response_model=HomeFeedResponse)
def get_home_feed(
    filter_type: str = "all",  # "all", "shared_with_me", "group"
    group_id: Optional[int] = None,
    category: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get home feed.
    
    Filters:
    - all: All ideas user created or is in audience for
    - shared_with_me: Only ideas shared with user (not created by them)
    - group: Only ideas shared with a specific group
    """
    
    # Base query: ideas where user is in audience
    audience_idea_ids = db.query(audience_members.c.audience_id).filter(
        audience_members.c.user_id == current_user.id
    ).subquery()
    
    if filter_type == "all":
        # Ideas created by user OR user is in audience
        query = db.query(Idea).filter(
            or_(
                Idea.created_by == current_user.id,
                Idea.audience_id.in_(
                    db.query(audience_members.c.audience_id).filter(
                        audience_members.c.user_id == current_user.id
                    )
                )
            )
        )
    
    elif filter_type == "shared_with_me":
        # Only ideas shared with user (not created by them)
        query = db.query(Idea).filter(
            Idea.created_by != current_user.id,
            Idea.audience_id.in_(
                db.query(audience_members.c.audience_id).filter(
                    audience_members.c.user_id == current_user.id
                )
            )
        )
    
    elif filter_type == "group":
        # Only ideas shared with a specific group
        if not group_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="group_id required for group filter"
            )
        
        # Verify user is member of group
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group or current_user not in group.members:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this group"
            )
        
        # Ideas where audience is linked to this group
        from app.models.models import Audience
        query = db.query(Idea).join(Audience).filter(
            Audience.group_id == group_id
        )
    
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filter_type"
        )
    
    # Apply category filter
    if category:
        query = query.filter(Idea.category == category)
    
    # Order by most recent
    query = query.order_by(Idea.created_at.desc())
    
    # Get total count for pagination
    total = query.count()
    
    # Apply pagination
    ideas = query.offset(offset).limit(limit).all()
    
    return HomeFeedResponse(
        ideas=[build_idea_card(idea, current_user) for idea in ideas],
        has_more=(offset + limit) < total
    )


@router.get("/groups/{group_id}/ideas", response_model=List[IdeaCard])
def get_group_ideas(
    group_id: int,
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get ideas shared with a specific group.
    This is the group's idea feed.
    """
    
    # Verify membership
    group = db.query(Group).filter(Group.id == group_id).first()
    
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    if current_user not in group.members:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this group"
        )
    
    # Get ideas where audience is linked to this group
    from app.models.models import Audience
    query = db.query(Idea).join(Audience).filter(
        Audience.group_id == group_id
    )
    
    if category:
        query = query.filter(Idea.category == category)
    
    ideas = query.order_by(Idea.created_at.desc()).all()
    
    return [build_idea_card(idea, current_user) for idea in ideas]
