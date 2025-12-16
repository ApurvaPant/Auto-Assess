import os
import random
import string
from datetime import date
from sqlmodel import Session, select
from app.database import engine
from app import models, auth, crud
from app.constants import GEMINI_API_KEY

async def initialize_database():
    with Session(engine) as session:
        teacher_exists = session.exec(select(models.Teacher)).first() is not None
        if teacher_exists:
            print("INFO:     Database already seeded.")
            return
        
        print("INFO:     Database is empty, seeding initial data...")
        
        # 1. Create Teacher
        teacher_username = os.getenv("TEACHER_USERNAME", "teacher")
        teacher_password = os.getenv("TEACHER_PASSWORD", "teachpass")
        teacher_in = models.Teacher(username=teacher_username, hashed_password=auth.get_password_hash(teacher_password))
        session.add(teacher_in)
        session.commit() # Commit teacher first
        print(f"INFO:     Teacher '{teacher_username}' created.")
        
        # 2. Create Students and Codes
        student_dob = date(2005, 1, 1)
        hashed_dob_str = student_dob.isoformat()
        hashed_dob = auth.get_password_hash(hashed_dob_str)
        
        codes_plaintext_for_file = []
        
        for i in range(1, 73):
            # Create student
            student = models.Student(
                roll=i,
                username=f"23AM{i:03d}",
                dob=student_dob,
                hashed_dob=hashed_dob
            )
            session.add(student)
            session.commit() # Commit each student to get their ID
            session.refresh(student)
            
            # Create a unique code for this student
            code_str = f"code-{student.roll}-{''.join(random.choices(string.ascii_lowercase + string.digits, k=6))}"
            hashed_code = auth.get_password_hash(code_str)
            
            teacher_code = models.TeacherCode(
                hashed_code=hashed_code,
                student_id=student.id, # Link code to the student
                is_used=False,
                uses_remaining=2  # New: code can be used twice
            )
            session.add(teacher_code)
            
            # Add code to list for seed_codes.txt
            codes_plaintext_for_file.append(f"Roll: {student.roll} | Username: {student.username} | Code: {code_str}")

        print("INFO:     72 students and 72 unique codes created.")
            
        # 3. Save plaintext codes to file
        codes_file_path = "seed_codes.txt"
        try:
            with open(codes_file_path, "w") as f:
                f.write("\n".join(codes_plaintext_for_file))
            print(f"INFO:     Plaintext student codes saved to {codes_file_path}")
        except Exception as e:
            print(f"WARN:     Could not write {codes_file_path}: {e}")
        
        # 4. Seed sample packages
        if not GEMINI_API_KEY:
            print("INFO:     GEMINI_API_KEY not set. Seeding 2 sample packages.")
            from app.gemini_client import _get_canned_questions
            for pkg_data in _get_canned_questions(2):
                crud.create_package_with_testcases(session, pkg_data)
        
        try:
            session.commit() # Commit codes and packages
            print("INFO:     Database seeding complete.")
        except Exception as e:
            session.rollback()
            print(f"ERROR:    Database seeding failed: {e}")
            raise