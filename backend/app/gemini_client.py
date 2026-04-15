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
        response_data = await _call_gemini_api([prompt], model_name=MODEL_FLASH)
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

async def check_plagiarism(submissions: List[Dict[str, Any]], problem_title: str = "") -> Dict[str, Any]:
    """
    Compares all submissions for an assignment and flags suspected plagiarism pairs.
    submissions: [{"roll": int, "code": str}, ...]
    """
    if not GEMINI_API_KEY:
        return {"flagged_pairs": [], "summary": "API key not configured.", "risk_level": "unknown"}
    if len(submissions) < 2:
        return {"flagged_pairs": [], "summary": "Need at least 2 submissions to compare.", "risk_level": "none"}

    code_listing = "\n".join(
        f"--- Student Roll {s['roll']} ---\n```python\n{_short(s['code'], 800)}\n```"
        for s in submissions
    )

    prompt = f"""You are an academic integrity expert. Analyze these {len(submissions)} Python student submissions for the problem: "{problem_title or 'Unknown'}".

{code_listing}

Identify pairs of submissions that appear to be plagiarised or copied from each other. Look for:
- Identical or near-identical logic and structure
- Same unusual variable/function names
- Copy-paste with minor renaming or reordering
- Same distinctive algorithmic choices that are unlikely to be coincidental

Respond ONLY with valid JSON:
{{
    "flagged_pairs": [
        {{
            "roll_a": <int>,
            "roll_b": <int>,
            "similarity_score": <0-100>,
            "reason": "concise explanation of why these look copied"
        }}
    ],
    "summary": "one-sentence overall assessment",
    "risk_level": "none|low|medium|high"
}}

Only include pairs with similarity_score >= 60. If no suspicious pairs, return an empty flagged_pairs list."""

    try:
        response_data = await _call_gemini_api([prompt], model_name=MODEL_PRO)
        if isinstance(response_data, dict) and "flagged_pairs" in response_data:
            return {
                "flagged_pairs": list(response_data.get("flagged_pairs", [])),
                "summary": str(response_data.get("summary", "")),
                "risk_level": str(response_data.get("risk_level", "unknown")),
            }
        return {"flagged_pairs": [], "summary": "Response format error.", "risk_level": "unknown"}
    except Exception as e:
        logger.error(f"Error in check_plagiarism: {e}")
        return {"flagged_pairs": [], "summary": "Analysis failed.", "risk_level": "unknown"}


async def evaluate_code_with_llm(
    code: str,
    problem_title: str,
    problem_prompt: str,
    testcases: List[Dict[str, Any]]  # each: {id, input, type}
) -> Dict[str, Any]:
    """
    Uses LLM to simulate Python execution and predict exact stdout for each test case.
    Uses PRO model for maximum accuracy. Caller compares stdout.strip() vs expected.strip().
    """
    if not GEMINI_API_KEY:
        return {"has_syntax_error": False, "syntax_error_msg": "", "results": []}

    tc_block = "\n".join(
        f"Test {i+1} (testcase_id={tc['id']}, type={tc['type']}):\n  stdin lines: {repr(tc['input']) if tc['input'] else '(no input)'}"
        for i, tc in enumerate(testcases)
    )

    prompt = f"""You are an exact Python 3 execution simulator. Your sole job is to determine what a Python program prints to stdout for each test case — not what the correct answer is, but what THIS specific code actually outputs.

PROBLEM: "{problem_title}"
DESCRIPTION (for context only — do NOT use it to infer "correct" output):
{_short(problem_prompt, 500)}

STUDENT CODE:
```python
{_short(code, 4000)}
```

TEST CASES (stdin is fed line-by-line to input() / sys.stdin.readline()):
{tc_block}

EXECUTION RULES — follow these exactly:
1. Check for syntax errors FIRST. If the code has a SyntaxError or IndentationError, set has_syntax_error=true and stop — all results get stdout="" and stderr=the error message.
2. For each test case, simulate execution from scratch, independently.
3. stdin: each newline-separated token in the input is returned by successive input() or readline() calls.
4. stdout: collect ONLY what print() statements output. Each print() appends its output followed by "\\n". Your "stdout" field must be the concatenation of all printed lines, WITHOUT a trailing newline (i.e., "\\n".join(lines)).
5. If a NameError, TypeError, ValueError, IndexError, ZeroDivisionError, or any other exception occurs mid-execution: stderr = the exception message (e.g. "ZeroDivisionError: division by zero"), stdout = whatever was printed before the crash.
6. If the code contains an obvious infinite loop for the given input (no termination condition): timed_out=true, stdout="", stderr="".
7. CRITICAL — Do NOT guess or produce "what the correct answer should be". Simulate THIS code's logic precisely, including any bugs it has. Wrong code must produce wrong output.
8. Pay close attention to: integer vs float output (print(5) → "5", print(5.0) → "5.0"), trailing spaces, exact casing, and separator characters.

Respond ONLY with this exact JSON (no markdown, no extra text):
{{
  "has_syntax_error": false,
  "syntax_error_msg": "",
  "results": [
    {{
      "testcase_id": <int — must match the id from the test case>,
      "stdout": "<exact stdout string, newlines as \\n, no trailing newline>",
      "stderr": "<exception message if crashed, else empty string>",
      "timed_out": false,
      "explanation": "<one sentence: what the code does for this input>"
    }}
  ]
}}"""

    try:
        data = await _call_gemini_api([prompt], model_name=MODEL_PRO)
        if isinstance(data, dict) and "results" in data:
            return {
                "has_syntax_error": bool(data.get("has_syntax_error", False)),
                "syntax_error_msg": str(data.get("syntax_error_msg", "")),
                "results": list(data.get("results", []))
            }
        return {"has_syntax_error": False, "syntax_error_msg": "", "results": []}
    except Exception as e:
        logger.error(f"Error in evaluate_code_with_llm: {e}")
        return {"has_syntax_error": False, "syntax_error_msg": "", "results": []}


async def detect_ai_content(code: str, problem_title: str = "") -> Dict[str, Any]:
    """Detects whether student code was likely AI-generated. Uses FLASH model."""
    if not GEMINI_API_KEY:
        return {"ai_likelihood": 0, "verdict": "unknown", "indicators": [], "explanation": "API key not configured."}

    prompt = f"""You are an expert in detecting AI-generated code. Analyze this Python student submission for the problem: "{problem_title or 'Unknown'}".

Determine whether this code was likely written by a human student or generated by an AI tool (like ChatGPT, GitHub Copilot, Gemini, etc.).

Look for these AI indicators:
- Overly polished structure and comments for a student submission
- Verbose, well-formatted docstrings uncommon in student work
- Unusual completeness (handles every edge case perfectly without struggle)
- Generic variable names like `result`, `output`, `data` paired with perfect style
- Boilerplate patterns typical of LLM outputs
- Algorithmically optimal solution when simpler brute-force is expected
- Consistent style that never varies (humans make minor inconsistencies)

Also look for human indicators:
- Minor syntax inconsistencies or style variations
- Simple, direct logic without unnecessary abstraction
- Typical student errors (off-by-one, wrong variable names)
- Missing edge case handling

Respond ONLY with valid JSON in this exact format:
{{
    "ai_likelihood": <integer 0-100>,
    "verdict": "likely_human",
    "indicators": ["list of up to 4 specific observations from this code"],
    "explanation": "one concise sentence summary"
}}

verdict must be exactly one of: "likely_human" (0-30), "possibly_ai" (31-65), "likely_ai" (66-100).

Code to analyze:
```python
{_short(code, 3000)}
```"""

    try:
        response_data = await _call_gemini_api([prompt], model_name=MODEL_FLASH)
        if isinstance(response_data, dict) and "ai_likelihood" in response_data:
            return {
                "ai_likelihood": int(response_data.get("ai_likelihood", 0)),
                "verdict": str(response_data.get("verdict", "unknown")),
                "indicators": list(response_data.get("indicators", [])),
                "explanation": str(response_data.get("explanation", "")),
            }
        return {"ai_likelihood": 0, "verdict": "unknown", "indicators": [], "explanation": "AI response format error."}
    except Exception as e:
        logger.error(f"Error in detect_ai_content: {e}")
        return {"ai_likelihood": 0, "verdict": "unknown", "indicators": [], "explanation": "AI call failed."}


async def analyze_code_feedback(code: str, problem_title: str = "") -> Dict[str, Any]:
    """Analyzes student code and provides feedback on weak and strong points. Uses PRO model."""
    if not GEMINI_API_KEY:
        return {
            "strong_points": ["Unable to analyze - API key not configured"],
            "weak_points": ["Unable to analyze - API key not configured"],
            "suggestions": ["Please configure GEMINI_API_KEY"]
        }
    
    prompt = f"""Analyze this Python code submission for the problem: "{problem_title or 'Unknown'}".

Provide constructive feedback for a teacher to share with the student.

Respond ONLY with valid JSON in this exact format:
{{
    "strong_points": ["up to 3 specific things the student did well"],
    "weak_points": ["up to 3 areas that need improvement"],
    "suggestions": ["up to 3 actionable suggestions for improvement"]
}}

Code to analyze:
```python
{_short(code, 3000)}
```"""
    
    try:
        response_data = await _call_gemini_api([prompt], model_name=MODEL_PRO)
        if isinstance(response_data, dict) and "strong_points" in response_data:
            return {
                "strong_points": list(response_data.get("strong_points", [])),
                "weak_points": list(response_data.get("weak_points", [])),
                "suggestions": list(response_data.get("suggestions", []))
            }
        else:
            return {"strong_points": [], "weak_points": ["AI response format error"], "suggestions": []}
    except Exception as e:
        logger.error(f"Error in analyze_code_feedback: {e}")
        return {"strong_points": [], "weak_points": ["AI call failed"], "suggestions": []}

async def analyze_student_portfolio(
    student_name: str,
    submissions: List[Dict[str, Any]],
    summary: Dict[str, Any]
) -> Dict[str, Any]:
    """Generates deep AI insights from a student's full submission history. Uses PRO model."""
    if not GEMINI_API_KEY:
        return {"overall_assessment": "API key not configured.", "risk_level": "unknown", "strongest_areas": [], "struggling_areas": [], "improvement_trend": "unknown", "recommendations": []}

    sub_summaries = "\n".join(
        f"- {s['assignment_name']} ({s['difficulty']}): score={s['final_score']}%, test_pass={s['test_pass_rate']}%, quality={s['quality_score']}/100, errors={s['error_counts']}"
        for s in submissions if s.get("submitted")
    ) or "No submissions yet."

    prompt = f"""You are an expert programming educator. Analyze the following student's performance data comprehensively.

STUDENT: {student_name}
SUMMARY:
- Completion rate: {summary['completion_rate']}%
- Average score: {summary['avg_score']}%
- Best score: {summary['best_score']}%
- Worst score: {summary['worst_score']}%
- Average code quality: {summary['avg_quality_score']}/100
- Average test pass rate: {summary['avg_test_pass_rate']}%
- Error frequency: {summary['error_frequency']}

PER-ASSIGNMENT BREAKDOWN:
{sub_summaries}

Provide a deep, actionable analysis for the teacher. Assess:
1. Overall learning trajectory (improving, declining, stagnant, inconsistent)
2. Strongest programming concepts demonstrated
3. Areas where the student is clearly struggling
4. Specific, actionable recommendations the teacher can give
5. Risk level (is this student at risk of falling behind?)

Respond ONLY with this exact JSON:
{{
    "overall_assessment": "2-3 sentence overall assessment of the student",
    "risk_level": "excellent|on_track|needs_attention|at_risk",
    "improvement_trend": "one sentence describing score trend over time",
    "strongest_areas": ["up to 3 specific strengths with evidence"],
    "struggling_areas": ["up to 3 specific weaknesses with evidence"],
    "recommendations": ["up to 4 specific actionable recommendations for the teacher"],
    "personality_note": "one sentence about the student's coding style/habits"
}}"""

    try:
        data = await _call_gemini_api([prompt], model_name=MODEL_PRO)
        if isinstance(data, dict) and "overall_assessment" in data:
            return {
                "overall_assessment": str(data.get("overall_assessment", "")),
                "risk_level": str(data.get("risk_level", "unknown")),
                "improvement_trend": str(data.get("improvement_trend", "")),
                "strongest_areas": list(data.get("strongest_areas", [])),
                "struggling_areas": list(data.get("struggling_areas", [])),
                "recommendations": list(data.get("recommendations", [])),
                "personality_note": str(data.get("personality_note", "")),
            }
        return {"overall_assessment": "Analysis failed.", "risk_level": "unknown", "strongest_areas": [], "struggling_areas": [], "improvement_trend": "", "recommendations": [], "personality_note": ""}
    except Exception as e:
        logger.error(f"Error in analyze_student_portfolio: {e}")
        return {"overall_assessment": "Analysis failed.", "risk_level": "unknown", "strongest_areas": [], "struggling_areas": [], "improvement_trend": "", "recommendations": [], "personality_note": ""}


# ---- Canned Responses ----
def _get_canned_questions(n: int) -> List[Dict[str, Any]]:
    canned = [{"id": str(uuid.uuid4()), "title": "Sum Two Numbers", "difficulty": "easy", "prompt": "Sum two integers.", "testcases": [{"type": "sample", "input": "2 3", "expected": "5", "points": 50}, {"type": "hidden", "input": "-1 1", "expected": "0", "points": 50}]}, {"id": str(uuid.uuid4()), "title": "Reverse String", "difficulty": "easy", "prompt": "Reverse a string.", "testcases": [{"type": "sample", "input": "hello", "expected": "olleh", "points": 50}, {"type": "hidden", "input": "Python", "expected": "nohtyP", "points": 50}]}]
    return [canned[i % len(canned)] for i in range(n)]

def _get_canned_error_classification(run_result: RunResult) -> Dict[str, str]:
    if run_result.timed_out: return {"error_type": "timeout", "explain": "Execution timed out."}
    if run_result.stderr: return {"error_type": "runtime_error", "explain": f"Runtime error: {run_result.stderr[:100]}"}
    return {"error_type": "wrong_output", "explain": "Incorrect output."}