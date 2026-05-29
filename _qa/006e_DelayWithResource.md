# 006e — Delay With Resource Action Tests

QA tests for the **Delay with Resource** action editor inside the Activity Editor's Actions tab in the Quodsi LucidChart extension.

## How to read this file

Each test: **ID — Name [Priority]**, then **Preconditions**, **Steps**, **Expected**, and (sometimes) **Context** — author notes pointing at the source-of-truth code.

## How to record a run

Don't edit this file. For each run, create a file under `_qa/runs/` and **log only failures** — silence means pass. See `_qa/runs/README.md`.

## Scope

This file covers the **Delay with Resource** action editor (combined seize-delay-release pattern). For shared concerns:
- High-level Actions-tab behaviors (add / delete / drag-reorder / type-switch) → `005_Activity_Tests.md` → `## Actions` (`ACT-ACT-001..007`)
- Per-action state-condition guard → `006l_StateConditionGuard.md`
- Auto-save mechanics → `005_Activity_Tests.md` → `## Auto-Save Behavior` (`ACT-AUTOSAVE-001..005`)
- Per-distribution input mechanics → `004_Duration_Editor_Tests.md`

Save behavior is the Activity Editor's `useAutoSave` (debounced ~500 ms, blur/select flushes immediately). `SaveStatusLine` strings: `Saving…`, `Saved`, `Fix errors to save`, `Save failed — keep typing to retry`.

---

### ACT-DWR-001 — Add Delay with Resource action [P1]

**Preconditions**
- Activity selected; Actions tab open

**Steps**
1. `+ Add`, expand, set `Action Type = Delay with Resource`

**Expected**
- Both a Duration editor and a `Resource Requirement` dropdown appear
- Collapsed row's type label reads `Process`
- `SaveStatusLine` cycles `Saving…` → `Saved`

**Context:** This is the default type for newly added actions (see `ACT-ACT-002` in 005), but `+ Add` itself is covered there. This test verifies the **type-switch** path lands on the same editor.

### ACT-DWR-002 — Configure duration and resource [P1]

**Preconditions**
- DWR action expanded; resource requirements exist

**Steps**
1. Set duration `10 MINUTES CONSTANT`
2. Pick a requirement in `Resource Requirement`
3. Tab out

**Expected**
- Duration field shows `10 min Const`; requirement preview card appears
- Collapsed summary: duration `10 min Const`, resource = requirement name
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-DWR-003 — Keep resource checkbox appears only when requirement is set [P1]

**Preconditions**
- DWR action expanded

**Steps**
1. With `Resource Requirement` set to `None`, observe — no `Keep resource after delay` checkbox
2. Pick a requirement — checkbox appears
3. Check `Keep resource after delay`
4. Collapse the card and read the summary

**Expected**
- Checkbox is hidden when requirement is `None`
- When checked with a requirement set, collapsed summary's resource column shows `RequirementName (keep)`
- Unsetting the requirement again hides the checkbox
- `SaveStatusLine` cycles `Saving…` → `Saved` after each change

### ACT-DWR-004 — Pure delay (no requirement) [P2]

**Preconditions**
- DWR action expanded

**Steps**
1. Leave `Resource Requirement` on `None`
2. Set a duration (e.g. 5 minutes constant)
3. Tab out

**Expected**
- The action persists with no requirement
- `Keep resource` checkbox is not rendered
- Collapsed summary's resource column shows `-`
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-DWR-005 — Classic seize-delay-release pattern [P1]

**Preconditions**
- DWR action expanded; a `Workstation` requirement exists

**Steps**
1. Set duration `15 MINUTES NORMAL` (mean 15, std 3)
2. Pick `Workstation` requirement
3. Leave `Keep resource` unchecked
4. Save (auto-save)

**Expected**
- At runtime this single action runs seize → delay → release on `Workstation`
- Equivalent to three separate `Seize` / `Delay` / `Release` actions
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-DWR-006 — Create requirement inline from DWR [P2]

**Preconditions**
- DWR action expanded; some resources exist

**Steps**
1. Open `Resource Requirement`
2. Pick `+ Create New…`
3. Configure and save the requirement

**Expected**
- Modal opens; on save the new requirement is auto-selected
- `Keep resource` checkbox becomes available
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-DWR-007 — Edit selected requirement [P2]

**Preconditions**
- DWR action with a requirement selected; preview visible

**Steps**
1. Click the pencil (`Edit`) button
2. Edit and save the requirement in the modal

**Expected**
- Modal opens preloaded; on save, preview updates
- Other actions referencing the same requirement also see the changes
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-DWR-008 — Multiple DWR actions in sequence [P2]

**Preconditions**
- Activity selected; resource requirements exist

**Steps**
1. Add DWR #1: 5 min, Workstation
2. Add DWR #2: 10 min, Inspector
3. Add DWR #3: 3 min, Packer

**Expected**
- All three appear in order (1, 2, 3) in the list
- Each has independent duration + requirement
- `SaveStatusLine` settles on `Saved` after the last edit

### ACT-DWR-009 — Collapsed summary [P3]

**Preconditions**
- DWR fully configured

**Steps**
1. Collapse the card; read the summary

**Expected**
- Type column: `Process`
- Duration column: `value unit dist`
- Resource column: requirement name (with ` (keep)` suffix when `keepResource` is true)
