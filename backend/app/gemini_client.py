import httpx
import json
import uuid
import asyncio
import logging
from typing import List, Dict, Any, Optional

# Import the official Google SDK
import google.generativeai as genai
# THIS IS THE FIX: Import 'types' and access submodules through it.
from google.generativeai import types 

# Import our project constants
from app.constants import GEMINI_API_KEY, MODEL_FLASH, MODEL_PRO

# Import dummy classes for type hinting
try:
    from app.runner import RunResult
    from app.models import TestCase
except ImportError:
    class RunResult:
        def __init__(self, stdout="", stderr="", runtime=0.0, timed_out=False):
            self.stdout, self.stderr, self.runtime, self.timed_out = stdout, stderr, runtime, timed_out
    class TestCase:
        def __init__(self, input="", expected="", type="sample", **kwargs):
            self.input, self.expected, self.type = input, expected, type

# --- Configuration ---
logger = logging.getLogger("gemini_client")
logging.basicConfig(level=logging.INFO)

# Configure the genai client
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    logger.warning("GEMINI_API_KEY not set. Gemini calls will use canned fallbacks.")

# --- THIS IS THE FIX ---
# Use the correct `types.SafetySettingDict` as suggested by the error
SAFETY_SETTINGS = [
    {"category": types.HarmCategory.HARM_CATEGORY_HARASSMENT, "threshold": "BLOCK_NONE"},
    {"category": types.HarmCategory.HARM_CATEGORY_HATE_SPEECH, "threshold": "BLOCK_NONE"},
    {"category": types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, "threshold": "BLOCK_NONE"},
    {"category": types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, "threshold": "BLOCK_NONE"}
]

# Use the correct `types.GenerationConfig`
JSON_GENERATION_CONFIG = types.GenerationConfig(
    response_mime_type="application/json"
)
# --- END FIX ---

# ---- Internal Helper ----
async def _call_gemini_api(prompt_parts: List[Any], model_name: str) -> Dict[str, Any]:
    """
    Internal function to call a specific Gemini model with a list of prompt parts
    (which can be text or images/PDFs).
    """
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured.")

    try:
        print(f"INFO: Calling Gemini API. Model: {model_name}. Prompt parts count: {len(prompt_parts)}")
        model = genai.GenerativeModel(model_name)
        
        # Make the API call
        response = await model.generate_content_async(
            prompt_parts,
            generation_config=JSON_GENERATION_CONFIG,
            safety_settings=SAFETY_SETTINGS
        )
        
        # Log the raw text response for debugging
        print("\n--- RAW GEMINI API RESPONSE ---")
        print(response.text)
        print("-----------------------------\n")

        # Parse the JSON response text
        return json.loads(response.text)
        
    except Exception as e:
        logger.error(f"Error calling Gemini ({model_name}): {e}")
        import traceback
        traceback.print_exc()
        raise e # Re-raise the exception to be handled by the calling function

# ---- Public Client Functions with Routing ----

async def generate_questions(
    topic: str, 
    difficulty: str, 
    n_questions: int, 
    source_material: Optional[Any] = None # Can be PIL Image or PDF blob
) -> List[Dict[str, Any]]:
    """
    Generates programming questions.
    If source_material is provided, it will first try to extract questions from it.
    If not, it will generate new ones based on the topic.
    """
    if not GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set. Returning canned questions.")
        return _get_canned_questions(n_questions)

    prompt_parts = []
    
    # --- THIS IS THE NEW, SMARTER PROMPT LOGIC ---
    if source_material:
        # If we have a file, add it as the first part of the prompt
        prompt_parts.append(source_material) # This is the PIL Image or PDF blob
        base_prompt = f"""
        You are an expert programming question generator. The user has provided an image/PDF of their syllabus.

        YOUR TASK IS TO FOLLOW THESE STEPS:
        1.  First, analyze the provided file. Does it contain an explicit list of experiments, problems, or questions (e.g., a numbered list like '1. Apply K-Means...', '2. Implement...')? 
        
        2.  IF IT DOES contain such a list:
            -   Extract up to {n_questions} of those exact experiment/problem statements from the file.
            -   For each extracted statement, use it as the "title".
            -   Then, create a detailed "prompt" in MARKDOWN format explaining the task, including examples and constraints (as if for a LeetCode problem).
            -   Finally, generate 5 test cases (2 sample, 3 hidden, summing to 100 points) for that specific problem.
        
        3.  IF IT DOES NOT contain a list (e.g., it's just a wall of text):
            -   Then, and only then, generate {n_questions} *new* unique programming problems based on the overall topics in the file, matching the difficulty "{difficulty}".
            -   The user has provided a "topic" hint: "{topic}". Use this to help guide your generation.
            -   For each new problem, generate a title, Markdown prompt, and 5 test cases.
        """
    else:
        # This is the normal text-only prompt
        base_prompt = f"""
        You are an expert programming question generator. Produce EXACTLY {n_questions} unique programming problems on the topic: {topic!r} with difficulty {difficulty!r}.
        """
    # --- END OF NEW LOGIC ---
    
    # Add the universal JSON formatting instructions
    prompt_parts.append(f"""
    {base_prompt}

    IMPORTANT JSON FORMATTING INSTRUCTIONS:
    1. You MUST respond with a single, perfectly-formed JSON object and nothing else.
    2. The root of the JSON object MUST be a key named "packages", which is a list of question objects.
    3. Every single question object in the "packages" list MUST contain the following keys: "title", "prompt", "difficulty", and "testcases".
    4. The "title" key is MANDATORY and must be a short, descriptive string.
    5. The "prompt" key must be a detailed string in MARKDOWN format, including examples and constraints.
    6. The "difficulty" key MUST be the string "{difficulty}".
    7. The "testcases" key MUST be a list of EXACTLY 5 test case objects.
    8. Each of the 5 test case objects MUST have the following 4 keys: "type" ("sample" or "hidden"), "input" (string), "expected" (string), and "points" (int).
    9. The "points" for all 5 test cases MUST sum to exactly 100.
    Return only valid JSON.
    """)

    try:
        # ROUTE TO FLASH MODEL (it's multi-modal and fast)
        response_data = await _call_gemini_api(prompt_parts, model_name=MODEL_FLASH)
        if isinstance(response_data, dict) and "packages" in response_data and isinstance(response_data["packages"], list):
            return response_data["packages"]
        else:
            logger.error("Gemini response for generate_questions was not in expected format.")
            return []
    except Exception as e:
        logger.error(f"Error calling Gemini ({MODEL_FLASH}) for generate_questions: {e}")
        return []

def _short(text: str, n: int = 2000) -> str:
    """Helper to truncate text for logging."""
    return (text[:n] + "...(truncated)") if len(text) > n else text
    
async def classify_error(run_result: RunResult, code: str, testcase: TestCase) -> Dict[str, str]:
    """Classifies errors. ROUTING: Uses FLASH model."""
    if not GEMINI_API_KEY: return _get_canned_error_classification(run_result)
    summary = f"Input: {testcase.input}, Expected: {testcase.expected}, STDOUT: {_short(run_result.stdout)}, STDERR: {_short(run_result.stderr)}, Timed Out: {run_result.timed_out}"
    prompt = f"""Classify the primary error from this Python code execution into ONE category: 'compile_error', 'runtime_error', 'timeout', 'wrong_output', 'logic_bug'. Respond ONLY with JSON: {{"error_type": "...", "explain": "Short explanation..."}}\n\nCode:\n```python\n{_short(code)}\n```\nExecution:\n{summary}"""
    try:
        # ROUTE TO FLASH MODEL
        response_data = await _call_gemimni_api([prompt], model_name=MODEL_FLASH)
        if isinstance(response_data, dict) and "error_type" in response_data:
            return {"error_type": str(response_data.get("error_type", "unknown")), "explain": str(response_data.get("explain", "AI classification failed."))}
        else:
            return _get_canned_error_classification(run_result)
    except Exception:
        return _get_canned_error_classification(run_result)

async def code_quality(code: str) -> Dict[str, Any]:
    """Scores code quality. ROUTING: Uses PRO model."""
    if not GEMINI_API_KEY: return {"score": 75, "comments": ["Canned response."]}
    prompt = f"""Rate the quality of this Python code (readability, efficiency, best practices) from 0 to 100. Provide 2-3 brief comments. Respond ONLY with JSON: {{"score": <int>, "comments": ["...", "..."]}}\n\nCode:\n```python\n{_short(code)}\n```"""
    try:
        # ROUTE TO PRO MODEL
        response_data = await _call_gemini_api([prompt], model_name=MODEL_PRO)
        if isinstance(response_data, dict) and "score" in response_data and "comments" in response_data:
            return {"score": int(response_data.get("score", 70)), "comments": list(response_data.get("comments", []))}
        else:
            return {"score": 70, "comments": ["AI response format error."]}
    except Exception:
        return {"score": 70, "comments": ["AI call failed."]}

# ---- Canned Responses ----
def _get_canned_questions(n: int) -> List[Dict[str, Any]]:
    canned = [{"id": str(uuid.uuid4()), "title": "Sum Two Numbers", "difficulty": "easy", "prompt": "Sum two integers.", "testcases": [{"type": "sample", "input": "2 3", "expected": "5", "points": 50}, {"type": "hidden", "input": "-1 1", "expected": "0", "points": 50}]}, {"id": str(uuid.uuid4()), "title": "Reverse String", "difficulty": "easy", "prompt": "Reverse a string.", "testcases": [{"type": "sample", "input": "hello", "expected": "olleh", "points": 50}, {"type": "hidden", "input": "Python", "expected": "nohtyP", "points": 50}]}]
    return [canned[i % len(canned)] for i in range(n)]

def _get_canned_error_classification(run_result: RunResult) -> Dict[str, str]:
    if run_result.timed_out: return {"error_type": "timeout", "explain": "Execution timed out."}
    if run_result.stderr: return {"error_type": "runtime_error", "explain": f"Runtime error: {run_result.stderr[:100]}"}
    return {"error_type": "wrong_output", "explain": "Incorrect output."}