# 006b — Seize Action Tests

QA tests for the **Seize Resource** action editor inside the Activity Editor's Actions tab in the Quodsi LucidChart extension.

## How to read this file

Each test: **ID — Name [Priority]**, then **Preconditions**, **Steps**, **Expected**, and (sometimes) **Context** — author notes pointing at the source-of-truth code.

## How to record a run

Don't edit this file. For each run, create a file under `_qa/runs/` and **log only failures** — silence means pass. See `_qa/runs/README.md`.

## Scope

This file covers the **Seize Resource** action editor. For shared concerns:
- High-level Actions-tab behaviors (add / delete / drag-reorder / type-switch) → `005_Activity_Tests.md` → `## Actions` (`ACT-ACT-001..007`)
- Per-action state-condition guard → `006l_StateConditionGuard.md`
- Auto-save mechanics → `005_Activity_Tests.md` → `## Auto-Save Behavior` (`ACT-AUTOSAVE-001..005`)

Save behavior is the Activity Editor's `useAutoSave` (debounced ~500 ms, blur/select flushes immediately). `SaveStatusLine` strings: `Saving…`, `Saved`, `Fix errors to save`, `Save failed — keep typing to retry`.

---

### ACT-SEIZE-001 — Add Seize action [P1]

**Preconditions**
- Activity selected; Actions tab open

**Steps**
1. `+ Add`, expand the new card
2. Set `Action Type = Seize Resource`

**Expected**
- A `Resource to Seize` dropdown appears
- Collapsed row's type label reads `Seize Res`
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-SEIZE-002 — Select a resource requirement [P1]

**Preconditions**
- Seize action expanded
- Model has at least one Resource Requirement

**Steps**
1. Open `Resource to Seize`
2. Pick an existing requirement

**Expected**
- Dropdown shows the picked requirement
- A blue preview card appears below with the requirement name + a one-line preview of its clauses
- An `Edit` (pencil) button appears next to the dropdown
- Collapsed row's resource column shows the requirement name
- `SaveStatusLine` cycles `Saving…` → `Saved` immediately (dropdown change saves on change)

### ACT-SEIZE-003 — Create new requirement inline [P2]

**Preconditions**
- Seize action expanded; some Resources exist

**Steps**
1. Open `Resource to Seize`
2. Pick `+ Create New…` (rendered in blue)
3. Configure and save the requirement in the modal that opens

**Expected**
- Modal opens for requirement creation
- After saving, the new requirement is auto-selected in the dropdown
- Blue preview shows the newly created requirement
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-SEIZE-004 — Edit selected requirement [P2]

**Preconditions**
- Seize action with a requirement selected; preview visible

**Steps**
1. Click the pencil (`Edit`) button next to the dropdown
2. Make a change and save in the modal

**Expected**
- Modal opens preloaded with the selected requirement
- After save, the preview updates
- The requirement ID is unchanged
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-SEIZE-005 — No requirements available [P3]

**Preconditions**
- Activity selected; Actions tab open
- Model has **zero** Resource Requirements

**Steps**
1. Expand a Seize action
2. Open `Resource to Seize`

**Expected**
- Dropdown contains only `None` and `+ Create New…`
- Collapsed row's resource column shows `-`

### ACT-SEIZE-006 — Requirement preview content [P3]

**Preconditions**
- Seize action with a requirement selected

**Steps**
1. Look at the blue preview card below the dropdown

**Expected**
- Light blue background, requirement name in bold
- Preview line summarises the clause structure (e.g. `Worker (1)` or `Worker OR Machine (1 each)`)

### ACT-SEIZE-007 — Seize with no requirement selected [P2]

**Preconditions**
- Seize action expanded; `Resource to Seize` set to `None`

**Steps**
1. Leave the dropdown on `None`

**Expected**
- The action persists (no validation banner blocks save in the editor)
- Collapsed row's resource column shows `-`
- `SaveStatusLine` settles on `Saved`

**Context:** Per-action-type validators in `ActivityEditor.tsx` cover Split/Create/Join/Branch but not Seize/Release — an unselected Seize is allowed by the editor; if the simulation needs it set, model-level validation should warn.
