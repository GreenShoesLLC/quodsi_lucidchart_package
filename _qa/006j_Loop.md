# 006j — Loop Action Tests

QA tests for the **Loop** action editor inside the Activity Editor's Actions tab in the Quodsi LucidChart extension.

## How to read this file

Each test: **ID — Name [Priority]**, then **Preconditions**, **Steps**, **Expected**, and (sometimes) **Context** — author notes pointing at the source-of-truth code.

## How to record a run

Don't edit this file. For each run, create a file under `_qa/runs/` and **log only failures** — silence means pass. See `_qa/runs/README.md`.

## Scope

This file covers the **Loop** action editor. For shared concerns:
- High-level Actions-tab behaviors (add / delete / drag-reorder / type-switch) → `005_Activity_Tests.md` → `## Actions` (`ACT-ACT-001..007`)
- Per-action state-condition guard → `006l_StateConditionGuard.md`
- Auto-save mechanics → `005_Activity_Tests.md` → `## Auto-Save Behavior` (`ACT-AUTOSAVE-001..005`)

Save behavior is the Activity Editor's `useAutoSave` (debounced ~500 ms, blur/select flushes immediately). `SaveStatusLine` strings: `Saving…`, `Saved`, `Fix errors to save`, `Save failed — keep typing to retry`.

> **Note:** the Action Type dropdown filters `LOOP` out of its options unless the current action is already a Loop. To create a Loop action for testing, import a model JSON that contains one. Once present, its editor is exercised by the tests below.

---

### ACT-LOOP-001 — Loop action renders [P2]

**Preconditions**
- Activity has a Loop action (imported from JSON)

**Steps**
1. Open the Actions tab, expand the Loop card

**Expected**
- Card shows `Action Type = Loop` (the dropdown includes `Loop` because the current action is already Loop)
- An `Iterations` numeric field appears (default `1`)
- A blue info box reports nested-action count and that nested editing is JSON-only
- Collapsed row's type label reads `Loop`

### ACT-LOOP-002 — Set iteration count [P1]

**Preconditions**
- Loop action expanded

**Steps**
1. In `Iterations`, clear, type `5`
2. Tab out

**Expected**
- Field accepts `5`
- Minimum is `1` (`min={1}`); entering `0` or negative is coerced to `1` via `Math.max(1, parseInt(value) || 1)`
- Collapsed summary's resource column reads `5× (N actions)` where N is the nested-actions count
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-LOOP-003 — Nested-actions info box [P2]

**Preconditions**
- Loop action expanded

**Steps**
1. Read the blue info box below the Iterations field

**Expected**
- Heading reads `Loop contains <N> action(s)`
- Body: `This action type is read-only. Nested actions can be configured via model JSON.`
- This holds even when N > 0

### ACT-LOOP-004 — Collapsed summary [P3]

**Preconditions**
- Loop action configured

**Steps**
1. Collapse; read summary

**Expected**
- Type column: `Loop`
- Duration column: `-`
- Resource column: `<iterations>× (<N> action<plural>)` (e.g. `5× (0 actions)`, `3× (1 action)`)

### ACT-LOOP-005 — Loop with 1 iteration [P3]

**Preconditions**
- Loop action expanded

**Steps**
1. Set `Iterations` to `1`

**Expected**
- Value `1` is accepted (it's the minimum, also the default)
- Functionally equivalent to running the nested actions once without the loop wrapper
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-LOOP-006 — Loop index is available at runtime (informational) [P3]

**Preconditions**
- Understanding loop behaviour

**Steps**
1. Note the runtime semantic: loop index (0-based) is exposed to nested actions via execution context

**Expected**
- Index starts at `0` for the first iteration
- Can be referenced inside nested action expressions
- Editor does not surface this — it's a runtime concern

### ACT-LOOP-007 — Editing nested actions requires JSON [P2]

**Preconditions**
- Loop action expanded

**Steps**
1. Try to add or edit nested actions from the UI

**Expected**
- No UI controls exist for editing the `actions` array
- The blue info box explicitly says nested-action editing is JSON-only
- To edit: export model JSON → modify the Loop's `actions` array → import

### ACT-LOOP-008 — Iterations minimum of 1 [P3]

**Preconditions**
- Loop action expanded

**Steps**
1. In `Iterations`, try `0` and negative numbers

**Expected**
- Sub-1 values are coerced to `1` by `Math.max(1, parseInt(value) || 1)`
- Field also has `min={1}` which may block sub-1 input directly
- `SaveStatusLine` cycles `Saving…` → `Saved`
