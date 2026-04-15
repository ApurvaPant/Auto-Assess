from typing import List, Optional, Dict, Any
import random, string
from sqlmodel import Session, select
from sqlalchemy import func
from app import models, schemas
from datetime import datetime

# ─── Teacher ──────────────────────────────────────────────────────────────────
def get_teacher_by_username(db: Session, username: str) -> Optional[models.Teacher]:
    return db.exec(select(models.Teacher).where(models.Teacher.username == username)).first()

def create_teacher(db: Session, teacher: schemas.TeacherLogin) -> models.Teacher:
    from app import auth
    hashed_password = auth.get_password_hash(teacher.password)
    db_teacher = models.Teacher(username=teacher.username, hashed_password=hashed_password)
    db.add(db_teacher); db.commit(); db.refresh(db_teacher)
    return db_teacher

# ─── Student ──────────────────────────────────────────────────────────────────
def get_student_by_email(db: Session, email: str) -> Optional[models.Student]:
    return db.exec(select(models.Student).where(models.Student.email == email)).first()

def create_student(db: Session, email: str, name: str, hashed_password: str) -> models.Student:
    student = models.Student(email=email, name=name, hashed_password=hashed_password)
    db.add(student); db.commit(); db.refresh(student)
    return student

# ─── Classroom ────────────────────────────────────────────────────────────────
def _generate_classroom_code(db: Session) -> str:
    for _ in range(100):
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        existing = db.exec(select(models.Classroom).where(models.Classroom.code == code)).first()
        if not existing:
            return code
    raise ValueError("Could not generate unique classroom code")

def create_classroom(db: Session, name: str, teacher_id: int) -> models.Classroom:
    code = _generate_classroom_code(db)
    classroom = models.Classroom(name=name, code=code, teacher_id=teacher_id)
    db.add(classroom); db.commit(); db.refresh(classroom)
    return classroom

def get_classrooms_for_teacher(db: Session, teacher_id: int) -> List[Dict[str, Any]]:
    classrooms = db.exec(
        select(models.Classroom)
        .where(models.Classroom.teacher_id == teacher_id)
        .order_by(models.Classroom.created_at.desc())
    ).all()
    result = []
    for c in classrooms:
        student_count = db.exec(
            select(func.count(models.ClassroomStudent.id))
            .where(models.ClassroomStudent.classroom_id == c.id)
        ).one()
        assignment_count = db.exec(
            select(func.count(models.Assignment.id))
            .where(models.Assignment.classroom_id == c.id)
        ).one()
        result.append({
            "id": c.id, "name": c.name, "code": c.code,
            "created_at": c.created_at.isoformat(),
            "student_count": student_count,
            "assignment_count": assignment_count,
        })
    return result

def get_classroom_by_code(db: Session, code: str) -> Optional[models.Classroom]:
    return db.exec(select(models.Classroom).where(models.Classroom.code == code.upper())).first()

def get_classroom_by_id(db: Session, classroom_id: int) -> Optional[models.Classroom]:
    return db.get(models.Classroom, classroom_id)

def delete_classroom(db: Session, classroom_id: int, teacher_id: int) -> bool:
    classroom = db.exec(
        select(models.Classroom).where(
            models.Classroom.id == classroom_id,
            models.Classroom.teacher_id == teacher_id
        )
    ).first()
    if not classroom:
        return False
    db.delete(classroom)
    db.commit()
    return True

def join_classroom(db: Session, student_id: int, classroom_id: int) -> Optional[models.ClassroomStudent]:
    existing = db.exec(
        select(models.ClassroomStudent).where(
            models.ClassroomStudent.student_id == student_id,
            models.ClassroomStudent.classroom_id == classroom_id
        )
    ).first()
    if existing:
        return existing  # Already joined
    membership = models.ClassroomStudent(student_id=student_id, classroom_id=classroom_id)
    db.add(membership); db.commit(); db.refresh(membership)
    # Backfill any assignments that existed before this student joined
    _backfill_assignments_for_student(db, student_id, classroom_id)
    return membership

def _backfill_assignments_for_student(db: Session, student_id: int, classroom_id: int) -> None:
    """Auto-assign all pre-existing classroom assignments to a newly joined student."""
    import random
    assignments = db.exec(
        select(models.Assignment).where(models.Assignment.classroom_id == classroom_id)
    ).all()
    for assignment in assignments:
        # Skip if student already has this assignment
        already = db.exec(
            select(models.StudentAssignment).where(
                models.StudentAssignment.student_id == student_id,
                models.StudentAssignment.assignment_id == assignment.id
            )
        ).first()
        if already:
            continue
        # Find packages used in this assignment; pick the least-assigned one for fairness
        existing_sas = db.exec(
            select(models.StudentAssignment).where(
                models.StudentAssignment.assignment_id == assignment.id
            )
        ).all()
        if not existing_sas:
            continue
        package_counts: Dict[int, int] = {}
        for sa in existing_sas:
            package_counts[sa.package_id] = package_counts.get(sa.package_id, 0) + 1
        min_count = min(package_counts.values())
        candidates = [pid for pid, cnt in package_counts.items() if cnt == min_count]
        chosen_package_id = random.choice(candidates)
        db.add(models.StudentAssignment(
            student_id=student_id,
            package_id=chosen_package_id,
            assignment_id=assignment.id
        ))
    db.commit()

def get_classrooms_for_student(db: Session, student_id: int) -> List[Dict[str, Any]]:
    memberships = db.exec(
        select(models.ClassroomStudent)
        .where(models.ClassroomStudent.student_id == student_id)
    ).all()
    result = []
    for m in memberships:
        classroom = db.get(models.Classroom, m.classroom_id)
        if not classroom:
            continue
        teacher = db.get(models.Teacher, classroom.teacher_id)
        assignment_count = db.exec(
            select(func.count(models.Assignment.id))
            .where(models.Assignment.classroom_id == classroom.id)
        ).one()
        result.append({
            "id": classroom.id, "name": classroom.name, "code": classroom.code,
            "teacher_name": teacher.username if teacher else "",
            "assignment_count": assignment_count,
        })
    return result

def get_classroom_students(db: Session, classroom_id: int) -> List[models.Student]:
    memberships = db.exec(
        select(models.ClassroomStudent)
        .where(models.ClassroomStudent.classroom_id == classroom_id)
    ).all()
    students = []
    for m in memberships:
        student = db.get(models.Student, m.student_id)
        if student:
            students.append(student)
    return students

# ─── Package ──────────────────────────────────────────────────────────────────
def create_package_with_testcases(db: Session, package_data: dict, classroom_id: Optional[int] = None) -> Optional[models.Package]:
    try:
        new_pkg = models.Package(
            title=package_data.get('title', 'Untitled'),
            prompt=package_data.get('prompt', ''),
            difficulty=package_data.get('difficulty', 'medium'),
            classroom_id=classroom_id,
        )
        db.add(new_pkg); db.commit(); db.refresh(new_pkg)
        for tc_data in package_data.get('testcases', []):
            tc = models.TestCase(
                type=tc_data.get('type', 'sample'),
                input=tc_data.get('input', ''),
                expected=tc_data.get('expected', ''),
                points=tc_data.get('points', 10),
                package_id=new_pkg.id
            )
            db.add(tc)
        db.commit(); db.refresh(new_pkg)
        return new_pkg
    except Exception as e:
        db.rollback()
        print(f"Error creating package: {e}")
        return None

def get_all_packages(db: Session, classroom_id: Optional[int] = None) -> List[models.Package]:
    q = select(models.Package).where(models.Package.is_deleted == False)
    if classroom_id is not None:
        q = q.where(models.Package.classroom_id == classroom_id)
    return db.exec(q).all()

def get_packages_by_ids(db: Session, ids: List[int]) -> List[models.Package]:
    return db.exec(
        select(models.Package).where(models.Package.id.in_(ids))
    ).all()

def delete_packages_by_ids(db: Session, ids: List[int]) -> int:
    packages = db.exec(select(models.Package).where(models.Package.id.in_(ids))).all()
    count = 0
    for pkg in packages:
        _delete_package(db, pkg)
        count += 1
    db.commit()
    return count

def delete_all_packages(db: Session, classroom_id: Optional[int] = None) -> int:
    q = select(models.Package).where(models.Package.is_deleted == False)
    if classroom_id is not None:
        q = q.where(models.Package.classroom_id == classroom_id)
    packages = db.exec(q).all()
    count = 0
    for pkg in packages:
        _delete_package(db, pkg)
        count += 1
    db.commit()
    return count

def _delete_package(db, pkg):
    for tc in pkg.testcases:
        db.delete(tc)
    pkg.is_deleted = True
    db.add(pkg)

# ─── Assignment ───────────────────────────────────────────────────────────────
def create_assignment_with_mappings(db: Session, name: str, student_assignments_data: list, classroom_id: Optional[int] = None, deadline: Optional[datetime] = None) -> models.Assignment:
    assignment = models.Assignment(name=name, classroom_id=classroom_id, deadline=deadline)
    db.add(assignment); db.commit(); db.refresh(assignment)
    for sa_data in student_assignments_data:
        sa = models.StudentAssignment(
            student_id=sa_data["student_id"],
            package_id=sa_data["package_id"],
            assignment_id=assignment.id
        )
        db.add(sa)
    db.commit(); db.refresh(assignment)
    return assignment

def get_all_assignments(db: Session, classroom_id: Optional[int] = None) -> List[models.Assignment]:
    q = select(models.Assignment)
    if classroom_id is not None:
        q = q.where(models.Assignment.classroom_id == classroom_id)
    return db.exec(q.order_by(models.Assignment.created_at.desc())).all()

def delete_assignment(db: Session, assignment_id: int) -> bool:
    assignment = db.exec(
        select(models.Assignment).where(models.Assignment.id == assignment_id)
    ).first()
    if not assignment:
        return False
    for sa in assignment.student_assignments:
        if sa.submission:
            db.delete(sa.submission)
        db.delete(sa)
    db.delete(assignment)
    db.commit()
    return True

def release_results_for_assignment(db: Session, assignment_id: int, alpha: float, beta: float, gamma: float) -> Optional[models.Assignment]:
    assignment = db.get(models.Assignment, assignment_id)
    if not assignment:
        return None
    assignment.results_released = True
    assignment.weight_test = alpha
    assignment.weight_quality = beta
    assignment.weight_penalty = gamma
    db.add(assignment); db.commit(); db.refresh(assignment)
    return assignment

# ─── Student Assignment ──────────────────────────────────────────────────────
def get_student_assignment(db: Session, assignment_id: int, student_id: int) -> Optional[models.StudentAssignment]:
    return db.exec(
        select(models.StudentAssignment).where(
            models.StudentAssignment.assignment_id == assignment_id,
            models.StudentAssignment.student_id == student_id
        )
    ).first()

def get_assignments_for_student(db: Session, student_id: int, classroom_id: Optional[int] = None) -> List[Dict[str, Any]]:
    results = db.exec(
        select(models.StudentAssignment).where(
            models.StudentAssignment.student_id == student_id
        )
    ).all()
    processed = []
    for sa in results:
        if classroom_id is not None and sa.assignment.classroom_id != classroom_id:
            continue
        sub = sa.submission
        processed.append({
            "assignment_id": sa.assignment_id,
            "assignment_name": sa.assignment.name,
            "package_title": sa.package.title,
            "has_submitted": sub is not None,
            "results_released": sa.assignment.results_released,
            "final_score": sub.final_score if sub and sa.assignment.results_released else None,
            "classroom_name": sa.assignment.classroom.name if sa.assignment.classroom else None,
            "deadline": sa.assignment.deadline.isoformat() if sa.assignment.deadline else None,
        })
    return processed

# ─── Submission ───────────────────────────────────────────────────────────────
def create_submission(db: Session, student_assignment_id: int, submission_data: schemas.SubmissionCreate, results_data: dict) -> models.Submission:
    existing = db.exec(select(models.Submission).where(models.Submission.student_assignment_id == student_assignment_id)).first()
    if existing:
        existing.code = submission_data.code
        existing.submitted_at = datetime.utcnow()
        for key, value in results_data.items():
            setattr(existing, key, value)
        db_submission = existing
    else:
        db_submission = models.Submission(student_assignment_id=student_assignment_id, code=submission_data.code, **results_data)
    db.add(db_submission); db.commit(); db.refresh(db_submission)
    return db_submission

def get_submissions_for_assignment(db: Session, assignment_id: int) -> List[models.Submission]:
    return db.exec(
        select(models.Submission).join(
            models.StudentAssignment
        ).where(
            models.StudentAssignment.assignment_id == assignment_id
        )
    ).all()

# ─── Dashboard Stats ──────────────────────────────────────────────────────────
def get_dashboard_stats(db: Session, classroom_id: Optional[int] = None) -> Dict[str, Any]:
    if classroom_id is not None:
        total_students = db.exec(
            select(func.count(models.ClassroomStudent.id))
            .where(models.ClassroomStudent.classroom_id == classroom_id)
        ).one()
        total_questions = db.exec(
            select(func.count(models.Package.id))
            .where(models.Package.is_deleted == False, models.Package.classroom_id == classroom_id)
        ).one()
        total_assignments = db.exec(
            select(func.count(models.Assignment.id))
            .where(models.Assignment.classroom_id == classroom_id)
        ).one()
        total_submissions = db.exec(
            select(func.count(models.Submission.id))
            .join(models.StudentAssignment)
            .join(models.Assignment)
            .where(models.Assignment.classroom_id == classroom_id)
        ).one()
        pending_assignments = db.exec(
            select(func.count(models.Assignment.id))
            .where(models.Assignment.classroom_id == classroom_id, models.Assignment.results_released == False)
        ).one()
    else:
        total_students = db.exec(select(func.count(models.Student.id))).one()
        total_questions = db.exec(select(func.count(models.Package.id)).where(models.Package.is_deleted == False)).one()
        total_assignments = db.exec(select(func.count(models.Assignment.id))).one()
        total_submissions = db.exec(select(func.count(models.Submission.id))).one()
        pending_assignments = db.exec(select(func.count(models.Assignment.id)).where(models.Assignment.results_released == False)).one()

    # Average score from released results
    avg_q = select(func.avg(models.Submission.final_score)).join(models.StudentAssignment).join(models.Assignment).where(models.Assignment.results_released == True)
    if classroom_id is not None:
        avg_q = avg_q.where(models.Assignment.classroom_id == classroom_id)
    global_avg_raw = db.exec(avg_q).one() or 0.0
    global_avg_score = round(float(global_avg_raw), 1)

    # Score distribution
    scores_q = select(models.Submission.final_score).join(models.StudentAssignment).join(models.Assignment).where(models.Assignment.results_released == True)
    if classroom_id is not None:
        scores_q = scores_q.where(models.Assignment.classroom_id == classroom_id)
    all_scores = db.exec(scores_q).all()
    buckets = {"0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0}
    for s in all_scores:
        if s <= 20:   buckets["0-20"] += 1
        elif s <= 40: buckets["21-40"] += 1
        elif s <= 60: buckets["41-60"] += 1
        elif s <= 80: buckets["61-80"] += 1
        else:         buckets["81-100"] += 1
    score_distribution = [{"range": k, "count": v} for k, v in buckets.items()]

    # Submission rates per assignment
    asgn_q = select(models.Assignment).order_by(models.Assignment.id.desc()).limit(8)
    if classroom_id is not None:
        asgn_q = asgn_q.where(models.Assignment.classroom_id == classroom_id)
    all_asgn = db.exec(asgn_q).all()
    submission_rates = []
    for asgn in reversed(all_asgn):
        total_sa = db.exec(select(func.count(models.StudentAssignment.id)).where(models.StudentAssignment.assignment_id == asgn.id)).one()
        submitted = db.exec(select(func.count(models.Submission.id)).join(models.StudentAssignment).where(models.StudentAssignment.assignment_id == asgn.id)).one()
        if total_sa > 0:
            submission_rates.append({
                "name": asgn.name[:20], "submitted": submitted, "total": total_sa,
                "rate": round(submitted / total_sa * 100), "released": asgn.results_released,
            })

    # Recent activity
    activity_q = (
        select(models.Submission)
        .join(models.StudentAssignment)
        .join(models.Student)
        .join(models.Assignment, models.StudentAssignment.assignment_id == models.Assignment.id)
        .order_by(models.Submission.submitted_at.desc())
        .limit(5)
    )
    if classroom_id is not None:
        activity_q = activity_q.where(models.Assignment.classroom_id == classroom_id)
    recent_subs = db.exec(activity_q).all()
    recent_activity = []
    for sub in recent_subs:
        student_name = sub.student_assignment.student.name or sub.student_assignment.student.email
        assignment_name = sub.student_assignment.assignment.name
        time_diff = datetime.utcnow() - sub.submitted_at
        if time_diff.days > 0: time_str = f"{time_diff.days}d ago"
        elif time_diff.seconds // 3600 > 0: time_str = f"{time_diff.seconds // 3600}h ago"
        else: time_str = f"{time_diff.seconds // 60}m ago"
        recent_activity.append({
            "user": student_name, "action": assignment_name, "time": time_str,
            "score": round(sub.final_score) if sub.student_assignment.assignment.results_released else None,
        })

    # Chart data
    chart_q = select(models.Assignment).where(models.Assignment.results_released == True).limit(10)
    if classroom_id is not None:
        chart_q = chart_q.where(models.Assignment.classroom_id == classroom_id)
    chart_data = []
    for asgn in db.exec(chart_q).all():
        scores = db.exec(select(models.Submission.final_score).join(models.StudentAssignment).where(models.StudentAssignment.assignment_id == asgn.id)).all()
        if scores:
            chart_data.append({"name": asgn.name[:14], "avg": round(sum(scores) / len(scores), 1), "top": round(max(scores), 1)})

    return {
        "total_students": total_students, "total_questions": total_questions,
        "active_assignments": total_assignments, "total_submissions": total_submissions,
        "pending_assignments": pending_assignments, "avg_score": global_avg_score,
        "score_distribution": score_distribution, "submission_rates": submission_rates,
        "recent_activity": recent_activity, "chart_data": chart_data,
    }

# ─── Doubts ───────────────────────────────────────────────────────────────────
def create_doubt(db: Session, student_id: int, classroom_id: int, question: str, assignment_id: Optional[int] = None) -> models.Doubt:
    doubt = models.Doubt(student_id=student_id, classroom_id=classroom_id, question=question, assignment_id=assignment_id)
    db.add(doubt); db.commit(); db.refresh(doubt)
    return doubt

def get_doubts_for_student(db: Session, student_id: int, classroom_id: int) -> List[models.Doubt]:
    return db.exec(
        select(models.Doubt)
        .where(models.Doubt.student_id == student_id, models.Doubt.classroom_id == classroom_id)
        .order_by(models.Doubt.created_at.asc())
    ).all()

def get_doubts_for_classroom(db: Session, classroom_id: int) -> List[models.Doubt]:
    return db.exec(
        select(models.Doubt)
        .where(models.Doubt.classroom_id == classroom_id)
        .order_by(models.Doubt.created_at.asc())
    ).all()

def reply_to_doubt(db: Session, doubt_id: int, reply_text: str) -> Optional[models.Doubt]:
    doubt = db.get(models.Doubt, doubt_id)
    if not doubt:
        return None
    doubt.reply = reply_text
    doubt.replied_at = datetime.utcnow()
    db.add(doubt); db.commit(); db.refresh(doubt)
    return doubt

# ─── Assignment Details ───────────────────────────────────────────────────────
def get_assignment_details(db: Session, assignment_id: int) -> Optional[Dict[str, Any]]:
    assignment = db.exec(
        select(models.Assignment).where(models.Assignment.id == assignment_id)
    ).first()
    if not assignment:
        return None
    students = []
    released_scores = []
    for sa in assignment.student_assignments:
        student = sa.student
        package = sa.package
        sub = sa.submission
        entry = {
            "roll": student.id,
            "name": student.name or student.email,
            "photo_url": student.photo_url,
            "package_title": package.title if package else "—",
            "package_difficulty": package.difficulty if package else "—",
            "status": "submitted" if sub else "pending",
            "submitted_at": sub.submitted_at.isoformat() if sub else None,
            "final_score": round(sub.final_score, 1) if sub and assignment.results_released else None,
            "raw_test_score": round(sub.raw_test_score, 1) if sub and assignment.results_released else None,
            "quality_score": sub.quality_score if sub and assignment.results_released else None,
            "error_counts": sub.error_counts if sub and assignment.results_released else None,
        }
        students.append(entry)
        if sub and assignment.results_released:
            released_scores.append(sub.final_score)
    students.sort(key=lambda x: x["roll"])
    submitted_count = sum(1 for s in students if s["status"] == "submitted")
    avg_score = round(sum(released_scores) / len(released_scores), 1) if released_scores else None
    top_score = round(max(released_scores), 1) if released_scores else None
    return {
        "id": assignment.id, "name": assignment.name,
        "created_at": assignment.created_at.isoformat(),
        "results_released": assignment.results_released,
        "total_students": len(students), "submitted_count": submitted_count,
        "pending_count": len(students) - submitted_count,
        "avg_score": avg_score, "top_score": top_score, "students": students,
    }

def get_student_portfolio(db: Session, classroom_id: int, student_id: int) -> Optional[Dict[str, Any]]:
    """Aggregates all submission data for a student in a classroom for the teacher analysis view."""
    from sqlmodel import select as sqlselect
    # Verify student is in classroom
    membership = db.exec(
        sqlselect(models.ClassroomStudent)
        .where(models.ClassroomStudent.classroom_id == classroom_id)
        .where(models.ClassroomStudent.student_id == student_id)
    ).first()
    if not membership:
        return None

    student = db.get(models.Student, student_id)
    if not student:
        return None

    # Get all StudentAssignments for this student in this classroom
    student_assignments = db.exec(
        sqlselect(models.StudentAssignment)
        .join(models.Assignment)
        .where(models.StudentAssignment.student_id == student_id)
        .where(models.Assignment.classroom_id == classroom_id)
        .order_by(models.Assignment.created_at)
    ).all()

    assignments_data = []
    total_score = 0.0
    total_quality = 0
    total_test_pass_rate = 0.0
    submitted_count = 0
    best_score = 0.0
    worst_score = 100.0
    error_frequency: Dict[str, int] = {}

    for sa in student_assignments:
        sub = sa.submission
        asg = sa.assignment
        pkg = sa.package

        test_pass_rate = 0.0
        submission_dict = None

        if sub:
            submitted_count += 1
            total_score += sub.final_score
            total_quality += sub.quality_score
            best_score = max(best_score, sub.final_score)
            worst_score = min(worst_score, sub.final_score)

            passed = sum(1 for r in (sub.test_results or []) if r.get("passed"))
            total_tc = len(sub.test_results or [])
            test_pass_rate = (passed / total_tc * 100) if total_tc > 0 else 0.0
            total_test_pass_rate += test_pass_rate

            for err_type, count in (sub.error_counts or {}).items():
                error_frequency[err_type] = error_frequency.get(err_type, 0) + int(count)

            submission_dict = {
                "id": sub.id,
                "submitted_at": sub.submitted_at.isoformat(),
                "final_score": round(sub.final_score, 2),
                "raw_test_score": round(sub.raw_test_score, 2),
                "quality_score": sub.quality_score,
                "error_penalty": sub.error_penalty,
                "error_counts": sub.error_counts or {},
                "quality_comments": sub.quality_comments or [],
                "test_results": sub.test_results or [],
                "test_pass_rate": round(test_pass_rate, 1),
                "code": sub.code,
            }

        assignments_data.append({
            "assignment_id": asg.id,
            "assignment_name": asg.name,
            "package_title": pkg.title if pkg else "Unknown",
            "difficulty": pkg.difficulty if pkg else "unknown",
            "deadline": asg.deadline.isoformat() if asg.deadline else None,
            "created_at": asg.created_at.isoformat(),
            "results_released": asg.results_released,
            "submitted": sub is not None,
            "submission": submission_dict,
        })

    avg_score = round(total_score / submitted_count, 2) if submitted_count > 0 else 0.0
    avg_quality = round(total_quality / submitted_count, 1) if submitted_count > 0 else 0.0
    avg_test_pass_rate = round(total_test_pass_rate / submitted_count, 1) if submitted_count > 0 else 0.0
    completion_rate = round(submitted_count / len(student_assignments) * 100, 1) if student_assignments else 0.0

    return {
        "student": {
            "id": student.id,
            "name": student.name,
            "email": student.email,
            "photo_url": student.photo_url,
            "joined_at": membership.joined_at.isoformat(),
        },
        "summary": {
            "total_assignments": len(student_assignments),
            "submitted_count": submitted_count,
            "avg_score": avg_score,
            "best_score": round(best_score, 2) if submitted_count > 0 else 0.0,
            "worst_score": round(worst_score, 2) if submitted_count > 0 else 0.0,
            "completion_rate": completion_rate,
            "avg_quality_score": avg_quality,
            "avg_test_pass_rate": avg_test_pass_rate,
            "error_frequency": error_frequency,
        },
        "assignments": assignments_data,
    }
