from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware

from app.database import create_db_and_tables
from app.api import api_router
from app import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs on startup
    print("INFO:     Starting up...")
    create_db_and_tables() # Create tables if they don't exist
    await init_db.initialize_database() # Seed the database
    print("INFO:     Application startup complete.")
    yield
    # Runs on shutdown
    print("INFO:     Shutting down...")

app = FastAPI(
    title="AutoAssess-MVP",
    description="An AI-based auto-assessment tool.",
    version="0.1.0",
    lifespan=lifespan # Use the lifespan context manager
)

# Allow requests from our frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all the API routes defined in api.py
app.include_router(api_router, prefix="/api")

@app.get("/health", tags=["Health"])
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok"}