from sqlmodel import create_engine, SQLModel, Session
import os

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable not set")

engine = create_engine(DATABASE_URL, echo=False)

def create_db_and_tables():
    from app import models # Import here to avoid circular dependency
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session