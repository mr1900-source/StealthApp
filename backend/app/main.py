"""
Drift API - Main Application

FastAPI entry point with CORS and router registration.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base

# Import routers (will create these next)
from app.routers import auth, ideas, groups, plans, users, feed

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="Drift API",
    description="Backend API for Drift - Turn ideas into plans",
    version="2.0.0"
)

# CORS configuration - allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(ideas.router, prefix="/ideas", tags=["Ideas"])
app.include_router(groups.router, prefix="/groups", tags=["Groups"])
app.include_router(plans.router, prefix="/plans", tags=["Plans"])
app.include_router(feed.router, prefix="/feed", tags=["Feed"])


@app.get("/")
def root():
    """Health check endpoint."""
    return {"status": "ok", "app": "Drift API", "version": "2.0.0"}
