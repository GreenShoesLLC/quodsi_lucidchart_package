# 006g — Create Action Tests

QA tests for the **Create Entity** action editor inside the Activity Editor's Actions tab in the Quodsi LucidChart extension.

## How to read this file

Each test: **ID — Name [Priority]**, then **Preconditions**, **Steps**, **Expected**, and (sometimes) **Context** — author notes pointing at the source-of-truth code.

## How to record a run

Don't edit this file. For each run, create a file under `_qa/runs/` and **log only failures** — silence means pass. See `_qa/runs/README.md`.

## Scope

This file covers the **Create Entity** action editor. For shared concerns:
- High-level Actions-tab behaviors (add / delete / drag-reorder / type-switch) → `005_Activity_Tests.md` → `## Actions` (`ACT-ACT-001..007`)
- Per-action state-condition guard → `006l_StateConditionGuard.md`
- Auto-save mechanics → `005_Activity_Tests.md` → `## Auto-Save Behavior` (`ACT-AUTOSAVE-001..005`)

Save behavior is the Activity Editor's `useAutoSave` (debounced ~500 ms, blur/select flushes immediately). `SaveStatusLine` strings: `Saving…`, `Saved`, `Fix errors to save`, `Save failed — keep typing to retry`.

---

### ACT-CREATE-001 — Add Create action [P1]

**Preconditions**
- Activity selected; Actions tab open

**Steps**
1. `+ Add`, expand, set `Action Type = Create Entity`

**Expected**
- Fields appear: `Entity Template` *required*, `Destination Activity` *required*, `State Modifications` editor
- Collapsed row's type label reads `Create`
- A red banner `Fix to save: Create action requires entity template and destination.` appears (covered by `ACT-ACT-007` in 005)
- `SaveStatusLine` shows `Fix errors to save`

### ACT-CREATE-002 — Set entity template (required) [P1]

**Preconditions**
- Create action expanded; entity templates exist

**Steps**
1. Open `Entity Template`
2. Pick a template

**Expected**
- Dropdown shows all available entity templates
- Before pick: red border + inline red text `Required - select the type of entity to create`
- After pick: red border + inline text disappear for this field; banner still present if destination still unset
- `SaveStatusLine` updates accordingly

### ACT-CREATE-003 — Set destination activity (required) [P1]

**Preconditions**
- Create action expanded; other activities exist

**Steps**
1. Open `Destination Activity`
2. Pick an activity

**Expected**
- Before pick: red border + inline red text `Required - select where the new entity will be routed`
- After pick: red border + inline text gone
- Once both required fields are set, the top-level banner clears and `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-CREATE-004 — Add state modifications [P2]

**Preconditions**
- Create action expanded; both required fields set; states defined

**Steps**
1. In `State Modifications`, click `+ Add Modification`
2. Configure (e.g. set `type` = `created`)

**Expected**
- Modification is applied to the **new** entity only (section description: `Applied to the new entity`)
- Original entity is unaffected
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-CREATE-005 — Create vs Split distinction (informational) [P3]

**Preconditions**
- Understanding entity lifecycle

**Steps**
1. Compare Create and Split semantically

**Expected**
- Create: original entity continues; one new entity is spawned and routed to the destination
- Split: original entity is disposed and replaced by N new entities
- Use Create for side-effect entities (shipping label, inspection record); use Split for batch decomposition

### ACT-CREATE-006 — Both required fields validation [P1]

**Preconditions**
- Create action expanded; both fields unset

**Steps**
1. Leave both dropdowns unset → check banner + inline errors
2. Set only Entity Template → check
3. Set only Destination → check
4. Set both → check

**Expected**
- Steps 1-3: top-level banner `Fix to save: Create action requires entity template and destination.` remains visible while either field is unset; inline red borders + texts track per-field
- Step 4: banner clears, both inline errors clear, `SaveStatusLine` cycles `Saving…` → `Saved`
- Aggregate count shows in parens if more than one Create is broken (e.g. `(2 actions need entity templates and destinations)`)

### ACT-CREATE-007 — Collapsed summary [P3]

**Preconditions**
- Create action fully configured

**Steps**
1. Collapse; read summary

**Expected**
- Type column: `Create`
- Duration column: `-`
- Resource column: `→ <destination name>` or `→ Not set`

### ACT-CREATE-008 — Multiple Create actions spawn multiple entities [P2]

**Preconditions**
- Activity selected; templates + activities exist

**Steps**
1. Add Create #1: template `ShippingLabel`, dest `ShippingActivity`
2. Add Create #2: template `InspectionRecord`, dest `QAActivity`

**Expected**
- Both Creates persist in the list
- Original entity continues after both Creates; each spawn routes independently
- `SaveStatusLine` settles on `Saved`

### ACT-CREATE-009 — Destination = current activity [P3]

**Preconditions**
- Create action expanded

**Steps**
1. Pick the current activity as the destination

**Expected**
- UI accepts the selection
- At runtime the new entity is routed back to the same activity (potential growth in population — document if a warning fires)
- `SaveStatusLine` cycles `Saving…` → `Saved`
