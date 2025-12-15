import os
import math
from dotenv import load_dotenv

load_dotenv()

# --- Security & Auth ---
SECRET_KEY = os.getenv("SECRET_KEY", "default_secret_key_for_testing")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

# --- Application Mode ---
APP_MODE = os.getenv("APP_MODE", "production")

# --- Gemini API ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# Base URL for all API calls
GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1/models/" 

# Model names for routing (Using the 2.x models you requested)
# NOTE: If these cause 404 errors, the correct names are likely
# gemini-1.5-flash-001 and gemini-1.5-pro-001
MODEL_FLASH = "gemini-2.5-flash"
MODEL_PRO = "gemini-2.5-pro"

# --- Assignment Generation Formulas ---
D_ADJACENCY = 1
S_MAX = 8
A_COST = 1.0
B_COST = 1.0

def compute_m_star(n: int, d: int = D_ADJACENCY, a: float = A_COST, b: float = B_COST, s_max: int = S_MAX) -> int:
    if n <= 1: return n
    m_adjacency = d + 1
    m_optimal = math.ceil(math.sqrt((a / b) * n)) if a > 0 and b > 0 else 1
    m_fairness = math.ceil(n / s_max) if s_max > 0 else 1
    return max(m_adjacency, m_optimal, m_fairness)

# --- Scoring Formulas ---
ALPHA = 0.75
BETA = 0.25
GAMMA = 1.0

ERROR_SEVERITY = {
    "compile_error": 5,
    "runtime_error": 4,
    "timeout": 3,
    "wrong_output": 2,
    "logic_bug": 2,
}