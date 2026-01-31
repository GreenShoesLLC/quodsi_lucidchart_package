# Azure Batch Spot Node Startup & Task Reliability Plan

## Purpose
This document summarizes the root cause analysis and recommended changes to improve reliability of Azure Batch jobs running on **Spot (Low-Priority) nodes**, and outlines concrete actions to apply in the repository.

The goal is to:
- Eliminate race conditions and path mismatches between pool StartTask and job tasks
- Make jobs resilient to Spot eviction and node re-creation
- Ensure deterministic Python environment availability

---

## Problem Summary

### Observed Failures
- Tasks fail immediately with:
  ```
  /bin/bash: .../batch_env/bin/activate: No such file or directory
  ```
- Portal later reports `NodeNotFound`
- Failures occur primarily when Spot nodes are newly allocated or evicted/replaced

### Key Findings
1. **Virtual environment (`batch_env`) is created relative to the StartTask working directory**
   - Created with:
     ```bash
     python3 -m venv batch_env
     ```
   - Assumes implicit working directory = `$AZ_BATCH_NODE_STARTUP_DIR/wd`
   - Tasks later reference this directory explicitly
   - This coupling is brittle and breaks on Spot churn

2. **Tasks only activate a venv; they do not create it**
   - If the node is new or reimaged, the venv does not exist
   - `waitForSuccess=true` does not help if the StartTask succeeds but places artifacts elsewhere

3. **Use of `apt-get upgrade -y` in StartTask**
   - Increases bootstrap time and failure probability
   - Makes Spot nodes slow to become usable
   - Complicates debugging when nodes are evicted quickly

4. **Low retry count**
   - `maxTaskRetryCount = 1` is insufficient for Spot workloads

---

## Design Principles Going Forward

- Treat Spot nodes as **ephemeral**
- Make node bootstrap **idempotent and explicit**
- Avoid reliance on implicit working directories
- Ensure tasks can tolerate cold nodes
- Prefer deterministic, fast startup

---

## Recommended Changes

### 1. Move Python Virtual Environment to Node Shared Directory

Use a stable, node-scoped path:
```
$AZ_BATCH_NODE_SHARED_DIR/batch_env
```

This directory:
- Persists for the lifetime of the node
- Is accessible to StartTask and all tasks
- Is the intended location for node-level artifacts

---

### 2. Update Pool StartTask (Node Bootstrap)

**Key changes**
- Create venv at an explicit absolute path
- Make setup idempotent
- Remove `apt-get upgrade`
- Keep bootstrap fast and deterministic

**Example StartTask**
```bash
VENV_DIR="${AZ_BATCH_NODE_SHARED_DIR}/batch_env"

if [ ! -f "${VENV_DIR}/bin/activate" ]; then
  python3 -m venv "${VENV_DIR}"
  source "${VENV_DIR}/bin/activate"
  python -m pip install --upgrade pip setuptools wheel
  python -m pip install --no-cache-dir -r "$AZ_BATCH_APP_PACKAGE_quodsim_base_1_0/requirements.txt"
fi
```

---

### 3. Update Task Command Lines

Tasks must activate the same shared venv explicitly:

```bash
source $AZ_BATCH_NODE_SHARED_DIR/batch_env/bin/activate
python3 -m quodsim_runner.lucidchart.cli ...
```

No task should assume:
- A previous job ran
- A node is warm
- A venv exists unless verified

---

### 4. Optional: Make Tasks Self-Healing (Extra Safety)

For maximum robustness, tasks may create the venv if missing:

```bash
if [ ! -f "$AZ_BATCH_NODE_SHARED_DIR/batch_env/bin/activate" ]; then
  python3 -m venv "$AZ_BATCH_NODE_SHARED_DIR/batch_env"
fi
source "$AZ_BATCH_NODE_SHARED_DIR/batch_env/bin/activate"
```

---

### 5. Increase Retry Counts for Spot Jobs

Recommended:
- `maxTaskRetryCount`: **3–5**
- Ensure tasks are idempotent

This allows recovery from:
- Spot eviction
- Node reallocation during startup

---

## Non-Goals (Out of Scope)
- Containerization (recommended long-term but not required for this change)
- Pool autoscaling changes
- Cost optimization tuning

---

## Expected Outcomes

After applying these changes:
- Tasks will no longer fail due to missing `batch_env`
- Spot eviction will be recoverable via retries
- Node startup will be faster and more predictable
- Debugging will be simpler and deterministic

---

## Next Steps

1. Update pool StartTask script in repo
2. Update task command templates to use Node Shared path
3. Increase retry counts for Spot jobs
4. (Optional) Add logging/upload for StartTask stdout/stderr

---

## Notes

These changes align with Azure Batch best practices for Spot/Low-Priority pools and are required for reliable execution under node churn.
