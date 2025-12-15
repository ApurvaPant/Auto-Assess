from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlmodel import Session
from app import models
from app.database import get_session
from app.constants import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- THIS IS THE FIX ---
# We create TWO different security schemes.
# One for the teacher's login page
teacher_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/teacher/login")
# A second, simple one to grab the token from the header for student routes
student_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/student/login") 
# --- END FIX ---

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def authenticate_teacher(db: Session, username: str, password: str) -> Optional[models.Teacher]:
    from app import crud
    teacher = crud.get_teacher_by_username(db, username=username)
    if not teacher or not verify_password(password, teacher.hashed_password):
        return None
    return teacher

def authenticate_student(db: Session, roll: int, dob: str) -> Optional[models.Student]:
    from app import crud
    student = crud.get_student_by_roll(db, roll=roll)
    if not student or not verify_password(dob, student.hashed_dob):
        return None
    return student

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_teacher(token: str = Depends(teacher_oauth2_scheme), db: Session = Depends(get_session)) -> models.Teacher:
    from app import crud
    credentials_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: Optional[str] = payload.get("sub")
        if username is None: raise credentials_exception
    except JWTError:
        raise credentials_exception
    teacher = crud.get_teacher_by_username(db, username=username)
    if teacher is None: raise credentials_exception
    return teacher