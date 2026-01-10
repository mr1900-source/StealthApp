"""
Plans Router

Plans are created from ideas + audience.
Group is optional (for continuity/history).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from app.database import get_db
from app.models.models import (
    User, Plan, Idea, Group, PlanRating,
    plan_participants, PlanStatus, IdeaStatus
)
from app.schemas.schemas import (
    PlanCreate, PlanUpdate, PlanResponse, PlanRatingCreate, GroupSummary
)
from app.auth import get_current_user

router = APIRouter()


def build_plan_response(plan: Plan, db: Session) -> dict:
    """Build plan response with relationships."""
    
    # Build idea card
    idea = plan.idea
    primary_image = idea.images[0].url if idea.images else None
    idea_card = {
        "id": idea.id,
        "title": idea.title,
        "category": idea.category,
        "location_name": idea.location_name,
        "status": idea.status,
        "created_at": idea.created_at,
        "creator": idea.creator,
        "primary_image": primary_image,
        "reactions": {"interested": 0, "maybe": 0, "no": 0},
        "my_reaction": None
    }
    
    # Build group summary
    group_summary = None
    if plan.group:
        group_summary = {
            "id": plan.group.id,
            "name": plan.group.name,
            "cover_image": plan.group.cover_image,
            "member_count": len(plan.group.members)
        }
    
    # Parse roles
    roles = None
    if plan.roles:
        try:
            roles = json.loads(plan.roles)
        except:
            roles = None
    
    return {
        "id": plan.id,
        "idea_id": plan.idea_id,
        "group_id": plan.group_id,
        "date": plan.date,
        "time": plan.time,
        "location_name": plan.location_name,
        "location_lat": plan.location_lat,
        "location_lng": plan.location_lng,
        "notes": plan.notes,
        "roles": roles,
        "status": plan.status,
        "created_by": plan.created_by,
        "created_at": plan.created_at,
        "idea": idea_card,
        "group": group_summary,
        "participants": plan.participants
    }


# =============================================================================
# CREATE PLAN
# =============================================================================

@router.post("/", response_model=PlanResponse)
def create_plan(
    plan_data: PlanCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a plan from an idea.
    
    Default participants = idea audience (if not specified).
    Group is optional.
    """
    
    # Get the idea
    idea = db.query(Idea).filter(Idea.id == plan_data.idea_id).first()
    
    if not idea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Idea not found"
        )
    
    # Check access
    if idea.created_by != current_user.id:
        if not idea.audience or current_user not in idea.audience.members:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this idea"
            )
    
    # Check group access if specified
    group = None
    if plan_data.group_id:
        group = db.query(Group).filter(Group.id == plan_data.group_id).first()
        if not group or current_user not in group.members:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this group"
            )
    
    # Create plan
    plan = Plan(
        idea_id=idea.id,
        group_id=plan_data.group_id,
        date=plan_data.date,
        time=plan_data.time,
        location_name=plan_data.location_name or idea.location_name,
        location_lat=plan_data.location_lat or idea.location_lat,
        location_lng=plan_data.location_lng or idea.location_lng,
        notes=plan_data.notes,
        roles=json.dumps(plan_data.roles) if plan_data.roles else None,
        created_by=current_user.id
    )
    
    # Set participants
    if plan_data.participant_ids:
        # Use specified participants
        participants = db.query(User).filter(User.id.in_(plan_data.participant_ids)).all()
        for p in participants:
            plan.participants.append(p)
    elif idea.audience:
        # Default to idea audience
        for member in idea.audience.members:
            plan.participants.append(member)
    
    # Always include creator
    if current_user not in plan.participants:
        plan.participants.append(current_user)
    
    # Update idea status
    idea.status = IdeaStatus.PLANNED
    
    db.add(plan)
    db.commit()
    db.refresh(plan)
    
    return build_plan_response(plan, db)


# =============================================================================
# READ PLANS
# =============================================================================

@router.get("/", response_model=List[PlanResponse])
def get_my_plans(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get plans the current user is a participant in."""
    
    query = db.query(Plan).join(plan_participants).filter(
        plan_participants.c.user_id == current_user.id
    )
    
    if status_filter:
        query = query.filter(Plan.status == status_filter)
    
    plans = query.order_by(Plan.date.asc()).all()
    
    return [build_plan_response(p, db) for p in plans]


@router.get("/upcoming", response_model=List[PlanResponse])
def get_upcoming_plans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get upcoming plans."""
    
    plans = db.query(Plan).join(plan_participants).filter(
        plan_participants.c.user_id == current_user.id,
        Plan.status == PlanStatus.UPCOMING
    ).order_by(Plan.date.asc()).all()
    
    return [build_plan_response(p, db) for p in plans]


@router.get("/{plan_id}", response_model=PlanResponse)
def get_plan(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific plan's details."""
    
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
        )
    
    if current_user not in plan.participants:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this plan"
        )
    
    return build_plan_response(plan, db)


# =============================================================================
# UPDATE PLAN
# =============================================================================

@router.patch("/{plan_id}", response_model=PlanResponse)
def update_plan(
    plan_id: int,
    updates: PlanUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a plan."""
    
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
        )
    
    # Only creator can update
    if plan.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the plan creator can update it"
        )
    
    # Update fields
    if updates.date is not None:
        plan.date = updates.date
    if updates.time is not None:
        plan.time = updates.time
    if updates.location_name is not None:
        plan.location_name = updates.location_name
    if updates.location_lat is not None:
        plan.location_lat = updates.location_lat
    if updates.location_lng is not None:
        plan.location_lng = updates.location_lng
    if updates.notes is not None:
        plan.notes = updates.notes
    if updates.roles is not None:
        plan.roles = json.dumps(updates.roles)
    if updates.status is not None:
        plan.status = updates.status
        # Update idea status if plan is completed
        if updates.status == PlanStatus.COMPLETED:
            plan.idea.status = IdeaStatus.COMPLETED
    
    # Update participants
    if updates.participant_ids is not None:
        plan.participants.clear()
        participants = db.query(User).filter(User.id.in_(updates.participant_ids)).all()
        for p in participants:
            plan.participants.append(p)
        # Always include creator
        if current_user not in plan.participants:
            plan.participants.append(current_user)
    
    db.commit()
    db.refresh(plan)
    
    return build_plan_response(plan, db)


# =============================================================================
# DELETE PLAN
# =============================================================================

@router.delete("/{plan_id}")
def delete_plan(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete/cancel a plan."""
    
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
        )
    
    if plan.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the plan creator can delete it"
        )
    
    # Revert idea status
    plan.idea.status = IdeaStatus.IDEA
    
    db.delete(plan)
    db.commit()
    
    return {"message": "Plan deleted"}


# =============================================================================
# POST-EXPERIENCE RATING
# =============================================================================

@router.post("/{plan_id}/rate")
def rate_plan(
    plan_id: int,
    rating_data: PlanRatingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Rate a completed plan."""
    
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
        )
    
    if current_user not in plan.participants:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this plan"
        )
    
    # Check for existing rating
    existing = db.query(PlanRating).filter(
        PlanRating.plan_id == plan_id,
        PlanRating.user_id == current_user.id
    ).first()
    
    if existing:
        existing.rating = rating_data.rating
        existing.note = rating_data.note
    else:
        rating = PlanRating(
            plan_id=plan_id,
            user_id=current_user.id,
            rating=rating_data.rating,
            note=rating_data.note
        )
        db.add(rating)
    
    db.commit()
    
    return {"message": "Rating saved"}
