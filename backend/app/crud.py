from typing import List, Optional, Dict, Any
from sqlmodel import Session, select
from app import models, schemas
from datetime import date, datetime
from sqlalchemy.orm import selectinload

# --- (Teacher, Student, TeacherCode functions are unchanged) ---
def get_teacher_by_username(db: Session, username: str) -> Optional[models.Teacher]:
    return db.exec(select(models.Teacher).where(models.Teacher.username == username)).first()
def create_teacher(db: Session, teacher: schemas.TeacherLogin) -> models.Teacher:
    from app import auth
    hashed_password = auth.get_password_hash(teacher.password)
    db_teacher = models.Teacher(username=teacher.username, hashed_password=hashed_password)
    db.add(db_teacher); db.commit(); db.refresh(db_teacher)
    return db_teacher
def get_student_by_roll(db: Session, roll: int) -> Optional[models.Student]:
    return db.exec(select(models.Student).where(models.Student.roll == roll)).first()
def get_all_students(db: Session) -> List[models.Student]:
    return db.exec(select(models.Student).order_by(models.Student.roll)).all()
def update_student_dob(db: Session, roll: int, new_dob_str: str) -> Optional[models.Student]:
    from app import auth
    student = get_student_by_roll(db, roll)
    if not student: return None
    try:
        new_dob = date.fromisoformat(new_dob_str)
        student.dob = new_dob
        student.hashed_dob = auth.get_password_hash(new_dob_str)
        db.add(student); db.commit(); db.refresh(student)
        return student
    except (ValueError, TypeError):
        return None
def get_all_student_codes(db: Session) -> List[models.TeacherCode]:
    return db.exec(select(models.TeacherCode).options(selectinload(models.TeacherCode.student))).all()
def validate_and_use_student_code(db: Session, roll: int, plaintext_code: str) -> bool:
    from app import auth
    student = get_student_by_roll(db, roll)
    if not student: return False
    code_obj = db.exec(select(models.TeacherCode).where(models.TeacherCode.student_id == student.id)).first()
    if (code_obj and not code_obj.is_used and auth.verify_password(plaintext_code, code_obj.hashed_code)):
        code_obj.is_used = True
        db.add(code_obj); db.commit()
        return True
    return False

# --- (Package & TestCase functions are unchanged) ---
def create_package_with_testcases(db: Session, package_data: dict) -> Optional[models.Package]:
    if not isinstance(package_data, dict):
        print("Validation ERROR: Package data is not a dictionary.")
        return None
    testcases_data = package_data.get('testcases', [])
    required_keys = ['title', 'prompt', 'difficulty', 'testcases']
    if not all(key in package_data for key in required_keys):
        print(f"Validation ERROR: Package missing required keys. Data: {package_data.get('title')}")
        return None
    if not isinstance(testcases_data, list) or len(testcases_data) != 5:
        print(f"Validation ERROR: Package '{package_data.get('title')}' does not have 5 test cases.")
        return None
    total_points = 0
    for tc_data in testcases_data:
        if not isinstance(tc_data, dict) or not all(k in tc_data for k in ['type', 'input', 'expected', 'points']):
            print(f"Validation ERROR: Package '{package_data.get('title')}' has a malformed test case.")
            return None
        try:
            total_points += int(tc_data['points'])
        except (ValueError, TypeError):
            print(f"Validation ERROR: Package '{package_data.get('title')}' has invalid test case points.")
            return None
    if total_points != 100:
        print(f"Validation ERROR: Package '{package_data.get('title')}' test case points do not sum to 100 (Got: {total_points}).")
        return None
    testcases_data = package_data.pop('testcases', [])
    package_data.pop('id', None)
    db_package = models.Package(**package_data)
    db.add(db_package); db.commit(); db.refresh(db_package)
    for tc_data in testcases_data:
        tc_data.pop('id', None)
        db_testcase = models.TestCase(**tc_data, package_id=db_package.id)
        db.add(db_testcase)
    db.commit(); db.refresh(db_package)
    print(f"Validation SUCCESS: Package '{db_package.title}' created.")
    return db_package
def get_packages_by_ids(db: Session, package_ids: List[int]) -> List[models.Package]:
    statement = select(models.Package).where(models.Package.id.in_(package_ids)).options(selectinload(models.Package.testcases))
    return db.exec(statement).all()
def get_all_packages(db: Session) -> List[models.Package]:
    statement = select(models.Package).options(selectinload(models.Package.testcases))
    return db.exec(statement).all()

# --- Assignment & Submission --- #
def create_assignment_with_mappings(db: Session, name: str, student_assignments_data: List[dict]) -> models.Assignment:
    # --- THIS IS UPDATED ---
    db_assignment = models.Assignment(name=name, results_released=False)
    db.add(db_assignment); db.commit(); db.refresh(db_assignment)
    for sa_data in student_assignments_data:
        db.add(models.StudentAssignment(**sa_data, assignment_id=db_assignment.id))
    db.commit(); db.refresh(db_assignment)
    return db_assignment

def get_all_assignments(db: Session) -> List[models.Assignment]:
    return db.exec(select(models.Assignment)).all()

# --- NEW FUNCTION ---
def release_results_for_assignment(db: Session, assignment_id: int) -> Optional[models.Assignment]:
    """Finds an assignment and sets its results_released flag to True."""
    assignment = db.get(models.Assignment, assignment_id)
    if not assignment:
        return None
    assignment.results_released = True
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment

# --- UPDATED FUNCTION ---
def get_student_assignment(db: Session, assignment_id: int, student_roll: int) -> Optional[models.StudentAssignment]:
    student = get_student_by_roll(db, student_roll)
    if not student: return None
    statement = select(models.StudentAssignment).where(
        models.StudentAssignment.assignment_id == assignment_id,
        models.StudentAssignment.student_id == student.id
    ).options(
        selectinload(models.StudentAssignment.package).selectinload(models.Package.testcases),
        selectinload(models.StudentAssignment.assignment), # Load assignment to check release status
        selectinload(models.StudentAssignment.submission)
    )
    return db.exec(statement).first()

# --- UPDATED FUNCTION ---
def get_assignments_for_student(db: Session, student_id: int) -> List[Dict[str, Any]]:
    """Gets all assignment details for a student, including submission and release status."""
    statement = select(
        models.StudentAssignment,
        models.Submission,
        models.Assignment.results_released
    ).join(
        models.Assignment,
        models.StudentAssignment.assignment_id == models.Assignment.id
    ).outerjoin(
        models.Submission,
        models.StudentAssignment.id == models.Submission.student_assignment_id
    ).where(
        models.StudentAssignment.student_id == student_id
    ).options(
        selectinload(models.StudentAssignment.assignment),
        selectinload(models.StudentAssignment.package)
    )
    results = db.exec(statement).all()
    processed = []
    for sa, sub, results_released in results:
        processed.append({
            "assignment_id": sa.assignment_id,
            "assignment_name": sa.assignment.name,
            "package_title": sa.package.title,
            "has_submitted": sub is not None,
            "results_released": results_released,
            "final_score": sub.final_score if sub and results_released else None
        })
    return processed

# --- UPDATED FUNCTION ---
def create_submission(db: Session, student_assignment_id: int, submission_data: schemas.SubmissionCreate, results_data: dict) -> models.Submission:
    """Creates or UPDATES a submission for a student assignment."""
    existing_submission = db.exec(select(models.Submission).where(models.Submission.student_assignment_id == student_assignment_id)).first()
    
    if existing_submission:
        # Update existing submission
        print(f"INFO: Updating existing submission for student_assignment_id {student_assignment_id}")
        existing_submission.code = submission_data.code
        existing_submission.submitted_at = datetime.utcnow()
        for key, value in results_data.items():
            setattr(existing_submission, key, value)
        db_submission = existing_submission
    else:
        # Create new submission
        print(f"INFO: Creating new submission for student_assignment_id {student_assignment_id}")
        db_submission = models.Submission(student_assignment_id=student_assignment_id, code=submission_data.code, **results_data)
    
    db.add(db_submission)
    db.commit()
    db.refresh(db_submission)
    return db_submission

def get_submissions_for_assignment(db: Session, assignment_id: int) -> List[models.Submission]:
    statement = select(models.Submission).join(
        models.StudentAssignment
    ).join(
        models.Student
    ).where(
        models.StudentAssignment.assignment_id == assignment_id
    ).options(selectinload(models.Submission.student_assignment).selectinload(models.StudentAssignment.student))
    return db.exec(statement).all()