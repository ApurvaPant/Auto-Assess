import os
import random
import string
from datetime import date
from sqlmodel import Session, select
from app.database import engine
from app import models, auth, crud # Import necessary modules
from app.constants import GEMINI_API_KEY

async def initialize_database():
    """Checks if DB is seeded and seeds it if necessary."""
    with Session(engine) as session:
        # Check if a teacher already exists; if so, assume DB is seeded
        teacher_exists = session.exec(select(models.Teacher)).first() is not None
        if teacher_exists:
            print("INFO:     Database already seeded.")
            return

        print("INFO:     Database is empty, seeding initial data...")

        # 1. Create Teacher from .env variables
        teacher_username = os.getenv("TEACHER_USERNAME", "teacher")
        teacher_password = os.getenv("TEACHER_PASSWORD", "teachpass")
        if not teacher_password:
            raise ValueError("TEACHER_PASSWORD environment variable not set.")

        teacher_in = models.Teacher(
            username=teacher_username,
            hashed_password=auth.get_password_hash(teacher_password)
        )
        session.add(teacher_in)
        print(f"INFO:     Teacher '{teacher_username}' created.")

        # 2. Create 72 Students
        student_dob = date(2005, 1, 1)
        hashed_dob_str = student_dob.isoformat()
        hashed_dob = auth.get_password_hash(hashed_dob_str)
        for i in range(1, 73):
            student = models.Student(
                roll=i,
                username=f"23AM{i:03d}",
                dob=student_dob,
                hashed_dob=hashed_dob
            )
            session.add(student)
        print("INFO:     72 students created.")

        # 3. Create 10 Teacher Codes
        codes_plaintext = []
        for i in range(1, 11):
            code = f"code-{i}-{''.join(random.choices(string.ascii_lowercase + string.digits, k=6))}"
            codes_plaintext.append(code)
            hashed_code = auth.get_password_hash(code)
            session.add(models.TeacherCode(hashed_code=hashed_code))
        print("INFO:     10 teacher codes created.")

        # Save plaintext codes to a file inside the container's app directory
        codes_file_path = "seed_codes.txt"
        try:
            with open(codes_file_path, "w") as f:
                f.write("\n".join(codes_plaintext))
            print(f"INFO:     Plaintext teacher codes saved to {codes_file_path}")
        except Exception as e:
            print(f"WARN:     Could not write {codes_file_path}: {e}")

        # 4. Seed 2 sample question packages if no Gemini key is present
        if not GEMINI_API_KEY:
            print("INFO:     GEMINI_API_KEY not set. Seeding 2 sample packages.")
            from app.gemini_client import _get_canned_questions
            for pkg_data in _get_canned_questions(2):
                crud.create_package_with_testcases(session, pkg_data)

        # Commit all changes
        try:
            session.commit()
            print("INFO:     Database seeding complete.")
        except Exception as e:
            session.rollback()
            print(f"ERROR:    Database seeding failed: {e}")
            raise