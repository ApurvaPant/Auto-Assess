# AutoAssess MVP — Project Blueprint

> A full-stack, AI-powered automated code assessment platform for teachers and students. Teachers create classrooms, generate coding questions via AI, assign them to students, and get automated grading, plagiarism detection, and per-student analytics. Students write and submit Python code in a browser-based IDE.

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Database Schema](#4-database-schema)
5. [Backend — Module by Module](#5-backend--module-by-module)
6. [API Reference](#6-api-reference)
7. [Frontend — Page by Page](#7-frontend--page-by-page)
8. [Core Systems Deep Dive](#8-core-systems-deep-dive)
9. [Environment Variables](#9-environment-variables)
10. [Local Development](#10-local-development)
11. [GCP Cloud Run Deployment](#11-gcp-cloud-run-deployment)

---

## 1. High-Level Architecture

```
Browser
  │
  ▼
┌─────────────────────────────┐
│  Frontend (React + Nginx)   │  Port 5173 (local) / 80 (container)
│  Serves static files        │
│  Proxies /api/* → Backend   │
└────────────┬────────────────┘
             │ HTTP proxy
             ▼
┌─────────────────────────────┐
│  Backend (FastAPI)          │  Port 8000
│  REST API, business logic   │
│  AI grading via Gemini      │
│  Code execution (subprocess)│
└────────────┬────────────────┘
             │ SQLModel / psycopg2
             ▼
┌─────────────────────────────┐
│  PostgreSQL 15              │  Port 5432
│  Persistent data store      │
└─────────────────────────────┘
```

All three services run as Docker containers orchestrated by `docker-compose.yml`. In production (GCP), the database is replaced by **Cloud SQL** and the two app containers run as separate **Cloud Run** services.

### Request flow (browser → database)

1. Browser hits `http://localhost:5173/some-page` → Nginx serves the React SPA (`index.html`).
2. React app makes `axios` calls to `/api/*` → Nginx proxies those to `http://backend:8000`.
3. FastAPI handles the request: authenticates the JWT, runs business logic, queries PostgreSQL via SQLModel, optionally calls Gemini API.
4. JSON response flows back through the same chain.

---

## 2. Tech Stack

### Frontend

| Library | Version | Purpose |
|---|---|---|
| React | 18 | UI framework |
| Vite | 5 | Build tool & dev server |
| React Router DOM | 6 | Client-side routing |
| TailwindCSS | 3 | Utility-first CSS |
| Axios | 1.7 | HTTP client |
| @monaco-editor/react | 4.6 | VS Code-style code editor |
| Recharts | 3 | Charts (performance graphs) |
| Chart.js + react-chartjs-2 | 4 | Additional charts |
| lucide-react | 0.56 | Icon library |
| react-hot-toast | 2.4 | Toast notifications |
| react-markdown | 10 | Render markdown (AI feedback) |
| clsx + tailwind-merge | — | Conditional class merging |

### Backend

| Library | Version | Purpose |
|---|---|---|
| FastAPI | 0.110 | Web framework |
| Uvicorn | 0.29 | ASGI server |
| SQLModel | 0.0.16 | ORM (built on SQLAlchemy + Pydantic) |
| psycopg2-binary | 2.9.9 | PostgreSQL driver |
| python-jose | 3.3 | JWT creation & validation |
| passlib + bcrypt | 1.7 / 4.1 | Password hashing |
| google-generativeai | latest | Gemini AI SDK |
| python-multipart | — | File upload support |
| Pillow | — | Image processing (for file uploads to Gemini) |
| PyMuPDF | — | PDF text extraction |
| httpx | 0.27 | Async HTTP client |
| numpy / pandas / scikit-learn | — | Stats & ML utilities |
| python-dotenv | 1.0 | Load `.env` files |

### Infrastructure

| Tool | Purpose |
|---|---|
| Docker + Docker Compose | Local multi-service orchestration |
| Nginx | Static file serving + reverse proxy |
| PostgreSQL 15 | Relational database |
| Google Cloud Run | Serverless container hosting |
| Google Cloud SQL | Managed PostgreSQL (production) |
| Google Artifact Registry | Docker image registry |

---

## 3. Repository Structure

```
AutoAssess-MVP/
├── docker-compose.yml          # Orchestrates db + backend + frontend
├── .env                        # Local secrets (never commit)
├── .env.example                # Template for .env
│
├── backend/
│   ├── Dockerfile              # Python 3.11-slim image
│   ├── requirements.txt        # All Python dependencies
│   ├── wait-for-db.sh          # Waits for Postgres to be ready before starting
│   └── app/
│       ├── main.py             # FastAPI app, CORS, startup lifecycle
│       ├── api.py              # All route handlers (the "controller" layer)
│       ├── models.py           # SQLModel table definitions (ORM models)
│       ├── schemas.py          # Pydantic request/response schemas (DTOs)
│       ├── crud.py             # Database query functions (the "repository" layer)
│       ├── auth.py             # JWT creation, password hashing, token validation
│       ├── database.py         # SQLAlchemy engine & session factory
│       ├── init_db.py          # DB table creation, migrations, seed data
│       ├── constants.py        # Env vars, model names, scoring weights
│       ├── gemini_client.py    # All Gemini API calls (question gen, grading, etc.)
│       ├── assignment_logic.py # Anti-cheating package assignment algorithm
│       └── runner.py           # Sandboxed Python code execution via subprocess
│
└── frontend/
    ├── Dockerfile              # Node build → Nginx serve (multi-stage)
    ├── nginx.conf              # Nginx config (local: hardcoded backend URL)
    ├── nginx.conf.template     # Nginx config (Cloud Run: BACKEND_URL env var)
    ├── index.html              # SPA entry point, favicon
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── main.jsx            # React entry, wraps app in providers
        ├── App.jsx             # React Router route definitions
        ├── index.css           # Global styles + Tailwind directives
        ├── api/
        │   └── client.js       # All axios API calls, request interceptor for auth
        ├── contexts/
        │   ├── AuthContext.jsx  # Global auth state (teacher token, classroom)
        │   └── ThemeContext.jsx # Dark/light theme toggle
        ├── components/
        │   ├── layouts/
        │   │   ├── DashboardLayout.jsx  # Teacher portal shell (sidebar + topbar)
        │   │   └── Sidebar.jsx          # Teacher navigation sidebar
        │   └── ui/
        │       ├── Button.jsx
        │       ├── Card.jsx
        │       ├── Input.jsx
        │       ├── Select.jsx
        │       ├── Badge.jsx
        │       └── StudentPerformanceChart.jsx
        └── pages/
            ├── Home.jsx                         # Landing page
            ├── TeacherLogin.jsx                 # Teacher login
            ├── TeacherDashboard.jsx             # Teacher portal shell
            ├── StudentPortal.jsx                # Student sign in / sign up (with photo)
            ├── StudentDashboard.jsx             # Student home (classrooms overview)
            ├── StudentClassroom.jsx             # Single classroom view (assignments list)
            ├── StudentAssignmentPage.jsx        # Monaco editor + run/submit
            ├── StudentResultPage.jsx            # Student's own result view
            ├── StudentProfile.jsx               # Student profile & photo management
            └── teacher/
                ├── ClassroomManagement.jsx      # Create/delete classrooms
                ├── GenerateQuestions.jsx        # AI question generation
                ├── CreateAssignment.jsx         # Create & configure assignments
                ├── AssignmentDetail.jsx         # Per-assignment student progress table
                ├── ViewResults.jsx              # Submission results + grading release
                ├── StudentAnalysis.jsx          # Per-student deep analytics
                ├── TeacherDoubts.jsx            # Student Q&A (doubts system)
                └── ViewCodes.jsx               # Student access codes view
```

---

## 4. Database Schema

All tables are defined in `backend/app/models.py` using SQLModel (which generates both the Pydantic schema and the SQLAlchemy table).

```
Teacher
├── id (PK)
├── username (unique)
└── hashed_password

Student
├── id (PK)
├── email (unique)
├── name
├── hashed_password
├── photo_url (TEXT, base64 data URL, nullable)
└── created_at

Classroom
├── id (PK)
├── name
├── code (6-char alphanumeric, unique) ← students use this to join
├── teacher_id (FK → Teacher)
└── created_at

ClassroomStudent          ← join table: which students are in which classroom
├── id (PK)
├── classroom_id (FK → Classroom)
├── student_id (FK → Student)
└── joined_at

Package                   ← a single coding problem (title + prompt + test cases)
├── id (PK)
├── title
├── prompt
├── difficulty (easy/medium/hard)
├── is_deleted
└── classroom_id (FK → Classroom, nullable)

TestCase                  ← belongs to a Package
├── id (PK)
├── type (sample / hidden)
├── input
├── expected
├── points
└── package_id (FK → Package)

Assignment                ← groups of packages assigned to a classroom
├── id (PK)
├── name
├── created_at
├── deadline (nullable)
├── results_released (bool)
├── weight_test (float, default 0.6)
├── weight_quality (float, default 0.4)
├── weight_penalty (float, default 10.0)
└── classroom_id (FK → Classroom)

StudentAssignment         ← which student gets which package in which assignment
├── id (PK)
├── student_id (FK → Student)
├── package_id (FK → Package)
└── assignment_id (FK → Assignment)

Submission                ← a student's code submission (one per StudentAssignment)
├── id (PK)
├── student_assignment_id (FK → StudentAssignment, unique)
├── code (TEXT)
├── submitted_at
├── raw_test_score (float)
├── quality_score (int, 0–100)
├── error_penalty (float)
├── final_score (float)
├── test_results (JSON array)
├── quality_comments (JSON array of strings)
└── error_counts (JSON object)

Doubt                     ← student Q&A per classroom/assignment
├── id (PK)
├── student_id (FK → Student)
├── classroom_id (FK → Classroom)
├── assignment_id (FK → Assignment, nullable)
├── question (TEXT)
├── reply (TEXT, nullable)
├── created_at
└── replied_at (nullable)
```

### Entity Relationships

```
Teacher ──< Classroom ──< ClassroomStudent >── Student
                  │
                  ├──< Package ──< TestCase
                  │
                  └──< Assignment ──< StudentAssignment ──< Submission
                                                │
                                           (student + package)
Classroom ──< Doubt >── Student
```

---

## 5. Backend — Module by Module

### `main.py`
- Creates the `FastAPI` app instance.
- Registers CORS middleware (allows `localhost:5173` in dev).
- Uses `lifespan` context manager: on startup, calls `create_db_and_tables()` then `initialize_database()`.
- Mounts all routes under the `/api` prefix.
- Exposes `GET /health` for health checks.

### `database.py`
- Creates the SQLAlchemy `engine` from `DATABASE_URL`.
- Provides `get_session()` — a FastAPI dependency that yields a DB session per request.
- `create_db_and_tables()` calls `SQLModel.metadata.create_all(engine)`.

### `models.py`
- Defines all SQLModel table classes (see schema above).
- Each class is both an ORM model and a Pydantic model.
- Relationships are defined using `Relationship()` for ORM joins.
- `model_rebuild()` is called at the bottom to resolve forward references.

### `schemas.py`
- Pydantic `BaseModel` classes used as request bodies and response shapes.
- Separate from `models.py` — these are DTOs, not DB tables.
- Key schemas: `UpdateProfileRequest`, `SubmissionResult`, `PackageWithTestcases`, `StudentAssignmentDetails`.

### `auth.py`
- Password hashing via `passlib` with bcrypt.
- JWT creation: `create_access_token(data)` — 24-hour expiry, HS256.
- Two separate OAuth2 schemes: `teacher_oauth2_scheme` and `student_oauth2_scheme`.
- `get_current_teacher()` and `get_current_student()` are FastAPI dependencies used on protected routes.
- Teacher JWT encodes `username`; Student JWT encodes `student_id`.

### `constants.py`
- Loads all environment variables via `dotenv`.
- Defines Gemini model names (`MODEL_FLASH = "gemini-2.5-flash"`, `MODEL_PRO = "gemini-2.5-pro"`).
- Defines scoring weights: `ALPHA` (test score weight), `BETA` (quality weight), `GAMMA` (penalty multiplier).
- Defines the `compute_m_star(n)` formula for optimal package count.

### `init_db.py`
- `run_migrations()`: runs idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` SQL for schema changes added after initial deployment (e.g., `deadline`, `photo_url`).
- `initialize_database()`: seeds a default teacher account if the DB is empty.

### `crud.py`
- Pure database query functions. No business logic, no HTTP.
- Key functions:
  - `create_classroom()` — generates a random 6-char join code.
  - `create_package_with_testcases()` — bulk inserts a package + its test cases.
  - `get_submissions_for_assignment()` — fetches all submissions for results view.
  - `get_student_portfolio()` — aggregates all a student's submissions across an assignment set into one analytics object including `photo_url`.
  - `get_assignment_details()` — returns the full student×package×submission matrix for an assignment including `photo_url`.

### `assignment_logic.py`
- `assign_packages_to_students(students, packages)` — anti-cheating assignment engine.
- Uses round-robin as a base, then fixes adjacent duplicates with local swaps.
- Ensures no two sitting-next-to-each-other students get the same problem.
- `compute_m_star(n)` formula: `max(d+1, ceil(sqrt(n)), ceil(n/8))` — computes the minimum number of unique packages needed for `n` students.

### `runner.py`
- `run_python_code(code, input_data)` — executes student Python code in a subprocess.
- Sets resource limits on Linux: 3-second CPU, 300 MB RAM (using `resource.setrlimit`).
- Uses `tempfile.TemporaryDirectory` to isolate each execution.
- Returns `RunResult(stdout, stderr, runtime, timed_out)`.

### `gemini_client.py`
All functions call the `google-generativeai` SDK. Uses `MODEL_FLASH` for fast tasks, `MODEL_PRO` for deep analysis.

| Function | Model | What it does |
|---|---|---|
| `generate_questions()` | Flash | Generates N coding problems with test cases from a topic/file/text |
| `grade_submission()` | Flash | Scores code quality (0–100) and identifies error types |
| `analyze_code_feedback()` | Pro | Returns strong points, weak points, suggestions for a submission |
| `check_plagiarism()` | Pro | Compares all submissions in an assignment for similarity |
| `detect_ai_content()` | Pro | Estimates probability that code was AI-generated |
| `analyze_student_portfolio()` | Pro | Generates holistic insights and risk level across all a student's submissions |

All responses are parsed as JSON (`response_mime_type="application/json"`).

### `api.py`
The single router file containing all HTTP endpoints. Grouped by:
- **Teacher Auth**: `POST /api/teacher/login`
- **Classrooms**: CRUD for classrooms, student listing
- **Packages**: Generate questions (from topic / text / file), list, delete
- **Assignments**: Create, delete, release results, get details
- **Results**: Get submissions, AI code analysis, plagiarism, AI detection
- **Student Portfolio**: Per-student analytics + AI insights
- **Student Auth**: `POST /api/student/signup`, `POST /api/student/login`
- **Student Actions**: Join classroom, get assignments, run code, submit
- **Student Profile**: Get/update profile, upload photo
- **Doubts**: Student asks question, teacher replies

---

## 6. API Reference

### Authentication
All protected endpoints require `Authorization: Bearer <token>` header.
- Teacher token: obtained from `POST /api/teacher/login`
- Student token: obtained from `POST /api/student/login` or `POST /api/student/signup`

### Teacher Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/teacher/login` | Returns JWT token |
| POST | `/api/teacher/classrooms` | Create classroom |
| GET | `/api/teacher/classrooms` | List teacher's classrooms |
| DELETE | `/api/teacher/classrooms/{id}` | Delete classroom |
| GET | `/api/teacher/classrooms/{id}/students` | List students (includes photo_url) |
| POST | `/api/teacher/generate_questions` | Generate N questions from topic |
| POST | `/api/teacher/generate_from_file` | Generate questions from PDF/image |
| POST | `/api/teacher/generate_from_text` | Generate questions from raw text |
| GET | `/api/teacher/packages` | List packages (optionally filter by classroom) |
| DELETE | `/api/teacher/packages` | Delete selected packages |
| DELETE | `/api/teacher/packages/all` | Delete all packages |
| POST | `/api/teacher/create_assignment` | Create assignment + distribute packages |
| GET | `/api/teacher/assignments` | List assignments for a classroom |
| DELETE | `/api/teacher/assignments/{id}` | Delete assignment |
| GET | `/api/teacher/assignments/{id}/details` | Student×package×status matrix (includes photo_url) |
| GET | `/api/teacher/results/{id}` | All submissions (includes student_photo_url) |
| POST | `/api/teacher/assignments/{id}/release` | Publish results with custom weights |
| GET | `/api/teacher/analyze/{submission_id}` | AI code feedback |
| GET | `/api/teacher/assignments/{id}/plagiarism` | Run plagiarism check |
| GET | `/api/teacher/ai-detect/{submission_id}` | AI content detection |
| GET | `/api/teacher/stats` | Classroom-level statistics |
| GET | `/api/teacher/classrooms/{cid}/students/{sid}/portfolio` | Student analytics (includes photo_url) |
| POST | `/api/teacher/classrooms/{cid}/students/{sid}/ai-insights` | AI student insights |
| GET | `/api/teacher/classroom/{id}/doubts` | All doubts (includes student_photo_url) |
| POST | `/api/teacher/doubts/{id}/reply` | Reply to a student doubt |

### Student Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/student/signup` | Register + returns JWT |
| POST | `/api/student/login` | Login + returns JWT |
| POST | `/api/student/join` | Join classroom by 6-char code |
| GET | `/api/student/classrooms` | List joined classrooms |
| GET | `/api/student/assignments` | List assignments (optionally by classroom) |
| GET | `/api/student/assignment/{id}` | Get assignment details + problem |
| POST | `/api/run` | Run code against sample test cases |
| POST | `/api/submit` | Submit final code (triggers full grading) |
| GET | `/api/student/analyze/{assignment_id}` | AI feedback on own submission |
| GET | `/api/student/result/{assignment_id}` | View own result (if released) |
| GET | `/api/student/profile` | Get profile (name, email, photo_url) |
| POST | `/api/student/profile` | Update name / change password |
| POST | `/api/student/profile/photo` | Upload profile photo (multipart, max 2 MB) |
| POST | `/api/student/classroom/{id}/doubts` | Ask a question |
| GET | `/api/student/classroom/{id}/doubts` | View own doubts + replies |

---

## 7. Frontend — Page by Page

### Routing (`App.jsx`)

```
/                          → Home (landing page)
/teacher/login             → TeacherLogin
/teacher                   → TeacherDashboard (protected, wraps child pages)
  /teacher/classrooms      → ClassroomManagement
  /teacher/generate        → GenerateQuestions
  /teacher/create          → CreateAssignment
  /teacher/assignment/:id  → AssignmentDetail
  /teacher/results         → ViewResults
  /teacher/analysis        → StudentAnalysis
  /teacher/doubts          → TeacherDoubts
  /teacher/codes           → ViewCodes
/student                   → StudentPortal (sign in / sign up tabs)
/student/dashboard         → StudentDashboard
/student/classroom/:id     → StudentClassroom
/student/assignment/:id    → StudentAssignmentPage (Monaco editor)
/student/result/:id        → StudentResultPage
/student/profile           → StudentProfile
```

### Auth State (`AuthContext.jsx`)

- Stores `teacherToken` and `classroomId` (selected classroom for the teacher session).
- `selectClassroom(id, name)` — persists classroom choice to localStorage.
- Guards teacher routes: if no token, redirects to `/teacher/login`.

### API Client (`api/client.js`)

- Single `axios` instance with `baseURL: '/api'`.
- Request interceptor: reads URL to decide which token to attach (`/student/*` → student token, `/teacher/*` → teacher token).
- All API calls exported as named functions.

### Key Pages

**`StudentPortal.jsx`**
- Two-tab layout: Sign In / Sign Up.
- Sign Up tab includes an optional circular photo picker (avatar preview + file input).
- On signup: account is created first, then if a photo was selected it is uploaded via `POST /api/student/profile/photo`.

**`StudentAssignmentPage.jsx`**
- Shows problem description on the left, Monaco editor on the right.
- "Run" button calls `POST /api/run` — shows per-test-case pass/fail in real time.
- "Submit" button calls `POST /api/submit` — triggers full grading pipeline (test runner + Gemini quality scoring).
- Countdown timer if deadline is set.

**`ViewResults.jsx`**
- Table of all submissions per assignment with test score, quality, final score.
- Each row shows a student photo avatar (or initial letter fallback).
- "Publish Results" button triggers `POST /api/teacher/assignments/{id}/release` with configurable α/β/γ sliders.
- Submission detail modal: photo + name in header, code viewer, scores, AI analysis, AI content detection.
- Embedded plagiarism panel.

**`StudentAnalysis.jsx`**
- Dropdown to select a student from the classroom.
- Student identity card shows their photo (or initial letter avatar) + name + email + join date.
- Loads portfolio via `GET /teacher/classrooms/{cid}/students/{sid}/portfolio`.
- Shows: score trend line chart, radar chart (consistency/quality/completion), error frequency bar chart.
- "Generate AI Insights" button → shows risk level badge + recommendations.
- Print report button.

**`AssignmentDetail.jsx`**
- Table of all students × their assigned package × submission status.
- Each student name row now shows a small circular photo avatar.

**`TeacherDoubts.jsx`**
- Lists all student questions per classroom, auto-refreshes every 30 seconds.
- Each doubt card shows student photo avatar next to their name.
- Teacher can reply inline.

**`StudentProfile.jsx`**
- Circular photo widget at the top — click to upload a new photo (immediate upload, no form submit required).
- Separate form for updating name and changing password.

**`GenerateQuestions.jsx`**
- Three input modes: Topic text prompt, Upload File (PDF/image), Paste Text.
- Sends to the appropriate backend endpoint.
- Preview generated questions before saving to the classroom.

---

## 8. Core Systems Deep Dive

### Scoring Formula

When a student submits, the backend:

1. **Runs all test cases** (sample + hidden) using `runner.run_python_code()`.
2. **Calculates raw test score**: `passed_points / total_points * 100`.
3. **Calls Gemini** to score code quality (0–100) and identify error types.
4. **Applies error penalty**: `error_penalty = sum(severity[error_type] * count) * GAMMA`.
5. **Final score**: `(α × test_score) + (β × quality_score) - error_penalty`

Where α + β = 1.0. Teacher can adjust α, β, γ when releasing results.

Default weights in `constants.py`: `ALPHA=0.75`, `BETA=0.25`, `GAMMA=1.0`.

Error severity weights:
```python
ERROR_SEVERITY = {
    "compile_error": 5,
    "runtime_error": 4,
    "timeout": 3,
    "wrong_output": 2,
    "logic_bug": 2,
}
```

### Anti-Cheating Assignment Distribution

When a teacher creates an assignment:

1. Packages are assigned to students using `assignment_logic.assign_packages_to_students()`.
2. Base algorithm: round-robin (`student[i]` gets `package[i % m]`).
3. Then a local-swap pass ensures no two adjacent students (by roll number) get the same package.
4. The optimal number of packages to generate for `n` students:

```
m* = max(d+1,  ceil(sqrt(n)),  ceil(n/8))
       └─ adjacency  └─ cost optimal  └─ fairness
```

Where `d=1` means no adjacent pair can share a package.

### Student Photo Storage

Photos are stored as **base64 data URLs** directly in the `student.photo_url` TEXT column in PostgreSQL. This avoids needing a file storage service.

- 2 MB limit enforced both client-side (before upload) and server-side (after read).
- Format: `data:image/jpeg;base64,<base64string>`
- The same `photo_url` field is returned by every teacher-facing API that includes student data (results, portfolio, assignment details, doubts).

### Code Execution Sandbox

- Each run creates a `tempfile.TemporaryDirectory`.
- Student code is written to `main.py` inside that directory.
- Executed via `subprocess.run(["python", "main.py"], timeout=5)`.
- On Linux: `resource.setrlimit` enforces 3-second CPU and 300 MB RAM hard limits.
- On Windows (local dev): limits are skipped, only timeout applies.

### Question Generation from Files

- **PDF**: PyMuPDF extracts text, sent as plain text context to Gemini.
- **Image**: Pillow opens the image, sent as a multimodal input to Gemini (vision capability).
- Gemini returns structured JSON matching the `PackageWithTestcases` schema.

### DB Migrations Pattern

There is no Alembic. Migrations are plain SQL in `init_db.py`:

```python
migrations = [
    "ALTER TABLE assignment ADD COLUMN IF NOT EXISTS deadline TIMESTAMP",
    "ALTER TABLE student ADD COLUMN IF NOT EXISTS photo_url TEXT",
]
```

These run on every startup and are safe to re-run (`IF NOT EXISTS`). New columns should always be added here.

---

## 9. Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@db:5432/autodb

# Teacher seed account (created on first startup if DB is empty)
TEACHER_USERNAME=teacher
TEACHER_PASSWORD=yourpassword

# Gemini AI — get from https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# JWT signing secret — use a long random string in production
SECRET_KEY=change_me_to_a_long_random_string

# Application mode
APP_MODE=development
```

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `TEACHER_USERNAME` | Yes | Username for the seeded teacher account |
| `TEACHER_PASSWORD` | Yes | Password for the seeded teacher account |
| `GEMINI_API_KEY` | Yes | Google AI Studio API key |
| `SECRET_KEY` | Yes | Secret for JWT signing (use 32+ random chars in production) |
| `APP_MODE` | No | `development` or `production` |

---

## 10. Local Development

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — everything else runs inside containers.

### Start everything

```bash
# From the project root
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API docs (Swagger): http://localhost:8000/docs
- Database: `localhost:5432` (user: `postgres`, password: `postgres`, db: `autodb`)

### Rebuild after code changes

```bash
docker compose up --build
```

### View logs

```bash
docker compose logs -f backend
docker compose logs -f frontend
```

### Reset the database

```bash
docker compose down -v   # -v removes the postgres_data volume
docker compose up --build
```

---

## 11. GCP Cloud Run Deployment

### Architecture on GCP

```
Internet → Cloud Run: autoassess-frontend (Nginx, port 80)
                │ proxy /api/*
                ▼
           Cloud Run: autoassess-backend (FastAPI, port 8000)
                │ Unix socket
                ▼
           Cloud SQL: PostgreSQL 15
```

### How the Nginx proxy works on Cloud Run

Locally, `nginx.conf` has `proxy_pass http://backend:8000` hardcoded.

On Cloud Run there is no `backend` hostname. The `frontend/Dockerfile` copies both `nginx.conf` (for local) and `nginx.conf.template` (for Cloud Run). At container startup:

```bash
# If BACKEND_URL env var is set, render the template; otherwise use static config
if [ -n "$BACKEND_URL" ]; then
  envsubst '${BACKEND_URL}' < nginx.conf.template > /etc/nginx/conf.d/default.conf
fi
nginx -g 'daemon off;'
```

So you just set `BACKEND_URL=https://your-backend-url.run.app` when deploying the frontend.

---

### Step 0 — Prerequisites

```bash
# Install Google Cloud CLI: https://cloud.google.com/sdk/docs/install
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Enable required GCP services
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com
```

### Step 1 — Create Artifact Registry

```bash
gcloud artifacts repositories create autoassess \
  --repository-format=docker \
  --location=asia-south1 \
  --description="AutoAssess container images"
```

### Step 2 — Create Cloud SQL (PostgreSQL)

```bash
# Create instance (~5 minutes)
gcloud sql instances create autoassess-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=asia-south1

# Create database
gcloud sql databases create autodb --instance=autoassess-db

# Set postgres user password
gcloud sql users set-password postgres \
  --instance=autoassess-db \
  --password=YOUR_DB_PASSWORD
```

Note your **Cloud SQL connection name**: `YOUR_PROJECT_ID:asia-south1:autoassess-db`

### Step 3 — Build and Push Images

```bash
# Authenticate Docker with Artifact Registry
gcloud auth configure-docker asia-south1-docker.pkg.dev

REGISTRY=asia-south1-docker.pkg.dev/YOUR_PROJECT_ID/autoassess

# Backend
docker build -t $REGISTRY/backend ./backend
docker push $REGISTRY/backend

# Frontend
docker build -t $REGISTRY/frontend ./frontend
docker push $REGISTRY/frontend
```

### Step 4 — Deploy Backend

```bash
gcloud run deploy autoassess-backend \
  --image=asia-south1-docker.pkg.dev/YOUR_PROJECT_ID/autoassess/backend \
  --region=asia-south1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=8000 \
  --add-cloudsql-instances=YOUR_PROJECT_ID:asia-south1:autoassess-db \
  --set-env-vars="DATABASE_URL=postgresql://postgres:YOUR_DB_PASSWORD@/autodb?host=/cloudsql/YOUR_PROJECT_ID:asia-south1:autoassess-db" \
  --set-env-vars="GEMINI_API_KEY=YOUR_GEMINI_KEY" \
  --set-env-vars="SECRET_KEY=YOUR_LONG_RANDOM_SECRET" \
  --set-env-vars="TEACHER_USERNAME=teacher" \
  --set-env-vars="TEACHER_PASSWORD=YOUR_TEACHER_PASSWORD" \
  --set-env-vars="APP_MODE=production" \
  --command="uvicorn,app.main:app,--host,0.0.0.0,--port,8000"
```

Copy the **backend URL** printed at the end (e.g. `https://autoassess-backend-abc123-el.a.run.app`).

### Step 5 — Deploy Frontend

```bash
gcloud run deploy autoassess-frontend \
  --image=asia-south1-docker.pkg.dev/YOUR_PROJECT_ID/autoassess/frontend \
  --region=asia-south1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=80 \
  --set-env-vars="BACKEND_URL=https://autoassess-backend-abc123-el.a.run.app"
```

### Step 6 — Fix CORS and Verify

After frontend is deployed, copy its URL (e.g. `https://autoassess-frontend-abc123-el.a.run.app`).

Update `backend/app/main.py` to allow the frontend origin:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://autoassess-frontend-abc123-el.a.run.app",  # add this
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Then rebuild and redeploy the backend:

```bash
docker build -t $REGISTRY/backend ./backend && docker push $REGISTRY/backend
gcloud run deploy autoassess-backend --image=$REGISTRY/backend --region=asia-south1
```

Verify:
```bash
curl https://autoassess-backend-abc123-el.a.run.app/health
# → {"status": "ok"}
```

### Re-deploying After Code Changes

```bash
# Rebuild and push changed image(s)
docker build -t $REGISTRY/backend ./backend && docker push $REGISTRY/backend

# Cloud Run updates with zero downtime
gcloud run deploy autoassess-backend --image=$REGISTRY/backend --region=asia-south1
```

### Production Tips

| Concern | Solution |
|---|---|
| Cold starts (first request is slow) | `--min-instances=1` on backend to keep one instance warm |
| Large photo storage | Migrate `photo_url` from base64-in-postgres to Cloud Storage + signed URLs |
| Secrets management | Use `--set-secrets` with Google Secret Manager instead of `--set-env-vars` |
| Custom domain | Cloud Run → Manage Custom Domains in GCP console |
| Monitoring | Cloud Run emits logs to Cloud Logging automatically |

---

## Quick Reference

| What | Where |
|---|---|
| Add a new API endpoint | `backend/app/api.py` |
| Add a new DB table | `backend/app/models.py` + `SQLModel.metadata.create_all()` handles it |
| Add a new DB column | `backend/app/models.py` + add migration SQL in `backend/app/init_db.py` |
| Add a new frontend page | `frontend/src/pages/` + add route in `frontend/src/App.jsx` |
| Add a new API call (frontend) | `frontend/src/api/client.js` |
| Change scoring weights | `backend/app/constants.py` (`ALPHA`, `BETA`, `GAMMA`) |
| Change Gemini models | `backend/app/constants.py` (`MODEL_FLASH`, `MODEL_PRO`) |
| Change code execution limits | `backend/app/runner.py` (`CPU_LIMIT_SECONDS`, `MEMORY_LIMIT_MB`) |
| Change JWT expiry | `backend/app/constants.py` (`ACCESS_TOKEN_EXPIRE_MINUTES`) |
| Add a new env variable | `.env` + `backend/app/constants.py` + `.env.example` |
