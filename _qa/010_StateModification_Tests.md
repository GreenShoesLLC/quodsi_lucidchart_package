# 010 — State Modification Tests

Suite of manual / agent-driven QA tests for the **State Modifications editor** in the Quodsi LucidChart extension.

## How to read this file

Each test is a small block: **ID — Name [Priority]**, then **Preconditions**, **Steps**, **Expected**, and (sometimes) **Context** — author notes that explain a subtle assertion or point at the source-of-truth code. Tests can be run by a human or by an AI agent walking the file top-to-bottom.

## How to record a run

Don't edit this file. For each run, create a new file under `_qa/runs/` and **log only failures** — silence means pass. See `_qa/runs/README.md` for the run-file template.

## Scope

State Modifications are configuration that change **model-level state values** during simulation. They are **always embedded inside a parent editor** — they have no dedicated panel of their own. The two host contexts are:

1. **Generator Editor → Events tab** (`activeTab === "events"`). Renders a single `StateModificationsEditor` titled `Initial State Modifications`; these modifications are applied to each entity the generator produces.
2. **Activity Editor → Actions tab → an expanded action card**, for action types that operate on entity state. The action types that embed a `StateModificationsEditor` today (from `ActionEditor.tsx`):
   - `Assign` (the dedicated state-modification action) — title `State Modifications`, description `Changes applied when this action executes`
   - `Split` — applied to each new entity
   - `Create` — applied to the new entity
   - `Join` — applied to the combined entity

  Other action types (`Seize`, `Release`, `Delay`, `DelayWithResource`, `Dispose`, `Loop`, `Branch`) **do not** embed a state-modifications editor.

**Auto-save is the parent editor's responsibility.** The State Modifications editor calls `onModificationsChange` and the parent (Generator / Activity) flushes through the standard 500 ms debounce auto-save in `useAutoSave`. There is no Save or Cancel button on the State Modifications editor itself; the inner Add/Edit modal does have **Add Modification / Save Changes / Cancel** buttons because it's a transient form dialog. The bottom-of-panel `SaveStatusLine` (`Saving…`, `Fix errors to save`, `Save failed — keep typing to retry`, `Saved`) belongs to the parent editor and reflects the state mod change once the parent serializes the new modifications array. For details on the parent-editor save model see `005_Activity_Tests.md` (Activity host) and the Generator suite.

**Note on `DurationModification`.** A new modification kind called `DurationModification` lives in `@quodsi/shared` (`shared/src/types/elements/DurationModification.ts`) and is consumed by the **Scenario Change Request** editor (`ChangeRequestEditor.tsx`) — *not* by the per-action state-modification editor that this file covers. Scenario change requests are the load-knob mechanism for experiments (rate multiplier / distribution swap) and belong in a separate QA suite. Tests in this file deliberately stay scoped to `StateModification`.

## Source-of-truth components

- `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/StateModificationsEditor.tsx` — list + Add/Edit/Delete orchestration; optimistic UI with 2-second fallback timeout
- `…/editors/StateModificationFormDialog.tsx` — the Add/Edit modal form
- `…/editors/StateModificationListItem.tsx` — single-row display
- `shared/src/types/elements/StateModification.ts` — class + validation (`validate`, `validateValueType`, `validateOperationForType`, SAMPLE-distribution rules)

---

## Navigation

### SM-NAV-001 — Access State Modifications in Generator (Events tab) [P1]

**Preconditions**
- LucidChart document open with a Quodsi model
- At least one State is defined in **Model Editor → States**
- Click a Generator shape; the Generator Editor panel is visible

**Steps**
1. In the Generator Editor tab bar, click the **events** (lightning/event) icon
2. Wait for the content area to update

**Expected**
- The events icon is highlighted
- Below the tab bar a `Initial State Modifications` section appears with:
  - Section title (with info tooltip)
  - Blue `+ Add` button in the top-right
  - List of modifications (or an empty-state hint)
- These modifications set the initial state values on newly generated entities

**Context:** Wired in `GeneratorEditor.tsx` (`activeTab === "events"` branch). Description prop is `Applied to new entities`.

### SM-NAV-002 — Access State Modifications inside an Activity action [P1]

**Preconditions**
- Activity shape selected; Activity Editor panel visible
- At least one State is defined in the model

**Steps**
1. Open the **Actions** tab (layers icon)
2. Click `+ Add`, set the action type to `Assign State` (Assign) — or expand an existing Assign / Split / Create / Join action
3. Locate the `State Modifications` section inside the expanded action card

**Expected**
- The action card contains a `State Modifications` section with `+ Add` button and the modifications list
- For Assign action, description reads `Changes applied when this action executes`
- For Split, `Applied to each new entity`. For Create, `Applied to the new entity`. For Join, `Applied to the combined entity`.
- These modifications execute when this action runs

**Context:** Other action types (Seize, Release, Delay, Delay with Resource, Dispose, Loop, Branch) do **not** embed a `StateModificationsEditor`.

### SM-NAV-003 — Section header and info tooltip [P2]

**Preconditions**
- An editor with the State Modifications section open
- At least one state exists in the model

**Steps**
1. Find the State Modifications section header
2. Hover the info icon (ⓘ) next to the title

**Expected**
- A tooltip appears with the host-provided `description` prop (e.g. `Applied to new entities` or `Changes applied when this action executes`)

### SM-NAV-006 — "No States Available" warning [P2]

**Preconditions**
- Model has **no states defined** (Model Editor → States is empty)
- Open the Generator Events tab OR an Assign/Split/Create/Join action

**Steps**
1. Look at the State Modifications section

**Expected**
- Amber/yellow card appears with a warning triangle icon, title `No States Available`, body text `Go to Model Editor → States tab to create states first.`
- The `+ Add` button is **disabled** (gray)
- If `onNavigateToModelEditor` is wired (Generator Events tab passes it), `Model Editor` renders as a clickable blue link; otherwise it renders as bold plain text

### SM-NAV-007 — Click `Model Editor` link to navigate [P2]

**Preconditions**
- Generator Events tab open with no states defined
- The `No States Available` warning is showing with `Model Editor` as a clickable link

**Steps**
1. Click the `Model Editor` link in the warning

**Expected**
- The Model Editor opens with its **States** tab selected (via `selectElement('model', { targetTab: 'states' })`)
- User can now add states and return to the Generator

**Context:** Inside an Activity action, `onNavigateToModelEditor` is also passed down, so the same behavior should apply.

---

## CRUD Operations

### SM-CRUD-001 — Add state modification — ASSIGN operation [P1]

**Preconditions**
- State Modifications section open in a host editor
- At least one State exists (e.g. STRING state `OrderStatus`)

**Steps**
1. Click `+ Add`
2. In the modal, pick the state (e.g. `OrderStatus`)
3. Operation defaults to `Assign (=)`
4. Type the value (e.g. `New`)
5. Click `Add Modification`

**Expected**
- The modal closes
- A new list row appears immediately (optimistic UI) showing the state name + operation `=` + value `"New"`
- Parent editor's `SaveStatusLine` cycles `Saving…` → `Saved`

### SM-CRUD-002 — Add state modification — ADD operation on a NUMBER state [P1]

**Preconditions**
- A NUMBER-typed state (e.g. `Counter`) exists
- State Modifications section open

**Steps**
1. Click `+ Add`
2. Select the NUMBER state
3. Change operation to `Add (+)`
4. Type value `5`
5. Click `Add Modification`

**Expected**
- New row shows `Counter` + `+` + `5`
- ADD increments the existing value at runtime (does not set it to 5)
- Parent `SaveStatusLine` cycles `Saving…` → `Saved`

**Context:** ADD/Subtract/Multiply/Divide only appear in the Operation dropdown for NUMBER states (filtered by `getSupportedOperationsForType`).

### SM-CRUD-003 — Edit an existing modification's value [P1]

**Preconditions**
- At least one modification exists in the list

**Steps**
1. Click the pencil (Edit) icon on a row
2. Modal opens pre-filled with current state / operation / value
3. Change just the value (e.g. `New` → `Pending`)
4. Click `Save Changes`

**Expected**
- Modal closes; the row updates in place; state and operation unchanged
- Parent `SaveStatusLine` cycles `Saving…` → `Saved`

### SM-CRUD-004 — Edit a NUMBER modification to switch operation [P1]

**Preconditions**
- A NUMBER state modification with `Assign` operation exists

**Steps**
1. Click Edit on the modification
2. Change operation from `Assign (=)` to `Add (+)`
3. Keep the value the same
4. Click `Save Changes`

**Expected**
- Row updates to show the `+` operator instead of `=`
- Parent `SaveStatusLine` cycles `Saving…` → `Saved`

### SM-CRUD-005 — Delete a modification with confirmation [P1]

**Preconditions**
- At least one modification in the list

**Steps**
1. Click the trash icon on a row
2. A red confirmation block appears in-place:
   - Title `Delete State Modification: "<state name>"?`
   - Body `This action cannot be undone.`
   - `Delete Modification` (red) and `Cancel` buttons
3. Click `Delete Modification`

**Expected**
- The confirmation block disappears, the row is removed from the list
- Parent `SaveStatusLine` cycles `Saving…` → `Saved`

### SM-CRUD-006 — Cancel delete keeps the modification [P1]

**Preconditions**
- At least one modification in the list
- The delete confirmation block is showing (you clicked the trash)

**Steps**
1. Click the gray `Cancel` button in the confirmation block

**Expected**
- The confirmation block disappears
- The modification stays in the list, unchanged
- Parent `SaveStatusLine` stays `Saved` (no save fires)

### SM-CRUD-007 — Multiple modifications on the same state [P2]

**Preconditions**
- A NUMBER state (e.g. `Score`) exists

**Steps**
1. Add modification: `Score = 100` (Assign)
2. Add modification: `Score + 10` (Add)
3. Both rows should target the same state

**Expected**
- Both rows appear in the list in insertion order
- The editor does **not** block duplicates; runtime executes them in list order (final `Score` would be 110 with these inputs)
- Parent `SaveStatusLine` cycles `Saving…` → `Saved` after each add

### SM-CRUD-008 — Multiple modifications across different states [P2]

**Preconditions**
- Several states defined: `Status` (STRING), `Priority` (CATEGORY), `Counter` (NUMBER)

**Steps**
1. Add `Status = "New"`
2. Add `Priority = "High"`
3. Add `Counter + 1`

**Expected**
- All three rows visible in the order added
- Each row can be independently edited or deleted
- Parent `SaveStatusLine` cycles to `Saved` after the last add

### SM-CRUD-009 — Optimistic UI update on add [P2]

**Preconditions**
- State Modifications section open; states available

**Steps**
1. Click `+ Add`, fill in the form
2. Click `Add Modification`
3. Watch the list area

**Expected**
- The new row appears **immediately** — `pendingModifications` is set and the list uses `displayModifications = isSaving ? pendingModifications : modifications`
- The modal closes once the `modifications` prop actually updates (or after the 2-second fallback timer fires)

**Context:** Same optimistic pattern applies to edit and delete.

### SM-CRUD-010 — Many modifications still navigable [P3]

**Preconditions**
- Many states defined (5+)
- State Modifications section open

**Steps**
1. Add 5+ modifications
2. Scroll the section, expand/scroll the parent panel as needed
3. Edit and delete items in the middle of the list

**Expected**
- All rows remain reachable
- Edit / Delete buttons work on any row regardless of scroll position
- Parent `SaveStatusLine` cycles to `Saved` after each operation

---

## State Types

### SM-TYPE-001 — NUMBER state — Assign positive integer [P1]

**Preconditions**
- A NUMBER state (e.g. `Counter`) exists

**Steps**
1. Add → select NUMBER state → operation `Assign (=)` → value `100` → `Add Modification`

**Expected**
- Row shows `Counter` `=` `100`
- Value is parsed to number via `parseFloat`
- Parent `SaveStatusLine` cycles `Saving…` → `Saved`

### SM-TYPE-002 — NUMBER state — Assign decimal [P1]

**Preconditions**
- A NUMBER state exists

**Steps**
1. Add → NUMBER state → `Assign` → value `3.14159` → save

**Expected**
- Decimal preserved exactly; row shows the value as `3.14159`
- Parent `SaveStatusLine` cycles to `Saved`

### SM-TYPE-003 — NUMBER state — Assign negative [P1]

**Preconditions**
- A NUMBER state exists

**Steps**
1. Add → NUMBER state → `Assign` → value `-50` → save

**Expected**
- Negative value accepted; row shows `=` `-50`
- Parent `SaveStatusLine` cycles to `Saved`

### SM-TYPE-004 — NUMBER state — ADD operation [P1]

**Preconditions**
- A NUMBER state exists

**Steps**
1. Add → NUMBER state → operation `Add (+)` → value `10` → save

**Expected**
- Row shows `+` `10`
- ADD operation is offered **only** for NUMBER states (see `SM-TYPE-011`)

### SM-TYPE-005 — STRING state — Assign text [P1]

**Preconditions**
- A STRING state (e.g. `Status`) exists

**Steps**
1. Add → STRING state → operation dropdown should only offer `Assign (=)` → value `Processing` → save

**Expected**
- Row shows `Status` `=` `"Processing"` (formatted with quotes by `StateModificationListItem.formatValue`)
- Operation dropdown does **not** offer Add/Subtract/Multiply/Divide

### SM-TYPE-006 — STRING state — empty string [P1]

**Preconditions**
- A STRING state exists

**Steps**
1. Add → STRING state → leave value empty → click `Add Modification`

**Expected**
- Save is blocked: red banner inside the modal reads `Please enter a value`
- The `Add Modification` button is also disabled when value is empty
- Modal stays open until a value is typed

**Context:** Empty-string blocking lives in `StateModificationFormDialog.validate()` and the disabled-button check on the footer button.

### SM-TYPE-007 — BOOLEAN state — Assign true [P1]

**Preconditions**
- A BOOLEAN state (e.g. `IsActive`) exists

**Steps**
1. Add → BOOLEAN state → value dropdown defaults to `true` → save

**Expected**
- Row shows `IsActive` `=` `true`
- Value control is a `true / false` dropdown (not a free-text field or checkbox)

### SM-TYPE-008 — BOOLEAN state — Assign false [P1]

**Preconditions**
- A BOOLEAN state exists

**Steps**
1. Add → BOOLEAN state → change value dropdown to `false` → save

**Expected**
- Row shows `IsActive` `=` `false`
- Stored as boolean `false`, distinct from null/undefined

### SM-TYPE-009 — CATEGORY state — Assign a valid category [P1]

**Preconditions**
- A CATEGORY state (e.g. `Priority` with values `["Low", "Medium", "High"]`) exists

**Steps**
1. Add → CATEGORY state → value dropdown shows exactly the defined values → pick `High` → save

**Expected**
- Row shows `Priority` `=` `"High"`
- Value input is a `<select>`, not a free-text input

### SM-TYPE-010 — CATEGORY value dropdown shows only valid values [P2]

**Preconditions**
- A CATEGORY state with explicit `categoryValues` exists

**Steps**
1. Add → CATEGORY state
2. Open the value dropdown and read all options

**Expected**
- Options are exactly: the empty `Select a category…` placeholder plus each `state.categoryValues` entry — nothing else
- No free-text option

### SM-TYPE-011 — Operation dropdown filtered by state type [P2]

**Preconditions**
- States of all four types exist: NUMBER, STRING, BOOLEAN, CATEGORY

**Steps**
1. Open the Add dialog
2. Select each state in turn and inspect the Operation dropdown

**Expected**
- NUMBER: `Assign`, `Add`, `Subtract`, `Multiply`, `Divide`, `Sample from Distribution`
- STRING: `Assign` only (plus `Sample from Distribution` if `getSupportedOperationsForType` exposes it for STRING — verify against `StateOperation`)
- BOOLEAN: `Assign`, `Sample from Distribution` (Bernoulli at sample time)
- CATEGORY: `Assign`, `Sample from Distribution` (multinomial at sample time)
- Switching state type resets a now-invalid operation back to `Assign`

**Context:** Filter logic is `getSupportedOperationsForType(selectedState.dataType)` and the reset effect in `StateModificationFormDialog`.

### SM-TYPE-012 — NUMBER state — Assign zero [P3]

**Preconditions**
- A NUMBER state exists

**Steps**
1. Add → NUMBER state → value `0` → save

**Expected**
- Row shows `=` `0`
- Zero is stored as a number, distinct from null/undefined

---

## SAMPLE Operations

### SM-SAMPLE-001 — SAMPLE option available for NUMBER state [P1]

**Preconditions**
- A NUMBER state exists; State Modifications section open

**Steps**
1. Add → NUMBER state → open Operation dropdown
2. Verify `Sample from Distribution` is present

**Expected**
- `Sample from Distribution (sample)` appears alongside the arithmetic options
- Selecting it hides the plain value input and reveals the `SampleDistributionEditor` block

### SM-SAMPLE-002 — SAMPLE for NUMBER — Normal distribution [P1]

**Preconditions**
- A NUMBER state exists

**Steps**
1. Add → NUMBER state → operation `Sample from Distribution`
2. In the distribution editor pick `Normal`, set `loc = 50`, `scale = 10`
3. Click `Add Modification`

**Expected**
- Row shows `<state>` with shuffle icon and `Normal(μ=50, σ=10)` (formatted by `formatDistributionInfo`)
- Stored as `distributionType: "normal"`, `distributionParameters: { loc: 50, scale: 10 }`

### SM-SAMPLE-003 — SAMPLE for NUMBER — Uniform distribution [P2]

**Preconditions**
- A NUMBER state exists

**Steps**
1. Add → NUMBER state → operation `Sample from Distribution` → distribution `Uniform` → `low = 0`, `high = 100` → save

**Expected**
- Row shows `Uniform(0, 100)`
- Stored with `distributionType: "uniform"`, `distributionParameters: { low: 0, high: 100 }`

### SM-SAMPLE-004 — SAMPLE for NUMBER — Exponential distribution [P2]

**Preconditions**
- A NUMBER state exists

**Steps**
1. Add → NUMBER state → operation `Sample from Distribution` → distribution `Exponential` → set rate/scale parameter → save

**Expected**
- Row shows `Exponential(λ=<scale>)`
- Stored with `distributionType: "exponential"` and the configured parameter

### SM-SAMPLE-005 — SAMPLE for BOOLEAN — Bernoulli [P1]

**Preconditions**
- A BOOLEAN state (e.g. `IsPremium`) exists

**Steps**
1. Add → BOOLEAN state → operation `Sample from Distribution`
2. Distribution defaults to (or is set to) `Bernoulli`, `p = 0.3`
3. Click `Add Modification`

**Expected**
- Row shows `IsPremium` with shuffle icon and `Bernoulli (p=30%)`
- Stored with `distributionType: "bernoulli"`, `distributionParameters: { p: 0.3 }`

### SM-SAMPLE-006 — Bernoulli `p` out-of-range blocks save [P1]

**Preconditions**
- A BOOLEAN state exists; SAMPLE operation selected with Bernoulli

**Steps**
1. Try `p = 1.5` → click `Add Modification`
2. Try `p = -0.2` → click `Add Modification`
3. Try `p = 0.5` → click `Add Modification`

**Expected**
- For 1.5 and -0.2: red banner inside the modal reads `Probability must be between 0 and 1`; modal stays open
- For 0.5: modal closes, row shows `Bernoulli (p=50%)`, parent `SaveStatusLine` cycles to `Saved`

### SM-SAMPLE-007 — SAMPLE for CATEGORY — Multinomial [P1]

**Preconditions**
- A CATEGORY state with values `["L1", "L2", "L3"]` exists

**Steps**
1. Add → CATEGORY state → operation `Sample from Distribution`
2. Distribution defaults to `sample_multinomial_one`; set probabilities `L1=0.5, L2=0.3, L3=0.2`
3. Click `Add Modification`

**Expected**
- Row shows shuffle icon and `Multinomial (3 categories)`
- Stored with `distributionType: "sample_multinomial_one"`, `distributionParameters: { probabilities: { L1: 0.5, L2: 0.3, L3: 0.2 } }`

### SM-SAMPLE-008 — Multinomial probabilities must sum to 1 [P1]

**Preconditions**
- A CATEGORY state with at least 3 values; SAMPLE operation selected

**Steps**
1. Enter probabilities that sum to 1.1 (e.g. 0.5, 0.3, 0.3)
2. Click `Add Modification`

**Expected**
- Red banner inside the modal reads `Probabilities must sum to 1.0`
- Modal stays open; correcting the probabilities to sum to 1.0 lets save succeed and parent `SaveStatusLine` cycles to `Saved`

### SM-SAMPLE-009 — Multinomial requires a probability for every category [P2]

**Preconditions**
- A CATEGORY state with 3 values; SAMPLE selected

**Steps**
1. Enter probabilities for only 2 of the 3 categories
2. Click `Add Modification`

**Expected**
- Save is blocked (the dialog reports `Please set probabilities for all category values` or a missing-category error from `validateSampleOperation`)
- Modal stays open until every category has a probability and they sum to 1.0

### SM-SAMPLE-010 — SAMPLE value field is ignored [P2]

**Preconditions**
- A state with a SAMPLE modification saved

**Steps**
1. Edit the SAMPLE modification
2. Observe that the plain `Value` input is **not** rendered while `Sample from Distribution` is the operation

**Expected**
- Only the `SampleDistributionEditor` block is shown; no separate value field
- At runtime the value field is replaced by sampling — `StateModification` constructor passes a placeholder (`0` / `false` / `""`) according to state type

### SM-SAMPLE-011 — Edit SAMPLE distribution parameters [P3]

**Preconditions**
- An existing SAMPLE modification with configured parameters

**Steps**
1. Click Edit on the SAMPLE row
2. Change parameters (e.g. Normal `loc` from `50` → `75`; Bernoulli `p` from `0.3` → `0.7`)
3. Click `Save Changes`

**Expected**
- Row display updates to show the new parameters
- Parent `SaveStatusLine` cycles `Saving…` → `Saved`

### SM-SAMPLE-012 — Switch from SAMPLE back to ASSIGN [P3]

**Preconditions**
- An existing SAMPLE modification on a NUMBER state

**Steps**
1. Edit the modification
2. Change operation from `Sample from Distribution` back to `Assign (=)`
3. Enter a fixed value (e.g. `100`)
4. `Save Changes`

**Expected**
- Row no longer shows the shuffle icon / distribution label
- Row shows `=` `100`
- Parent `SaveStatusLine` cycles to `Saved`

---

## Cross-Component

### SM-CROSS-001 — Modify an ENTITY state (default target) [P1]

**Preconditions**
- An ENTITY-scoped state exists
- State Modifications section open in either host context

**Steps**
1. Add a modification for the ENTITY state
2. Configure operation and value (Advanced cross-component section stays collapsed/unused)
3. Save

**Expected**
- Modification persists with no `targetComponentType` and no `componentUniqueId`
- At runtime: Generator → applies to each generated entity; Activity action → applies to the current entity
- Parent `SaveStatusLine` cycles to `Saved`

### SM-CROSS-002 — Modify a MODEL state (counter pattern) [P2]

**Preconditions**
- A MODEL-scoped state exists (e.g. `TotalProcessed`)
- An Assign/Split/Create/Join action card is open with `allowCrossComponent={true}` (true in all four action contexts in `ActionEditor.tsx`)

**Steps**
1. Add a modification → select the MODEL state
2. Operation `Add (+)`, value `1`
3. (Optional) Open the `Advanced: Cross-Component Access` section and set Target Component Type to `MODEL` explicitly; otherwise leave it `Auto (infer from state)`
4. Save

**Expected**
- The modification persists; `targetComponentType` is `MODEL` (explicit or inferred)
- Runtime effect: a global counter increments by 1 every time the action executes
- Parent `SaveStatusLine` cycles to `Saved`

### SM-CROSS-003 — Modify a RESOURCE state (cross-component) [P2]

**Preconditions**
- A RESOURCE-scoped state exists
- A Resource is defined
- An Assign/Split/Create/Join action open

**Steps**
1. Add a modification → select the RESOURCE state
2. Open `Advanced: Cross-Component Access`
3. Optionally set `Target Component Type = RESOURCE`
4. Optionally type a `Component Unique ID` to target a specific resource instance
5. Save

**Expected**
- Modification persists with the chosen `targetComponentType` / `componentUniqueId`
- Note in the run report whether the UI offers a dropdown of resources or only the free-text component-id input (current UI is a free-text input)

### SM-CROSS-004 — Modify an ACTIVITY state (cross-component) [P2]

**Preconditions**
- An ACTIVITY-scoped state exists
- An Assign/Split/Create/Join action open

**Steps**
1. Add a modification → select the ACTIVITY state
2. Open `Advanced: Cross-Component Access`
3. Set `Target Component Type = ACTIVITY` and (optionally) the component unique ID
4. Save

**Expected**
- Modification persists with the chosen targeting fields
- If targeting fields are required for ACTIVITY scope and missing, runtime validation in `StateModification.validate()` will flag it; the editor itself does not block this

### SM-CROSS-005 — Cross-component section visibility by host [P2]

**Preconditions**
- States of multiple component types exist

**Steps**
1. Open the Generator Events tab and click `+ Add` — note whether the `Advanced: Cross-Component Access` toggle is visible
2. Open an Assign/Split/Create/Join action card and click `+ Add` — note whether the toggle is visible

**Expected**
- Generator Events: `allowCrossComponent` is **not** passed (defaults to `false`), so the toggle is **hidden**
- Activity action contexts: `allowCrossComponent={true}` is passed, so the toggle **is** visible
- (Document any deviation; this is the contract per `GeneratorEditor.tsx` vs `ActionEditor.tsx`.)

### SM-CROSS-006 — `filterComponentType` narrows the state dropdown [P3]

**Preconditions**
- States of multiple component types exist
- A host that passes `filterComponentType` (e.g. a future scope; today none of the four action contexts or the Generator pass it)

**Steps**
1. Open the Add dialog in a context that sets `filterComponentType`
2. Read the State dropdown

**Expected**
- Only states matching `filterComponentType` appear
- This currently exercises a code path that has no production caller — log as skipped if no host uses the prop

**Context:** `availableStates` is filtered via `useMemo` inside both `StateModificationsEditor` and `StateModificationFormDialog`. The empty-state `No States Available` card also responds to this filter.

### SM-CROSS-007 — Component Unique ID input [P3]

**Preconditions**
- Cross-component section open (Activity action with a RESOURCE or ACTIVITY state)

**Steps**
1. Inspect the `Component Unique ID` control

**Expected**
- A monospace free-text `<input type="text">` with placeholder `Specific component ID (optional)`
- Today this is **not** a dropdown of available components — record any UX issue in the run report

### SM-CROSS-008 — Stale cross-component reference [P2]

**Preconditions**
- A modification targets a specific component via `componentUniqueId`

**Steps**
1. Save the modification
2. Delete that component from the model
3. Re-open the host editor

**Expected**
- The modification stays in the list (the editor does not auto-clean)
- Model-level validation should surface the stale reference (see `StateModification.validateCrossComponentAccess`); record observed behavior

### SM-CROSS-009 — State unique-id pattern inference [P3]

**Preconditions**
- A state with `stateUniqueId` matching pattern `state_name_<COMPONENTTYPE>_###`

**Steps**
1. Create a modification for that state, leave `Target Component Type` on `Auto (infer from state)`
2. Save

**Expected**
- `targetComponentType` is omitted in storage; runtime uses `inferComponentTypeFromUniqueId` (MODEL / ENTITY / RESOURCE / ACTIVITY, default ENTITY)
- If you then set an explicit `Target Component Type`, the explicit value overrides the inference

### SM-CROSS-010 — Model-level counter increment pattern [P3]

**Preconditions**
- A MODEL state for counting (e.g. `EntitiesProcessed`)
- An Assign/Split/Create/Join action open

**Steps**
1. Add modification → select the MODEL counter state → operation `Add (+)` → value `1`
2. Explicitly set `Target Component Type = MODEL`
3. Save

**Expected**
- The modification persists with `targetComponentType: MODEL`, equivalent to the `createModelCounterIncrement` helper in `StateModification.ts`
- Useful for throughput tracking; every entity through this action increments the global counter
- Parent `SaveStatusLine` cycles to `Saved`

---

## UI Interactions (Modal)

### SM-UI-001 — Add dialog opens on `+ Add` [P1]

**Preconditions**
- State Modifications section open; at least one state exists

**Steps**
1. Click `+ Add`

**Expected**
- A centered modal opens over a dimmed backdrop
- Header: `Add State Modification` with a close `X` button
- Body: `State` select, then conditionally `Operation`, `Value` / `SampleDistributionEditor`, optional `Advanced: Cross-Component Access`
- Footer: `Cancel` and `Add Modification` buttons; the latter is disabled until a state is picked and (for non-SAMPLE) a value is entered

### SM-UI-002 — Cancel closes the dialog without saving [P1]

**Preconditions**
- Add dialog is open; user has picked a state and entered a value

**Steps**
1. Click `Cancel` (or the close `X`)

**Expected**
- The modal closes
- The list is unchanged
- Parent `SaveStatusLine` stays `Saved` (no save fires)

### SM-UI-003 — `Add Modification` button commits the new row [P1]

**Preconditions**
- Add dialog open with a valid state + operation + value (or SAMPLE config)

**Steps**
1. Click `Add Modification`

**Expected**
- The new row appears in the list immediately (optimistic update)
- Modal closes once the host's `modifications` prop refreshes (or after the 2s fallback timer)
- Parent `SaveStatusLine` cycles `Saving…` → `Saved`

### SM-UI-004 — Edit dialog opens pre-filled [P1]

**Preconditions**
- At least one modification in the list

**Steps**
1. Click the pencil icon on a row

**Expected**
- Modal opens with header `Edit State Modification`
- State, Operation, Value (or distribution params) all pre-populated from the existing modification
- Footer shows `Save Changes` instead of `Add Modification`

### SM-UI-005 — `Save Changes` updates the row in place [P1]

**Preconditions**
- Edit dialog open with fields pre-filled

**Steps**
1. Change one field (e.g. value `New` → `Updated`)
2. Click `Save Changes`

**Expected**
- Modal closes; the row shows the new value at the same list position
- Parent `SaveStatusLine` cycles `Saving…` → `Saved`

### SM-UI-006 — State dropdown lists every available state [P2]

**Preconditions**
- Several states defined with different types (NUMBER / STRING / BOOLEAN / CATEGORY)

**Steps**
1. Open the Add dialog and read the State `<select>` options

**Expected**
- Each option shows `<state name> (<componentType> - <dataType>)` (per the JSX)
- The placeholder `Select a state…` is shown when nothing is picked

### SM-UI-007 — Operation dropdown updates with state selection [P2]

**Preconditions**
- NUMBER and STRING states both exist

**Steps**
1. Open Add dialog
2. Pick the NUMBER state → note operation options
3. Switch to the STRING state → note operation options

**Expected**
- NUMBER: full arithmetic set plus Sample (see SM-TYPE-011)
- STRING: only `Assign` (and Sample if exposed)
- If the previously selected operation isn't valid for the new state, it resets to `Assign`

### SM-UI-008 — Value input control matches state type [P2]

**Preconditions**
- States of each type exist

**Steps**
1. Open Add dialog
2. Pick each state type in turn and inspect the Value control

**Expected**
- NUMBER: `<input type="number" step="any">`
- STRING: `<input type="text">`
- BOOLEAN: `<select>` with options `true` / `false`
- CATEGORY: `<select>` populated from `state.categoryValues`

### SM-UI-009 — List row display [P2]

**Preconditions**
- Modifications of mixed kinds exist (ASSIGN, ADD, SAMPLE)

**Steps**
1. Inspect each row in the list

**Expected**
- State name, dataType colored badge (NUMBER blue, STRING green, BOOLEAN purple, CATEGORY orange, fallback gray)
- For non-SAMPLE: operation symbol + formatted value (strings get wrapping quotes; booleans render as `true` / `false`)
- For SAMPLE: shuffle icon + distribution summary (`Normal(μ=…, σ=…)`, `Bernoulli (p=…%)`, `Multinomial (N categories)`, etc.)
- External-link icon appears if `componentUniqueId` or `targetComponentType` is set; a sub-line shows `Target: …` / `ID: …`
- Pencil (Edit) and trash (Delete) icons on the right

### SM-UI-010 — Modal keyboard interactions [P3]

**Preconditions**
- Add or Edit dialog open

**Steps**
1. Press `Tab` repeatedly
2. Press `Enter` while a button has focus
3. Press `Escape`

**Expected**
- Tab cycles through the visible form controls in DOM order
- Enter activates the focused button (browser default; no custom `onKeyDown` for form-level submit)
- Escape does **not** close the modal today (no Esc handler is wired) — record this in the run report if you'd expect it to

---

## Form Sync

### SM-SYNC-001 — Modifications sync when the `modifications` prop changes [P1]

**Preconditions**
- A modification list is showing for an element

**Steps**
1. Trigger an external update of the element (collaborative edit in a second window, or programmatic update)
2. Observe the list

**Expected**
- The list re-renders from the new prop value
- `pendingModifications` and `isSaving` are cleared (`useEffect` watching `modifications` resets optimistic state)

### SM-SYNC-002 — Open dialogs close after a save completes [P1]

**Preconditions**
- Add or Edit dialog open

**Steps**
1. Click `Add Modification` / `Save Changes`
2. Wait for the host to push a new `modifications` prop

**Expected**
- The dialog closes automatically once the prop updates (or after the 2s fallback timer if the prop never updates)
- Edit state (`editingModification`, `editingIndex`) and delete state (`deletingIndex`) reset to defaults

### SM-SYNC-003 — Pending changes are isolated from unrelated prop updates [P2]

**Preconditions**
- A modification is being added (modal open with values filled, not yet saved)

**Steps**
1. Without closing the modal, trigger an unrelated update (e.g. a different element's state changes externally)
2. Check the modal

**Expected**
- The modal's local form state is preserved (state pick, operation, value entries don't reset)
- The user can finish the add and save normally

**Context:** Modal form state lives in `StateModificationFormDialog` `useState`, not in the parent. Only a new `modifications` prop on the **same** element triggers the cleanup effect.

### SM-SYNC-004 — Deleted underlying state surfaces gracefully [P2]

**Preconditions**
- A modification references a state, then that state is deleted from the model

**Steps**
1. Return to the host editor and view the modifications list

**Expected**
- The row renders with a red sub-line `⚠ State not found: <stateUniqueId>` (per `StateModificationListItem`)
- The type badge does not render (no `state.dataType` available)
- Edit / Delete buttons still work; the user can delete the orphan row

### SM-SYNC-005 — Delete confirmation resets on prop change [P2]

**Preconditions**
- The delete confirmation block is showing (user clicked the trash but has not yet confirmed)

**Steps**
1. Trigger an external `modifications` prop change (e.g. a collaborative edit)

**Expected**
- `deletingIndex` resets to `-1` and the red confirmation block disappears
- The user has to click the trash again to start over (prevents confirming deletion of stale data)

### SM-SYNC-006 — Edit dialog resets on prop change [P3]

**Preconditions**
- The Edit dialog is open

**Steps**
1. Trigger an external `modifications` prop change

**Expected**
- `editingModification` resets to `undefined`, `editingIndex` resets to `-1`, the dialog closes
- The user must click Edit again on a fresh row

---

## Validation (shared library)

These tests exercise `StateModification.validate()` in `@quodsi/shared`. The UI prevents most of these from happening, but model-level validation and JSON-import paths can still surface them.

### SM-VAL-001 — State not found [P1]

**Preconditions**
- A modification references a state UID that no longer exists in the model

**Steps**
1. Run model validation (Validation panel) on a model with such a modification

**Expected**
- Validation error: `State with unique_id '<id>' not found in model`
- Comes from `findStateByUniqueId` throwing

### SM-VAL-002 — STRING state + ADD operation [P1]

**Preconditions**
- A STRING state modification with operation = ADD (created via import or programmatic mutation)

**Steps**
1. Run validation

**Expected**
- Error: `Operation '+' not supported for STRING state. Only assignment (=) is supported for non-numeric state types.`
- Raised by `validateOperationForType`

### SM-VAL-003 — BOOLEAN state + ADD operation [P1]

**Preconditions**
- A BOOLEAN state modification with operation = ADD

**Steps**
1. Run validation

**Expected**
- Error: `Operation '+' not supported for BOOLEAN state…`
- Only `ASSIGN` and `SAMPLE` are supported for BOOLEAN

### SM-VAL-004 — NUMBER state with string value [P1]

**Preconditions**
- A NUMBER state modification whose value is a string

**Steps**
1. Run validation

**Expected**
- Error: `NUMBER state '<name>' modification value must be numeric, got string`
- Raised by `validateValueType`

### SM-VAL-005 — STRING state with number value [P1]

**Preconditions**
- A STRING state modification whose value is a number

**Steps**
1. Run validation

**Expected**
- Error: `STRING state '<name>' modification value must be string, got number`

### SM-VAL-006 — BOOLEAN state with non-boolean value [P1]

**Preconditions**
- A BOOLEAN state modification whose value is a string (e.g. `"yes"`)

**Steps**
1. Run validation

**Expected**
- Error: `BOOLEAN state '<name>' modification value must be boolean, got string`

### SM-VAL-007 — CATEGORY value not in allowed values [P1]

**Preconditions**
- A CATEGORY state with `categoryValues = ["Low", "Medium", "High"]`
- A modification whose value is `"Critical"`

**Steps**
1. Run validation

**Expected**
- Error: `CATEGORY state '<name>' modification value 'Critical' not in valid values [Low, Medium, High]`

### SM-VAL-008 — SAMPLE missing `distributionType` [P1]

**Preconditions**
- A modification with `operation = SAMPLE` but no `distributionType`

**Steps**
1. Run validation

**Expected**
- Error: `SAMPLE operation requires distribution_type`

### SM-VAL-009 — SAMPLE missing `distributionParameters` [P1]

**Preconditions**
- A SAMPLE modification with `distributionType` set but no `distributionParameters`

**Steps**
1. Run validation

**Expected**
- Error: `SAMPLE operation requires distribution_parameters`

### SM-VAL-010 — CATEGORY SAMPLE with wrong distribution type [P1]

**Preconditions**
- A CATEGORY state SAMPLE whose `distributionType = "normal"`

**Steps**
1. Run validation

**Expected**
- Error: `CATEGORY state SAMPLE requires 'sample_multinomial_one' distribution`

### SM-VAL-011 — BOOLEAN SAMPLE with wrong distribution type [P1]

**Preconditions**
- A BOOLEAN state SAMPLE whose `distributionType = "normal"`

**Steps**
1. Run validation

**Expected**
- Error: `BOOLEAN state SAMPLE requires 'bernoulli' distribution`

### SM-VAL-012 — Bernoulli `p` out of `[0, 1]` [P1]

**Preconditions**
- A BOOLEAN SAMPLE with `distributionParameters = { p: 1.5 }`

**Steps**
1. Run validation

**Expected**
- Error: `'p' must be between 0 and 1`

### SM-VAL-013 — Multinomial probabilities don't sum to 1 [P1]

**Preconditions**
- A CATEGORY SAMPLE with probabilities summing to 1.1

**Steps**
1. Run validation

**Expected**
- Error: `Probabilities must sum to 1.0, got 1.1`

### SM-VAL-014 — Multinomial missing a category probability [P2]

**Preconditions**
- A CATEGORY state with `categoryValues = ["L1", "L2", "L3"]`
- A SAMPLE modification with probabilities only for `L1` and `L2`

**Steps**
1. Run validation

**Expected**
- Error: `SAMPLE for state '<name>' missing probability for category 'L3'`

### SM-VAL-015 — Fixing a validation issue clears it [P1]

**Preconditions**
- A modification with a known validation error (e.g. CATEGORY value not in list)

**Steps**
1. Fix the underlying issue (edit the modification to use a valid category)
2. Wait for the parent `SaveStatusLine` to show `Saved`
3. Re-check the Validation panel

**Expected**
- The error entry disappears from the Validation panel once the model state is corrected

---

## Edge Cases

### SM-EDGE-001 — Very long state name display [P2]

**Preconditions**
- A state with a very long name (e.g. `CustomerOrderProcessingStatusIndicator`)

**Steps**
1. Add a modification for that state
2. Inspect the row and the Add dialog State dropdown

**Expected**
- The row's state name uses `truncate`; full name is available via tooltip / hover or by expanding the panel
- Dialog dropdown renders the long name; no layout breakage

### SM-EDGE-002 — Very long STRING value [P2]

**Preconditions**
- A STRING state exists

**Steps**
1. Add a modification with a 100+ character value
2. Inspect the row and re-open the Edit dialog

**Expected**
- Row truncates the value visually with no overflow; the full value is preserved in storage and re-shown in the Edit dialog

### SM-EDGE-003 — Special characters in STRING value [P2]

**Preconditions**
- A STRING state exists

**Steps**
1. Add a modification with value `<script>alert('test')</script>` and another with `Value with 'quotes' and "double"`
2. View the row

**Expected**
- Characters are rendered as plain text (React JSX auto-escapes — no XSS)
- Round-trip through save/reload preserves the exact value

### SM-EDGE-004 — Unicode characters in values [P2]

**Preconditions**
- A STRING or CATEGORY state exists

**Steps**
1. Add a modification with value `éàüñ 中文 🎉`
2. Save, reload the model, re-select the host element

**Expected**
- Characters are preserved exactly across save/reload (UTF-8 JSON serialization)

### SM-EDGE-005 — Very large NUMBER value [P2]

**Preconditions**
- A NUMBER state exists

**Steps**
1. Add a modification with value `999999999999`
2. Save and re-view

**Expected**
- Value preserved as a JS number; display may use scientific notation depending on magnitude
- No overflow / precision loss within JS Number safe range

### SM-EDGE-006 — Very small decimal NUMBER value [P2]

**Preconditions**
- A NUMBER state exists

**Steps**
1. Add a modification with value `0.000001`
2. Save and re-view

**Expected**
- Value preserved; no rounding to zero in storage

### SM-EDGE-007 — Rapid add/delete operations [P3]

**Preconditions**
- States available; State Modifications section open

**Steps**
1. Rapidly add, delete, add, delete (5+ cycles)

**Expected**
- The list stays consistent; the 2-second fallback timer never strands a row
- Parent `SaveStatusLine` eventually settles on `Saved`
- No console errors

### SM-EDGE-008 — Many modifications (10+) [P3]

**Preconditions**
- 10+ states available

**Steps**
1. Add ~10 modifications
2. Edit / delete items mid-list, scroll the parent panel

**Expected**
- All operations behave the same regardless of list length
- Parent `SaveStatusLine` cycles cleanly after each operation

### SM-EDGE-009 — Empty model (no states) [P3]

**Preconditions**
- Model has zero states defined

**Steps**
1. Open the State Modifications section

**Expected**
- The amber `No States Available` card renders
- `+ Add` is disabled
- No errors; the user is pointed at the Model Editor (clickable link in Generator host)

### SM-EDGE-010 — State renamed after modification was created [P3]

**Preconditions**
- A modification references state `OldName`

**Steps**
1. Rename the state to `NewName` in Model Editor → States
2. Return to the host editor

**Expected**
- The modification still resolves via `stateUniqueId` (which doesn't change on rename)
- Row display should reflect the new name; record any staleness in the run report

### SM-EDGE-011 — Concurrent editing (multiple users) [P3]

**Preconditions**
- Two clients have the same element selected and the State Modifications section open

**Steps**
1. User A adds a modification
2. Before seeing A's change, User B adds a different modification
3. Both edits flush via the parent's auto-save

**Expected**
- Document observed conflict resolution (last-write-wins vs. merge) in the run report — this exercises the host editor's persistence, not the state-mod editor itself

### SM-EDGE-012 — JSON serialization round-trip [P3]

**Preconditions**
- Modifications of every flavor exist (ASSIGN string, ADD number, SAMPLE Normal, SAMPLE Bernoulli, SAMPLE Multinomial, one cross-component MODEL counter)

**Steps**
1. Export the model to JSON
2. Re-import the model
3. Re-open the host editor and inspect the modifications

**Expected**
- Every modification survives the round-trip exactly: state UID, operation, value, distribution type, distribution parameters, target component type, component unique id
- This exercises `StateModification.toJSON` / `fromJSON`
