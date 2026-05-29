# 006c — Release Action Tests

QA tests for the **Release Resource** action editor inside the Activity Editor's Actions tab in the Quodsi LucidChart extension.

## How to read this file

Each test: **ID — Name [Priority]**, then **Preconditions**, **Steps**, **Expected**, and (sometimes) **Context** — author notes pointing at the source-of-truth code.

## How to record a run

Don't edit this file. For each run, create a file under `_qa/runs/` and **log only failures** — silence means pass. See `_qa/runs/README.md`.

## Scope

This file covers the **Release Resource** action editor. For shared concerns:
- High-level Actions-tab behaviors (add / delete / drag-reorder / type-switch) → `005_Activity_Tests.md` → `## Actions` (`ACT-ACT-001..007`)
- Per-action state-condition guard → `006l_StateConditionGuard.md`
- Auto-save mechanics → `005_Activity_Tests.md` → `## Auto-Save Behavior` (`ACT-AUTOSAVE-001..005`)

Save behavior is the Activity Editor's `useAutoSave` (debounced ~500 ms, blur/select flushes immediately). `SaveStatusLine` strings: `Saving…`, `Saved`, `Fix errors to save`, `Save failed — keep typing to retry`.

---

### ACT-RELEASE-001 — Add Release action [P1]

**Preconditions**
- Activity selected; Actions tab open

**Steps**
1. `+ Add`, expand, set `Action Type = Release Resource`

**Expected**
- A `Resource to Release` dropdown appears
- Collapsed row's type label reads `Release Res`
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-RELEASE-002 — Select a specific requirement to release [P1]

**Preconditions**
- Release action expanded; model has Resource Requirements

**Steps**
1. Open `Resource to Release`
2. Pick a specific requirement (not `All`)

**Expected**
- Dropdown shows the picked requirement
- Blue preview card appears
- Collapsed row's resource column shows the requirement name
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-RELEASE-003 — Release All option [P1]

**Preconditions**
- Release action expanded

**Steps**
1. Open `Resource to Release`
2. Pick the first option, `All (release all held resources)`

**Expected**
- Dropdown shows `All (release all held resources)`
- No blue preview card appears (no specific requirement)
- Collapsed row's resource column shows `-`
- `SaveStatusLine` cycles `Saving…` → `Saved`

**Context:** The Release editor uses `emptyOptionLabel = "All (release all held resources)"` instead of the generic `None`.

### ACT-RELEASE-004 — Release pairs with Seize [P1]

**Preconditions**
- Activity with a Seize action that references requirement `Worker`

**Steps**
1. Add a Release action later in the list
2. Pick the same `Worker` requirement in `Resource to Release`

**Expected**
- Both Seize and Release rows reference the same requirement
- `SaveStatusLine` cycles `Saving…` → `Saved`

**Context:** Behavior at runtime — Seize acquires, Release frees. The editor doesn't enforce pairing; this just verifies they can refer to the same requirement.

### ACT-RELEASE-005 — Edit selected requirement [P2]

**Preconditions**
- Release action with a specific requirement selected; preview visible

**Steps**
1. Click the pencil (`Edit`) button next to the dropdown
2. Edit and save in the modal

**Expected**
- Modal opens preloaded with the selected requirement
- After save, the preview updates
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-RELEASE-006 — Create requirement inline from Release [P2]

**Preconditions**
- Release action expanded; resources exist

**Steps**
1. Open `Resource to Release`
2. Pick `+ Create New…`
3. Configure and save the requirement

**Expected**
- Modal opens; on save, the new requirement is auto-selected
- Blue preview shows the new requirement
- `SaveStatusLine` cycles `Saving…` → `Saved`
