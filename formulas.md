# AutoAssess Grading Algorithm

This document outlines the dynamic scoring logic used by the AutoAssess engine to evaluate student submissions.

## The Core Formula

The final score ($S_{final}$) is calculated using a weighted linear combination of test correctness, code quality, and error penalties.

$$S_{final} = \max\left(0, \min\left(100, \alpha \cdot S_{test} + \beta \cdot S_{quality} - \gamma \cdot P_{error} \right)\right)$$

### Variables Definition

| Variable | Name | Description | Range | Source |
| :--- | :--- | :--- | :--- | :--- |
| **$S_{test}$** | Raw Test Score | Percentage of hidden test cases passed. | $0 - 100$ | Python Runtime Sandbox |
| **$S_{quality}$** | Quality Score | AI assessment of readability, PEP-8 compliance, and efficiency. | $0 - 100$ | Gemini 1.5 Pro |
| **$P_{error}$** | Error Penalty | Severity score based on the *type* of runtime error (if any). | $0 - 5$ | Log Analysis |
| **$\alpha$** | Test Weight | Importance given to functional correctness. | $0.0 - 1.0$ | **Teacher Configurable** |
| **$\beta$** | Quality Weight | Importance given to code style/efficiency. | $0.0 - 1.0$ | **Teacher Configurable** |
| **$\gamma$** | Penalty Multiplier | Severity multiplier for errors. | $0 - 50$ | **Teacher Configurable** |

---

## Error Classification Table

When a submission fails, the AI analyzes the `stderr` output and classifies the error type. Each type carries a base penalty severity.

| Error Type | Severity Base | Description |
| :--- | :--- | :--- |
| **SyntaxError** | 5 | Code fails to parse/compile. Immediate failure. |
| **IndentationError** | 4 | Python specific structural error. |
| **TimeoutError** | 3 | Infinite loop or inefficient algorithm ($O(n^2)$ vs $O(n \log n)$). |
| **LogicError** | 2 | Code runs but produces incorrect output. |
| **RuntimeError** | 2 | Crash during execution (e.g., ZeroDivisionError). |

---

## Dynamic Re-Grading Workflow

One of the key features of AutoAssess is **Post-Submission Re-grading**.

1.  **Storage:** When a student submits, the system stores raw data ($S_{test}$, code string, execution logs).
2.  **Evaluation:** The AI asynchronously computes $S_{quality}$ and classifies any errors to determine $P_{error}$.
3.  **Release:** When the teacher clicks "Release Results", they set the specific $\alpha, \beta, \gamma$ for that assignment.
4.  **Calculation:** The backend iterates through all submissions for that assignment ID and applies the formula above to generate the $S_{final}$ that is shown to students.

This allows instructors to be lenient on logic errors for beginners ($\gamma = 5$) or strict for advanced exams ($\gamma = 20$).