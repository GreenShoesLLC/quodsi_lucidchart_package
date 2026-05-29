# 007 — Model Editor Tests

Suite of manual / agent-driven QA tests for the **Model Editor** in the Quodsi LucidChart extension. The Model Editor configures the top-level simulation model — its name, simulation duration / time mode, replications, model-level state variables, reusable resource-requirement templates, scenarios, and model validation.

## How to read this file

Each test is a small block: **ID — Name [Priority]**, then **Preconditions**, **Steps**, **Expected**, and (sometimes) **Context** — author notes that explain a subtle assertion or point at the source-of-truth code. Tests can be run by a human or by an AI agent walking the file top-to-bottom.

## How to record a run

Don't edit this file. For each run, create a new file under `_qa/runs/` and **log only failures** — silence means pass. See `_qa/runs/README.md` for the run-file template.

## Auto-save model (read once)

The Model Editor has **no Save or Cancel button**. Every change is auto-saved:

- **Text / number / datetime-local inputs** on the Basic tab (Model Name, Run Time period, Replications, Warmup Time period, Start/Finish/Warmup Date): change is held locally, then auto-saved ~500 ms after the last keystroke (debounced). **Tabbing out / clicking elsewhere (blur) flushes the save immediately.**
- **Dropdowns** on the Basic tab (Run Time unit, Time Mode, Clock Unit, Warmup Time unit): saved **immediately** on change (no debounce, no blur required).
- **States, Requirements, Scenarios** tabs: each list mutation (add / edit / delete) is dispatched immediately to storage via the corresponding ops sender — no per-field debounce on those tabs.
- **Validation** tab: read-only; no save behavior.

A status line at the bottom of the Basic tab (`SaveStatusLine`) shows what's happening, using these exact strings:

| Status | Text | When it appears |
|---|---|---|
| saving | `Saving…` (spinner) | Save is in flight, or just kicked off |
| invalid | `Fix errors to save` (yellow triangle) | Local edits exist but validation fails |
| error | `Save failed — keep typing to retry` (red triangle) | Last save threw; next edit retries |
| saved | `Saved` (check) | Idle; no pending edits, last save (if any) succeeded |

Note: the Model has **no name-uniqueness validation** (only one Model per document) and no required-field validation in the editor itself, so the `Fix errors to save` state is unlikely to appear on the Basic tab in normal use. Model-level issues (no generators, broken paths, etc.) surface on the **Validation** tab instead.

To undo a saved change, use LucidChart's native **Ctrl+Z**.

## Tab layout

The Model Editor has **5 tabs** (no Save/Cancel buttons, no States tab on the Activity Editor — model-level States live here):

| # | Icon | Title | Internal id |
|---|---|---|---|
| 1 | Settings (gear) | Basic Settings | `basic` |
| 2 | Hash | State Definitions | `states` |
| 3 | Users | Resource Requirements | `requirements` |
| 4 | Play-square | Scenarios | `scenarios` |
| 5 | Alert triangle | Validation | `validation` |

Hover any icon to see its full tooltip (e.g. gear → "Configure model name, simulation time settings, and runtime parameters").

> **Heads up — Utilities tab is gone.** The old "View Model JSON" / Diagnostics panel was removed when the editor was rewritten. Any test that previously targeted a Utilities tab is now invalid; the JSON-dump capability now lives outside the Model Editor (developer tooling).

---

## Tab Navigation

### MOD-NAV-001 — Navigate to Basic Settings tab [P1]

**Preconditions**
- LucidChart document open with a Quodsi model
- The Model Editor panel is visible (open the main Quodsi panel, not an element-specific editor)

**Steps**
1. In the tab bar at the top of the panel, click the **gear** icon (1st icon)

**Expected**
- The gear icon is highlighted (blue underline, blue tint)
- Content area shows Basic Settings: `Model Name` text input, `Run Time` (number + unit dropdown — only shown in Clock mode), an `Advanced Settings` accordion (collapsed by default), and a `SaveStatusLine` at the bottom

### MOD-NAV-002 — Navigate to State Definitions tab [P2]

**Preconditions**
- Model Editor panel visible

**Steps**
1. Click the **hash** icon (2nd icon) in the tab bar

**Expected**
- Hash icon highlighted
- Content shows the `StatesEditor`: a filter dropdown ("All Components" by default), a list of model-level state variables (may be empty), and an `Add` / `+` button to create a new state
- No `SaveStatusLine` on this tab — state changes are dispatched immediately on add / edit / delete

**Context:** These are **model-level** states (`ComponentType.MODEL`-scoped by default), distinct from per-element state lists.

### MOD-NAV-003 — Navigate to Resource Requirements tab [P2]

**Preconditions**
- Model Editor panel visible

**Steps**
1. Click the **users** icon (3rd icon) in the tab bar

**Expected**
- Users icon highlighted
- Content shows the `ResourceRequirementsManager`: the requirements list (may include auto-generated requirements, one per Resource shape) and an `Add` button
- Editing or creating a requirement opens a modal (`ResourceRequirementModal`)
- No `SaveStatusLine` on this tab — modal Save persists immediately via `updateResourceRequirements`

### MOD-NAV-004 — Navigate to Scenarios tab [P2]

**Preconditions**
- Model Editor panel visible

**Steps**
1. Click the **play-square** icon (4th icon) in the tab bar

**Expected**
- Play-square icon highlighted
- Content shows `ScenariosAndRunsPanel`: a list of scenario cards (one per scenario, including the baseline), an `Add Scenario` button at the bottom, and a small footer row with a sync (refresh) button and an `Auto: Off / Smart / On` selector
- No `SaveStatusLine` on this tab — scenario changes dispatch immediately via `updateScenarioDefinitions`

### MOD-NAV-005 — Navigate to Validation tab [P2]

**Preconditions**
- Model Editor panel visible

**Steps**
1. Click the **alert triangle** icon (5th icon) in the tab bar

**Expected**
- Alert triangle icon highlighted
- Content shows the `ValidationDashboard`: error list (red) and warning list (yellow), or a success indicator if the model is clean
- Validation runs automatically when the tab is opened (the editor calls `onValidate()` on entry)

### MOD-NAV-006 — All 5 tabs visible in tab bar [P1]

**Preconditions**
- Model Editor panel visible

**Steps**
1. Look at the tab bar
2. Hover each icon to read its tooltip

**Expected**
- Exactly **5** tab icons in this order: gear (Basic Settings), hash (State Definitions), users (Resource Requirements), play-square (Scenarios), alert triangle (Validation)
- **No Utilities tab** — the old "View Model JSON" / Diagnostics tab no longer exists

### MOD-NAV-007 — Tab tooltips display [P2]

**Preconditions**
- Model Editor panel visible

**Steps**
1. Hover each of the 5 tab icons for ~1–2 seconds

**Expected**
- Each tab shows a tooltip:
  - Gear → `Configure model name, simulation time settings, and runtime parameters`
  - Hash → `Define model-level state variables that can be accessed and modified throughout the simulation`
  - Users → `Create reusable resource requirement templates that define which resources are needed for activities`
  - Play-square → `Configure and manage scenarios with different parameter sets and run configurations`
  - Alert triangle → `View comprehensive model validation results and resolve any issues`

**Context:** Tooltips come from the `title` attribute on each tab button (`TAB_CONFIG[*].tooltip` in `ModelEditor.tsx`); browser may render them via native tooltips, not a custom UI element.

---

## Basic Settings

### MOD-BASIC-001 — Edit model name [P1]

**Preconditions**
- Model Editor → Basic Settings tab open

**Steps**
1. Click the `Model Name` field
2. Select all and type `Customer Service Simulation`
3. Tab out of the field

**Expected**
- Field shows `Customer Service Simulation`
- `SaveStatusLine` briefly flashes `Saving…` then settles on `Saved`
- Re-opening the model panel shows the new name

### MOD-BASIC-002 — Edit run time value [P1]

**Preconditions**
- Basic Settings tab open
- Time Mode is `Clock` (default) — `Run Time` row is visible directly under Model Name

**Steps**
1. Click the `Run Time` numeric input (left of the unit dropdown)
2. Clear it, type `100`
3. Tab out

**Expected**
- Field shows `100`
- `SaveStatusLine` cycles `Saving…` → `Saved`

**Context:** Bound to `runClockPeriod`. Input has `min="0"`.

### MOD-BASIC-003 — Change run time unit [P1]

**Preconditions**
- Basic Settings tab open; Time Mode is `Clock`

**Steps**
1. Open the `Run Time` unit dropdown (right of the numeric field)
2. Select `Days`

**Expected**
- Dropdown shows `Days`
- `SaveStatusLine` cycles `Saving…` → `Saved` immediately (selects flush on change via `useFlushOnChange`)

**Context:** Options come from `PeriodUnit` enum.

### MOD-BASIC-004 — Run time hidden in Calendar mode [P2]

**Preconditions**
- Basic Settings tab open
- Advanced Settings expanded; Time Mode set to `CalendarDate`

**Steps**
1. Inspect the Basic Settings area

**Expected**
- The `Run Time` numeric input and its unit dropdown are **not** visible (the whole row is hidden when `simulationTimeType === CalendarDate`)
- Inside Advanced Settings, three date pickers appear instead: `Start Date`, `Finish Date`, `Warmup Date` (each a `datetime-local` input)

### MOD-BASIC-005 — Expand Advanced Settings [P2]

**Preconditions**
- Basic Settings tab open; Advanced Settings is currently **collapsed** (default state on a freshly selected model)

**Steps**
1. Click the `Advanced Settings` header row

**Expected**
- The accordion expands; chevron rotates from right to down
- Newly visible fields: `Replications`, `Time Mode` dropdown, and (in Clock mode) `Clock Unit` + `Warmup Time` (number + unit), or (in CalendarDate mode) `Start Date` + `Finish Date` + `Warmup Date`

### MOD-BASIC-006 — Collapse Advanced Settings [P2]

**Preconditions**
- Basic Settings tab open; Advanced Settings currently **expanded**

**Steps**
1. Click the `Advanced Settings` header row

**Expected**
- The accordion collapses; chevron rotates back
- Replications, Time Mode, Clock Unit, Warmup Time, and any date pickers are hidden — only the header row remains

### MOD-BASIC-007 — Edit replications [P1]

**Preconditions**
- Basic Settings tab open; Advanced Settings expanded

**Steps**
1. Click the `Replications` numeric input
2. Clear it, type `10`
3. Tab out

**Expected**
- Field shows `10`
- `SaveStatusLine` cycles `Saving…` → `Saved`

**Context:** Bound to `reps`. Input has `min="1"`.

### MOD-BASIC-008 — Minimum replications (0 coerced to 1) [P2]

**Preconditions**
- Basic Settings tab open; Advanced Settings expanded

**Steps**
1. Click `Replications`, clear and type `0`
2. Tab out

**Expected**
- Either the input's `min="1"` constraint blocks `0` immediately, **or** the save-defaulting wrapper coerces stored `reps` to `1` (`draft.reps || 1`). Either way, the stored replications value is `≥ 1`.
- `SaveStatusLine` settles on `Saved` (no visible validation banner — the coercion is silent)

**Context:** Defaulting logic in `onSaveWithDefaults` applies `reps: draft.reps || 1`.

### MOD-BASIC-009 — Change time mode to CalendarDate [P1]

**Preconditions**
- Basic Settings tab open; Advanced Settings expanded; Time Mode is currently `Clock`

**Steps**
1. Open the `Time Mode` dropdown
2. Select `CalendarDate`

**Expected**
- The form changes immediately:
  - `Run Time` row (number + unit) **disappears** from the top of the Basic tab
  - In Advanced Settings, `Clock Unit` and `Warmup Time` rows disappear
  - `Start Date`, `Finish Date`, and `Warmup Date` (`datetime-local` inputs) appear in Advanced Settings
- `SaveStatusLine` cycles `Saving…` → `Saved` immediately (no blur needed — selects flush on change)

### MOD-BASIC-010 — Change time mode to Clock [P1]

**Preconditions**
- Basic Settings tab open; Advanced Settings expanded; Time Mode is currently `CalendarDate`

**Steps**
1. Open the `Time Mode` dropdown
2. Select `Clock`

**Expected**
- The form changes immediately:
  - Date pickers (`Start Date`, `Finish Date`, `Warmup Date`) disappear
  - `Run Time` row reappears at the top of the Basic tab
  - `Clock Unit` and `Warmup Time` rows reappear in Advanced Settings
- `SaveStatusLine` cycles `Saving…` → `Saved` immediately

### MOD-BASIC-011 — Edit clock unit [P2]

**Preconditions**
- Basic Settings tab open; Advanced Settings expanded; Time Mode is `Clock`

**Steps**
1. Open the `Clock Unit` dropdown (in Advanced Settings)
2. Select `Minutes`

**Expected**
- Dropdown shows `Minutes`
- `SaveStatusLine` cycles `Saving…` → `Saved` immediately

**Context:** Bound to `oneClockUnit` — the base time unit for the entire simulation, distinct from the `Run Time` unit.

### MOD-BASIC-012 — Edit warmup time period [P2]

**Preconditions**
- Basic Settings tab open; Advanced Settings expanded; Time Mode is `Clock`

**Steps**
1. Click the `Warmup Time` numeric input
2. Clear it, type `10`
3. Tab out

**Expected**
- Field shows `10`
- `SaveStatusLine` cycles `Saving…` → `Saved`

**Context:** Bound to `warmupClockPeriod`. Input has `min="0"`. Adjacent dropdown sets `warmupClockPeriodUnit`.

### MOD-BASIC-013 — Edit warmup time unit [P3]

**Preconditions**
- Basic Settings tab open; Advanced Settings expanded; Time Mode is `Clock`

**Steps**
1. Open the unit dropdown next to `Warmup Time`
2. Select a different unit (e.g. `Minutes`)

**Expected**
- Dropdown shows the new unit
- `SaveStatusLine` cycles `Saving…` → `Saved` immediately

### MOD-BASIC-014 — No Random Seed input visible [P3]

**Preconditions**
- Basic Settings tab open; Advanced Settings expanded

**Steps**
1. Inspect the full contents of Advanced Settings

**Expected**
- There is **no** Random Seed field in the UI
- The seed value is set via `onSaveWithDefaults` to `DEFAULT_RANDOM_SEED` (`12345`) whenever the saved draft has a falsy seed

**Context:** The legacy spec referenced a seed input that does not exist in the current editor — `seed` is constant-defaulted at save time.

---

## Calendar Date Mode

### MOD-CAL-001 — Set start date [P1]

**Preconditions**
- Basic Settings tab; Advanced Settings expanded; Time Mode is `CalendarDate`

**Steps**
1. Click the `Start Date` input (a `datetime-local` picker)
2. Pick a date and time, e.g. `2024-01-15 08:00`
3. Tab out

**Expected**
- Field shows the chosen date/time
- `SaveStatusLine` cycles `Saving…` → `Saved`

**Context:** Stored as `startDateTime` on `Model`. The editor converts the input string to a `Date` via `new Date(value)` in `handleChange`.

### MOD-CAL-002 — Set finish date [P1]

**Preconditions**
- Basic Settings tab; Advanced Settings expanded; Time Mode is `CalendarDate`
- A `Start Date` is set

**Steps**
1. Click `Finish Date`
2. Pick a date AFTER the start date, e.g. `2024-01-31 17:00`
3. Tab out

**Expected**
- Field shows the chosen date/time
- `SaveStatusLine` cycles `Saving…` → `Saved`

### MOD-CAL-003 — Set warmup date [P2]

**Preconditions**
- Time Mode `CalendarDate`; Start and Finish dates set

**Steps**
1. Click `Warmup Date`
2. Pick a date between Start and Finish
3. Tab out

**Expected**
- Field shows the chosen date/time
- `SaveStatusLine` cycles `Saving…` → `Saved`

### MOD-CAL-004 — Clear start date [P2]

**Preconditions**
- Time Mode `CalendarDate`; Start Date currently set

**Steps**
1. Open the `Start Date` picker
2. Clear the value (browser-specific — typically a `Clear` action in the native picker, or select-all + Delete in the input)
3. Tab out

**Expected**
- Field is empty
- `SaveStatusLine` cycles `Saving…` → `Saved` (no editor-level validation blocks a missing start date — model validation may flag it later on the Validation tab; document observed behavior)

**Context:** `handleChange` converts an empty value to `null`. `onSaveWithDefaults` leaves `startDateTime` as `null` (no fallback applied).

### MOD-CAL-005 — Finish before start (no editor block) [P3]

**Preconditions**
- Time Mode `CalendarDate`; Start Date set to e.g. `2024-01-15`

**Steps**
1. Set `Finish Date` to a date BEFORE the start date, e.g. `2024-01-10`
2. Tab out

**Expected**
- The editor **does not** block the save — there is no inline `Fix to save: …` banner for the Basic tab
- `SaveStatusLine` cycles `Saving…` → `Saved`
- The Validation tab may surface a model-level error / warning about the invalid date range — document what you observe

**Context:** **Legacy spec assumed inline date-range validation; the current editor has none.** Treat date-range checks as a Validation-tab concern.

### MOD-CAL-006 — Warmup outside range (no editor block) [P3]

**Preconditions**
- Time Mode `CalendarDate`; Start and Finish dates set

**Steps**
1. Set `Warmup Date` to a date BEFORE Start, or AFTER Finish
2. Tab out

**Expected**
- The editor accepts the value; `SaveStatusLine` cycles `Saving…` → `Saved`
- The Validation tab may surface a warning; document what you observe

### MOD-CAL-007 — Date field info tooltips [P2]

**Preconditions**
- Time Mode `CalendarDate`; date fields visible

**Steps**
1. Hover the small `Info` icon next to each date field label (Start Date, Finish Date, Warmup Date)

**Expected**
- Each label has an info icon with a tooltip describing the field, for example:
  - Start Date → `The calendar date and time when the simulation begins in Calendar Date mode...`
  - Finish Date → `The calendar date and time when the simulation ends in Calendar Date mode...`
  - Warmup Date → `The calendar date and time when the warmup period ends and statistics collection begins...`

---

## State Definitions

### MOD-STATE-001 — Add new state [P1]

**Preconditions**
- State Definitions tab open

**Steps**
1. Click the `Add` / `+` button
2. The `StateFormDialog` opens
3. Fill in a name (e.g. `Operational`) and any required fields, confirm

**Expected**
- Dialog closes; new state appears in the list immediately
- No `Save` button on the tab — the change was dispatched immediately to the parent via `onStatesChange`

**Context:** Driven by `StatesEditor` → `handleAddState`, which rebuilds the `StateListManager` and calls `onStatesChange`.

### MOD-STATE-002 — Edit state name [P1]

**Preconditions**
- State Definitions tab open; at least one state exists

**Steps**
1. Click the edit icon (pencil) on a state row, or click the row to open `StateFormDialog`
2. Change the name to `Running`
3. Confirm

**Expected**
- Dialog closes; the state in the list now shows `Running`
- Change persists across tab switches and panel close/re-open

### MOD-STATE-003 — Delete state [P2]

**Preconditions**
- State Definitions tab open; at least one state exists

**Steps**
1. Click the delete (trash) icon on a state row
2. A confirmation dialog appears; confirm

**Expected**
- The state is removed from the list immediately
- Change persists across tab switches

### MOD-STATE-004 — State filter by component type [P2]

**Preconditions**
- State Definitions tab open; states exist across multiple component types

**Steps**
1. Open the filter dropdown at the top of the tab
2. Pick a specific component type (e.g. `Model` or `Resource`)

**Expected**
- The list narrows to states scoped to the selected component type
- Choosing `All Components` restores the full list

**Context:** Filter is `filterComponentType` in `StatesEditor`; persists for the duration of the session but resets when the panel reopens.

### MOD-STATE-005 — State changes persist across tabs [P2]

**Preconditions**
- State Definitions tab open

**Steps**
1. Add a new state named `Maintenance Mode`
2. Switch to the Basic Settings tab
3. Switch back to State Definitions

**Expected**
- The new state is still present — there is no per-tab save step; each add / edit / delete is dispatched immediately

---

## Resource Requirements

### MOD-REQ-001 — Add new requirement (modal opens) [P1]

**Preconditions**
- Resource Requirements tab open

**Steps**
1. Click the `Add` button

**Expected**
- The `ResourceRequirementModal` opens with empty fields:
  - Name input
  - Resource-requirement structure editor (clauses / quantities)
  - `Save` and `Cancel` buttons inside the modal

**Context:** The modal's Save/Cancel buttons are local to the dialog; the tab itself has no Save/Cancel.

### MOD-REQ-002 — Save new requirement [P1]

**Preconditions**
- Resource Requirements tab open; modal opened via `Add`

**Steps**
1. Enter name `Operator Required`
2. Configure the resource clauses (select at least one resource and a quantity)
3. Click the modal's `Save` button

**Expected**
- Modal closes
- New requirement `Operator Required` appears in the list
- Change is persisted immediately — `updateResourceRequirements` is dispatched with the serialized custom requirements; no main-tab `Save` needed

### MOD-REQ-003 — Edit existing requirement [P1]

**Preconditions**
- Resource Requirements tab open; at least one requirement exists

**Steps**
1. Click `Edit` (pencil) on a requirement row
2. Modify the name or clauses
3. Click `Save` in the modal

**Expected**
- Modal closes; list shows the updated requirement
- Editing an auto-generated requirement converts it into a custom requirement (it gets persisted; previously it was inferred from the Resource shape)

**Context:** Persistence path filters out unmodified auto-generated requirements (`isAutoGeneratedRequirement` check in `ModelEditor.tsx`) — only manually edited or newly created ones are sent to storage.

### MOD-REQ-004 — Delete requirement [P1]

**Preconditions**
- Resource Requirements tab open; a deletable requirement exists

**Steps**
1. Click the delete (trash) icon on a requirement row
2. If a confirmation appears, confirm

**Expected**
- The requirement is removed from the list immediately
- `updateResourceRequirements` is dispatched with the remaining custom requirements

### MOD-REQ-005 — Delete requirement that is in use [P2]

**Preconditions**
- Resource Requirements tab open; a requirement that is referenced by ≥ 1 activity action exists (the list row should show a usage count > 0 — `getUsageCount` counts action references)

**Steps**
1. Attempt to delete the in-use requirement

**Expected**
- The deletion is **either** blocked with a warning, **or** confirmed with a warning showing the usage count. Document the actual behavior in your run report.
- If allowed, the affected activity actions may need re-binding

### MOD-REQ-006 — Cancel modal without saving [P2]

**Preconditions**
- Resource Requirements tab open; modal opened via `Add`

**Steps**
1. Enter a name (e.g. `Test Requirement`)
2. Click `Cancel` (or the `X` icon) on the modal

**Expected**
- Modal closes without saving
- The requirement list is unchanged — `Test Requirement` is **not** added

### MOD-REQ-007 — Requirements persist across tab switches [P2]

**Preconditions**
- Resource Requirements tab open

**Steps**
1. Add a requirement via the modal, click Save
2. Switch to Basic Settings, then back

**Expected**
- The requirement is still in the list — no manual save was needed

### MOD-REQ-008 — Auto-generated requirements appear for Resource shapes [P2]

**Preconditions**
- Model has Resource shapes in the diagram; Requirements tab open

**Steps**
1. Inspect the list

**Expected**
- Auto-generated requirements appear, typically one per Resource, with names matching the Resource names
- These are **not** persisted as separate records — they are inferred on read; only when edited do they become custom records

### MOD-REQ-009 — Empty requirements list with no resources [P3]

**Preconditions**
- Model has no Resource shapes and no custom requirements

**Steps**
1. Open the Requirements tab

**Expected**
- The list is empty (or shows an empty-state message)
- The `Add` button is still visible and functional

---

## Scenarios

### MOD-SCEN-001 — View scenarios panel [P1]

**Preconditions**
- Model Editor → Scenarios tab open

**Steps**
1. Inspect the tab content

**Expected**
- A list of scenario cards (each: name, expand chevron, play button, optional delete) — at minimum the baseline scenario is present
- An `Add Scenario` button at the bottom of the list
- A footer with a sync (refresh) button and an `Auto: Off / Smart / On` selector

### MOD-SCEN-002 — Create new scenario [P1]

**Preconditions**
- Scenarios tab open

**Steps**
1. Click `Add Scenario`

**Expected**
- A new scenario card appears at the bottom, named `Scenario N` (where N = current count of non-baseline scenarios + 1) and auto-expanded
- The scenario is immediately persisted via `updateScenarioDefinitions`

### MOD-SCEN-003 — Edit scenario name / settings [P2]

**Preconditions**
- Scenarios tab open; at least one non-baseline scenario exists

**Steps**
1. Expand a scenario card
2. Edit the name or any change-request fields

**Expected**
- Edits flow through the card's local handlers → `onUpdate` → `updateScenarioDefinitions`; persistence is immediate

### MOD-SCEN-004 — Delete non-baseline scenario [P2]

**Preconditions**
- Scenarios tab open; at least one non-baseline scenario exists

**Steps**
1. Click `Delete` on the scenario card
2. An inline confirmation appears next to the Delete button; confirm

**Expected**
- The scenario is removed from the list
- If the scenario had simulation results, the run record is also deleted via `deleteSimulationRun`
- The baseline scenario **cannot** be deleted — its Delete button is suppressed (`onDelete` is `undefined` when `scenario.isBaseline`)

### MOD-SCEN-005 — Scenarios persist across tab switches [P2]

**Preconditions**
- Scenarios tab open

**Steps**
1. Create or edit a scenario
2. Switch to Basic Settings, then back

**Expected**
- Changes are still present — each action is immediately dispatched

### MOD-SCEN-006 — Multiple scenarios listed [P3]

**Preconditions**
- Scenarios tab open; ≥ 3 scenarios exist

**Steps**
1. Inspect the list and scroll if needed

**Expected**
- All scenarios are listed, each with its name and run-status indicator
- The list area is scrollable when it overflows

### MOD-SCEN-007 — Run scenario from card [P1]

**Preconditions**
- Scenarios tab open; document is bound to a Lucid document with valid `documentId` / `pageId`; at least one scenario exists

**Steps**
1. Click the play button on a scenario card
2. If this is a re-run (results already exist), an inline confirmation appears — confirm

**Expected**
- The card's status optimistically flips to `Queued`, then `Running` as the engine progresses
- Auto-refresh switches from `Off` to `Smart` if it was off
- On completion, the status becomes `RanSuccessfully` (or `RanWithErrors` / `Cancelled`); `Analyze` becomes available

**Context:** Per-scenario gating: distinct scenario runs are capped per plan (`scenarios_per_model`). When the cap is hit, the play button on a never-run scenario is greyed out with a tooltip explaining the limit. Re-runs are free.

### MOD-SCEN-008 — Cancel running scenario [P2]

**Preconditions**
- Scenarios tab open; a scenario is in `Queued` or `Running` state

**Steps**
1. Click the cancel control on the scenario card
2. Confirm in the inline confirmation prompt

**Expected**
- The card's status optimistically flips to `Cancelled`
- `cancelSimulationRun` is dispatched with the document/page/scenario ids
- A `SIMULATION_RUN_CANCEL_RESULT` message triggers a refresh

### MOD-SCEN-009 — Sync button [P2]

**Preconditions**
- Scenarios tab open

**Steps**
1. Click the sync (refresh) icon in the footer

**Expected**
- Button shows a spinner (`animate-spin` on the icon); button is disabled while syncing (`disabled:cursor-wait`)
- `syncAll` is dispatched (push local changes, pull server updates)
- Spinner clears when the extension dispatches `SYNC_ALL_SUCCESS_UPDATE` / `SYNC_ALL_ERROR_UPDATE`

### MOD-SCEN-010 — Auto-refresh mode selector [P3]

**Preconditions**
- Scenarios tab open

**Steps**
1. Use the `Auto: Off / Smart / On` dropdown in the footer

**Expected**
- `Off`: no polling
- `Smart`: polls every 10 s only when at least one run is `Queued` / `Running`, or when a `RanSuccessfully` run is missing `downloadInfo`
- `On`: polls every 10 s unconditionally

---

## Validation

### MOD-VAL-001 — Validation auto-triggers on tab entry [P1]

**Preconditions**
- Model Editor visible; model has at least one validation issue

**Steps**
1. Click the Validation tab

**Expected**
- Validation runs automatically — no `Validate` button required
- Errors (red) and warnings (yellow) appear in the `ValidationDashboard`

**Context:** `useEffect` in `ModelEditor` calls `onValidate()` whenever `activeTab === 'validation'`.

### MOD-VAL-002 — View validation errors [P1]

**Preconditions**
- Validation tab open; model has at least one ERROR

**Steps**
1. Inspect the dashboard

**Expected**
- Each error shows a message and the affected element name/type, with red styling and an error icon
- Errors block simulation from running

### MOD-VAL-003 — View validation warnings [P1]

**Preconditions**
- Validation tab open; model has at least one WARNING (and no ERRORS, ideally)

**Steps**
1. Inspect the dashboard

**Expected**
- Each warning shows a message and the affected element, with yellow / orange styling
- Warnings do **not** block simulation but indicate potential issues

### MOD-VAL-004 — Valid model shows success [P2]

**Preconditions**
- Model is complete and valid (≥ 1 generator, ≥ 1 activity, ≥ 1 entity, all paths reach a terminal)

**Steps**
1. Open the Validation tab

**Expected**
- No errors are listed
- A success indicator appears (empty error list and/or a green check / `Model is valid` message)
- Warnings may still be present and are informational only

### MOD-VAL-005 — Click validation item navigates to element [P2]

**Preconditions**
- Validation tab open; at least one error or warning references an element

**Steps**
1. Click the error/warning entry

**Expected**
- The diagram selects the offending element and the appropriate element editor opens

### MOD-VAL-006 — Error count badge on tab icon [P2]

**Preconditions**
- Model has validation errors

**Steps**
1. Inspect the Validation tab icon in the tab bar

**Expected**
- The icon shows a badge with the error count (red, numeric). When all errors are fixed, the badge disappears or zeroes out.

### MOD-VAL-007 — Validation refreshes after fix [P3]

**Preconditions**
- Validation tab open; a known fixable error is listed

**Steps**
1. Click the error to navigate to the element
2. Fix the underlying issue
3. Wait for auto-save to complete (per-element `SaveStatusLine` shows `Saved`)
4. Return to the Validation tab

**Expected**
- The fixed error no longer appears (or the count decreases). The Validation tab re-runs `onValidate()` on entry.

### MOD-VAL-008 — Generator with no outgoing connectors → ERROR [P1]

**Preconditions**
- A Generator shape exists with no outgoing connectors

**Steps**
1. Open the Validation tab

**Expected**
- An ERROR appears for the generator with text like `Generator has no outgoing connectors` (or equivalent)

### MOD-VAL-009 — Generator with no path to terminal → ERROR [P1]

**Preconditions**
- A Generator connects through a loop that has no path to a terminal Activity (e.g. `Generator → A → B → A`, no terminal flag)

**Steps**
1. Open the Validation tab

**Expected**
- An ERROR appears about the missing path to a terminal Activity

### MOD-VAL-010 — Generator with dead-end path → ERROR [P1]

**Preconditions**
- A Generator connects through a non-terminal Activity with no outgoing connector (`Generator → A → B`, B is not terminal and has no outgoing)

**Steps**
1. Open the Validation tab

**Expected**
- An ERROR appears about the dead-end path

### MOD-VAL-011 — Valid path to terminal → no path errors [P2]

**Preconditions**
- `Generator → A → B (terminal)`

**Steps**
1. Open the Validation tab

**Expected**
- No path-related errors are listed for this generator (other errors / warnings may still exist for unrelated reasons)

### MOD-VAL-012 — Loop with valid exit path → no errors [P2]

**Preconditions**
- `Generator → A → B → A` (loop) **and** `A → C (terminal)` — i.e. the loop has an exit

**Steps**
1. Open the Validation tab

**Expected**
- No path-related errors — loops are valid as long as an exit to a terminal Activity exists

### MOD-VAL-013 — Multiple generators each validated [P2]

**Preconditions**
- Two generators with different path problems

**Steps**
1. Open the Validation tab

**Expected**
- Errors appear for each generator independently; each error identifies the affected generator

### MOD-VAL-014 — No generators defined → ERROR [P1]

**Preconditions**
- Model has zero Generator shapes

**Steps**
1. Open the Validation tab

**Expected**
- A model-level ERROR appears, e.g. `Model must have at least one generator`

### MOD-VAL-015 — No activities defined → ERROR [P1]

**Preconditions**
- Model has zero Activity shapes

**Steps**
1. Open the Validation tab

**Expected**
- A model-level ERROR appears, e.g. `Model must have at least one activity`

### MOD-VAL-016 — No entities defined → ERROR [P1]

**Preconditions**
- Model has zero Entity shapes

**Steps**
1. Open the Validation tab

**Expected**
- A model-level ERROR appears, e.g. `Model must have at least one entity`

### MOD-VAL-017 — All required elements present → element-count errors clear [P2]

**Preconditions**
- ≥ 1 Generator, ≥ 1 Activity, ≥ 1 Entity exist; elements are connected

**Steps**
1. Open the Validation tab

**Expected**
- No `must have at least one …` element-count errors. Other issues may still surface.

---

## Form Sync

### MOD-SYNC-001 — Model data loads on panel open [P1]

**Preconditions**
- LucidChart document with a configured Quodsi model; Model Editor panel currently closed (or showing a different element)

**Steps**
1. Open the Model Editor panel
2. Click Basic Settings (gear icon)

**Expected**
- Form populates with the saved Model values: `Model Name`, `Run Time` (in Clock mode), all Advanced Settings fields (Replications, Time Mode, Clock Unit, Warmup Time) or date pickers (in CalendarDate mode)
- `SaveStatusLine` shows `Saved`

### MOD-SYNC-002 — Switching away flushes pending edits [P1]

**Preconditions**
- Basic Settings tab open

**Steps**
1. Click `Model Name`, change it to `MODIFIED`
2. **Without blurring**, click an element in the diagram (e.g. an Activity) → element editor opens
3. Re-open the Model Editor

**Expected**
- The mid-edit change is **flushed** when the panel switches away — `useAutoSave`'s element-switch effect dispatches the pending draft
- When you return, the Model Name shows `MODIFIED` (the edit was saved, not discarded)

**Context:** **This is the opposite of the legacy Save/Cancel behavior.** Under debounce auto-save, panel-switch acts as an implicit blur.

### MOD-SYNC-003 — External update syncs to form [P3]

**Preconditions**
- Same Quodsi document open in two browser windows
- Model Editor visible in both

**Steps**
1. In Window 2: change the model name to `Changed by Window 2`, blur
2. In Window 1: wait, then close and re-open the Model Editor (or wait for collaborative sync)

**Expected**
- Window 1 eventually shows the new name
- Sync may be near-immediate via Lucid's collaborative pipeline, or require re-open — document what you observe

---

## Edge Cases

### MOD-EDGE-001 — Corrupt model data handling [P3]

**Preconditions**
- Way to inject corrupt Model data (typically requires developer help — directly mutate the underlying storage)

**Steps**
1. Trigger the Model Editor against the corrupted model

**Expected**
- The editor shows a guard panel: red box with `Invalid model data — Model data missing required properties`
- The extension does not crash; other elements remain selectable

**Context:** Guard fires when `localModelDraft.id` is empty (top of the editor's render path in `ModelEditor.tsx`).

### MOD-EDGE-002 — Very long model name (500+ characters) [P3]

**Preconditions**
- Basic Settings tab open
- Have a 500+ character string ready

**Steps**
1. Paste the long string into `Model Name`
2. Tab out

**Expected**
- Field accepts the long value without crashing or breaking panel layout (it may scroll horizontally)
- `SaveStatusLine` cycles `Saving…` → `Saved`
- No max-length truncation in the UI; document any limits observed in the run report

### MOD-EDGE-003 — Very large replications (999999) [P3]

**Preconditions**
- Basic Settings tab; Advanced Settings expanded

**Steps**
1. In `Replications`, type `999999`
2. Tab out

**Expected**
- Field accepts the large value; `SaveStatusLine` cycles `Saving…` → `Saved`
- No editor-level cap or warning. 999,999 replications would take a very long time to actually simulate — document any operational guardrail observed downstream.

### MOD-EDGE-004 — Zero run time [P3]

**Preconditions**
- Basic Settings tab; Time Mode `Clock`

**Steps**
1. Set `Run Time` to `0`
2. Tab out

**Expected**
- Field accepts `0`; `SaveStatusLine` cycles `Saving…` → `Saved`
- `onSaveWithDefaults` leaves `runClockPeriod` at `0` (the `||` fallback applies only to falsy unit values, not the period — `0 || 0` is `0`)
- The Validation tab may surface a warning about zero run time; document what you observe

### MOD-EDGE-005 — Browser refresh preserves auto-saved edits [P3]

**Preconditions**
- Basic Settings tab open

**Steps**
1. Edit `Model Name` to a new value
2. Tab out, wait for `SaveStatusLine` to show `Saved`
3. Press F5 to refresh the browser
4. Re-open the Model Editor

**Expected**
- The new name is preserved — auto-save flushed on blur before refresh
- Variant: if you refresh during the ~500 ms debounce window without blurring, the pending edit may be lost. Document observed behavior in the run report.

**Context:** **This is the opposite of the legacy expectation.** With auto-save, anything that has been flushed (blurred or 500 ms elapsed) is durable across refresh. There's no longer an "unsaved changes" warning because there's no manual save step.

### MOD-EDGE-006 — Random seed default applied [P3]

**Preconditions**
- A model whose saved `seed` value is missing or `0`

**Steps**
1. Edit any Basic field to trigger a save (e.g. tweak Model Name)
2. Inspect the saved model JSON (via developer tools, or run a simulation and look at the engine-side seed)

**Expected**
- The saved `seed` value is `12345` (the `DEFAULT_RANDOM_SEED` constant in `ModelEditor.tsx`)

**Context:** There is no UI input for `seed`. `onSaveWithDefaults` applies `seed: draft.seed || DEFAULT_RANDOM_SEED` on every save.

---

## Auto-Save Behavior (Cross-Cutting)

These tests verify the auto-save mechanism itself on the Basic Settings tab. Other sections assert that "`SaveStatusLine` cycles `Saving…` → `Saved`"; these tests verify that statement is actually accurate. The States / Requirements / Scenarios / Validation tabs do not surface `SaveStatusLine` — their persistence happens via direct dispatch on each list mutation.

### MOD-AUTOSAVE-001 — Text field uses 500 ms debounce [P1]

**Preconditions**
- Basic Settings tab open

**Steps**
1. Click `Model Name`
2. Type 3 characters quickly, **do not** tab out
3. Wait ~500 ms

**Expected**
- During typing: `SaveStatusLine` does not show `Saved` (status stays `Saved` from idle or transitions through `Saving…`)
- ~500 ms after the last keystroke: `SaveStatusLine` shows `Saving…` briefly, then `Saved`

**Context:** `debounceMs = 500` in `useAutoSave`.

### MOD-AUTOSAVE-002 — Blur on text field triggers immediate save [P1]

**Preconditions**
- Basic Settings tab open

**Steps**
1. Click `Model Name`
2. Type 1 character
3. Immediately Tab out (within < 500 ms)

**Expected**
- `SaveStatusLine` shows `Saving…` immediately (blur calls `saveNow()` which bypasses the debounce timer)
- Then settles on `Saved`

### MOD-AUTOSAVE-003 — Select dropdown saves immediately on change [P1]

**Preconditions**
- Basic Settings tab open; Advanced Settings expanded

**Steps**
1. Change any of: `Run Time` unit, `Time Mode`, `Clock Unit`, `Warmup Time` unit
2. Do **not** click elsewhere

**Expected**
- `SaveStatusLine` shows `Saving…` immediately on change (no debounce, no blur required)
- Then settles on `Saved`

**Context:** Driven by `useFlushOnChange` watching `simulationTimeType`, `runClockPeriodUnit`, `oneClockUnit`, and `warmupClockPeriodUnit`.

### MOD-AUTOSAVE-004 — Element switch flushes pending edit [P1]

**Preconditions**
- Basic Settings tab open

**Steps**
1. Click `Replications`, change `1` to `7`
2. Without blurring, immediately click an Activity in the diagram (Activity Editor opens)
3. Re-open the Model Editor

**Expected**
- Replications is `7` after returning — the element-switch effect detected the change and dispatched a save with the pending draft (drained silently if a save was already in flight)

**Context:** Mirrors `MOD-SYNC-002`. Shared with the activity-side `ACT-AUTOSAVE-005` test — the underlying hook (`useAutoSave`) is the same.

### MOD-AUTOSAVE-005 — No name validation blocks save [P2]

**Preconditions**
- Basic Settings tab open

**Steps**
1. Clear `Model Name`
2. Tab out

**Expected**
- `SaveStatusLine` cycles `Saving…` → `Saved` (no `Fix errors to save` state, no inline `Fix to save: …` banner)
- An empty Model Name is **not** blocked by the editor — `useAutoSave` is initialized with `isValid: true` for the Model

**Context:** Comment in `ModelEditor.tsx`: *"No validation: only one Model per document, no name-uniqueness check needed."* Any complaints about an empty model name would surface on the Validation tab, not in the Basic editor.
