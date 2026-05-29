# 006f — Split Action Tests

QA tests for the **Split Entity** action editor inside the Activity Editor's Actions tab in the Quodsi LucidChart extension.

## How to read this file

Each test: **ID — Name [Priority]**, then **Preconditions**, **Steps**, **Expected**, and (sometimes) **Context** — author notes pointing at the source-of-truth code.

## How to record a run

Don't edit this file. For each run, create a file under `_qa/runs/` and **log only failures** — silence means pass. See `_qa/runs/README.md`.

## Scope

This file covers the **Split Entity** action editor. For shared concerns:
- High-level Actions-tab behaviors (add / delete / drag-reorder / type-switch) → `005_Activity_Tests.md` → `## Actions` (`ACT-ACT-001..007`)
- Per-action state-condition guard → `006l_StateConditionGuard.md`
- Auto-save mechanics → `005_Activity_Tests.md` → `## Auto-Save Behavior` (`ACT-AUTOSAVE-001..005`)

Save behavior is the Activity Editor's `useAutoSave` (debounced ~500 ms, blur/select flushes immediately). `SaveStatusLine` strings: `Saving…`, `Saved`, `Fix errors to save`, `Save failed — keep typing to retry`.

---

### ACT-SPLIT-001 — Add Split action [P1]

**Preconditions**
- Activity selected; Actions tab open

**Steps**
1. `+ Add`, expand, set `Action Type = Split Entity`

**Expected**
- Fields appear: `Split Count` (default 1), `Destination Activity` *required*, `Entity Template` (default "Same as original"), `Split Index State`, plus a `State Modifications` editor
- Collapsed row's type label reads `Split`
- A red banner `Fix to save: Split action requires a destination activity.` appears above the status line (covered by `ACT-ACT-006` in 005)
- `SaveStatusLine` shows `Fix errors to save`

### ACT-SPLIT-002 — Set split count [P1]

**Preconditions**
- Split action expanded

**Steps**
1. In `Split Count`, clear, type `5`
2. Tab out

**Expected**
- Field shows `5`
- Collapsed summary's resource column shows `5 → <destination or "Not set">`
- Minimum value is `1` (`min={1}`)
- `SaveStatusLine` cycles `Saving…` → `Saved` (assuming destination is also set)

### ACT-SPLIT-003 — Set destination activity (required) [P1]

**Preconditions**
- Split action expanded; other activities exist in the model

**Steps**
1. `Destination Activity` is marked with a red `*`
2. Open the dropdown
3. Pick an activity

**Expected**
- Dropdown shows all other activities
- Before selection: red border on dropdown, inline red text `Required - split entities must route to a different activity`, top-level red banner `Fix to save: Split action requires a destination activity.`
- After selection: red border + inline text + top-level banner all disappear
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-SPLIT-004 — Set entity template [P2]

**Preconditions**
- Split action expanded; entity templates exist

**Steps**
1. In `Entity Template`, leave on `Same as original` and re-select, then switch to a specific template

**Expected**
- `Same as original` corresponds to a `null` template (entities keep the original type)
- Selecting a template stores its id and applies to all split entities
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-SPLIT-005 — Set split index state [P2]

**Preconditions**
- Split action expanded
- Variant A: model has at least one **Number** state
- Variant B: model has zero numeric states

**Steps**
1. Open `Split Index State`
2. Variant A: pick a numeric state
3. Variant B: observe the field with no numeric states

**Expected**
- The dropdown lists only `NUMBER`-typed states (plus a `None` option)
- Variant B: a gray helper line reads `No numeric states defined. Create a numeric state to track split index.`
- When set, each split entity receives its 0-based index in this state
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-SPLIT-006 — Add state modifications [P2]

**Preconditions**
- Split action expanded; states defined; destination set

**Steps**
1. In `State Modifications`, click `+ Add Modification`
2. Configure a modification (e.g. set `status` = `split`)

**Expected**
- The modification is applied to **each** new entity (description text under the section reads `Applied to each new entity`)
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-SPLIT-007 — Missing destination blocks save (banner) [P1]

**Preconditions**
- Split action expanded; destination unset

**Steps**
1. Observe the panel state
2. Pick a destination
3. Observe again

**Expected**
- Before pick: red banner `Fix to save: Split action requires a destination activity.` above the status line; status line shows `Fix errors to save`
- After pick: banner gone; status line cycles to `Saved`
- Multiple unset Splits aggregate to a parenthesised count (e.g. `(2 actions need destinations)`) — see `ACT-ACT-007` in 005

### ACT-SPLIT-008 — Collapsed summary [P3]

**Preconditions**
- Split action configured

**Steps**
1. Collapse; read summary

**Expected**
- Type column: `Split`
- Duration column: `-`
- Resource column: `<count> → <destination name>` or `<count> → Not set` if destination is unset

### ACT-SPLIT-009 — Split count = 1 [P3]

**Preconditions**
- Split action expanded

**Steps**
1. Set `Split Count` to `1`
2. Pick a destination

**Expected**
- Value `1` is accepted
- The original entity is replaced by a single new entity routed to the destination
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-SPLIT-010 — Multiple Split actions on one activity [P3]

**Preconditions**
- Activity selected

**Steps**
1. Add Split #1: count `2`, destination Activity A
2. Add Split #2: count `3`, destination Activity B

**Expected**
- Both rows persist (`SaveStatusLine` settles on `Saved` after both have destinations)
- Document at runtime only the first Split executes — the original entity is disposed after the first split, so the second never runs
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-SPLIT-011 — Destination = current activity is accepted by the UI [P3]

**Preconditions**
- Split action expanded

**Steps**
1. In `Destination Activity`, pick the current activity itself

**Expected**
- The UI accepts the selection (the dropdown includes the current activity)
- No editor-level error; model-level validation should warn about a self-referential split (potential infinite loop)
- `SaveStatusLine` cycles `Saving…` → `Saved`
