# 006l — State-Condition Guard Tests (cross-cutting)

QA tests for the per-action **state-condition guard** that appears on every expanded action card in the Activity Editor's Actions tab.

## How to read this file

Each test: **ID — Name [Priority]**, then **Preconditions**, **Steps**, **Expected**, and (sometimes) **Context** — author notes pointing at the source-of-truth code.

## How to record a run

Don't edit this file. For each run, create a file under `_qa/runs/` and **log only failures** — silence means pass. See `_qa/runs/README.md`.

## Scope

Every expanded action card surfaces a collapsible **Condition** section (labelled **Run Condition** for Branch actions, to disambiguate from the Branch's own decision condition). When set, the action only runs if the entity's state matches the guard. The section is hidden when the model has zero states defined.

These tests apply to every action type — they live here, not duplicated across `006a..006k`. For shared concerns:
- High-level Actions-tab behaviors → `005_Activity_Tests.md` → `## Actions`
- Auto-save mechanics → `005_Activity_Tests.md` → `## Auto-Save Behavior` (`ACT-AUTOSAVE-001..005`)
- Per-action editors → `006a..006k`

Save behavior is the Activity Editor's `useAutoSave` (debounced ~500 ms, blur/select flushes immediately). `SaveStatusLine` strings: `Saving…`, `Saved`, `Fix errors to save`, `Save failed — keep typing to retry`.

---

### ACT-GUARD-001 — Guard section visible when states exist [P2]

**Preconditions**
- Activity selected; Actions tab open; model has at least one State

**Steps**
1. Expand any action card

**Expected**
- A collapsible row labelled `Condition` (or `Run Condition` for Branch) appears above the action-specific content
- Default expanded state is **collapsed**; the row summary reads `No condition (always runs)` in gray

### ACT-GUARD-002 — Guard section hidden when no states exist [P3]

**Preconditions**
- Activity selected; Actions tab open; model has **zero** States

**Steps**
1. Expand any action card

**Expected**
- The Condition / Run Condition row is **not** rendered
- Action-specific editor renders as normal

### ACT-GUARD-003 — Set a guard condition [P2]

**Preconditions**
- Action expanded; model has states defined

**Steps**
1. Click the Condition row to expand it
2. Pick a state, comparison, and value
3. Collapse the row

**Expected**
- Row summary changes to `When: <stateName> <comparison> <value>`, rendered in blue
- The label text turns blue (medium weight)
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-GUARD-004 — Clear a guard condition [P3]

**Preconditions**
- Action with a guard condition set

**Steps**
1. Expand the Condition section
2. Click the clear control inside the guard editor

**Expected**
- The condition is removed; row summary reverts to `No condition (always runs)` in gray
- The section auto-collapses on clear
- `SaveStatusLine` cycles `Saving…` → `Saved`
