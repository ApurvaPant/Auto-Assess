from typing import List, Optional, Dict, Any
from sqlmodel import Field, SQLModel, Relationship, JSON, Column
from datetime import date, datetime

# --- User Models ---

class Teacher(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    hashed_password: str

class Student(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    roll: int = Field(unique=True, index=True)
    username: str = Field(unique=True, index=True)
    dob: date 
    hashed_dob: str 
    student_assignments: List["StudentAssignment"] = Relationship(back_populates="student")
    
    # Relationship for 72-code system
    teacher_code: Optional["TeacherCode"] = Relationship(back_populates="student")

class TeacherCode(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_code: str = Field(unique=True)
    is_used: bool = Field(default=False)
    student_id: Optional[int] = Field(default=None, foreign_key="student.id", unique=True)
    student: Optional["Student"] = Relationship(back_populates="teacher_code")

# --- Content Models ---

class Package(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    prompt: str
    difficulty: str
    testcases: List["TestCase"] = Relationship(back_populates="package")
    student_assignments: List["StudentAssignment"] = Relationship(back_populates="package")

class TestCase(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    type: str
    input: str = Field(default="")
    expected: str = Field(default="")
    points: int
    package_id: int = Field(foreign_key="package.id")
    package: "Package" = Relationship(back_populates="testcases")

# --- Assignment & Submission Models ---

# --- THIS MODEL IS UPDATED ---
class Assignment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # --- ADD THIS LINE ---
    results_released: bool = Field(default=False)

    student_assignments: List["StudentAssignment"] = Relationship(back_populates="assignment")
# --- END UPDATE ---

class StudentAssignment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    student_id: int = Field(foreign_key="student.id")
    package_id: int = Field(foreign_key="package.id")
    assignment_id: int = Field(foreign_key="assignment.id")
    student: "Student" = Relationship(back_populates="student_assignments")
    package: "Package" = Relationship(back_populates="student_assignments")
    assignment: "Assignment" = Relationship(back_populates="student_assignments")
    submission: Optional["Submission"] = Relationship(back_populates="student_assignment")

class Submission(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    # --- THIS IS UPDATED ---
    # A student can only have one submission for a specific assignment
    student_assignment_id: int = Field(foreign_key="studentassignment.id", unique=True)
    
    code: str
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    raw_test_score: float
    quality_score: int
    error_penalty: float
    final_score: float
    test_results: List[Dict[str, Any]] = Field(sa_column=Column(JSON))
    quality_comments: List[str] = Field(sa_column=Column(JSON))
    error_counts: Dict[str, Any] = Field(sa_column=Column(JSON))
    student_assignment: "StudentAssignment" = Relationship(back_populates="submission")

# Rebuild all models
Package.model_rebuild()
Student.model_rebuild()
TeacherCode.model_rebuild()
Assignment.model_rebuild()
StudentAssignment.model_rebuild()
Submission.model_rebuild()