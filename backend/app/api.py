from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, UploadFile, File, Form, Body, Query
from typing import List, Optional
from sqlmodel import Session, select
from app import crud, schemas, models, auth, assignment_logic, gemini_client, constants, email_service, runner
from app.database import get_session
import asyncio
from datetime import datetime
from PIL import Image
import io

api_router = APIRouter()

# ── Output comparison helper ──────────────────────────────────────────────────
def _outputs_match(actual: str, expected: str) -> bool:
    """
    Compare student output to expected output.

    Handles the most common format mismatches that occur with function-based
    submissions:
      • Trailing / leading whitespace (always stripped)
      • Numeric formatting: '2.0' vs '2', '1.000' vs '1', '-0.0' vs '0'

    Does NOT normalise string case or reorder lines — those are real differences.
    """
    a, e = actual.strip(), expected.strip()
    if a == e:
        return True

    a_lines, e_lines = a.splitlines(), e.splitlines()
    if len(a_lines) != len(e_lines):
        return False

    for al, el in zip(a_lines, e_lines):
        al, el = al.strip(), el.strip()
        if al == el:
            continue
        # Try numeric comparison (handles 2.0==2, 1.5==1.50, etc.)
        try:
            if float(al) == float(el):
                continue
        except (ValueError, TypeError):
            pass
        return False

    return True

# ─── Public Config ────────────────────────────────────────────────────────────
@api_router.get("/config", tags=["Public"])
def get_config():
    """Returns public client-side config (e.g. Google Client ID)."""
    return {"google_client_id": constants.GOOGLE_CLIENT_ID}

# ─── Teacher Auth ─────────────────────────────────────────────────────────────
@api_router.post("/teacher/login", response_model=schemas.Token, tags=["Teacher"])
def login_teacher(form_data: schemas.TeacherLogin, db: Session = Depends(get_session)):
    teacher = auth.authenticate_teacher(db, username=form_data.username, password=form_data.password)
    if not teacher:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")
    return {"access_token": auth.create_access_token(data={"sub": teacher.username}), "token_type": "bearer"}

# ─── Classrooms ───────────────────────────────────────────────────────────────
@api_router.post("/teacher/classrooms", tags=["Teacher"])
def create_classroom(data: schemas.ClassroomCreate, db: Session = Depends(get_session), teacher: models.Teacher = Depends(auth.get_current_teacher)):
    classroom = crud.create_classroom(db, name=data.name, teacher_id=teacher.id)
    return {"id": classroom.id, "name": classroom.name, "code": classroom.code, "created_at": classroom.created_at.isoformat()}

@api_router.get("/teacher/classrooms", tags=["Teacher"])
def list_classrooms(db: Session = Depends(get_session), teacher: models.Teacher = Depends(auth.get_current_teacher)):
    return crud.get_classrooms_for_teacher(db, teacher.id)

@api_router.delete("/teacher/classrooms/{classroom_id}", tags=["Teacher"])
def delete_classroom(classroom_id: int, db: Session = Depends(get_session), teacher: models.Teacher = Depends(auth.get_current_teacher)):
    if not crud.delete_classroom(db, classroom_id, teacher.id):
        raise HTTPException(status_code=404, detail="Classroom not found")
    return {"ok": True}

@api_router.get("/teacher/classrooms/{classroom_id}/students", tags=["Teacher"])
def list_classroom_students(classroom_id: int, db: Session = Depends(get_session), teacher: models.Teacher = Depends(auth.get_current_teacher)):
    students = crud.get_classroom_students(db, classroom_id)
    return [{"id": s.id, "name": s.name, "email": s.email, "photo_url": s.photo_url} for s in students]

# ─── Packages ─────────────────────────────────────────────────────────────────
@api_router.post("/teacher/generate_questions", response_model=List[schemas.PackageWithTestcases], tags=["Teacher"])
async def generate_questions_simple(request: schemas.GenerateQuestionsRequest, db: Session = Depends(get_session), teacher: models.Teacher = Depends(auth.get_current_teacher)):
    packages_data = await gemini_client.generate_questions(topic=request.topic, difficulty=request.difficulty, n_questions=request.n_questions, source_material=None)
    created = []
    for pkg_data in packages_data:
        new_pkg = crud.create_package_with_testcases(db, pkg_data, classroom_id=request.classroom_id)
        if new_pkg: created.append(new_pkg)
    return created

@api_router.post("/teacher/generate_from_file", response_model=List[schemas.PackageWithTestcases], tags=["Teacher"])
async def generate_from_file(
    file: UploadFile = File(...),
    n_questions: int = Form(5),
    difficulty: str = Form("medium"),
    classroom_id: Optional[int] = Form(None),
    db: Session = Depends(get_session),
    teacher: models.Teacher = Depends(auth.get_current_teacher)
):
    content = await file.read(); mime_type = file.content_type
    if mime_type == "application/pdf": source_material = {"mime_type": mime_type, "data": content}
    elif mime_type.startswith("image/"):
        try: source_material = Image.open(io.BytesIO(content))
        except Exception as e: raise HTTPException(status_code=400, detail=f"Could not open image file: {e}")
    else: raise HTTPException(status_code=400, detail="Unsupported file type.")
    packages_data = await gemini_client.generate_questions(topic=f"file: {file.filename}", difficulty=difficulty, n_questions=n_questions, source_material=source_material)
    created = []
    for pkg_data in packages_data:
        new_pkg = crud.create_package_with_testcases(db, pkg_data, classroom_id=classroom_id)
        if new_pkg: created.append(new_pkg)
    return created

@api_router.post("/teacher/generate_from_text", response_model=List[schemas.PackageWithTestcases], tags=["Teacher"])
async def generate_from_text(request: schemas.GenerateFromTextRequest, db: Session = Depends(get_session), teacher: models.Teacher = Depends(auth.get_current_teacher)):
    packages_data = await gemini_client.generate_questions(topic=request.text, difficulty=request.difficulty, n_questions=request.n_questions, source_material=None)
    created = []
    for pkg_data in packages_data:
        new_pkg = crud.create_package_with_testcases(db, pkg_data, classroom_id=request.classroom_id)
        if new_pkg: created.append(new_pkg)
    return created

@api_router.get("/teacher/packages", response_model=List[schemas.PackageWithTestcases], tags=["Teacher"])
def list_packages(classroom_id: Optional[int] = Query(None), db: Session = Depends(get_session), teacher: models.Teacher = Depends(auth.get_current_teacher)):
    return crud.get_all_packages(db, classroom_id=classroom_id)

@api_router.delete("/teacher/packages", tags=["Teacher"])
def delete_selected_packages(package_ids: List[int] = Body(...), db: Session = Depends(get_session), teacher: models.Teacher = Depends(auth.get_current_teacher)):
    return {"deleted": crud.delete_packages_by_ids(db, package_ids)}

@api_router.delete("/teacher/packages/all", tags=["Teacher"])
def delete_all_packages(classroom_id: Optional[int] = Query(None), db: Session = Depends(get_session), teacher: models.Teacher = Depends(auth.get_current_teacher)):
    return {"deleted": crud.delete_all_packages(db, classroom_id=classroom_id)}

# ─── Assignments ──────────────────────────────────────────────────────────────
@api_router.post("/teacher/create_assignment", response_model=models.Assignment, tags=["Teacher"])
def create_assignment(data: schemas.AssignmentCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_session), teacher: models.Teacher = Depends(auth.get_current_teacher)):
    packages = crud.get_packages_by_ids(db, data.package_ids)
    students = crud.get_classroom_students(db, data.classroom_id)
    if not students: raise HTTPException(status_code=400, detail="No students in this classroom.")
    try: sa_data = assignment_logic.assign_packages_to_students(students=students, packages=packages)
    except ValueError as e: raise HTTPException(status_code=400, detail=str(e))
    assignment = crud.create_assignment_with_mappings(db, name=data.assignment_name, student_assignments_data=sa_data, classroom_id=data.classroom_id, deadline=data.deadline)
    classroom = crud.get_classroom_by_id(db, data.classroom_id)
    classroom_name = classroom.name if classroom else ""
    deadline_str = data.deadline.strftime("%d %b %Y, %I:%M %p") if data.deadline else ""
    students_data = [{"email": s.email, "name": s.name} for s in students]
    background_tasks.add_task(email_service.notify_assignment_created, students_data, data.assignment_name, classroom_name, deadline_str)
    return assignment

@api_router.get("/teacher/assignments", response_model=List[models.Assignment], tags=["Teacher"])
def list_assignments(classroom_id: Optional[int] = Query(None), db: Session = Depends(get_session), teacher: models.Teacher = Depends(auth.get_current_teacher)):
    return crud.get_all_assignments(db, classroom_id=classroom_id)

@api_router.delete("/teacher/assignments/{assignment_id}", tags=["Teacher"])
def delete_assignment(assignment_id: int, db: Session = Depends(get_session), teacher: models.Teacher = Depends(auth.get_current_teacher)):
    if not crud.delete_assignment(db, assignment_id):
        raise HTTPException(status_code=404, detail="Assignment not found")
    return {"ok": True}

@api_router.get("/teacher/assignments/{assignment_id}/details", tags=["Teacher"])
def get_assignment_details(assignment_id: int, db: Session = Depends(get_session), teacher: models.Teacher = Depends(auth.get_current_teacher)):
    details = crud.get_assignment_details(db, assignment_id)
    if not details: raise HTTPException(status_code=404, detail="Assignment not found")
    return details

# ─── Results ──────────────────────────────────────────────────────────────────
@api_router.get("/teacher/results/{assignment_id}", response_model=List[schemas.SubmissionResult], tags=["Teacher"])
def get_assignment_results(assignment_id: int, db: Session = Depends(get_session), teacher: models.Teacher = Depends(auth.get_current_teacher)):
    submissions = crud.get_submissions_for_assignment(db, assignment_id)
    result = []
    for sub in submissions:
        student = sub.student_assignment.student
        result.append(schemas.SubmissionResult(
            **sub.model_dump(),
            student_id=student.id,
            student_name=student.name or student.email,
            student_photo_url=student.photo_url,
        ))
    return result

@api_router.post("/teacher/assignments/{assignment_id}/release", status_code=status.HTTP_204_NO_CONTENT, tags=["Teacher"])
def release_results(assignment_id: int, request: schemas.ReleaseResultsRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_session), teacher: models.Teacher = Depends(auth.get_current_teacher)):
    assignment = crud.release_results_for_assignment(db, assignment_id, alpha=request.alpha, beta=request.beta, gamma=request.gamma)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    submissions = crud.get_submissions_for_assignment(db, assignment_id)
    submissions_data = [
        {"email": sub.student_assignment.student.email, "name": sub.student_assignment.student.name, "final_score": sub.final_score}
        for sub in submissions
        if sub.student_assignment and sub.student_assignment.student
    ]
    background_tasks.add_task(email_service.notify_results_released, submissions_data, assignment.name)

@api_router.get("/teacher/assignments/{assignment_id}/plagiarism", tags=["Teacher"])
async def check_plagiarism(assignment_id: int, db: Session = Depends(get_session), teacher: models.Teacher = Depends(auth.get_current_teacher)):
    submissions = crud.get_submissions_for_assignment(db, assignment_id)
    if not submissions: raise HTTPException(status_code=404, detail="No submissions found.")
    problem_title = submissions[0].student_assignment.package.title if submissions[0].student_assignment and submissions[0].student_assignment.package else ""
    submission_data = [{"roll": sub.student_assignment.student.id, "code": sub.code} for sub in submissions]
    return await gemini_client.check_plagiarism(submission_data, problem_title)

@api_router.get("/teacher/analyze/{submission_id}", tags=["Teacher"])
async def analyze_code(submission_id: int, db: Session = Depends(get_session), teacher: models.Teacher = Depends(auth.get_current_teacher)):
    submission = db.get(models.Submission, submission_id)
    if not submission: raise HTTPException(status_code=404, detail="Submission not found")
    problem_title = submission.student_assignment.package.title if submission.student_assignment else ""
    return await gemini_client.analyze_code_feedback(submission.code, problem_title)

@api_router.get("/teacher/ai-detect/{submission_id}", tags=["Teacher"])
async def detect_ai(submission_id: int, db: Session = Depends(get_session), teacher: models.Teacher = Depends(auth.get_current_teacher)):
    submission = db.get(models.Submission, submission_id)
    if not submission: raise HTTPException(status_code=404, detail="Submission not found")
    problem_title = submission.student_assignment.package.title if submission.student_assignment else ""
    return await gemini_client.detect_ai_content(submission.code, problem_title)

@api_router.get("/teacher/classrooms/{classroom_id}/students/{student_id}/portfolio", tags=["Teacher"])
def get_student_portfolio(classroom_id: int, student_id: int, db: Session = Depends(get_session), teacher: models.Teacher = Depends(auth.get_current_teacher)):
    portfolio = crud.get_student_portfolio(db, classroom_id=classroom_id, student_id=student_id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Student not found in this classroom")
    return portfolio

@api_router.post("/teacher/classrooms/{classroom_id}/students/{student_id}/ai-insights", tags=["Teacher"])
async def generate_student_ai_insights(classroom_id: int, student_id: int, db: Session = Depends(get_session), teacher: models.Teacher = Depends(auth.get_current_teacher)):
    portfolio = crud.get_student_portfolio(db, classroom_id=classroom_id, student_id=student_id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Student not found in this classroom")
    submitted_subs = [
        {**a["submission"], "assignment_name": a["assignment_name"], "difficulty": a["difficulty"]}
        for a in portfolio["assignments"] if a["submitted"] and a["submission"]
    ]
    return await gemini_client.analyze_student_portfolio(
        student_name=portfolio["student"]["name"],
        submissions=submitted_subs,
        summary=portfolio["summary"]
    )

@api_router.get("/teacher/stats", tags=["Teacher"])
def get_stats(classroom_id: Optional[int] = Query(None), db: Session = Depends(get_session), teacher: models.Teacher = Depends(auth.get_current_teacher)):
    return crud.get_dashboard_stats(db, classroom_id=classroom_id)

# ─── Student Auth ─────────────────────────────────────────────────────────────
@api_router.post("/student/signup", response_model=schemas.Token, tags=["Student"])
def signup_student(data: schemas.StudentSignup, db: Session = Depends(get_session)):
    if crud.get_student_by_email(db, data.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    student = crud.create_student(db, email=data.email, name=data.name, hashed_password=auth.get_password_hash(data.password))
    return {"access_token": auth.create_access_token(data={"sub": str(student.id)}), "token_type": "bearer"}

@api_router.post("/student/login", response_model=schemas.Token, tags=["Student"])
def login_student(data: schemas.StudentLogin, db: Session = Depends(get_session)):
    student = auth.authenticate_student(db, email=data.email, password=data.password)
    if not student: raise HTTPException(status_code=401, detail="Incorrect email or password")
    return {"access_token": auth.create_access_token(data={"sub": str(student.id)}), "token_type": "bearer"}

@api_router.post("/student/google-auth", response_model=schemas.Token, tags=["Student"])
def google_auth_student(body: schemas.GoogleAuthRequest, db: Session = Depends(get_session)):
    if not constants.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google Sign-In is not configured on this server.")
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as grequests
        id_info = id_token.verify_oauth2_token(body.credential, grequests.Request(), constants.GOOGLE_CLIENT_ID)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Google token.")
    email = id_info.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email.")
    student = crud.get_student_by_email(db, email=email)
    if not student:
        name = id_info.get("name") or email.split("@")[0]
        picture = id_info.get("picture")
        student = crud.create_google_student(db, email=email, name=name, photo_url=picture)
    return {"access_token": auth.create_access_token(data={"sub": str(student.id)}), "token_type": "bearer"}

# ─── Student Classrooms ──────────────────────────────────────────────────────
@api_router.post("/student/join", tags=["Student"])
def join_classroom(data: schemas.JoinClassroomRequest, db: Session = Depends(get_session), student: models.Student = Depends(auth.get_current_student)):
    classroom = crud.get_classroom_by_code(db, data.code)
    if not classroom: raise HTTPException(status_code=404, detail="Invalid classroom code")
    crud.join_classroom(db, student.id, classroom.id)
    return {"message": f"Joined '{classroom.name}'", "classroom_id": classroom.id, "classroom_name": classroom.name}

@api_router.get("/student/classrooms", tags=["Student"])
def student_classrooms(db: Session = Depends(get_session), student: models.Student = Depends(auth.get_current_student)):
    return crud.get_classrooms_for_student(db, student.id)

# ─── Student Assignments ──────────────────────────────────────────────────────
@api_router.get("/student/assignments", response_model=List[schemas.StudentAssignmentDetails], tags=["Student"])
def get_student_assignments(classroom_id: Optional[int] = Query(None), db: Session = Depends(get_session), student: models.Student = Depends(auth.get_current_student)):
    return crud.get_assignments_for_student(db, student.id, classroom_id=classroom_id)

@api_router.get("/student/assignment/{assignment_id}", response_model=schemas.StudentAssignmentPublic, tags=["Student"])
def get_student_assignment(assignment_id: int, db: Session = Depends(get_session), student: models.Student = Depends(auth.get_current_student)):
    sa = crud.get_student_assignment(db, assignment_id=assignment_id, student_id=student.id)
    if not sa: raise HTTPException(status_code=404)
    return schemas.StudentAssignmentPublic(
        assignment_name=sa.assignment.name,
        package_prompt=sa.package.prompt,
        package_title=sa.package.title,
        sample_testcases=[tc for tc in sa.package.testcases if tc.type == 'sample'],
        has_submitted=(sa.submission is not None),
        results_released=sa.assignment.results_released,
        deadline=sa.assignment.deadline,
    )

# ─── Run / Submit ─────────────────────────────────────────────────────────────
@api_router.post("/run", response_model=schemas.RunCodeResponse, tags=["Student"])
async def run_code(run_data: schemas.RunCodeRequest, db: Session = Depends(get_session), student: models.Student = Depends(auth.get_current_student)):
    sa = crud.get_student_assignment(db, assignment_id=run_data.assignment_id, student_id=student.id)
    if not sa: raise HTTPException(status_code=404)
    if sa.assignment.results_released: raise HTTPException(status_code=403, detail="Results released.")
    if sa.assignment.deadline and datetime.utcnow() > sa.assignment.deadline:
        raise HTTPException(status_code=403, detail="Submission deadline has passed.")
    sample_tcs = [tc for tc in sa.package.testcases if tc.type == 'sample']
    if not sample_tcs:
        return schemas.RunCodeResponse(overall_output="No sample test cases found.", results=[])
    loop = asyncio.get_running_loop()
    run_results = await asyncio.gather(*[
        loop.run_in_executor(None, runner.run_python_code, run_data.code, tc.input or "")
        for tc in sample_tcs
    ])
    results, all_stdout = [], []
    for tc, res in zip(sample_tcs, run_results):
        stdout, stderr, timed_out = res.stdout, res.stderr, res.timed_out
        passed = not timed_out and not stderr and _outputs_match(stdout, tc.expected)
        if stdout: all_stdout.append(stdout)
        results.append(schemas.RunCodeResult(stdout=stdout, stderr=stderr, runtime=res.runtime, timed_out=timed_out, passed=passed, testcase_type=tc.type, explanation=""))
    return schemas.RunCodeResponse(overall_output="\n".join(all_stdout), results=results)

@api_router.post("/submit", response_model=schemas.SubmissionResult, tags=["Student"])
async def submit_solution(submission_data: schemas.SubmissionCreate, db: Session = Depends(get_session), student: models.Student = Depends(auth.get_current_student)):
    sa = crud.get_student_assignment(db, assignment_id=submission_data.assignment_id, student_id=student.id)
    if not sa: raise HTTPException(status_code=404)
    if sa.submission: raise HTTPException(status_code=409, detail="You have already submitted this assignment.")
    if sa.assignment.results_released: raise HTTPException(status_code=403, detail="Results released.")
    if sa.assignment.deadline and datetime.utcnow() > sa.assignment.deadline:
        raise HTTPException(status_code=403, detail="Submission deadline has passed.")
    package = sa.package
    loop = asyncio.get_running_loop()
    run_results, q_res = await asyncio.gather(
        asyncio.gather(*[
            loop.run_in_executor(None, runner.run_python_code, submission_data.code, tc.input or "")
            for tc in package.testcases
        ]),
        gemini_client.code_quality(submission_data.code)
    )
    total_pts, passed_pts = sum(tc.points for tc in package.testcases), 0
    test_results = []
    any_stderr, any_timeout, has_syntax_error = False, False, False
    for tc, res in zip(package.testcases, run_results):
        stdout, stderr, timed_out = res.stdout, res.stderr, res.timed_out
        if "SyntaxError" in stderr or "IndentationError" in stderr:
            has_syntax_error = True
        passed = not timed_out and not stderr and _outputs_match(stdout, tc.expected)
        if passed: passed_pts += tc.points
        if stderr: any_stderr = True
        if timed_out: any_timeout = True
        test_results.append({"testcase_id": tc.id, "passed": passed, "stdout": stdout, "stderr": stderr, "type": tc.type, "explanation": "", "input": tc.input if tc.type != "hidden" else None, "expected": tc.expected if tc.type != "hidden" else None})
    raw_test_score = (passed_pts / total_pts) * 100 if total_pts > 0 else 0
    if has_syntax_error: error_type = "compile_error"
    elif any_timeout: error_type = "timeout"
    elif any_stderr: error_type = "runtime_error"
    elif raw_test_score < 100: error_type = "wrong_output"
    else: error_type = None
    quality_score = q_res['score']
    err_penalty = constants.ERROR_SEVERITY.get(error_type, 0) if error_type else 0
    err_counts = {error_type: 1} if error_type else {}
    final_score = max(0, min(100, constants.ALPHA * raw_test_score + constants.BETA * quality_score - constants.GAMMA * err_penalty))
    submission = crud.create_submission(
        db=db, student_assignment_id=sa.id, submission_data=submission_data,
        results_data={"raw_test_score": raw_test_score, "quality_score": quality_score, "error_penalty": err_penalty, "final_score": final_score, "test_results": test_results, "quality_comments": q_res['comments'], "error_counts": err_counts}
    )
    return schemas.SubmissionResult(**submission.model_dump(), student_id=student.id)

# ─── Student Results ──────────────────────────────────────────────────────────
@api_router.get("/student/result/{assignment_id}", response_model=schemas.SubmissionResult, tags=["Student"])
def get_student_result(assignment_id: int, db: Session = Depends(get_session), student: models.Student = Depends(auth.get_current_student)):
    sa = crud.get_student_assignment(db, assignment_id=assignment_id, student_id=student.id)
    if not sa: raise HTTPException(status_code=404, detail="Assignment not found")
    if not sa.assignment.results_released: raise HTTPException(status_code=403, detail="Results not released yet")
    if not sa.submission: raise HTTPException(status_code=404, detail="No submission found")
    submission_dict = sa.submission.model_dump()
    # Results are released — reveal hidden test case input/expected from the DB
    if sa.package and sa.package.testcases:
        tc_map = {tc.id: tc for tc in sa.package.testcases}
        enriched = []
        for tr in (submission_dict.get("test_results") or []):
            tc = tc_map.get(tr.get("testcase_id"))
            if tc and tr.get("type") == "hidden":
                tr = {**tr, "input": tc.input, "expected": tc.expected}
            enriched.append(tr)
        submission_dict["test_results"] = enriched
    return schemas.SubmissionResult(**submission_dict, student_id=student.id)

@api_router.get("/student/analyze/{assignment_id}", tags=["Student"])
async def student_analyze(assignment_id: int, db: Session = Depends(get_session), student: models.Student = Depends(auth.get_current_student)):
    sa = crud.get_student_assignment(db, assignment_id=assignment_id, student_id=student.id)
    if not sa: raise HTTPException(status_code=404)
    if not sa.assignment.results_released: raise HTTPException(status_code=403, detail="Available after results are released")
    if not sa.submission: raise HTTPException(status_code=404, detail="No submission found")
    return await gemini_client.analyze_code_feedback(sa.submission.code, sa.package.title if sa.package else "")

# ─── Class Analysis ───────────────────────────────────────────────────────────
@api_router.get("/teacher/classrooms/{classroom_id}/class-analysis", tags=["Teacher"])
def get_class_analysis(classroom_id: int, db: Session = Depends(get_session), teacher: models.Teacher = Depends(auth.get_current_teacher)):
    return crud.get_class_analysis(db, classroom_id=classroom_id)

# ─── Student Profile ──────────────────────────────────────────────────────────
@api_router.get("/student/profile", tags=["Student"])
def get_profile(db: Session = Depends(get_session), student: models.Student = Depends(auth.get_current_student)):
    return {"id": student.id, "email": student.email, "name": student.name, "photo_url": student.photo_url}

@api_router.post("/student/profile", tags=["Student"])
def update_profile(request: schemas.UpdateProfileRequest, db: Session = Depends(get_session), student: models.Student = Depends(auth.get_current_student)):
    if request.name is not None:
        student.name = request.name
    if request.new_password and request.current_password:
        if not auth.verify_password(request.current_password, student.hashed_password):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        student.hashed_password = auth.get_password_hash(request.new_password)
    db.add(student); db.commit()
    return {"message": "Profile updated"}

@api_router.post("/student/profile/photo", tags=["Student"])
async def upload_profile_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
    student: models.Student = Depends(auth.get_current_student)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed.")
    content = await file.read()
    if len(content) > 2 * 1024 * 1024:  # 2 MB limit
        raise HTTPException(status_code=400, detail="Image must be smaller than 2 MB.")
    import base64
    b64 = base64.b64encode(content).decode("utf-8")
    student.photo_url = f"data:{file.content_type};base64,{b64}"
    db.add(student)
    db.commit()
    return {"photo_url": student.photo_url}

# ─── Doubts - Student ─────────────────────────────────────────────────────────
@api_router.post("/student/classroom/{classroom_id}/doubts", tags=["Doubts"])
def ask_doubt(classroom_id: int, data: schemas.DoubtCreate, db: Session = Depends(get_session), student: models.Student = Depends(auth.get_current_student)):
    membership = db.exec(select(models.ClassroomStudent).where(models.ClassroomStudent.student_id == student.id, models.ClassroomStudent.classroom_id == classroom_id)).first()
    if not membership:
        raise HTTPException(status_code=403, detail="You are not in this classroom")
    doubt = crud.create_doubt(db, student.id, classroom_id, data.question, data.assignment_id)
    return {"id": doubt.id, "message": "Doubt submitted successfully"}

@api_router.get("/student/classroom/{classroom_id}/doubts", tags=["Doubts"])
def get_student_doubts(classroom_id: int, db: Session = Depends(get_session), student: models.Student = Depends(auth.get_current_student)):
    doubts = crud.get_doubts_for_student(db, student.id, classroom_id)
    result = []
    for d in doubts:
        assignment_name = None
        if d.assignment_id:
            asgn = db.get(models.Assignment, d.assignment_id)
            if asgn:
                assignment_name = asgn.name
        result.append({"id": d.id, "question": d.question, "reply": d.reply, "assignment_id": d.assignment_id, "assignment_name": assignment_name, "created_at": d.created_at.isoformat(), "replied_at": d.replied_at.isoformat() if d.replied_at else None})
    return result

# ─── Doubts - Teacher ─────────────────────────────────────────────────────────
@api_router.get("/teacher/classroom/{classroom_id}/doubts", tags=["Doubts"])
def get_classroom_doubts(classroom_id: int, db: Session = Depends(get_session), teacher: models.Teacher = Depends(auth.get_current_teacher)):
    doubts = crud.get_doubts_for_classroom(db, classroom_id)
    result = []
    for d in doubts:
        student = db.get(models.Student, d.student_id)
        assignment_name = None
        if d.assignment_id:
            asgn = db.get(models.Assignment, d.assignment_id)
            if asgn:
                assignment_name = asgn.name
        result.append({"id": d.id, "question": d.question, "reply": d.reply, "student_name": (student.name or student.email) if student else "Unknown", "student_photo_url": student.photo_url if student else None, "assignment_id": d.assignment_id, "assignment_name": assignment_name, "created_at": d.created_at.isoformat(), "replied_at": d.replied_at.isoformat() if d.replied_at else None})
    return result

@api_router.post("/teacher/doubts/{doubt_id}/reply", tags=["Doubts"])
def reply_to_doubt(doubt_id: int, data: schemas.DoubtReply, background_tasks: BackgroundTasks, db: Session = Depends(get_session), teacher: models.Teacher = Depends(auth.get_current_teacher)):
    doubt = crud.reply_to_doubt(db, doubt_id, data.reply)
    if not doubt:
        raise HTTPException(status_code=404, detail="Doubt not found")
    student = doubt.student
    assignment_name = doubt.assignment.name if doubt.assignment_id and doubt.assignment else ""
    background_tasks.add_task(
        email_service.notify_doubt_replied,
        student.email, student.name, doubt.question, data.reply, assignment_name,
    )
    return {"message": "Reply sent"}
