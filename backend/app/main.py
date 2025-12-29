from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import create_tables
from .routers import auth_router, saves_router, friends_router, interests_router
from dotenv import load_dotenv
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="Drift API",
    description="Turn saved ideas into real plans with friends",
    version="0.1.0"
)

# CORS middleware for mobile app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your app's domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(saves_router)
app.include_router(friends_router)
app.include_router(interests_router)


@app.on_event("startup")
def on_startup():
    """Create database tables on startup."""
    create_tables()


@app.get("/")
def root():
    """Health check endpoint."""
    return {
        "app": "Drift",
        "version": "0.1.0",
        "status": "running"
    }


@app.get("/health")
def health_check():
    """Health check for monitoring."""
    return {"status": "healthy"}
