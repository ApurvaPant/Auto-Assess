from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Body
from typing import List, Optional
from sqlmodel import Session
from app import crud, schemas, models, auth, assignment_logic, gemini_client, runner, constants
from app.database import get_session
import asyncio
from PIL import Image
import io

api_router = APIRouter()

@api_router.post("/teacher/login", response_model=schemas.Token, tags=["Teacher"])
def login_for_access_token(form_data: schemas.TeacherLogin, db: Session = Depends(get_session)):
    teacher = auth.authenticate_teacher(db, username=form_data.username, password=form_data.password)
    if not teacher:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")
    access_token = auth.create_access_token(data={"sub": teacher.username})
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.post("/teacher/generate_questions", response_model=List[schemas.PackageWithTestcases], tags=["Teacher"])
async def generate_questions_simple(request: schemas.GenerateQuestionsRequest, db: Session = Depends(get_session), current_teacher: models.Teacher = Depends(auth.get_current_teacher)):
    packages_data = await gemini_client.generate_questions(topic=request.topic, difficulty=request.difficulty, n_questions=request.n_questions, source_material=None)
    created_packages = []
    for pkg_data in packages_data:
        new_pkg = crud.create_package_with_testcases(db=db, package_data=pkg_data)
        if new_pkg: created_packages.append(new_pkg)
    return created_packages

@api_router.post("/teacher/generate_from_file", response_model=List[schemas.PackageWithTestcases], tags=["Teacher"])
async def generate_from_file(file: UploadFile = File(...), n_questions: int = Form(5), difficulty: str = Form("medium"), db: Session = Depends(get_session), current_teacher: models.Teacher = Depends(auth.get_current_teacher)):
    content = await file.read(); mime_type = file.content_type
    if mime_type == "application/pdf": source_material = {"mime_type": mime_type, "data": content}
    elif mime_type.startswith("image/"):
        try: source_material = Image.open(io.BytesIO(content))
        except Exception as e: raise HTTPException(status_code=400, detail=f"Could not open image file: {e}")
    else: raise HTTPException(status_code=400, detail="Unsupported file type.")
    packages_data = await gemini_client.generate_questions(topic=f"file: {file.filename}", difficulty=difficulty, n_questions=n_questions, source_material=source_material)
    created_packages = []
    for pkg_data in packages_data:
        new_pkg = crud.create_package_with_testcases(db=db, package_data=pkg_data)
        if new_pkg: created_packages.append(new_pkg)
    return created_packages

@api_router.post("/teacher/generate_from_text", response_model=List[schemas.PackageWithTestcases], tags=["Teacher"])
async def generate_from_text(request: schemas.GenerateFromTextRequest, db: Session = Depends(get_session), current_teacher: models.Teacher = Depends(auth.get_current_teacher)):
    packages_data = await gemini_client.generate_questions(topic=request.text, difficulty=request.difficulty, n_questions=request.n_questions, source_material=None)
    created_packages = []
    for pkg_data in packages_data:
        new_pkg = crud.create_package_with_testcases(db=db, package_data=pkg_data)
        if new_pkg: created_packages.append(new_pkg)
    return created_packages

@api_router.post("/teacher/create_assignment", response_model=models.Assignment, tags=["Teacher"])
def create_assignment(assignment_data: schemas.AssignmentCreate, db: Session = Depends(get_session), current_teacher: models.Teacher = Depends(auth.get_current_teacher)):
    packages = crud.get_packages_by_ids(db, assignment_data.package_ids)
    students = crud.get_all_students(db)
    if not students: raise HTTPException(status_code=400, detail="No students found.")
    try: student_assignments = assignment_logic.assign_packages_to_students(students=students, packages=packages)
    except ValueError as e: raise HTTPException(status_code=400, detail=str(e))
    return crud.create_assignment_with_mappings(db=db, name=assignment_data.assignment_name, student_assignments_data=student_assignments)

@api_router.get("/teacher/results/{assignment_id}", response_model=List[schemas.SubmissionResult], tags=["Teacher"])
def get_assignment_results(assignment_id: int, db: Session = Depends(get_session), current_teacher: models.Teacher = Depends(auth.get_current_teacher)):
    submissions = crud.get_submissions_for_assignment(db, assignment_id)
    return [schemas.SubmissionResult(**sub.model_dump(), roll=sub.student_assignment.student.roll) for sub in submissions]

@api_router.post("/teacher/assignments/{assignment_id}/release", status_code=status.HTTP_204_NO_CONTENT, tags=["Teacher"])
def release_assignment_results(
    assignment_id: int,
    request: schemas.ReleaseResultsRequest,
    db: Session = Depends(get_session),
    current_teacher: models.Teacher = Depends(auth.get_current_teacher)
):
    assignment = crud.release_results_for_assignment(
        db, 
        assignment_id=assignment_id, 
        alpha=request.alpha, 
        beta=request.beta, 
        gamma=request.gamma
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return None

@api_router.get("/teacher/analyze/{submission_id}", tags=["Teacher"])
async def analyze_student_code(
    submission_id: int,
    db: Session = Depends(get_session),
    current_teacher: models.Teacher = Depends(auth.get_current_teacher)
):
    """Uses AI to analyze student code and returns strong points, weak points, and suggestions."""
    submission = db.get(models.Submission, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Get problem title for context
    problem_title = submission.student_assignment.package.title if submission.student_assignment else ""
    
    # Call AI analysis
    analysis = await gemini_client.analyze_code_feedback(submission.code, problem_title)
    return analysis

@api_router.get("/teacher/codes", response_model=schemas.TeacherCodeResponse, tags=["Teacher"])
def get_teacher_codes(db: Session = Depends(get_session), current_teacher: models.Teacher = Depends(auth.get_current_teacher)):
    if constants.APP_MODE == 'development':
        try:
            with open('seed_codes.txt', 'r') as f: return schemas.TeacherCodeResponse(codes=[l.strip() for l in f.readlines()], mode="plaintext")
        except: pass
    codes = crud.get_all_student_codes(db)
    formatted_codes = [
        f"Roll: {c.student.roll} | Name: {c.student.name or c.student.username} | Uses: {c.uses_remaining}/2 | Used: {c.is_used}" 
        for c in codes if c.student
    ]
    return schemas.TeacherCodeResponse(codes=formatted_codes, mode="production")

@api_router.get("/teacher/packages", response_model=List[schemas.PackageWithTestcases], tags=["Teacher"])
def list_packages(db: Session = Depends(get_session), current_teacher: models.Teacher = Depends(auth.get_current_teacher)):
    return crud.get_all_packages(db)

@api_router.get("/teacher/assignments", response_model=List[models.Assignment], tags=["Teacher"])
def list_assignments(db: Session = Depends(get_session), current_teacher: models.Teacher = Depends(auth.get_current_teacher)):
    return crud.get_all_assignments(db)

@api_router.get("/teacher/stats", tags=["Teacher"])
def get_dashboard_stats(db: Session = Depends(get_session), current_teacher: models.Teacher = Depends(auth.get_current_teacher)):
    return crud.get_dashboard_stats(db)

@api_router.post("/student/login", response_model=schemas.Token, tags=["Student"])
def login_student(form_data: schemas.StudentLogin, db: Session = Depends(get_session)):
    student = auth.authenticate_student(db, roll=form_data.roll, dob=form_data.dob)
    if not student: raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect Roll or DOB")
    return {"access_token": auth.create_access_token(data={"sub": str(student.roll)}), "token_type": "bearer"}

@api_router.get("/student/assignments", response_model=List[schemas.StudentAssignmentDetails], tags=["Student"])
def get_student_dashboard(db: Session = Depends(get_session), token: str = Depends(auth.student_oauth2_scheme)):
    try: roll = int(auth.jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM]).get("sub"))
    except: raise HTTPException(status_code=401, detail="Invalid credentials")
    student = crud.get_student_by_roll(db, roll=roll)
    if not student: raise HTTPException(status_code=401)
    return crud.get_assignments_for_student(db, student_id=student.id)

@api_router.get("/student/assignment/{assignment_id}/{roll}", response_model=schemas.StudentAssignmentPublic, tags=["Student"])
def get_student_assignment(assignment_id: int, roll: int, db: Session = Depends(get_session)):
    sa = crud.get_student_assignment(db, assignment_id=assignment_id, student_roll=roll)
    if not sa: raise HTTPException(status_code=404)
    return schemas.StudentAssignmentPublic(
        assignment_name=sa.assignment.name,
        package_prompt=sa.package.prompt,
        package_title=sa.package.title,
        sample_testcases=[tc for tc in sa.package.testcases if tc.type == 'sample'],
        has_submitted=(sa.submission is not None),
        results_released=sa.assignment.results_released
    )

@api_router.post("/run", response_model=schemas.RunCodeResponse, tags=["Student"])
async def run_code(run_data: schemas.RunCodeRequest, db: Session = Depends(get_session)):
    sa = crud.get_student_assignment(db, assignment_id=run_data.assignment_id, student_roll=run_data.roll)
    if not sa: raise HTTPException(status_code=404)
    if sa.assignment.results_released: raise HTTPException(status_code=403, detail="Results released.")
    sample_tcs = [tc for tc in sa.package.testcases if tc.type == 'sample']
    if not sample_tcs: return schemas.RunCodeResponse(overall_output="No sample cases", results=[])
    
    results = []
    all_stdout = []
    for tc in sample_tcs:
        res = runner.run_python_code(run_data.code, tc.input)
        passed = not res.timed_out and not res.stderr and res.stdout.strip() == tc.expected.strip()
        if res.stdout: all_stdout.append(res.stdout)
        results.append(schemas.RunCodeResult(stdout=res.stdout, stderr=res.stderr, runtime=res.runtime, timed_out=res.timed_out, passed=passed, testcase_type=tc.type))
    return schemas.RunCodeResponse(overall_output="\n".join(all_stdout), results=results)

@api_router.post("/submit", response_model=schemas.SubmissionResult, tags=["Student"])
async def submit_solution(submission_data: schemas.SubmissionCreate, db: Session = Depends(get_session)):
    sa = crud.get_student_assignment(db, assignment_id=submission_data.assignment_id, student_roll=submission_data.roll)
    if not sa: raise HTTPException(status_code=404)
    if sa.assignment.results_released: raise HTTPException(status_code=403, detail="Results released.")
    
    package = sa.package
    total_pts = sum(tc.points for tc in package.testcases)
    passed_pts = 0
    test_results = []
    first_fail = None
    
    for tc in package.testcases:
        res = runner.run_python_code(submission_data.code, tc.input)
        passed = not res.timed_out and not res.stderr and res.stdout.strip() == tc.expected.strip()
        test_results.append({"testcase_id": tc.id, "passed": passed, "stdout": res.stdout, "stderr": res.stderr, "type": tc.type})
        if passed: passed_pts += tc.points
        elif not first_fail: first_fail = (res, tc)
    
    raw_test_score = (passed_pts / total_pts) * 100 if total_pts > 0 else 0
    
    q_task = gemini_client.code_quality(submission_data.code)
    e_task = gemini_client.classify_error(first_fail[0], submission_data.code, first_fail[1]) if first_fail else None
    
    if e_task: q_res, classification = await asyncio.gather(q_task, e_task)
    else: q_res, classification = await q_task, None
    
    quality_score = q_res['score']
    err_penalty, err_counts = 0, {}
    
    if classification and classification['error_type'] in constants.ERROR_SEVERITY:
        err_penalty = constants.ERROR_SEVERITY[classification['error_type']]
        err_counts[classification['error_type']] = 1
    
    final_score = max(0, min(100, (constants.ALPHA * raw_test_score + constants.BETA * quality_score - constants.GAMMA * err_penalty)))
    
    submission = crud.create_submission(
        db=db, student_assignment_id=sa.id, submission_data=submission_data,
        results_data={
            "raw_test_score": raw_test_score, "quality_score": quality_score, "error_penalty": err_penalty,
            "final_score": final_score, "test_results": test_results, "quality_comments": q_res['comments'], "error_counts": err_counts
        }
    )
    return schemas.SubmissionResult(**submission.model_dump(), roll=sa.student.roll)

@api_router.get("/student/analyze/{assignment_id}/{roll}", tags=["Student"])
async def student_analyze_code(assignment_id: int, roll: int, db: Session = Depends(get_session)):
    """Student-accessible AI code analysis. Only works after results are released."""
    sa = crud.get_student_assignment(db, assignment_id=assignment_id, student_roll=roll)
    if not sa: raise HTTPException(status_code=404, detail="Assignment not found")
    if not sa.assignment.results_released: 
        raise HTTPException(status_code=403, detail="AI analysis available after results are released")
    if not sa.submission:
        raise HTTPException(status_code=404, detail="No submission found")
    
    # Get problem title for context
    problem_title = sa.package.title if sa.package else ""
    
    # Call AI analysis
    analysis = await gemini_client.analyze_code_feedback(sa.submission.code, problem_title)
    return analysis

@api_router.post("/student/profile", tags=["Student"])
def update_student_profile(request: schemas.UpdateProfileRequest, db: Session = Depends(get_session), token: str = Depends(auth.student_oauth2_scheme)):
    try: roll = int(auth.jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM]).get("sub"))
    except: raise HTTPException(status_code=401, detail="Invalid credentials")
    
    student = crud.get_student_by_roll(db, roll)
    if not student: raise HTTPException(status_code=404, detail="Student not found")

    # Update Name
    if request.name is not None:
        student.name = request.name
    
    # Update DOB (Password) if provided
    if request.new_dob and request.code:
        if not crud.validate_and_use_student_code(db, roll=roll, plaintext_code=request.code):
             raise HTTPException(status_code=400, detail="Invalid teacher code for password change")
        if not crud.update_student_dob_from_obj(db, student, request.new_dob):
            raise HTTPException(status_code=400, detail="Invalid Date format")

    db.add(student)
    db.commit()
    return {"message": "Profile updated successfully"}

@api_router.get("/student/profile", tags=["Student"])
def get_student_profile(db: Session = Depends(get_session), token: str = Depends(auth.student_oauth2_scheme)):
    try: roll = int(auth.jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM]).get("sub"))
    except: raise HTTPException(status_code=401, detail="Invalid credentials")
    student = crud.get_student_by_roll(db, roll)
    if not student: raise HTTPException(status_code=404)
    return {"roll": student.roll, "name": student.name, "dob": student.dob}