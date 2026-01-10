"""
Ideas Router

CORE OBJECT - Everything revolves around this.

Ideas can exist:
- Without a group (private or shared with individuals)
- With multiple people
- With or without a named group
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional

from app.database import get_db
from app.models.models import (
    User, Idea, IdeaImage, Audience, Group, Reaction,
    audience_members, group_members, IdeaCategory, IdeaStatus, ReactionType
)
from app.schemas.schemas import (
    IdeaCreate, IdeaUpdate, IdeaResponse, IdeaCard,
    ReactionCreate, ReactionResponse, ReactionSummary,
    ParsedLinkResponse, PlacesAutocompleteResponse, GroupSummary
)
from app.auth import get_current_user
from app.services.link_parser import parse_link
from app.services.places import places_autocomplete

router = APIRouter()


# =============================================================================
# HELPERS
# =============================================================================

def get_reaction_summary(idea: Idea) -> ReactionSummary:
    """Calculate reaction counts for an idea."""
    interested = sum(1 for r in idea.reactions if r.reaction_type == ReactionType.INTERESTED)
    maybe = sum(1 for r in idea.reactions if r.reaction_type == ReactionType.MAYBE)
    no = sum(1 for r in idea.reactions if r.reaction_type == ReactionType.NO)
    return ReactionSummary(interested=interested, maybe=maybe, no=no)


def get_user_reaction(idea: Idea, user_id: int) -> Optional[ReactionType]:
    """Get the current user's reaction to an idea."""
    for r in idea.reactions:
        if r.user_id == user_id:
            return r.reaction_type
    return None


def get_shared_groups(idea: Idea, db: Session) -> List[GroupSummary]:
    """Get groups this idea is shared with (via audience)."""
    if idea.audience and idea.audience.group_id:
        group = db.query(Group).filter(Group.id == idea.audience.group_id).first()
        if group:
            return [GroupSummary(
                id=group.id,
                name=group.name,
                cover_image=group.cover_image,
                member_count=len(group.members)
            )]
    return []


def build_idea_response(idea: Idea, current_user: User, db: Session) -> dict:
    """Build full idea response."""
    return {
        "id": idea.id,
        "title": idea.title,
        "category": idea.category,
        "source_link": idea.source_link,
        "notes": idea.notes,
        "location_name": idea.location_name,
        "location_lat": idea.location_lat,
        "location_lng": idea.location_lng,
        "status": idea.status,
        "created_by": idea.created_by,
        "created_at": idea.created_at,
        "updated_at": idea.updated_at,
        "creator": idea.creator,
        "images": idea.images,
        "reactions": get_reaction_summary(idea),
        "my_reaction": get_user_reaction(idea, current_user.id),
        "audience_count": len(idea.audience.members) if idea.audience else 0,
        "shared_groups": get_shared_groups(idea, db)
    }


def build_idea_card(idea: Idea, current_user: User) -> dict:
    """Build compact idea card for lists."""
    primary_image = idea.images[0].url if idea.images else None
    return {
        "id": idea.id,
        "title": idea.title,
        "category": idea.category,
        "location_name": idea.location_name,
        "status": idea.status,
        "created_at": idea.created_at,
        "creator": idea.creator,
        "primary_image": primary_image,
        "reactions": get_reaction_summary(idea),
        "my_reaction": get_user_reaction(idea, current_user.id)
    }


def user_can_view_idea(idea: Idea, user: User) -> bool:
    """Check if a user can view an idea."""
    # Creator can always view
    if idea.created_by == user.id:
        return True
    # User is in the audience
    if idea.audience and user in idea.audience.members:
        return True
    return False


# =============================================================================
# CREATE IDEA
# =============================================================================

@router.post("/", response_model=IdeaResponse)
def create_idea(
    idea_data: IdeaCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new idea.
    
    Sharing is people-first:
    - Default: private (just the creator)
    - Can share with individuals and/or groups
    """
    
    # Create audience
    audience = Audience()
    audience.members.append(current_user)  # Creator is always in audience
    
    # Add individual users to audience
    if idea_data.share_with_user_ids:
        users = db.query(User).filter(User.id.in_(idea_data.share_with_user_ids)).all()
        for user in users:
            if user not in audience.members:
                audience.members.append(user)
    
    # Add group members to audience
    if idea_data.share_with_group_ids:
        groups = db.query(Group).filter(Group.id.in_(idea_data.share_with_group_ids)).all()
        for group in groups:
            # Link audience to group if sharing with exactly one group
            if len(idea_data.share_with_group_ids) == 1:
                audience.group_id = group.id
            # Add all group members
            for member in group.members:
                if member not in audience.members:
                    audience.members.append(member)
    
    db.add(audience)
    db.flush()  # Get audience ID
    
    # Create idea
    idea = Idea(
        title=idea_data.title,
        category=idea_data.category,
        source_link=idea_data.source_link,
        notes=idea_data.notes,
        location_name=idea_data.location_name,
        location_lat=idea_data.location_lat,
        location_lng=idea_data.location_lng,
        created_by=current_user.id,
        audience_id=audience.id
    )
    
    db.add(idea)
    db.flush()  # Get idea ID
    
    # Add images
    if idea_data.images:
        for i, url in enumerate(idea_data.images):
            image = IdeaImage(idea_id=idea.id, url=url, position=i)
            db.add(image)
    
    db.commit()
    db.refresh(idea)
    
    return build_idea_response(idea, current_user, db)


# =============================================================================
# READ IDEAS
# =============================================================================

@router.get("/", response_model=List[IdeaCard])
def get_my_ideas(
    category: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get ideas created by the current user (personal vault).
    """
    
    query = db.query(Idea).filter(Idea.created_by == current_user.id)
    
    if category:
        query = query.filter(Idea.category == category)
    
    if status:
        query = query.filter(Idea.status == status)
    
    ideas = query.order_by(Idea.created_at.desc()).all()
    
    return [build_idea_card(idea, current_user) for idea in ideas]


@router.get("/{idea_id}", response_model=IdeaResponse)
def get_idea(
    idea_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific idea's details."""
    
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    
    if not idea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Idea not found"
        )
    
    if not user_can_view_idea(idea, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this idea"
        )
    
    return build_idea_response(idea, current_user, db)


# =============================================================================
# UPDATE IDEA
# =============================================================================

@router.patch("/{idea_id}", response_model=IdeaResponse)
def update_idea(
    idea_id: int,
    updates: IdeaUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update an idea.
    
    Ideas are living objects - can update:
    - Title, category, notes, location
    - Images
    - Sharing (add/remove people and groups)
    """
    
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    
    if not idea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Idea not found"
        )
    
    # Only creator can update
    if idea.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the creator can update this idea"
        )
    
    # Update basic fields
    if updates.title is not None:
        idea.title = updates.title
    if updates.category is not None:
        idea.category = updates.category
    if updates.source_link is not None:
        idea.source_link = updates.source_link
    if updates.notes is not None:
        idea.notes = updates.notes
    if updates.location_name is not None:
        idea.location_name = updates.location_name
    if updates.location_lat is not None:
        idea.location_lat = updates.location_lat
    if updates.location_lng is not None:
        idea.location_lng = updates.location_lng
    
    # Update images
    if updates.images is not None:
        # Remove old images
        db.query(IdeaImage).filter(IdeaImage.idea_id == idea.id).delete()
        # Add new images
        for i, url in enumerate(updates.images):
            image = IdeaImage(idea_id=idea.id, url=url, position=i)
            db.add(image)
    
    # Update audience - add users
    if updates.add_user_ids:
        users = db.query(User).filter(User.id.in_(updates.add_user_ids)).all()
        for user in users:
            if user not in idea.audience.members:
                idea.audience.members.append(user)
    
    # Update audience - remove users
    if updates.remove_user_ids:
        users = db.query(User).filter(User.id.in_(updates.remove_user_ids)).all()
        for user in users:
            if user in idea.audience.members and user.id != current_user.id:
                idea.audience.members.remove(user)
    
    # Update audience - add group members
    if updates.add_group_ids:
        groups = db.query(Group).filter(Group.id.in_(updates.add_group_ids)).all()
        for group in groups:
            for member in group.members:
                if member not in idea.audience.members:
                    idea.audience.members.append(member)
    
    # Update audience - remove group members
    if updates.remove_group_ids:
        groups = db.query(Group).filter(Group.id.in_(updates.remove_group_ids)).all()
        for group in groups:
            for member in group.members:
                if member in idea.audience.members and member.id != current_user.id:
                    idea.audience.members.remove(member)
    
    db.commit()
    db.refresh(idea)
    
    return build_idea_response(idea, current_user, db)


# =============================================================================
# DELETE IDEA
# =============================================================================

@router.delete("/{idea_id}")
def delete_idea(
    idea_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an idea (creator only)."""
    
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    
    if not idea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Idea not found"
        )
    
    if idea.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the creator can delete this idea"
        )
    
    # Delete audience
    if idea.audience:
        db.delete(idea.audience)
    
    db.delete(idea)
    db.commit()
    
    return {"message": "Idea deleted"}


# =============================================================================
# REACTIONS
# =============================================================================

@router.post("/{idea_id}/react", response_model=ReactionResponse)
def react_to_idea(
    idea_id: int,
    reaction_data: ReactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    React to an idea (interested / maybe / no).
    One reaction per user per idea.
    """
    
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    
    if not idea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Idea not found"
        )
    
    if not user_can_view_idea(idea, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this idea"
        )
    
    # Check for existing reaction
    existing = db.query(Reaction).filter(
        Reaction.idea_id == idea_id,
        Reaction.user_id == current_user.id
    ).first()
    
    if existing:
        # Update existing reaction
        existing.reaction_type = reaction_data.reaction_type
        db.commit()
        db.refresh(existing)
        return existing
    
    # Create new reaction
    reaction = Reaction(
        idea_id=idea_id,
        user_id=current_user.id,
        reaction_type=reaction_data.reaction_type
    )
    
    db.add(reaction)
    db.commit()
    db.refresh(reaction)
    
    return reaction


@router.delete("/{idea_id}/react")
def remove_reaction(
    idea_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove your reaction from an idea."""
    
    reaction = db.query(Reaction).filter(
        Reaction.idea_id == idea_id,
        Reaction.user_id == current_user.id
    ).first()
    
    if not reaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reaction not found"
        )
    
    db.delete(reaction)
    db.commit()
    
    return {"message": "Reaction removed"}


# =============================================================================
# LINK PARSING
# =============================================================================

@router.post("/parse-link", response_model=ParsedLinkResponse)
async def parse_idea_link(
    url: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Parse a link to extract idea metadata.
    Supports: TikTok, Instagram, Google Maps, Yelp, Reddit, Eventbrite, etc.
    """
    return await parse_link(url, db)


# =============================================================================
# PLACES AUTOCOMPLETE
# =============================================================================

@router.get("/places/autocomplete", response_model=PlacesAutocompleteResponse)
async def search_places(
    q: str,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search for places using Google Places API.
    Minimum 3 characters required.
    Results are cached for 24 hours.
    """
    
    if len(q) < 3:
        return PlacesAutocompleteResponse(results=[])
    
    return await places_autocomplete(q, lat, lng, db)
