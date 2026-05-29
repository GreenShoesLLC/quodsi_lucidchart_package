# 006h — Dispose Action Tests

QA tests for the **Dispose Entity** action editor inside the Activity Editor's Actions tab in the Quodsi LucidChart extension.

## How to read this file

Each test: **ID — Name [Priority]**, then **Preconditions**, **Steps**, **Expected**, and (sometimes) **Context** — author notes pointing at the source-of-truth code.

## How to record a run

Don't edit this file. For each run, create a file under `_qa/runs/` and **log only failures** — silence means pass. See `_qa/runs/README.md`.

## Scope

This file covers the **Dispose Entity** action editor. For shared concerns:
- High-level Actions-tab behaviors (add / delete / drag-reorder / type-switch) → `005_Activity_Tests.md` → `## Actions` (`ACT-ACT-001..007`)
- Per-action state-condition guard → `006l_StateConditionGuard.md`
- Auto-save mechanics → `005_Activity_Tests.md` → `## Auto-Save Behavior` (`ACT-AUTOSAVE-001..005`)

Save behavior is the Activity Editor's `useAutoSave` (debounced ~500 ms, blur/select flushes immediately). `SaveStatusLine` strings: `Saving…`, `Saved`, `Fix errors to save`, `Save failed — keep typing to retry`.

---

### ACT-DISPOSE-001 — Add Dispose action [P1]

**Preconditions**
- Activity selected; Actions tab open

**Steps**
1. `+ Add`, expand, set `Action Type = Dispose Entity`

**Expected**
- Card body shows gray italic text `No configuration required.`
- No additional input fields
- Collapsed row's type label reads `Dispose`
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-DISPOSE-002 — No configuration fields rendered [P1]

**Preconditions**
- Dispose action expanded

**Steps**
1. Inspect the expanded card body

**Expected**
- Only the Action Type dropdown, the optional state-condition guard, and the `No configuration required.` message
- Zero other inputs

### ACT-DISPOSE-003 — Collapsed summary [P3]

**Preconditions**
- Dispose action in the list

**Steps**
1. Collapse; read summary

**Expected**
- Type column: `Dispose`
- Duration column: `-`
- Resource column: `Terminates entity`

### ACT-DISPOSE-004 — Dispose inside Branch (informational) [P2]

**Preconditions**
- Activity with states defined

**Steps**
1. Add a Branch action with condition (e.g. `quality < 80`)
2. Note that nested actions inside Branch ifTrue/ifFalse arrays are not editable in the UI — only via JSON

**Expected**
- Dispose is commonly used as a nested action in Branch (e.g. on the failure path) but must be added via JSON in the current build
- Editing the top-level Branch / Dispose works as documented in the Branch + Dispose sections here

### ACT-DISPOSE-005 — Dispose terminates entity early [P2]

**Preconditions**
- Activity with multiple actions

**Steps**
1. Configure: Action 1 = Delay 5 min, Action 2 = Dispose, Action 3 = Assign (any)

**Expected**
- At runtime, the entity completes Action 1, is terminated by Action 2, and Action 3 never runs
- The entity does not flow through outbound connectors after Dispose
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-DISPOSE-006 — Position of Dispose affects flow [P2]

**Preconditions**
- Activity with multiple actions

**Steps**
1. Configure Delay → Assign → Dispose → Assign
2. Drag-reorder to put Dispose first (see `ACT-ACT-004` in 005 for drag mechanics)
3. Observe semantically what would happen at runtime

**Expected**
- Actions before Dispose run; actions after Dispose are skipped
- Reordering via the drag handle persists through auto-save
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-DISPOSE-007 — Multiple Dispose actions on one activity [P3]

**Preconditions**
- Activity selected

**Steps**
1. Add two Dispose actions

**Expected**
- Both persist in the list (the editor doesn't dedupe)
- At runtime only the first Dispose executes — second is unreachable
- `SaveStatusLine` cycles `Saving…` → `Saved`
