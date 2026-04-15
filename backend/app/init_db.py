import os
from sqlmodel import Session, select, text
from app.database import engine
from app import models, auth

def run_migrations():
    """Add columns/tables that were introduced after initial schema creation."""
    migrations = [
        # Add deadline column to assignment table (added in v2)
        "ALTER TABLE assignment ADD COLUMN IF NOT EXISTS deadline TIMESTAMP",
        # Add photo_url column to student table (added in v3)
        "ALTER TABLE student ADD COLUMN IF NOT EXISTS photo_url TEXT",
        # Add reply columns to doubt table if it exists (handled by create_all for new installs)
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
            except Exception as e:
                print(f"INFO:     Migration skipped ({sql[:50]}...): {e}")
        conn.commit()
    print("INFO:     Migrations applied.")

async def initialize_database():
    # Run schema migrations first (safe to run on every startup — all are idempotent)
    run_migrations()

    with Session(engine) as session:
        teacher_exists = session.exec(select(models.Teacher)).first() is not None
        if teacher_exists:
            print("INFO:     Database already seeded.")
            return

        print("INFO:     Database is empty, seeding initial data...")

        # Create default teacher
        teacher_username = os.getenv("TEACHER_USERNAME", "teacher")
        teacher_password = os.getenv("TEACHER_PASSWORD", "teachpass")
        teacher = models.Teacher(
            username=teacher_username,
            hashed_password=auth.get_password_hash(teacher_password)
        )
        session.add(teacher)
        session.commit()
        print(f"INFO:     Teacher '{teacher_username}' created.")
        print("INFO:     Students will self-register and join classrooms via codes.")
        print("INFO:     Database seeding complete.")
