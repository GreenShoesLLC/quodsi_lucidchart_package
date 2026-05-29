# 006k — Branch Action Tests

QA tests for the **Branch** action editor inside the Activity Editor's Actions tab in the Quodsi LucidChart extension.

## How to read this file

Each test: **ID — Name [Priority]**, then **Preconditions**, **Steps**, **Expected**, and (sometimes) **Context** — author notes pointing at the source-of-truth code.

## How to record a run

Don't edit this file. For each run, create a file under `_qa/runs/` and **log only failures** — silence means pass. See `_qa/runs/README.md`.

## Scope

This file covers the **Branch** action editor. For shared concerns:
- High-level Actions-tab behaviors (add / delete / drag-reorder / type-switch) → `005_Activity_Tests.md` → `## Actions` (`ACT-ACT-001..007`)
- Per-action state-condition guard → `006l_StateConditionGuard.md` (note: Branch labels its guard `Run Condition` to disambiguate from the Branch's own decision condition)
- Auto-save mechanics → `005_Activity_Tests.md` → `## Auto-Save Behavior` (`ACT-AUTOSAVE-001..005`)

Save behavior is the Activity Editor's `useAutoSave` (debounced ~500 ms, blur/select flushes immediately). `SaveStatusLine` strings: `Saving…`, `Saved`, `Fix errors to save`, `Save failed — keep typing to retry`.

> **Note:** the Action Type dropdown filters `BRANCH` out of its options unless the current action is already a Branch. To create one for testing, import a model JSON that contains a Branch action. Once present, its editor is exercised below.

---

### ACT-BRANCH-001 — Branch action renders [P2]

**Preconditions**
- Activity has a Branch action (imported from JSON); Actions tab open

**Steps**
1. Expand the Branch card

**Expected**
- A `Condition` editor row appears (state / comparison / value)
- A green info box (`If True: <N> action(s)`) and a red info box (`If False: <N> action(s)`) below it
- A gray helper box notes that nested action editing is JSON-only
- The collapsible Run-Condition guard above is labelled `Run Condition` (instead of `Condition`) for Branch actions specifically
- Collapsed row's type label reads `Branch`
- If condition is unset: red banner `Fix to save: Branch action requires a condition to be set.` above the status line (covered by `ACT-ACT-007` in 005)

### ACT-BRANCH-002 — Set condition state (required) [P1]

**Preconditions**
- Branch action expanded; states defined

**Steps**
1. In the `Condition` row, open the state dropdown
2. Pick a state (e.g. `quality`)

**Expected**
- Dropdown lists all states
- Before pick: inline red text `Required - set the condition to evaluate`; top-level red banner present
- After pick: inline error gone; comparison + value fields become active

### ACT-BRANCH-003 — Set comparison operator [P1]

**Preconditions**
- Branch action expanded; condition state selected

**Steps**
1. Open the comparison dropdown (middle of the condition row)
2. Pick `>` (greater than)

**Expected**
- Available operators include `==`, `!=`, `>`, `>=`, `<`, `<=`
- Default is `==`
- Selection persists; condition summary in the collapsed view updates

### ACT-BRANCH-004 — Set condition value [P1]

**Preconditions**
- Branch action expanded; state + operator set

**Steps**
1. In the condition value input (right side), type `80`
2. Tab out

**Expected**
- Field accepts the value
- Numeric strings compare numerically; `true`/`false` compare as booleans; other strings compare lexically
- Once state + value are both set, top-level banner clears and `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-BRANCH-005 — If True info box [P2]

**Preconditions**
- Branch action expanded with condition configured

**Steps**
1. Read the green box below the condition row

**Expected**
- Heading: `If True: <N> action(s)`
- Body: `Executes when condition is satisfied.`

### ACT-BRANCH-006 — If False info box [P2]

**Preconditions**
- Branch action expanded

**Steps**
1. Read the red box below the green box

**Expected**
- Heading: `If False: <N> action(s)`
- Body: `Executes when condition is not satisfied.`

### ACT-BRANCH-007 — Nested-actions limitation message [P2]

**Preconditions**
- Branch action expanded

**Steps**
1. Read the gray helper box below the If True / If False boxes

**Expected**
- Body text: `This action type is read-only. Nested actions can be configured via model JSON.`
- Applies to both `ifTrue` and `ifFalse` arrays

### ACT-BRANCH-008 — Collapsed summary [P3]

**Preconditions**
- Branch action with condition configured

**Steps**
1. Collapse; read summary

**Expected**
- Type column: `Branch`
- Duration column: `-`
- Resource column: `<stateName> <comparison> <value> (<T>/<F>)` where T = ifTrue count, F = ifFalse count (e.g. `quality > 80 (0/1)`)
- If condition is unset, the summary substitutes `No condition`

### ACT-BRANCH-009 — Missing condition blocks save (banner) [P1]

**Preconditions**
- Branch action expanded; condition unset

**Steps**
1. Observe panel state
2. Set the condition
3. Observe again

**Expected**
- Before: red banner `Fix to save: Branch action requires a condition to be set.` and inline text `Required - set the condition to evaluate`; status line `Fix errors to save`
- After: banner + inline error clear; status line cycles to `Saved`

### ACT-BRANCH-010 — Quality-control pattern (informational) [P2]

**Preconditions**
- Understanding Branch patterns

**Steps**
1. Imagine: condition `quality >= 80`; If True path empty (continue); If False path holds a Dispose

**Expected**
- Common quality-gate pattern: items below threshold are disposed on the false branch
- Nested-action wiring still requires JSON editing in the current build

### ACT-BRANCH-011 — Editing nested actions requires JSON [P3]

**Preconditions**
- Branch action expanded

**Steps**
1. Try to add or edit nested actions from the UI

**Expected**
- No UI controls exist for editing the `ifTrue` or `ifFalse` arrays
- The gray helper box explicitly says nested-action editing is JSON-only
- To edit: export model JSON → modify the Branch's `ifTrue` / `ifFalse` arrays → import
