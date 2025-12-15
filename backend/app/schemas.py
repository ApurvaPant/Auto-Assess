from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import date, datetime
# We need to import the base model to avoid circular import issues
from sqlmodel import SQLModel 

# Create a slim version of TestCase for schema use
class TestCase(SQLModel):
    id: Optional[int] = None
    type: str
    input: str
    expected: str
    points: int

class Token(BaseModel):
    access_token: str
    token_type: str

class TeacherLogin(BaseModel):
    username: str
    password: str

class GenerateQuestionsRequest(BaseModel):
    topic: str
    difficulty: str = Field(default="easy", pattern="^(easy|medium|hard)$")
    n_questions: int = Field(gt=0, le=20)

class GenerateFromTextRequest(BaseModel):
    text: str
    difficulty: str = Field(default="easy", pattern="^(easy|medium|hard)$")
    n_questions: int = Field(gt=0, le=20)

class AssignmentCreate(BaseModel):
    assignment_name: str
    package_ids: List[int] = Field(min_length=1)

class SubmissionCreate(BaseModel):
    roll: int
    assignment_id: int
    code: str

class RunCodeRequest(BaseModel):
    roll: int
    assignment_id: int
    code: str

class RunCodeResult(BaseModel):
    stdout: str
    stderr: str
    runtime: float
    timed_out: bool
    passed: bool
    testcase_type: str

class RunCodeResponse(BaseModel):
    overall_output: str
    results: List[RunCodeResult]

class SubmissionResult(BaseModel):
    id: int
    student_assignment_id: int
    roll: int
    final_score: float
    raw_test_score: float
    quality_score: int
    error_penalty: float
    quality_comments: List[str]
    error_counts: Dict[str, Any]
    test_results: List[Dict[str, Any]]
    code: str
    submitted_at: datetime
    class Config:
        from_attributes = True

# --- THIS SCHEMA IS UPDATED ---
class StudentAssignmentPublic(BaseModel):
    assignment_name: str
    package_title: str
    package_prompt: str
    sample_testcases: List[TestCase]
    # This field will lock the editor if true
    has_submitted: bool = False
    # Add this field to lock if results are out
    results_released: bool = False
    
class StudentLogin(BaseModel):
    roll: int
    dob: str

# --- THIS SCHEMA IS UPDATED ---
class StudentAssignmentDetails(BaseModel):
    assignment_id: int
    assignment_name: str
    package_title: str
    has_submitted: bool
    results_released: bool
    final_score: Optional[float] = None # Only show score if released

class DobChangeRequest(BaseModel):
    roll: int
    new_dob: str
    code: str

class TeacherCodeResponse(BaseModel):
    codes: List[str]
    mode: str