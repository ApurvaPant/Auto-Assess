from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
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

# ─── Teacher ──────────────────────────────────────────────────────────────────
class TeacherLogin(BaseModel):
    username: str
    password: str

class GenerateQuestionsRequest(BaseModel):
    topic: str
    difficulty: str = Field(default="easy", pattern="^(easy|medium|hard)$")
    n_questions: int = Field(gt=0, le=20)
    classroom_id: int

class GenerateFromTextRequest(BaseModel):
    text: str
    difficulty: str = Field(default="easy", pattern="^(easy|medium|hard)$")
    n_questions: int = Field(gt=0, le=20)
    classroom_id: int

class AssignmentCreate(BaseModel):
    assignment_name: str
    package_ids: List[int] = Field(min_length=1)
    classroom_id: int
    deadline: Optional[datetime] = None

class ReleaseResultsRequest(BaseModel):
    alpha: float = Field(ge=0.0, le=1.0)
    beta: float = Field(ge=0.0, le=1.0)
    gamma: float = Field(ge=0.0)

class ClassroomCreate(BaseModel):
    name: str

class ClassroomPublic(BaseModel):
    id: int
    name: str
    code: str
    created_at: datetime
    student_count: int = 0
    assignment_count: int = 0
    class Config:
        from_attributes = True

# ─── Student ──────────────────────────────────────────────────────────────────
class StudentSignup(BaseModel):
    email: str
    name: str
    password: str

class StudentLogin(BaseModel):
    email: str
    password: str

class JoinClassroomRequest(BaseModel):
    code: str

class StudentClassroomPublic(BaseModel):
    id: int
    name: str
    code: str
    teacher_name: str = ""
    assignment_count: int = 0

class StudentAssignmentDetails(BaseModel):
    assignment_id: int
    assignment_name: str
    package_title: str
    has_submitted: bool
    results_released: bool
    final_score: Optional[float] = None
    classroom_name: Optional[str] = None
    deadline: Optional[datetime] = None

class StudentAssignmentPublic(BaseModel):
    assignment_name: str
    package_title: str
    package_prompt: str
    sample_testcases: List[TestCase]
    has_submitted: bool = False
    results_released: bool = False
    deadline: Optional[datetime] = None

# ─── Submission / Run ─────────────────────────────────────────────────────────
class SubmissionCreate(BaseModel):
    assignment_id: int
    code: str

class RunCodeRequest(BaseModel):
    assignment_id: int
    code: str

class RunCodeResult(BaseModel):
    stdout: str
    stderr: str
    runtime: float
    timed_out: bool
    passed: bool
    testcase_type: str
    explanation: str = ""

class RunCodeResponse(BaseModel):
    overall_output: str
    results: List[RunCodeResult]

class SubmissionResult(BaseModel):
    id: int
    student_assignment_id: int
    student_id: int
    student_name: Optional[str] = None
    student_photo_url: Optional[str] = None
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

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None



# ─── Doubts ───────────────────────────────────────────────────────────────────
class DoubtCreate(BaseModel):
    question: str
    assignment_id: Optional[int] = None

class DoubtReply(BaseModel):
    reply: str

class DoubtPublic(BaseModel):
    id: int
    question: str
    reply: Optional[str] = None
    student_name: Optional[str] = None
    assignment_id: Optional[int] = None
    assignment_name: Optional[str] = None
    created_at: datetime
    replied_at: Optional[datetime] = None
    class Config:
        from_attributes = True
