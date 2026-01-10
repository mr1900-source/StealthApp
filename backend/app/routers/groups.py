"""
Groups Router

Group CRUD and member management.
Groups are optional named shortcuts to persistent audiences.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.models import User, Group, group_members
from app.schemas.schemas import GroupCreate, GroupUpdate, GroupResponse, GroupSummary
from app.auth import get_current_user

router = APIRouter()


def get_group_response(group: Group, db: Session) -> dict:
    """Build group response with member count."""
    members = group.members
    return {
        "id": group.id,
        "name": group.name,
        "cover_image": group.cover_image,
        "created_by": group.created_by,
        "created_at": group.created_at,
        "members": members,
        "member_count": len(members)
    }


@router.post("/", response_model=GroupResponse)
def create_group(
    group_data: GroupCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new group.
    Groups are explicit, intentional creations - never auto-created.
    """
    
    # Create group
    group = Group(
        name=group_data.name,
        cover_image=group_data.cover_image,
        created_by=current_user.id
    )
    
    # Add creator as member
    group.members.append(current_user)
    
    # Add initial members (if any)
    if group_data.member_ids:
        members = db.query(User).filter(User.id.in_(group_data.member_ids)).all()
        for member in members:
            if member.id != current_user.id:
                group.members.append(member)
    
    db.add(group)
    db.commit()
    db.refresh(group)
    
    return get_group_response(group, db)


@router.get("/", response_model=List[GroupResponse])
def get_my_groups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all groups the current user is a member of."""
    
    groups = db.query(Group).join(group_members).filter(
        group_members.c.user_id == current_user.id
    ).all()
    
    return [get_group_response(g, db) for g in groups]


@router.get("/{group_id}", response_model=GroupResponse)
def get_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific group's details."""
    
    group = db.query(Group).filter(Group.id == group_id).first()
    
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Check membership
    if current_user not in group.members:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this group"
        )
    
    return get_group_response(group, db)


@router.patch("/{group_id}", response_model=GroupResponse)
def update_group(
    group_id: int,
    updates: GroupUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a group (creator only)."""
    
    group = db.query(Group).filter(Group.id == group_id).first()
    
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    if group.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the group creator can update it"
        )
    
    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(group, field, value)
    
    db.commit()
    db.refresh(group)
    
    return get_group_response(group, db)


@router.delete("/{group_id}")
def delete_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a group (creator only)."""
    
    group = db.query(Group).filter(Group.id == group_id).first()
    
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    if group.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the group creator can delete it"
        )
    
    db.delete(group)
    db.commit()
    
    return {"message": "Group deleted"}


# =============================================================================
# MEMBER MANAGEMENT
# =============================================================================

@router.post("/{group_id}/members/{user_id}")
def add_member(
    group_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a member to a group."""
    
    group = db.query(Group).filter(Group.id == group_id).first()
    
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Only members can add new members
    if current_user not in group.members:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this group"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user in group.members:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member"
        )
    
    group.members.append(user)
    db.commit()
    
    return {"message": "Member added"}


@router.delete("/{group_id}/members/{user_id}")
def remove_member(
    group_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a member from a group."""
    
    group = db.query(Group).filter(Group.id == group_id).first()
    
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )
    
    # Only creator can remove others, anyone can remove themselves
    if user_id != current_user.id and group.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the group creator can remove other members"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or user not in group.members:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )
    
    # Creator cannot be removed
    if user_id == group.created_by:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove the group creator"
        )
    
    group.members.remove(user)
    db.commit()
    
    return {"message": "Member removed"}
