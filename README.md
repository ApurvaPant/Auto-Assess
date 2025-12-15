# AutoAssess - AI-Powered Coding Assessment Platform

AutoAssess is a full-stack automated grading system designed for computer science education. It allows instructors to generate programming assignments using AI, assign them to students, and automatically grade submissions based on correctness, code quality, and efficiency.

![Project Status](https://img.shields.io/badge/Status-MVP_Complete-success)
![Tech Stack](https://img.shields.io/badge/Stack-FastAPI_React_PostgreSQL_Docker-blue)

## 🚀 Key Features

### For Teachers (Admin Portal)
* **AI Question Generation:** Create coding problems from a simple topic or by uploading a syllabus PDF (RAG).
* **Dynamic Grading:** Adjust grading weights (Correctness vs. Quality) on the fly before releasing results.
* **Batch Management:** Automatically handles student authentication (Roll Number + DOB) for a batch of 72 students.
* **Visual Analytics:** View class performance and detailed submission reports.

### For Students (Candidate Portal)
* **Distraction-Free IDE:** Integrated Monaco Editor (VS Code engine) with dark mode.
* **Live Feedback:** Run code against sample test cases in real-time.
* **Detailed Reports:** Receive AI-driven feedback on code quality, potential bugs, and logic errors after results are released.
* **Google Classroom Style Dashboard:** Track assigned vs. submitted work with status badges.

## 🛠️ Tech Stack

* **Frontend:** React (Vite), Tailwind CSS, Headless UI, Chart.js, Monaco Editor.
* **Backend:** Python 3.11, FastAPI, SQLModel (SQLAlchemy), Uvicorn.
* **AI Engine:** Google Gemini 1.5 Flash (for content gen) & Pro (for code quality analysis).
* **Database:** PostgreSQL 15.
* **DevOps:** Docker & Docker Compose (One-command setup).

## ⚙️ Installation & Setup

### Prerequisites
* Docker Desktop installed and running.
* A Google Gemini API Key.

### Quick Start
1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/ApurvaPant/Auto-Assess.git](https://github.com/ApurvaPant/Auto-Assess.git)
    cd Auto-Assess
    ```

2.  **Configure Environment:**
    Create a `.env` file in the `backend/` folder:
    ```env
    DATABASE_URL=postgresql://user:password@db:5432/autoassess_db
    SECRET_KEY=your_super_secret_key_here
    GEMINI_API_KEY=your_gemini_api_key_here
    APP_MODE=development
    ```

3.  **Run with Docker:**
    ```bash
    docker compose up --build
    ```

4.  **Access the App:**
    * **Frontend:** [http://localhost:5173](http://localhost:5173)
    * **Backend Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

## 📖 Usage Workflow

1.  **Teacher Login:** Use credentials (default: `admin` / `admin`).
2.  **Create Content:** Go to "Generate Questions" -> Type "Binary Search" -> Click Generate.
3.  **Assign:** Select the generated package -> Click "Create Assignment".
4.  **Student Login:** Student logs in with Roll Number (e.g., `1`) and DOB (default: `2000-01-01`).
5.  **Submit:** Student writes code, runs sample tests, and submits.
6.  **Release:** Teacher reviews submissions, adjusts grading weights ($\alpha, \beta, \gamma$), and clicks "Release Results".

## 🛡️ License
This project is open-source and available under the MIT License.