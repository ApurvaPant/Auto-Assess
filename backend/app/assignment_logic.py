from typing import List
from app.models import Student, Package

def assign_packages_to_students(
    students: List[Student],
    packages: List[Package]
) -> List[dict]:
    """
    Assigns packages to students using round-robin and fixes adjacent duplicates.
    Assumes students are sorted by roll number.
    """
    n = len(students)
    m = len(packages)

    if m == 0:
        raise ValueError("Cannot assign from an empty list of packages.")
    if n == 0:
        return []

    # Basic constraint: Need at least 2 packages if more than 1 student
    if n > 1 and m < 2:
        raise ValueError("At least 2 unique packages are required for more than 1 student.")

    # Step 1: Initial round-robin assignment
    assignments = [(students[i].id, packages[i % m].id) for i in range(n)]

    # Step 2: Fix adjacent duplicates with local swaps
    for i in range(n - 1):
        if assignments[i][1] == assignments[i+1][1]:
            # Found adjacent duplicate at index i+1
            found_swap = False
            # Try to swap with the next non-identical neighbor
            for j in range(i + 2, n):
                if assignments[j][1] != assignments[i+1][1]:
                    # Ensure the swap doesn't create a new adjacent duplicate at j-1
                    if j > 0 and assignments[j-1][1] == assignments[i+1][1]:
                        continue
                    # Ensure the swap doesn't create a new adjacent duplicate at i (rare case)
                    if i > 0 and assignments[i-1][1] == assignments[j][1]:
                         continue

                    assignments[i+1], assignments[j] = assignments[j], assignments[i+1]
                    found_swap = True
                    break # Swap done, move to next index i

            if not found_swap:
                # If no forward swap possible, this simple algorithm fails.
                # A more robust solution might need backtracking.
                raise ValueError(
                    f"Could not resolve adjacent duplicate packages with {m} packages for {n} students. "
                    f"Try generating more unique packages ({constants.compute_m_star(n)} recommended)."
                )

    return [{"student_id": s_id, "package_id": p_id} for s_id, p_id in assignments]

# Import constants at the end to avoid potential circular import issues
from app import constants