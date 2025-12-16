from typing import List, Optional, Dict, Any
from sqlmodel import Session, select
from app import models, schemas
from datetime import date, datetime
from sqlalchemy.orm import selectinload

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
    # Check if code is valid and has remaining uses
    if (code_obj and code_obj.uses_remaining > 0 and auth.verify_password(plaintext_code, code_obj.hashed_code)):
        code_obj.uses_remaining -= 1
        if code_obj.uses_remaining <= 0:
            code_obj.is_used = True  # Mark as fully used when no uses left
        db.add(code_obj); db.commit()
        return True
    return False

def update_student_dob_from_obj(db: Session, student: models.Student, new_dob_str: str) -> bool:
    from app import auth
    try:
        new_dob = date.fromisoformat(new_dob_str)
        student.dob = new_dob
        student.hashed_dob = auth.get_password_hash(new_dob_str)
        db.add(student); db.commit(); db.refresh(student)
        return True
    except (ValueError, TypeError):
        return False

def create_package_with_testcases(db: Session, package_data: dict) -> Optional[models.Package]:
    if not isinstance(package_data, dict): 
        print(f"DEBUG: package_data is not a dict: {type(package_data)}")
        return None
    
    testcases_data = package_data.get('testcases', [])
    
    # Be lenient - accept packages with any test cases (or none)
    if not testcases_data:
        print(f"DEBUG: No testcases in package: {package_data.get('title', 'untitled')}")
    
    # Pop testcases and id before creating package
    testcases_data = package_data.pop('testcases', [])
    package_data.pop('id', None)
    
    # Create the package
    db_package = models.Package(**package_data)
    db.add(db_package)
    db.commit()
    db.refresh(db_package)
    
    # Create test cases
    for tc_data in testcases_data:
        tc_data.pop('id', None)
        db.add(models.TestCase(**tc_data, package_id=db_package.id))
    
    db.commit()
    
    # Reload package with testcases using selectinload
    db_package = db.exec(
        select(models.Package)
        .where(models.Package.id == db_package.id)
        .options(selectinload(models.Package.testcases))
    ).first()
    
    return db_package

def get_packages_by_ids(db: Session, package_ids: List[int]) -> List[models.Package]:
    return db.exec(select(models.Package).where(models.Package.id.in_(package_ids)).options(selectinload(models.Package.testcases))).all()

def get_all_packages(db: Session) -> List[models.Package]:
    return db.exec(select(models.Package).options(selectinload(models.Package.testcases))).all()

def create_assignment_with_mappings(db: Session, name: str, student_assignments_data: List[dict]) -> models.Assignment:
    db_assignment = models.Assignment(name=name, results_released=False)
    db.add(db_assignment); db.commit(); db.refresh(db_assignment)
    for sa_data in student_assignments_data:
        db.add(models.StudentAssignment(**sa_data, assignment_id=db_assignment.id))
    db.commit(); db.refresh(db_assignment)
    return db_assignment

def get_all_assignments(db: Session) -> List[models.Assignment]:
    return db.exec(select(models.Assignment)).all()

def release_results_for_assignment(db: Session, assignment_id: int, alpha: float, beta: float, gamma: float) -> Optional[models.Assignment]:
    assignment = db.get(models.Assignment, assignment_id)
    if not assignment:
        return None
    assignment.results_released = True
    assignment.weight_test = alpha
    assignment.weight_quality = beta
    assignment.weight_penalty = gamma
    db.add(assignment)
    submissions = get_submissions_for_assignment(db, assignment_id)
    for sub in submissions:
        new_score = (alpha * sub.raw_test_score) + (beta * sub.quality_score) - (gamma * sub.error_penalty)
        new_score = max(0, min(100, new_score))
        sub.final_score = new_score
        db.add(sub)
    db.commit()
    db.refresh(assignment)
    return assignment

def get_student_assignment(db: Session, assignment_id: int, student_roll: int) -> Optional[models.StudentAssignment]:
    student = get_student_by_roll(db, student_roll)
    if not student: return None
    statement = select(models.StudentAssignment).where(
        models.StudentAssignment.assignment_id == assignment_id,
        models.StudentAssignment.student_id == student.id
    ).options(
        selectinload(models.StudentAssignment.package).selectinload(models.Package.testcases),
        selectinload(models.StudentAssignment.assignment),
        selectinload(models.StudentAssignment.submission)
    )
    return db.exec(statement).first()

def get_assignments_for_student(db: Session, student_id: int) -> List[Dict[str, Any]]:
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

def create_submission(db: Session, student_assignment_id: int, submission_data: schemas.SubmissionCreate, results_data: dict) -> models.Submission:
    existing_submission = db.exec(select(models.Submission).where(models.Submission.student_assignment_id == student_assignment_id)).first()
    if existing_submission:
        existing_submission.code = submission_data.code
        existing_submission.submitted_at = datetime.utcnow()
        for key, value in results_data.items():
            setattr(existing_submission, key, value)
        db_submission = existing_submission
    else:
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

def get_dashboard_stats(db: Session) -> Dict[str, Any]:
    from sqlalchemy import func
    total_students = db.exec(select(func.count(models.Student.id))).one()
    total_questions = db.exec(select(func.count(models.Package.id))).one()
    total_assignments = db.exec(select(func.count(models.Assignment.id))).one()
    
    # Calculate average score from released results
    avg_score_query = select(func.avg(models.Submission.final_score)).join(models.StudentAssignment).join(models.Assignment).where(models.Assignment.results_released == True)
    avg_score = db.exec(avg_score_query).one() or 0.0

    # Recent Activity Logic
    # Get 5 recent submissions
    recent_subs = db.exec(
        select(models.Submission)
        .join(models.StudentAssignment)
        .join(models.Student)
        .join(models.Assignment)
        .order_by(models.Submission.submitted_at.desc())
        .limit(5)
        .options(
            selectinload(models.Submission.student_assignment).selectinload(models.StudentAssignment.student),
            selectinload(models.Submission.student_assignment).selectinload(models.StudentAssignment.assignment)
        )
    ).all()

    recent_activity = []
    for sub in recent_subs:
        student_name = sub.student_assignment.student.name or f"Student {sub.student_assignment.student.roll}"
        assignment_name = sub.student_assignment.assignment.name
        
        # Calculate time difference roughly
        time_diff = datetime.utcnow() - sub.submitted_at
        if time_diff.days > 0:
            time_str = f"{time_diff.days} days ago"
        elif time_diff.seconds // 3600 > 0:
            time_str = f"{time_diff.seconds // 3600} hours ago"
        else:
            minutes = time_diff.seconds // 60
            time_str = f"{minutes} mins ago"

        recent_activity.append({
            "user": student_name,
            "action": f"submitted {assignment_name}",
            "time": time_str,
            "score": f"{int(sub.final_score)}/100" if sub.student_assignment.assignment.results_released else "Pending"
        })
    
    # Chart Data: Aggregate avg and top scores per assignment (for released results only)
    chart_data = []
    assignments_with_results = db.exec(
        select(models.Assignment).where(models.Assignment.results_released == True).limit(10)
    ).all()
    
    for assignment in assignments_with_results:
        # Get submissions for this assignment
        subs_query = select(models.Submission.final_score).join(
            models.StudentAssignment
        ).where(
            models.StudentAssignment.assignment_id == assignment.id
        )
        scores = db.exec(subs_query).all()
        
        if scores:
            avg_score = sum(scores) / len(scores)
            top_score = max(scores)
            chart_data.append({
                "name": assignment.name[:15],  # Truncate long names
                "avg": round(avg_score, 1),
                "top": round(top_score, 1)
            })
    
    return {
        "total_students": total_students,
        "total_questions": total_questions, # Packages
        "active_assignments": total_assignments,
        "avg_score": round(avg_score, 1) if recent_activity else 0,
        "recent_activity": recent_activity,
        "chart_data": chart_data
    }