from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import date, datetime
from sqlmodel import SQLModel

class TestCase(SQLModel):
    id: Optional[int] = None
    type: str
    input: str
    expected: str
    points: int

class PackageWithTestcases(BaseModel):
    id: int
    title: str
    prompt: str
    difficulty: str
    testcases: List[TestCase] = []
    class Config:
        from_attributes = True

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

class ReleaseResultsRequest(BaseModel):
    alpha: float = Field(ge=0.0, le=1.0)
    beta: float = Field(ge=0.0, le=1.0)
    gamma: float = Field(ge=0.0)

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

class StudentAssignmentPublic(BaseModel):
    assignment_name: str
    package_title: str
    package_prompt: str
    sample_testcases: List[TestCase]
    has_submitted: bool = False
    results_released: bool = False
    
class StudentLogin(BaseModel):
    roll: int
    dob: str

class StudentAssignmentDetails(BaseModel):
    assignment_id: int
    assignment_name: str
    package_title: str
    has_submitted: bool
    results_released: bool
    final_score: Optional[float] = None

class DobChangeRequest(BaseModel):
    roll: int
    new_dob: str # YYYY-MM-DD
    code: str
    name: Optional[str] = None # Added optional name update

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    new_dob: Optional[str] = None
    code: Optional[str] = None

class TeacherCodeResponse(BaseModel):
    codes: List[str]
    mode: str