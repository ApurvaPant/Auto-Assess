from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import List, Optional
from sqlmodel import Session
from app import crud, schemas, models, auth, assignment_logic, gemini_client, runner, constants
from app.database import get_session
import asyncio
from PIL import Image
import io

api_router = APIRouter()

# --- Teacher Endpoints ---
@api_router.post("/teacher/login", response_model=schemas.Token, tags=["Teacher"])
def login_for_access_token(form_data: schemas.TeacherLogin, db: Session = Depends(get_session)):
    teacher = auth.authenticate_teacher(db, username=form_data.username, password=form_data.password)
    if not teacher:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")
    access_token = auth.create_access_token(data={"sub": teacher.username})
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.post("/teacher/generate_questions", response_model=List[models.Package], tags=["Teacher"])
async def generate_questions_simple(request: schemas.GenerateQuestionsRequest, db: Session = Depends(get_session), current_teacher: models.Teacher = Depends(auth.get_current_teacher)):
    print(f"INFO: Generating {request.n_questions} questions from topic: {request.topic}")
    packages_data = await gemini_client.generate_questions(topic=request.topic, difficulty=request.difficulty, n_questions=request.n_questions, source_material=None)
    created_packages = []
    for pkg_data in packages_data:
        new_pkg = crud.create_package_with_testcases(db=db, package_data=pkg_data)
        if new_pkg:
            created_packages.append(new_pkg)
    return created_packages

@api_router.post("/teacher/generate_from_file", response_model=List[models.Package], tags=["Teacher"])
async def generate_from_file(file: UploadFile = File(...), n_questions: int = Form(5), difficulty: str = Form("medium"), db: Session = Depends(get_session), current_teacher: models.Teacher = Depends(auth.get_current_teacher)):
    print(f"INFO: Generating {n_questions} questions from file: {file.filename}")
    content = await file.read(); mime_type = file.content_type
    if mime_type == "application/pdf":
        source_material = {"mime_type": mime_type, "data": content}
    elif mime_type.startswith("image/"):
        try:
            source_material = Image.open(io.BytesIO(content))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not open image file: {e}")
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type.")
    topic = f"content from file: {file.filename}"
    packages_data = await gemini_client.generate_questions(topic=topic, difficulty=difficulty, n_questions=n_questions, source_material=source_material)
    created_packages = []
    for pkg_data in packages_data:
        new_pkg = crud.create_package_with_testcases(db=db, package_data=pkg_data)
        if new_pkg:
            created_packages.append(new_pkg)
    return created_packages

@api_router.post("/teacher/generate_from_text", response_model=List[models.Package], tags=["Teacher"])
async def generate_from_text(request: schemas.GenerateFromTextRequest, db: Session = Depends(get_session), current_teacher: models.Teacher = Depends(auth.get_current_teacher)):
    print(f"INFO: Generating {request.n_questions} questions from text snippet...")
    packages_data = await gemini_client.generate_questions(topic=request.text, difficulty=request.difficulty, n_questions=request.n_questions, source_material=None)
    created_packages = []
    for pkg_data in packages_data:
        new_pkg = crud.create_package_with_testcases(db=db, package_data=pkg_data)
        if new_pkg:
            created_packages.append(new_pkg)
    return created_packages

@api_router.post("/teacher/create_assignment", response_model=models.Assignment, tags=["Teacher"])
def create_assignment(assignment_data: schemas.AssignmentCreate, db: Session = Depends(get_session), current_teacher: models.Teacher = Depends(auth.get_current_teacher)):
    packages = crud.get_packages_by_ids(db, assignment_data.package_ids)
    if len(packages) != len(assignment_data.package_ids):
        raise HTTPException(status_code=404, detail="One or more package IDs not found.")
    students = crud.get_all_students(db)
    if not students:
        raise HTTPException(status_code=400, detail="No students found to assign.")
    try:
        student_assignments = assignment_logic.assign_packages_to_students(students=students, packages=packages)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return crud.create_assignment_with_mappings(db=db, name=assignment_data.assignment_name, student_assignments_data=student_assignments)

@api_router.get("/teacher/results/{assignment_id}", response_model=List[schemas.SubmissionResult], tags=["Teacher"])
def get_assignment_results(assignment_id: int, db: Session = Depends(get_session), current_teacher: models.Teacher = Depends(auth.get_current_teacher)):
    submissions = crud.get_submissions_for_assignment(db, assignment_id)
    results = []
    for sub in submissions:
        result_with_roll = schemas.SubmissionResult(**sub.model_dump(), roll=sub.student_assignment.student.roll)
        results.append(result_with_roll)
    return results

@api_router.post("/teacher/assignments/{assignment_id}/release", status_code=status.HTTP_204_NO_CONTENT, tags=["Teacher"])
def release_assignment_results(
    assignment_id: int,
    db: Session = Depends(get_session),
    current_teacher: models.Teacher = Depends(auth.get_current_teacher)
):
    assignment = crud.release_results_for_assignment(db, assignment_id=assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return None

@api_router.get("/teacher/codes", response_model=schemas.TeacherCodeResponse, tags=["Teacher"])
def get_teacher_codes(db: Session = Depends(get_session), current_teacher: models.Teacher = Depends(auth.get_current_teacher)):
    if constants.APP_MODE == 'development':
        try:
            with open('seed_codes.txt', 'r') as f:
                codes_list = [line.strip() for line in f.readlines()]
                return schemas.TeacherCodeResponse(codes=codes_list, mode="plaintext")
        except FileNotFoundError:
             print("WARN: seed_codes.txt not found. Falling back to DB.")
    
    codes = crud.get_all_student_codes(db)
    formatted_codes = [f"Roll: {c.student.roll} | User: {c.student.username} | Used: {c.is_used}" for c in codes if c.student]
    return schemas.TeacherCodeResponse(codes=formatted_codes, mode="production")

@api_router.get("/teacher/packages", response_model=List[models.Package], tags=["Teacher"])
def list_packages(db: Session = Depends(get_session), current_teacher: models.Teacher = Depends(auth.get_current_teacher)):
    return crud.get_all_packages(db)

@api_router.get("/teacher/assignments", response_model=List[models.Assignment], tags=["Teacher"])
def list_assignments(db: Session = Depends(get_session), current_teacher: models.Teacher = Depends(auth.get_current_teacher)):
    return crud.get_all_assignments(db)

# --- Student & Public Endpoints ---
@api_router.post("/student/login", response_model=schemas.Token, tags=["Student"])
def login_student(form_data: schemas.StudentLogin, db: Session = Depends(get_session)):
    student = auth.authenticate_student(db, roll=form_data.roll, dob=form_data.dob)
    if not student:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect Roll Number or DOB")
    access_token = auth.create_access_token(data={"sub": str(student.roll)})
    return {"access_token": access_token, "token_type": "bearer"}

# --- THIS IS THE FIX ---
# The dependency is changed from auth.oauth2_scheme (the teacher's)
# to auth.student_oauth2_scheme (the new one we just added).
@api_router.get("/student/assignments", response_model=List[schemas.StudentAssignmentDetails], tags=["Student"])
def get_student_dashboard(db: Session = Depends(get_session), token: str = Depends(auth.student_oauth2_scheme)):
    credentials_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
    try:
        payload = auth.jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        roll: str = payload.get("sub")
        if roll is None: raise credentials_exception
        student_roll = int(roll)
    except (auth.JWTError, ValueError):
        raise credentials_exception
    
    student = crud.get_student_by_roll(db, roll=student_roll)
    if student is None: raise credentials_exception
    
    assignments = crud.get_assignments_for_student(db, student_id=student.id)
    return assignments
# --- END FIX ---

@api_router.get("/student/assignment/{assignment_id}/{roll}", response_model=schemas.StudentAssignmentPublic, tags=["Student"])
def get_student_assignment(assignment_id: int, roll: int, db: Session = Depends(get_session)):
    student_assignment = crud.get_student_assignment(db, assignment_id=assignment_id, student_roll=roll)
    if not student_assignment:
        raise HTTPException(status_code=404, detail="Assignment not found for this student.")
    
    sample_testcases = [tc for tc in student_assignment.package.testcases if tc.type == 'sample']
    
    return schemas.StudentAssignmentPublic(
        assignment_name=student_assignment.assignment.name,
        package_prompt=student_assignment.package.prompt,
        package_title=student_assignment.package.title,
        sample_testcases=sample_testcases,
        has_submitted=(student_assignment.submission is not None),
        results_released=student_assignment.assignment.results_released
    )

@api_router.post("/run", response_model=schemas.RunCodeResponse, tags=["Student"])
async def run_code(run_data: schemas.RunCodeRequest, db: Session = Depends(get_session)):
    student_assignment = crud.get_student_assignment(db, assignment_id=run_data.assignment_id, student_roll=run_data.roll)
    if not student_assignment:
        raise HTTPException(status_code=404, detail="Assignment not found.")
    
    if student_assignment.assignment.results_released:
         raise HTTPException(status_code=403, detail="Cannot run code after results are released.")
    
    sample_testcases = [tc for tc in student_assignment.package.testcases if tc.type == 'sample']
    if not sample_testcases:
        return schemas.RunCodeResponse(overall_output="No sample test cases to run.", results=[])
    
    all_stdout, results = [], []
    for testcase in sample_testcases:
        run_result = runner.run_python_code(run_data.code, testcase.input)
        passed = not run_result.timed_out and not run_result.stderr and run_result.stdout.strip() == testcase.expected.strip()
        if run_result.stdout: all_stdout.append(run_result.stdout)
        if run_result.stderr: all_stdout.append(run_result.stderr)
        results.append(schemas.RunCodeResult(stdout=run_result.stdout, stderr=run_result.stderr, runtime=run_result.runtime, timed_out=run_result.timed_out, passed=passed, testcase_type=testcase.type))
    return schemas.RunCodeResponse(overall_output="\\n".join(all_stdout), results=results)

@api_router.post("/submit", response_model=schemas.SubmissionResult, tags=["Student"])
async def submit_solution(submission_data: schemas.SubmissionCreate, db: Session = Depends(get_session)):
    student_assignment = crud.get_student_assignment(db, assignment_id=submission_data.assignment_id, student_roll=submission_data.roll)
    if not student_assignment:
        raise HTTPException(status_code=404, detail="Assignment not found.")
    
    if student_assignment.assignment.results_released:
        raise HTTPException(status_code=403, detail="Cannot submit after results have been released.")
        
    package = student_assignment.package
    total_points, passed_points = sum(tc.points for tc in package.testcases), 0
    test_results, first_failed_result = [], None
    for testcase in package.testcases:
        run_result = runner.run_python_code(submission_data.code, testcase.input)
        passed = not run_result.timed_out and not run_result.stderr and run_result.stdout.strip() == testcase.expected.strip()
        test_results.append({"testcase_id": testcase.id, "passed": passed, "stdout": run_result.stdout, "stderr": run_result.stderr, "runtime": run_result.runtime, "timed_out": run_result.timed_out, "type": testcase.type})
        if passed: passed_points += testcase.points
        elif first_failed_result is None: first_failed_result = (run_result, testcase)
    
    raw_test_score = (passed_points / total_points) * 100 if total_points > 0 else 0
    
    quality_task = gemini_client.code_quality(submission_data.code)
    error_task = None
    if first_failed_result:
        run_res, tc = first_failed_result
        error_task = gemini_client.classify_error(run_res, submission_data.code, tc)
    
    if error_task:
        quality_result, classification = await asyncio.gather(quality_task, error_task)
    else:
        quality_result = await quality_task
        classification = None

    quality_score = quality_result['score']
    error_penalty, error_counts = 0, {}

    if classification:
        err_type = classification['error_type']
        if err_type in constants.ERROR_SEVERITY:
            num_failed = len([r for r in test_results if not r['passed']])
            error_penalty = constants.ERROR_SEVERITY[err_type]
            error_counts[err_type] = num_failed
    
    final_score = max(0, min(100, (constants.ALPHA * raw_test_score + constants.BETA * quality_score - constants.GAMMA * error_penalty)))

    submission = crud.create_submission(
        db=db,
        student_assignment_id=student_assignment.id,
        submission_data=submission_data,
        results_data={
            "raw_test_score": raw_test_score, "quality_score": quality_score, "error_penalty": error_penalty,
            "final_score": final_score, "test_results": test_results, "quality_comments": quality_result['comments'],
            "error_counts": error_counts
        }
    )
    
    response_data = schemas.SubmissionResult(
        **submission.model_dump(),
        roll=student_assignment.student.roll
    )
    return response_data

@api_router.post("/student/change_dob", tags=["Student"])
def change_student_dob(request: schemas.DobChangeRequest, db: Session = Depends(get_session)):
    is_valid_and_used = crud.validate_and_use_student_code(db, roll=request.roll, plaintext_code=request.code)
    if not is_valid_and_used:
        raise HTTPException(status_code=400, detail="Invalid, expired, or incorrect code provided.")
    student = crud.update_student_dob(db, roll=request.roll, new_dob=request.new_dob)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
    return {"message": f"Password for student roll {request.roll} updated."}