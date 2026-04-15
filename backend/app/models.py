from typing import List, Optional, Dict, Any
from sqlmodel import Field, SQLModel, Relationship, JSON, Column
from datetime import datetime

class Teacher(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    hashed_password: str
    classrooms: List["Classroom"] = Relationship(back_populates="teacher")

class Student(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    name: str
    hashed_password: str
    photo_url: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    classroom_memberships: List["ClassroomStudent"] = Relationship(back_populates="student")
    student_assignments: List["StudentAssignment"] = Relationship(back_populates="student")
    doubts: List["Doubt"] = Relationship(back_populates="student")

class Classroom(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    code: str = Field(unique=True, index=True)  # 6-char alphanumeric
    teacher_id: int = Field(foreign_key="teacher.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    teacher: "Teacher" = Relationship(back_populates="classrooms")
    members: List["ClassroomStudent"] = Relationship(back_populates="classroom")
    packages: List["Package"] = Relationship(back_populates="classroom")
    assignments: List["Assignment"] = Relationship(back_populates="classroom")
    doubts: List["Doubt"] = Relationship(back_populates="classroom")

class ClassroomStudent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    classroom_id: int = Field(foreign_key="classroom.id")
    student_id: int = Field(foreign_key="student.id")
    joined_at: datetime = Field(default_factory=datetime.utcnow)
    classroom: "Classroom" = Relationship(back_populates="members")
    student: "Student" = Relationship(back_populates="classroom_memberships")

class Package(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    prompt: str
    difficulty: str
    is_deleted: bool = Field(default=False)
    classroom_id: Optional[int] = Field(default=None, foreign_key="classroom.id")
    classroom: Optional["Classroom"] = Relationship(back_populates="packages")
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
    deadline: Optional[datetime] = Field(default=None)
    results_released: bool = Field(default=False)
    weight_test: float = Field(default=0.6)
    weight_quality: float = Field(default=0.4)
    weight_penalty: float = Field(default=10.0)
    classroom_id: Optional[int] = Field(default=None, foreign_key="classroom.id")
    classroom: Optional["Classroom"] = Relationship(back_populates="assignments")
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

class Doubt(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    student_id: int = Field(foreign_key="student.id")
    classroom_id: int = Field(foreign_key="classroom.id")
    assignment_id: Optional[int] = Field(default=None, foreign_key="assignment.id")
    question: str
    reply: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    replied_at: Optional[datetime] = Field(default=None)
    student: "Student" = Relationship(back_populates="doubts")
    classroom: "Classroom" = Relationship(back_populates="doubts")

Teacher.model_rebuild()
Student.model_rebuild()
Classroom.model_rebuild()
ClassroomStudent.model_rebuild()
Package.model_rebuild()
TestCase.model_rebuild()
Assignment.model_rebuild()
StudentAssignment.model_rebuild()
Submission.model_rebuild()
Doubt.model_rebuild()
