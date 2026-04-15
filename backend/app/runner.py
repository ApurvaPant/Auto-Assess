"""
Sandboxed Python code runner.

Key design decisions:
  - Uses sys.executable so the same interpreter that runs the backend
    always runs student code (no "python not found" failures in Docker).
  - -W ignore suppresses DeprecationWarning / ResourceWarning from reaching
    stderr and falsely marking a correct submission as failed.
  - RLIMIT_AS (virtual address space) is NOT set: Python 3 on 64-bit Linux
    legitimately maps ~500 MB+ of virtual address space even for tiny programs
    (shared libs, memory arenas). Capping at 300 MB silently kills correct code.
    Docker container memory limits provide the real protection.
  - RLIMIT_CPU keeps the hard CPU-time ceiling.
  - _get_function_wrapper() detects the common student mistake of writing a
    function definition without any top-level call, and injects a minimal
    call harness so the function actually runs.
"""

import ast
import os
import platform
import resource
import subprocess
import sys
import tempfile
from pydantic import BaseModel

CPU_LIMIT_SECONDS = 5   # hard CPU-time limit (seconds)


# ── Resource limits ───────────────────────────────────────────────────────────

class RunResult(BaseModel):
    stdout: str
    stderr: str
    runtime: float
    timed_out: bool


def _set_limits() -> None:
    """Called as preexec_fn in the child process (Linux only)."""
    resource.setrlimit(resource.RLIMIT_CPU, (CPU_LIMIT_SECONDS, CPU_LIMIT_SECONDS + 1))


# ── Smart function-call wrapper ───────────────────────────────────────────────

def _get_function_wrapper(code: str, input_data: str) -> str | None:
    """
    Many students write only a function definition when the problem says
    "write a function that …", forgetting to add the I/O boilerplate.
    This detects that pattern and injects a minimal call harness.

    Returns the augmented code string, or None when the original code
    already contains executable top-level statements.
    """
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return None  # Syntax errors are reported normally by the runner

    top_funcs: list[ast.FunctionDef] = []
    has_executable = False

    for node in tree.body:
        if isinstance(node, ast.FunctionDef):
            top_funcs.append(node)
        elif isinstance(node, (ast.Import, ast.ImportFrom, ast.ClassDef)):
            pass  # passive — no output produced
        else:
            # Assignment, bare call, for-loop, if, while, etc.
            has_executable = True

    if has_executable or not top_funcs:
        return None  # Code already runs, or has nothing to call

    # ── Pick which function to call ──────────────────────────────────────────
    PREFERRED = ("solve", "solution", "main", "run", "answer", "compute",
                 "calculate", "find", "get")
    fn_node: ast.FunctionDef | None = None
    for name in PREFERRED:
        fn_node = next((f for f in top_funcs if f.name == name), None)
        if fn_node:
            break
    if fn_node is None:
        fn_node = top_funcs[-1]  # Fall back to the last defined function

    fn_name = fn_node.name
    params   = [a for a in fn_node.args.args if a.arg != "self"]
    n_params = len(params)

    # ── 0-argument function ───────────────────────────────────────────────────
    # Either reads stdin itself, or is a pure computation with no input.
    if n_params == 0:
        wrapper = (
            f"\n_r = {fn_name}()\n"
            f"if _r is not None:\n"
            f"    print(_r)\n"
        )
        return code + wrapper

    # ── n-argument function — parse arguments from input_data ────────────────
    #
    # Strategy 1: one Python literal per line (handles lists, tuples, dicts,
    # strings, ints, floats — e.g. "[1, 2, 3]" or "42" on its own line).
    # This is the most common format when Gemini generates test-case inputs.
    lines = [l.strip() for l in (input_data or "").strip().split("\n") if l.strip()]
    if len(lines) >= n_params:
        call_args_lit: list[str] = []
        ok = True
        for ln in lines[:n_params]:
            try:
                val = ast.literal_eval(ln)
                call_args_lit.append(repr(val))
            except (ValueError, SyntaxError):
                ok = False
                break
        if ok:
            wrapper = (
                f"\n_r = {fn_name}({', '.join(call_args_lit)})\n"
                f"if _r is not None:\n"
                f"    print(_r)\n"
            )
            return code + wrapper

    # Strategy 2: fall back to whitespace-token splitting (simple scalar inputs
    # like "3 5" for two integer parameters).
    tokens: list[str] = []
    for line in (input_data or "").strip().split("\n"):
        tokens.extend(line.strip().split())

    if len(tokens) < n_params:
        return None  # Not enough tokens — give up; runner will get empty stdout

    call_args: list[str] = []
    for tok in tokens[:n_params]:
        try:
            int(tok)
            call_args.append(f"int({tok!r})")
        except ValueError:
            try:
                float(tok)
                call_args.append(f"float({tok!r})")
            except ValueError:
                call_args.append(repr(tok))

    wrapper = (
        f"\n_r = {fn_name}({', '.join(call_args)})\n"
        f"if _r is not None:\n"
        f"    print(_r)\n"
    )
    return code + wrapper


# ── Main runner ───────────────────────────────────────────────────────────────

def run_python_code(code: str, input_data: str) -> RunResult:
    is_windows = platform.system() == "Windows"

    # Pre-process: if the student only wrote function defs with no call,
    # inject a wrapper so the function is actually invoked.
    prepared   = _get_function_wrapper(code, input_data)
    final_code = prepared if prepared is not None else code

    with tempfile.TemporaryDirectory() as temp_dir:
        file_path = os.path.join(temp_dir, "main.py")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(final_code)

        try:
            process = subprocess.run(
                # sys.executable — always the correct Python in any environment
                # -W ignore    — suppress DeprecationWarning / ResourceWarning
                #                from reaching stderr and killing correct submissions
                [sys.executable, "-W", "ignore", file_path],
                input=(input_data or "").encode("utf-8"),
                capture_output=True,
                timeout=CPU_LIMIT_SECONDS + 2,  # wall-clock safety net
                preexec_fn=None if is_windows else _set_limits,
                check=False,
            )
            return RunResult(
                stdout=process.stdout.decode(errors="ignore").strip(),
                stderr=process.stderr.decode(errors="ignore").strip(),
                runtime=0.0,
                timed_out=False,
            )
        except subprocess.TimeoutExpired as e:
            return RunResult(
                stdout=e.stdout.decode(errors="ignore").strip() if e.stdout else "",
                stderr="Execution timed out.",
                runtime=float(CPU_LIMIT_SECONDS),
                timed_out=True,
            )
        except Exception as e:
            return RunResult(
                stdout="",
                stderr=f"Runner Error: {e}",
                runtime=0.0,
                timed_out=False,
            )
