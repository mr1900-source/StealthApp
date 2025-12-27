from .auth import router as auth_router
from .saves import router as saves_router
from .friends import router as friends_router
from .interests import router as interests_router

__all__ = ["auth_router", "saves_router", "friends_router", "interests_router"]
