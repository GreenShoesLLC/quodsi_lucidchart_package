# 006d — Delay Action Tests

QA tests for the **Delay** action editor inside the Activity Editor's Actions tab in the Quodsi LucidChart extension.

## How to read this file

Each test: **ID — Name [Priority]**, then **Preconditions**, **Steps**, **Expected**, and (sometimes) **Context** — author notes pointing at the source-of-truth code.

## How to record a run

Don't edit this file. For each run, create a file under `_qa/runs/` and **log only failures** — silence means pass. See `_qa/runs/README.md`.

## Scope

This file covers the **Delay** action editor (pure delay — no resource). For shared concerns:
- High-level Actions-tab behaviors (add / delete / drag-reorder / type-switch) → `005_Activity_Tests.md` → `## Actions` (`ACT-ACT-001..007`)
- Per-action state-condition guard → `006l_StateConditionGuard.md`
- Auto-save mechanics → `005_Activity_Tests.md` → `## Auto-Save Behavior` (`ACT-AUTOSAVE-001..005`)
- Per-distribution input mechanics (constant / exponential / normal / uniform / triangular) → `004_Duration_Editor_Tests.md`

Save behavior is the Activity Editor's `useAutoSave` (debounced ~500 ms, blur/select flushes immediately). `SaveStatusLine` strings: `Saving…`, `Saved`, `Fix errors to save`, `Save failed — keep typing to retry`.

---

### ACT-DELAY-001 — Add Delay action [P1]

**Preconditions**
- Activity selected; Actions tab open

**Steps**
1. `+ Add`, expand, set `Action Type = Delay`

**Expected**
- A Duration editor appears (period unit + distribution controls)
- Collapsed row's type label reads `Delay`; resource column shows `-`
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-DELAY-002 — Constant duration [P1]

**Preconditions**
- Delay action expanded

**Steps**
1. In the Duration editor: set distribution `CONSTANT`, value `5`, unit `MINUTES`
2. Tab out

**Expected**
- Collapsed summary's duration column reads `5 min Const`
- `SaveStatusLine` cycles `Saving…` → `Saved`

**Context:** Per-distribution input mechanics are covered by `004_Duration_Editor_Tests`.

### ACT-DELAY-003 — Exponential distribution [P2]

**Preconditions**
- Delay action expanded

**Steps**
1. Switch distribution to `EXPONENTIAL`
2. Enter scale `10`, unit `MINUTES`
3. Tab out

**Expected**
- `Scale` field is visible (and accepts values ≥ 0.01)
- Collapsed summary's duration column reads `10 min Exp`
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-DELAY-004 — Normal distribution [P2]

**Preconditions**
- Delay action expanded

**Steps**
1. Switch distribution to `NORMAL`
2. Enter mean `10`, std dev `2`
3. Tab out

**Expected**
- `Mean` and `Std Dev` fields are visible
- Collapsed summary's duration column references the mean (e.g. `10 min Norm`)
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-DELAY-005 — Uniform distribution [P2]

**Preconditions**
- Delay action expanded

**Steps**
1. Switch distribution to `UNIFORM`
2. Enter low `5`, high `15`
3. Tab out

**Expected**
- `Low` and `High` fields visible
- If low > high is entered, the editor auto-adjusts so low ≤ high
- Collapsed summary's duration references the low value (e.g. `5 min Unif`)
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-DELAY-006 — Triangular distribution [P2]

**Preconditions**
- Delay action expanded

**Steps**
1. Switch distribution to `TRIANGULAR`
2. Enter left `2`, mode `5`, right `10`
3. Tab out

**Expected**
- `Left`, `Mode`, `Right` fields visible
- Editor auto-adjusts to maintain `Left ≤ Mode ≤ Right`
- Collapsed summary references the minimum (e.g. `2 min Tri`)
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-DELAY-007 — Collapsed summary [P3]

**Preconditions**
- Delay action configured

**Steps**
1. Collapse the card; read the summary

**Expected**
- Type column: `Delay`
- Duration column: `value unit dist` (e.g. `5 min Const`, `10 hr Exp`)
- Resource column: `-`
