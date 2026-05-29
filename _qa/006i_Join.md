# 006i — Join Action Tests

QA tests for the **Join Entities** action editor inside the Activity Editor's Actions tab in the Quodsi LucidChart extension.

## How to read this file

Each test: **ID — Name [Priority]**, then **Preconditions**, **Steps**, **Expected**, and (sometimes) **Context** — author notes pointing at the source-of-truth code.

## How to record a run

Don't edit this file. For each run, create a file under `_qa/runs/` and **log only failures** — silence means pass. See `_qa/runs/README.md`.

## Scope

This file covers the **Join Entities** action editor. For shared concerns:
- High-level Actions-tab behaviors (add / delete / drag-reorder / type-switch) → `005_Activity_Tests.md` → `## Actions` (`ACT-ACT-001..007`)
- Per-action state-condition guard → `006l_StateConditionGuard.md`
- Auto-save mechanics → `005_Activity_Tests.md` → `## Auto-Save Behavior` (`ACT-AUTOSAVE-001..005`)

Save behavior is the Activity Editor's `useAutoSave` (debounced ~500 ms, blur/select flushes immediately). `SaveStatusLine` strings: `Saving…`, `Saved`, `Fix errors to save`, `Save failed — keep typing to retry`.

---

### ACT-JOIN-001 — Add Join action [P1]

**Preconditions**
- Activity selected; Actions tab open

**Steps**
1. `+ Add`, expand, set `Action Type = Join Entities`

**Expected**
- Fields appear: `Match State` *required*, `Join Count` (default 2), `Destination Activity` *required*, `Combined Entity Template` (default "Use first entity's template"), `Join Count State`, `State Modifications` editor
- Collapsed row's type label reads `Join`
- A red banner `Fix to save: Join action requires match state and destination.` appears (covered by `ACT-ACT-007` in 005)
- `SaveStatusLine` shows `Fix errors to save`

### ACT-JOIN-002 — Set match state (required) [P1]

**Preconditions**
- Join action expanded; states defined

**Steps**
1. Open `Match State`
2. Pick a state (e.g. `order_id`)

**Expected**
- Dropdown lists **all** states (not just numeric)
- Before pick: red border + inline red text `Required - select which state to match entities by`
- After pick: inline error gone
- `SaveStatusLine` updates accordingly

### ACT-JOIN-003 — Set join count [P1]

**Preconditions**
- Join action expanded

**Steps**
1. In `Join Count`, clear, type `3`
2. Tab out

**Expected**
- Field accepts `3`
- Minimum value is `2` (`min={2}`)
- Collapsed summary's resource column reads `3× <matchState> → <destination>`
- `SaveStatusLine` cycles `Saving…` → `Saved` (assuming required fields are set)

### ACT-JOIN-004 — Set destination activity (required) [P1]

**Preconditions**
- Join action expanded; other activities exist

**Steps**
1. Open `Destination Activity`
2. Pick an activity

**Expected**
- Before pick: red border + inline red text `Required - combined entity must route to an activity`
- After pick: inline error gone; if Match State is also set, top-level banner clears
- `SaveStatusLine` cycles to `Saved` once both required fields are set

### ACT-JOIN-005 — Set combined entity template [P2]

**Preconditions**
- Join action expanded; entity templates exist

**Steps**
1. Leave `Combined Entity Template` on `Use first entity's template`, then pick a specific template

**Expected**
- Default `Use first entity's template` corresponds to `null` (combined entity uses the first arriver's template)
- Selecting a specific template stores its id
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-JOIN-006 — Set join count state [P2]

**Preconditions**
- Join action expanded; numeric states defined

**Steps**
1. Open `Join Count State`
2. Pick a numeric state

**Expected**
- Dropdown lists **only** `NUMBER`-typed states (plus a `None` option)
- Optional — leaving on `None` is valid
- When set, stores the actual entity count at join time (useful when timeout / partial join is supported)
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-JOIN-007 — Add state modifications [P2]

**Preconditions**
- Join action expanded; required fields set; states defined

**Steps**
1. In `State Modifications`, click `+ Add Modification`
2. Configure a modification

**Expected**
- Modification applies to the **combined** entity (section description: `Applied to the combined entity`)
- Original entities are disposed and don't receive modifications
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-JOIN-008 — Both required fields validation [P1]

**Preconditions**
- Join action expanded; both required fields unset

**Steps**
1. Leave both unset → check banner + inline errors
2. Set only Match State → check
3. Set only Destination → check
4. Set both → check

**Expected**
- Steps 1-3: top-level banner `Fix to save: Join action requires match state and destination.` while either field is unset; inline errors track per-field
- Step 4: banner clears, inline errors clear, `SaveStatusLine` cycles `Saving…` → `Saved`
- `Join Count` defaults to `2` and never triggers a banner on its own

### ACT-JOIN-009 — Collapsed summary [P3]

**Preconditions**
- Join action fully configured

**Steps**
1. Collapse; read summary

**Expected**
- Type column: `Join`
- Duration column: `-`
- Resource column: `<count>× <matchState or "Not set"> → <destination or "Not set">`

### ACT-JOIN-010 — Join pairs with Split (informational) [P2]

**Preconditions**
- Understanding entity lifecycle

**Steps**
1. Consider a Split → process → Join roundtrip with `order_id` as the carried/match state

**Expected**
- Split spawns N items; each carries `order_id` from the original
- Join with `Match State = order_id` and `Join Count = N` recombines them
- Common pattern: Split for parallel work, Join to reassemble

### ACT-JOIN-011 — Join count minimum of 2 [P3]

**Preconditions**
- Join action expanded

**Steps**
1. In `Join Count`, try `1`, then `0`, then a negative number

**Expected**
- Each below-2 entry is coerced to `2` by `Math.max(2, parseInt(value) || 2)` (see `ActionEditor.tsx` join-count handler)
- Field also has `min={2}` so the browser may block the entry directly
- `SaveStatusLine` settles on `Saved`
