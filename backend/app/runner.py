import subprocess
import resource
import platform
import tempfile
import os
from pydantic import BaseModel

CPU_LIMIT_SECONDS = 3
MEMORY_LIMIT_MB = 300

class RunResult(BaseModel):
    stdout: str
    stderr: str
    runtime: float
    timed_out: bool

def set_limits():
    resource.setrlimit(resource.RLIMIT_CPU, (CPU_LIMIT_SECONDS, CPU_LIMIT_SECONDS + 1))
    memory_bytes = MEMORY_LIMIT_MB * 1024 * 1024
    resource.setrlimit(resource.RLIMIT_AS, (memory_bytes, memory_bytes))

def run_python_code(code: str, input_data: str) -> RunResult:
    is_windows = platform.system() == "Windows"
    with tempfile.TemporaryDirectory() as temp_dir:
        file_path = os.path.join(temp_dir, "main.py")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(code)
        try:
            process = subprocess.run(
                ["python", file_path],
                input=input_data.encode('utf-8'),
                capture_output=True,
                timeout=CPU_LIMIT_SECONDS + 2,
                preexec_fn=None if is_windows else set_limits,
                check=False
            )
            return RunResult(
                stdout=process.stdout.decode(errors='ignore').strip(),
                stderr=process.stderr.decode(errors='ignore').strip(),
                runtime=0.0,
                timed_out=False
            )
        except subprocess.TimeoutExpired as e:
            return RunResult(
                stdout=e.stdout.decode(errors='ignore').strip() if e.stdout else '',
                stderr="Execution timed out.",
                runtime=CPU_LIMIT_SECONDS,
                timed_out=True
            )
        except Exception as e:
             return RunResult(
                stdout='',
                stderr=f"Runner Error: {e}",
                runtime=0,
                timed_out=False
            )