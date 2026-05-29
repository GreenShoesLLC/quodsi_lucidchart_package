# 006a — Assign Action Tests

QA tests for the **Assign State** action editor inside the Activity Editor's Actions tab in the Quodsi LucidChart extension.

## How to read this file

Each test: **ID — Name [Priority]**, then **Preconditions**, **Steps**, **Expected**, and (sometimes) **Context** — author notes pointing at the source-of-truth code.

## How to record a run

Don't edit this file. For each run, create a file under `_qa/runs/` and **log only failures** — silence means pass. See `_qa/runs/README.md`.

## Scope

This file covers the **Assign State** action editor. For shared concerns:
- High-level Actions-tab behaviors (add / delete / drag-reorder / type-switch) → `005_Activity_Tests.md` → `## Actions` (`ACT-ACT-001..007`)
- Per-action state-condition guard → `006l_StateConditionGuard.md`
- Auto-save mechanics → `005_Activity_Tests.md` → `## Auto-Save Behavior` (`ACT-AUTOSAVE-001..005`)

Save behavior is the Activity Editor's `useAutoSave` (debounced ~500 ms, blur/select flushes immediately). `SaveStatusLine` strings: `Saving…`, `Saved`, `Fix errors to save`, `Save failed — keep typing to retry`.

---

### ACT-ASSIGN-001 — Add Assign action [P1]

**Preconditions**
- Activity selected; Actions tab open

**Steps**
1. Click `+ Add` to add a new action
2. The new card auto-expands
3. In the `Action Type` dropdown, pick `Assign State`

**Expected**
- Card shows `Action Type = Assign State`
- A `State Modifications` editor section appears
- Collapsed row's type label reads `Set State`
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-ASSIGN-002 — Add a state modification [P1]

**Preconditions**
- Activity has an `Assign State` action expanded
- Model has at least one State defined

**Steps**
1. In the `State Modifications` section, click `+ Add Modification`
2. Pick a state from the State dropdown
3. Pick an operation (e.g. `Set`)
4. Enter a value (e.g. `100`)
5. Tab out

**Expected**
- Modification row appears with state / operation / value populated
- Collapsed row's resource column reads `1 mod`
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-ASSIGN-003 — Multiple modifications [P2]

**Preconditions**
- Assign action with one modification already configured

**Steps**
1. Click `+ Add Modification` twice more
2. Configure each with a different state

**Expected**
- Three modification rows visible, independent values
- Collapsed row's resource column reads `3 mods`
- `SaveStatusLine` settles on `Saved`

### ACT-ASSIGN-004 — Delete a state modification [P2]

**Preconditions**
- Assign action with 2+ modifications

**Steps**
1. Click the red X (or trash) on one modification row

**Expected**
- That row disappears; the others remain intact
- Collapsed summary count decreases by one
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-ASSIGN-005 — No states available message [P3]

**Preconditions**
- Activity selected; Actions tab open
- Model has **zero** States defined

**Steps**
1. Add or expand an `Assign State` action

**Expected**
- The card body shows gray italic text: `No states available for modification`
- No `+ Add Modification` button is rendered
- No state-condition guard section is rendered either (hidden when state list is empty)

### ACT-ASSIGN-006 — Collapsed summary mods count [P3]

**Preconditions**
- An Assign action with N modifications

**Steps**
1. Collapse the card
2. Read the summary row

**Expected**
- Type label: `Set State`
- Resource column: `N mod` if N=1, `N mods` if N>1, `No mods` if N=0
- Duration column: `-`

### ACT-ASSIGN-007 — Modification operations available [P2]

**Preconditions**
- Assign action with at least one modification row

**Steps**
1. Open the Operation dropdown on a modification row
2. Note the available operations

**Expected**
- Available operations include `Set`, `Add`, `Subtract`, `Multiply`, `Divide`
- Each is selectable
- Value-field type may switch based on operation + state data type

### ACT-ASSIGN-008 — Modification respects state data type [P2]

**Preconditions**
- Assign action; model has both a Number state and a Text state defined

**Steps**
1. Add a modification pointing at a Number state; enter `42`
2. Add a second modification pointing at a Text state; enter `Complete`
3. Tab out of each

**Expected**
- Numeric state accepts `42`; text state accepts `Complete`
- Each modification renders the input control type that matches the state's data type
- `SaveStatusLine` cycles `Saving…` → `Saved` for each
