from typing import List, Optional, Dict, Any
from sqlmodel import Field, SQLModel, Relationship, JSON, Column
from datetime import date, datetime

class Teacher(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    hashed_password: str

class Student(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    roll: int = Field(unique=True, index=True)
    username: str = Field(unique=True, index=True)
    name: Optional[str] = Field(default=None) # Added name field
    dob: date 
    hashed_dob: str 
    student_assignments: List["StudentAssignment"] = Relationship(back_populates="student")
    teacher_code: Optional["TeacherCode"] = Relationship(back_populates="student")

class TeacherCode(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_code: str = Field(unique=True)
    is_used: bool = Field(default=False)  # True when uses_remaining reaches 0
    uses_remaining: int = Field(default=2)  # Code can be used 2 times
    student_id: Optional[int] = Field(default=None, foreign_key="student.id", unique=True)
    student: Optional["Student"] = Relationship(back_populates="teacher_code")

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

class Assignment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    results_released: bool = Field(default=False)
    weight_test: float = Field(default=0.6)
    weight_quality: float = Field(default=0.4)
    weight_penalty: float = Field(default=10.0)
    student_assignments: List["StudentAssignment"] = Relationship(back_populates="assignment")

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

Package.model_rebuild()
Student.model_rebuild()
TeacherCode.model_rebuild()
Assignment.model_rebuild()
StudentAssignment.model_rebuild()
Submission.model_rebuild()