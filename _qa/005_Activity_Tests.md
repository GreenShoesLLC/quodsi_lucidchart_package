# 005 — Activity Editor Tests

Suite of manual / agent-driven QA tests for the Activity Editor in the Quodsi LucidChart extension.

## How to read this file

Each test is a small block: **ID — Name [Priority]**, then **Preconditions**, **Steps**, **Expected**, and (sometimes) **Context** — author notes that explain a subtle assertion or point at the source-of-truth code. Tests can be run by a human or by an AI agent walking the file top-to-bottom.

## How to record a run

Don't edit this file. For each run, create a new file under `_qa/runs/` and **log only failures** — silence means pass. See `_qa/runs/README.md` for the run-file template.

## Auto-save model (read once)

The Activity Editor has **no Save or Cancel button**. Every change is auto-saved:

- **Text / number inputs** (Activity Name, Capacity, queue capacities, the 5 financial cost fields, MTBF/MTTR values): change is held locally, then auto-saved ~500 ms after the last keystroke (debounced). **Tabbing out / clicking elsewhere (blur) flushes the save immediately.**
- **Checkboxes and dropdowns** (Enable Financial Tracking, Enable Failure Simulation, Failure Clock Mode, Repair Resource Requirement, Routing Type): saved **immediately** on change (no debounce, no blur required).
- **Sub-editors** (action edits inside the Actions tab, duration changes via `EnhancedDurationEditor`): debounced auto-save, same 500 ms.

A status line at the very bottom of the panel (`SaveStatusLine`) shows what's happening, using these exact strings:

| Status | Text | When it appears |
|---|---|---|
| saving | `Saving…` (spinner) | Save is in flight, or just kicked off |
| invalid | `Fix errors to save` (yellow triangle) | Local edits exist but validation fails |
| error | `Save failed — keep typing to retry` (red triangle) | Last save threw; next edit retries |
| saved | `Saved` (check) | Idle; no pending edits, last save (if any) succeeded |

When validation fails, the editor *also* shows one or more red banners just above the status line, prefixed `Fix to save:`, that describe the specific problem (e.g. `Fix to save: Split action requires a destination activity.`).

To undo a saved change, use LucidChart's native **Ctrl+Z**.

## Tab layout

The Activity Editor has **5 tabs** (no Save/Cancel buttons, no States tab — States are now managed at the Model level):

| # | Icon | Title | Internal id |
|---|---|---|---|
| 1 | Settings (gear) | Basic Settings | `basic` |
| 2 | Layers (stacked squares) | Actions | `actions` |
| 3 | Dollar sign | Financial Settings | `financial` |
| 4 | Alert triangle | Failure Settings | `failure` |
| 5 | Arrow left-right | Routing Configuration | `connectors` |

Hover any icon to see its full title in a tooltip.

---

## Tab Navigation

### ACT-NAV-001 — Navigate to Basic Settings tab [P1]

**Preconditions**
- LucidChart document open with a Quodsi model
- Click any Activity shape; the Activity Editor panel shows on the right

**Steps**
1. In the tab bar at the top of the panel, click the **gear** icon (1st icon)

**Expected**
- The gear icon is highlighted (blue underline, blue tint)
- Content area shows Basic Settings: `Activity Name` text input, `Activity Capacity` number input, an `Advanced Settings` collapsible row

### ACT-NAV-002 — Navigate to Actions tab [P1]

**Preconditions**
- Activity selected; Activity Editor panel visible

**Steps**
1. Click the **layers** icon (2nd icon) in the tab bar

**Expected**
- Layers icon highlighted
- Content shows the Actions list (may be empty) and a blue `+ Add` button in the top-right of the section

### ACT-NAV-003 — Navigate to Financial Settings tab [P2]

**Preconditions**
- Activity selected; Activity Editor panel visible

**Steps**
1. Click the **dollar sign** icon (3rd icon)

**Expected**
- Dollar sign highlighted
- Content shows `Enable Financial Tracking` checkbox (unchecked by default on new activities); cost fields appear only when checked

### ACT-NAV-004 — Navigate to Failure Settings tab [P2]

**Preconditions**
- Activity selected; Activity Editor panel visible

**Steps**
1. Click the **alert triangle** icon (4th icon)

**Expected**
- Alert triangle highlighted
- Content shows `Enable Failure Simulation` checkbox (unchecked by default); MTBF/MTTR/clock-mode/repair fields appear only when checked

### ACT-NAV-005 — Navigate to Routing Configuration tab [P2]

**Preconditions**
- Activity selected; Activity Editor panel visible

**Steps**
1. Click the **arrow left-right** icon (5th, last icon)

**Expected**
- Arrow icon highlighted
- Content shows the Routing Configuration: a `Connect Type` dropdown (Probability / Conditional / EntityType) and a list of outgoing connectors (if any)

### ACT-NAV-006 — All 5 tabs visible in tab bar [P1]

**Preconditions**
- Activity selected

**Steps**
1. Look at the tab bar
2. Hover each icon to read its tooltip

**Expected**
- Exactly **5** tab icons in this order: gear (Basic Settings), layers (Actions), dollar (Financial Settings), alert triangle (Failure Settings), arrow left-right (Routing Configuration)
- No "States" tab — states are managed at the Model level

---

## Basic Settings

### ACT-BASIC-001 — Edit activity name [P1]

**Preconditions**
- Activity selected; Basic Settings tab open

**Steps**
1. Click the `Activity Name` field
2. Select all and type `Process Order`
3. Tab out of the field

**Expected**
- Field shows `Process Order`
- `SaveStatusLine` briefly flashes `Saving…` then settles on `Saved`
- Re-selecting the activity shows the new name

### ACT-BASIC-002 — Edit activity capacity [P1]

**Preconditions**
- Activity selected; Basic Settings tab open

**Steps**
1. Click the `Activity Capacity` field
2. Clear it, type `5`
3. Tab out

**Expected**
- Field shows `5`
- `SaveStatusLine` cycles `Saving…` → `Saved`
- No error message

### ACT-BASIC-003 — Edit inbound queue capacity [P1]

**Preconditions**
- Activity selected; Basic Settings tab open
- `Advanced Settings` row expanded (click the row if collapsed)

**Steps**
1. Click `Inbound Queue Capacity` inside Advanced Settings
2. Clear it, type `100`
3. Tab out

**Expected**
- Field shows `100`
- `SaveStatusLine` cycles `Saving…` → `Saved`

**Context:** Queue fields live inside the collapsible Advanced Settings section.

### ACT-BASIC-004 — Edit outbound queue capacity [P1]

**Preconditions**
- Activity selected; Basic Settings tab open; Advanced Settings expanded

**Steps**
1. Click `Outbound Queue Capacity`
2. Clear it, type `50`
3. Tab out

**Expected**
- Field shows `50`
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-BASIC-005 — Unlimited inbound queue (999999) [P2]

**Preconditions**
- Activity selected; Basic Settings tab open; Advanced Settings expanded

**Steps**
1. In `Inbound Queue Capacity`, clear and type `999999`
2. Tab out

**Expected**
- Field accepts `999999`
- `SaveStatusLine` cycles `Saving…` → `Saved`

**Context:** `999999` represents unlimited (max allowed by the input's `max` attribute).

### ACT-BASIC-006 — Unlimited outbound queue (999999) [P2]

**Preconditions**
- Activity selected; Basic Settings tab open; Advanced Settings expanded

**Steps**
1. In `Outbound Queue Capacity`, clear and type `999999`
2. Tab out

**Expected**
- Field accepts `999999`
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-BASIC-007 — Minimum capacity value (1) [P3]

**Preconditions**
- Activity selected; Basic Settings tab open

**Steps**
1. Click `Activity Capacity`
2. Clear it, type `1`
3. Tab out

**Expected**
- Field shows `1`
- `SaveStatusLine` cycles `Saving…` → `Saved`

**Context:** Input has `min="1"`.

### ACT-BASIC-008 — Zero queue capacity [P3]

**Preconditions**
- Activity selected; Basic Settings tab open; Advanced Settings expanded

**Steps**
1. In `Inbound Queue Capacity`, clear and type `0`
2. Tab out

**Expected**
- Field accepts `0`
- `SaveStatusLine` cycles `Saving…` → `Saved`

**Context:** Input has `min="0"` on the queue fields.

### ACT-BASIC-009 — Negative capacity coerced [P3]

**Preconditions**
- Activity selected; Basic Settings tab open

**Steps**
1. Click `Activity Capacity`
2. Clear it, type `-1`
3. Tab out

**Expected**
- Either the input's `min="1"` constraint blocks `-1` immediately, or the editor coerces the parsed value to `1` (the `parseInt(value) || 1` fallback). Either way, the stored capacity is ≥ 1.
- No persistent invalid state in `SaveStatusLine`

**Context:** Capacity is normalized via `parseInt(value) || 1` in the change handler.

### ACT-BASIC-010 — Empty name blocks save [P3]

**Preconditions**
- Activity selected; Basic Settings tab open
- Name field has some text

**Steps**
1. Click `Activity Name`
2. Select all, delete
3. Tab out

**Expected**
- Red text `Name is required` appears under the name field
- `SaveStatusLine` shows `Fix errors to save` (yellow triangle)
- No save fires; refreshing or re-selecting the activity reverts the displayed name to the last saved value

### ACT-BASIC-011 — Duplicate activity name blocks save [P2]

**Preconditions**
- Model has at least 2 Activities (e.g. `Activity A`, `Activity B`)
- You're editing the activity with the different name

**Steps**
1. Click `Activity Name`
2. Clear, type the exact name of the other activity (e.g. `Activity A`)
3. Tab out

**Expected**
- Red text `An Activity named "Activity A" already exists` appears under the name field
- `SaveStatusLine` shows `Fix errors to save`
- Change the name back to something unique → red text disappears, `SaveStatusLine` cycles to `Saved`

**Context:** Validation is per the `isNameUniqueInReferenceData` helper.

### ACT-BASIC-012 — Expand and collapse Advanced Settings [P2]

**Preconditions**
- Activity selected; Basic Settings tab open

**Steps**
1. Locate the `Advanced Settings` row
2. If collapsed (chevron points right), click to expand
3. Click again to collapse

**Expected**
- Chevron rotates (down when open, right when closed)
- Expanded view reveals `Inbound Queue Capacity` and `Outbound Queue Capacity` inputs
- Default state is **collapsed** on a freshly selected activity

### ACT-BASIC-013 — Queue fields are inside Advanced Settings [P2]

**Preconditions**
- Activity selected; Basic Settings tab open
- Advanced Settings collapsed

**Steps**
1. Inspect the main Basic Settings area without expanding Advanced Settings
2. Expand Advanced Settings
3. Inspect again

**Expected**
- Collapsed: only `Activity Name`, `Activity Capacity`, and the `Advanced Settings` row are visible
- Expanded: `Inbound Queue Capacity` and `Outbound Queue Capacity` appear, indented under the row

---

## Actions

### ACT-ACT-001 — View empty Actions list [P2]

**Preconditions**
- Activity with no actions defined (e.g. a freshly added Activity that has been wiped of its default action)

**Steps**
1. Open the Actions tab

**Expected**
- The list area is empty
- The blue `+ Add` button is visible in the top-right of the section header

### ACT-ACT-002 — Add a new action [P1]

**Preconditions**
- Activity selected; Actions tab open

**Steps**
1. Click `+ Add`

**Expected**
- A new action card appears at the bottom of the list, **auto-expanded**
- Default type is `Delay with Resource` with a 1-minute constant duration
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-ACT-003 — Delete an action [P1]

**Preconditions**
- Activity has at least one action; Actions tab open

**Steps**
1. Expand any action card
2. Click its delete (trash) control

**Expected**
- The action is removed from the list
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-ACT-004 — Reorder actions by drag-and-drop [P2]

**Preconditions**
- Activity has at least 2 actions; Actions tab open

**Steps**
1. Press and hold the drag handle on the second action card
2. Drag it above the first card
3. Release

**Expected**
- Order is swapped in the list
- `SaveStatusLine` cycles `Saving…` → `Saved`
- Re-selecting the activity preserves the new order

**Context:** Drag activation distance is 8 px — small accidental clicks won't trigger drag.

### ACT-ACT-005 — Change action type and configure [P2]

**Preconditions**
- Activity has at least one action; Actions tab open

**Steps**
1. Expand an action card
2. Change its type to `Split`, `Create`, `Join`, or `Branch` via the type selector

**Expected**
- The action card shows type-specific configuration fields (e.g. destination dropdown for Split)
- `SaveStatusLine` cycles `Saving…` → `Saved`

**Context:** Per-distribution input behavior is covered by `004_Duration_Editor_Tests`.

### ACT-ACT-006 — Split action missing destination blocks save [P1]

**Preconditions**
- Activity selected; Actions tab open

**Steps**
1. Add a new action, change its type to `Split`
2. Leave the destination unset

**Expected**
- A red banner appears above the status line: `Fix to save: Split action requires a destination activity.`
- `SaveStatusLine` shows `Fix errors to save`
- Pick any destination → banner disappears, status line cycles to `Saved`

### ACT-ACT-007 — Create / Join / Branch validation banners [P2]

**Preconditions**
- Activity selected; Actions tab open

**Steps**
1. Add a `Create` action, leave entity template **and** destination unset → expect banner `Fix to save: Create action requires entity template and destination.`
2. Add a `Join` action, leave match state **and** destination unset → expect banner `Fix to save: Join action requires match state and destination.`
3. Add a `Branch` action, leave the condition unset → expect banner `Fix to save: Branch action requires a condition to be set.`

**Expected**
- Each banner appears as soon as the offending action exists
- Multiple offending actions of the same type show a count in parentheses (e.g. `(2 actions need destinations)`)
- `SaveStatusLine` shows `Fix errors to save` while any banner is visible

**Context:** Validators are in `ActivityEditor.tsx` (Split/Create/Join/Branch checks).

---

## Financial Settings

### ACT-FIN-001 — Enable financial tracking [P1]

**Preconditions**
- Activity selected; Financial Settings tab open
- `Enable Financial Tracking` checkbox is unchecked

**Steps**
1. Click the `Enable Financial Tracking` checkbox

**Expected**
- Checkbox becomes checked
- Cost fields appear below: `Fixed Cost`, `Cost Per Entity`, `Cost/Hr Active`, `Cost/Hr Idle`, then a divider, then `Resource Cost Multiplier`
- `SaveStatusLine` cycles `Saving…` → `Saved` (checkbox change saves immediately, no blur needed)

### ACT-FIN-002 — Disable financial tracking hides cost fields [P1]

**Preconditions**
- Activity with financial tracking ENABLED

**Steps**
1. Click `Enable Financial Tracking` to uncheck it

**Expected**
- All cost fields disappear from the panel; only the checkbox row remains
- `SaveStatusLine` cycles `Saving…` → `Saved` immediately

**Context:** Cost values are retained in storage even when the checkbox is unchecked (re-enabling restores them); fields just stop rendering.

### ACT-FIN-003 — Edit Fixed Cost [P1]

**Preconditions**
- Activity with financial tracking enabled; Financial tab open

**Steps**
1. Click `Fixed Cost`
2. Clear, type `100`
3. Tab out

**Expected**
- Field shows `100`
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-FIN-004 — Edit Cost Per Entity [P1]

**Preconditions**
- Activity with financial tracking enabled

**Steps**
1. Click `Cost Per Entity`
2. Clear, type `10`
3. Tab out

**Expected**
- Field shows `10`; `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-FIN-005 — Edit Cost/Hr Active [P2]

**Preconditions**
- Activity with financial tracking enabled

**Steps**
1. Click `Cost/Hr Active`
2. Clear, type `25`
3. Tab out

**Expected**
- Field shows `25`; `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-FIN-006 — Edit Cost/Hr Idle [P2]

**Preconditions**
- Activity with financial tracking enabled

**Steps**
1. Click `Cost/Hr Idle`
2. Clear, type `5`
3. Tab out

**Expected**
- Field shows `5`; `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-FIN-007 — Edit Resource Cost Multiplier [P2]

**Preconditions**
- Activity with financial tracking enabled

**Steps**
1. Click `Resource Cost Multiplier`
2. Clear, type `1.5`
3. Tab out

**Expected**
- Field shows `1.5`; decimal value accepted
- `SaveStatusLine` cycles `Saving…` → `Saved`

**Context:** Default value is `1.0`.

### ACT-FIN-008 — Zero cost values accepted [P3]

**Preconditions**
- Activity with financial tracking enabled

**Steps**
1. Set every cost field (Fixed, Per Entity, Hr Active, Hr Idle) to `0`, tabbing out of each

**Expected**
- All fields accept `0`
- `SaveStatusLine` settles on `Saved` after each edit

### ACT-FIN-009 — Decimal cost values accepted [P3]

**Preconditions**
- Activity with financial tracking enabled

**Steps**
1. In `Fixed Cost`, type `10.50`, tab out
2. In `Cost Per Entity`, type `5.99`, tab out
3. In `Cost/Hr Idle`, type `0.75`, tab out

**Expected**
- Each field stores and displays the decimal value
- `SaveStatusLine` cycles `Saving…` → `Saved` for each

**Context:** Input `step="0.01"`.

### ACT-FIN-010 — Negative cost values are clamped [P3]

**Preconditions**
- Activity with financial tracking enabled

**Steps**
1. In `Fixed Cost`, clear and type `-10`
2. Tab out

**Expected**
- Either the input's `min="0"` constraint blocks the negative value, or the editor coerces via `parseFloat(value) || 0`. Final stored value is `0` (or the field rejects the input).
- `SaveStatusLine` settles on `Saved` (no validation banner — negatives are silently coerced, not flagged)

---

## Failure Settings

### ACT-FAIL-001 — Enable failure simulation [P1]

**Preconditions**
- Activity selected; Failure Settings tab open
- `Enable Failure Simulation` checkbox is unchecked

**Steps**
1. Click `Enable Failure Simulation`

**Expected**
- Checkbox becomes checked
- Fields appear: `MTBF Duration` (defaults to 8 hours, constant), `MTTR Duration` (defaults to 30 minutes, constant), `Failure Clock Mode` dropdown (defaults to `Wall Clock — runs continuously`), `Repair Resource Requirement` dropdown (defaults to `None (no resource needed)`)
- `SaveStatusLine` cycles `Saving…` → `Saved` immediately

### ACT-FAIL-002 — Disable failure simulation hides fields [P1]

**Preconditions**
- Activity with failure simulation ENABLED

**Steps**
1. Click `Enable Failure Simulation` to uncheck

**Expected**
- All MTBF/MTTR/clock-mode/repair fields disappear; only the checkbox row remains
- `SaveStatusLine` cycles `Saving…` → `Saved` immediately

### ACT-FAIL-003 — Edit MTBF duration [P1]

**Preconditions**
- Failure simulation enabled

**Steps**
1. In the `MTBF Duration` editor, change the period unit (e.g. from Hours to Minutes) or edit the distribution value
2. Click somewhere else to blur

**Expected**
- `SaveStatusLine` cycles `Saving…` → `Saved`
- Re-selecting the activity preserves the new value

**Context:** Distribution input mechanics are covered by `004_Duration_Editor_Tests`.

### ACT-FAIL-004 — Edit MTTR duration [P1]

**Preconditions**
- Failure simulation enabled

**Steps**
1. In the `MTTR Duration` editor, edit the value
2. Blur

**Expected**
- `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-FAIL-005 — Toggle Failure Clock Mode [P2]

**Preconditions**
- Failure simulation enabled

**Steps**
1. Open the `Failure Clock Mode` dropdown
2. Pick `Active Time — runs only while processing`

**Expected**
- Dropdown shows the new selection
- `SaveStatusLine` cycles `Saving…` → `Saved` immediately (no blur needed — selects save on change)

**Context:** Only two options: `Wall Clock — runs continuously` and `Active Time — runs only while processing`.

### ACT-FAIL-006 — Pick a Repair Resource Requirement [P2]

**Preconditions**
- Failure simulation enabled
- Model has at least one Resource Requirement defined

**Steps**
1. Open the `Repair Resource Requirement` dropdown
2. Pick a non-default option (anything other than `None (no resource needed)`)

**Expected**
- Dropdown shows the selection
- An `Edit` button appears next to the dropdown (alongside the existing `+` button)
- A small preview card appears below the dropdown showing the requirement name and clause count
- `SaveStatusLine` cycles `Saving…` → `Saved` immediately

**Context:** Selecting `None` removes the Edit button and the preview card.

---

## Routing Configuration

### ACT-ROUTE-001 — View Routing Configuration tab [P1]

**Preconditions**
- Activity selected; Routing Configuration tab open

**Steps**
1. Inspect the tab content

**Expected**
- A `Connect Type` dropdown is at the top with `Probability` selected by default on new activities
- A list of outgoing connectors appears below (or an empty-state message)

**Context:** Default `connectType` is `Probability`.

### ACT-ROUTE-002 — Change routing type to Probability [P1]

**Preconditions**
- Activity selected with at least one outgoing connector; Routing tab open

**Steps**
1. Open the `Connect Type` dropdown
2. Select `Probability`

**Expected**
- Each outgoing connector exposes a probability field
- `SaveStatusLine` cycles `Saving…` → `Saved` immediately

**Context:** Connector weights are normalized to probabilities automatically; they don't need to sum to a specific number.

### ACT-ROUTE-003 — Change routing type to Conditional [P1]

**Preconditions**
- Activity with at least one outgoing connector; Routing tab open

**Steps**
1. Open the `Connect Type` dropdown
2. Select `Conditional`

**Expected**
- Each outgoing connector exposes a condition field
- `SaveStatusLine` cycles `Saving…` → `Saved` immediately

### ACT-ROUTE-004 — Change routing type to EntityType [P2]

**Preconditions**
- Activity with at least one outgoing connector; Routing tab open

**Steps**
1. Open the `Connect Type` dropdown
2. Select `EntityType`

**Expected**
- Each outgoing connector exposes an entity-type-mapping control
- `SaveStatusLine` cycles `Saving…` → `Saved` immediately

### ACT-ROUTE-005 — View list of outgoing connectors [P2]

**Preconditions**
- Activity with at least 2 outgoing connectors; Routing tab open

**Steps**
1. Inspect the connector list

**Expected**
- Each outgoing connector is listed with its destination activity name and a routing-type-specific control
- List length matches the number of outgoing arrows in the diagram

### ACT-ROUTE-006 — Activity with no outgoing connectors [P3]

**Preconditions**
- Activity with no outgoing connectors (terminal activity)

**Steps**
1. Open the Routing tab

**Expected**
- The `Connect Type` dropdown is still visible
- The connector list is empty (or shows an empty-state message)
- No error; this is valid for terminal activities

---

## Form Sync

### ACT-SYNC-001 — Switch to a different activity loads new data [P1]

**Preconditions**
- Model has at least 2 Activities with distinct names; Activity A is currently in the panel

**Steps**
1. Click Activity B in the diagram
2. Inspect the panel

**Expected**
- Panel reloads with Activity B's values across all tabs
- `SaveStatusLine` resets to `Saved` for the new element

### ACT-SYNC-002 — Switching activity flushes pending edits [P1]

**Preconditions**
- Model has at least 2 Activities
- Activity A selected; Basic Settings open

**Steps**
1. Click `Activity Name`, change it to `MODIFIED`
2. **Without blurring**, click Activity B in the diagram
3. Click Activity A again

**Expected**
- The mid-edit change to Activity A is **flushed** when you switch away (the auto-save hook detects the element switch and dispatches a save with the pending draft)
- When you return to Activity A, the name shows `MODIFIED` (the edit was saved, not discarded)

**Context:** **This is the opposite of the legacy Save/Cancel behavior.** Under debounce auto-save, element-switch acts as an implicit blur. If there's an in-flight save at switch time, the pending draft is captured and drained after the in-flight save completes (silently — no status surfaced in the new element's panel).

### ACT-SYNC-003 — External update syncs to form [P3]

**Preconditions**
- Same Quodsi document open in two browser windows
- Activity A selected in both

**Steps**
1. In Window 2: change Activity A's name to `Changed by Window 2`, blur
2. In Window 1: wait, then click off and back onto Activity A (or wait for collaborative sync)

**Expected**
- Window 1 eventually shows the new name
- Sync may be near-immediate or require re-selection — record what you observe in **Notes**

---

## Edge Cases

### ACT-EDGE-001 — Very long activity name (500+ characters) [P3]

**Preconditions**
- Activity selected; Basic Settings open
- Have a 500+ character string ready (e.g. `abcdefghij` × 50)

**Steps**
1. Paste the long string into `Activity Name`
2. Tab out

**Expected**
- Field accepts the long value without crashing or breaking panel layout (it may scroll horizontally inside the input)
- `SaveStatusLine` cycles `Saving…` → `Saved` (assuming the name is still unique)
- No max-length truncation in the UI; document any limits observed in **Notes**

### ACT-EDGE-002 — Many actions (20+) on one activity [P3]

**Preconditions**
- Activity selected; Actions tab open

**Steps**
1. Click `+ Add` 20+ times
2. Scroll the list, expand/collapse cards, drag-reorder

**Expected**
- List remains usable; the panel scrolls (the Actions area has a fixed `max-h-[400px]` with `overflow-y-auto`)
- Expand/collapse and drag-reorder still work
- Each `+ Add` causes a debounced save; `SaveStatusLine` settles on `Saved` after the last addition

### ACT-EDGE-003 — Large queue numbers (999999) [P3]

**Preconditions**
- Activity selected; Basic Settings open; Advanced Settings expanded

**Steps**
1. Set Inbound Queue Capacity to `999999`, tab out
2. Set Outbound Queue Capacity to `999999`, tab out
3. Click off the activity, then re-select

**Expected**
- Both fields persist `999999` after re-select
- `SaveStatusLine` settles on `Saved`

### ACT-EDGE-004 — Browser refresh preserves auto-saved edits [P3]

**Preconditions**
- Activity selected; Basic Settings open

**Steps**
1. Edit `Activity Name` to a new value
2. Tab out, wait for `SaveStatusLine` to show `Saved`
3. Press F5 to refresh the browser
4. Re-select the same Activity

**Expected**
- The new name is preserved — auto-save flushed on blur before refresh
- Variant: if you refresh during the ~500 ms debounce window without blurring, the pending edit may be lost. Document observed behavior in **Notes**.

**Context:** **This is the opposite of the legacy expectation.** With auto-save, anything that has been flushed (blurred or 500 ms elapsed) is durable across refresh. There's no longer an "unsaved changes" warning because there's no manual save step.

### ACT-EDGE-005 — Corrupt activity data handling [P3]

**Preconditions**
- Way to inject corrupt activity data (may need developer help — e.g. directly mutate shape data)

**Steps**
1. Select the corrupted Activity in the diagram

**Expected**
- The editor shows the guard message `Invalid activity data — Activity data missing required properties` (red box) and nothing else
- The extension does not crash; other activities remain selectable

**Context:** Guard is at the top of the editor's render path, triggered when `localActivityDraft.id` is empty.

---

## Model Validation

### ACT-MVAL-001 — Isolated activity shows ERROR [P1]

**Preconditions**
- Create or find an Activity with no incoming and no outgoing connectors

**Steps**
1. Open the model's Validation panel
2. Look for entries referencing the isolated activity

**Expected**
- A model-level validation **error** appears for the isolated activity (red indicator), with text indicating it has no connections

**Context:** This is model-level validation reported through the Validation panel, distinct from the in-editor `Fix to save:` banners.

### ACT-MVAL-002 — No incoming connections shows WARNING [P1]

**Preconditions**
- Activity with outgoing connectors but no incoming connector

**Steps**
1. Open the Validation panel

**Expected**
- A **warning** appears for the activity (yellow indicator), indicating it has no incoming connections

### ACT-MVAL-003 — Empty actions list shows ERROR [P1]

**Preconditions**
- Activity selected; Actions tab open
- Delete every action

**Steps**
1. After deleting all actions, open the Validation panel

**Expected**
- A model-level validation **error** appears for the activity, indicating it has no actions defined

### ACT-MVAL-004 — Empty activity name shows WARNING [P1]

**Preconditions**
- Activity selected; Basic Settings open

**Steps**
1. Try clearing the name field; the **editor** blocks save and shows red `Name is required`
2. If you can force an empty name into the model (e.g. via import), check the Validation panel

**Expected**
- Editor blocks the empty value at write time (Notes-worthy: this means model-level Validation panel may never see an empty name in normal use)
- If empty name is somehow present (import path), Validation panel shows a **warning**

### ACT-MVAL-005 — Invalid capacity (< 1) shows ERROR [P2]

**Preconditions**
- Activity selected; Basic Settings open

**Steps**
1. Set `Activity Capacity` to `0` or `-1`
2. Check the Validation panel

**Expected**
- Editor coerces input via `parseInt(value) || 1` so the stored capacity is ≥ 1 in normal use
- If a sub-1 capacity reaches the model (import or coercion bypass), Validation panel shows an **error**

### ACT-MVAL-006 — Very large queue capacity shows WARNING [P2]

**Preconditions**
- Activity selected; Basic Settings open; Advanced Settings expanded

**Steps**
1. Set `Inbound Queue Capacity` to a number larger than `999999` (the input's `max`); e.g. paste `99999999`
2. Check the Validation panel

**Expected**
- Input's `max="999999"` may clamp the value at write time
- If a larger value reaches the model, Validation panel shows a **warning** (or accepts silently — document what you observe)

### ACT-MVAL-007 — Negative queue capacity shows ERROR [P2]

**Preconditions**
- Activity selected; Basic Settings open; Advanced Settings expanded

**Steps**
1. Try `-1` in `Inbound Queue Capacity`
2. Check the Validation panel

**Expected**
- Editor coerces via `parseInt(value) || 0` so the stored value is ≥ 0 in normal use
- If a negative reaches the model (import path), Validation panel shows an **error**

### ACT-MVAL-008 — Insufficient inbound queue WARNING [P2]

**Preconditions**
- Generator producing many entities per time unit
- Downstream Activity with a small inbound queue (e.g. `5`) and slow processing

**Steps**
1. Build the model
2. Open the Validation panel

**Expected**
- A **warning** may appear about a potential bottleneck. If no warning is reported, document the observation in **Notes** — this check may not be wired up yet.

### ACT-MVAL-009 — Circular dependency WARNING [P2]

**Preconditions**
- Two Activities A and B connected A→B→A

**Steps**
1. Open the Validation panel

**Expected**
- A **warning** appears about the cycle. If no warning is reported, document the observation in **Notes**.

**Context:** Some simulations use loops intentionally; expectation is warning, not error.

### ACT-MVAL-010 — Fixing a validation error clears it [P1]

**Preconditions**
- Activity with a known model-level validation error (e.g. no actions)

**Steps**
1. Fix the underlying issue (e.g. add an action)
2. Wait for auto-save to complete (`SaveStatusLine` shows `Saved`)
3. Re-check the Validation panel

**Expected**
- The error entry disappears from the Validation panel as soon as the model state is corrected

### ACT-MVAL-011 — Multiple validation issues shown for same activity [P2]

**Preconditions**
- Create an Activity with multiple problems: isolated, no actions, no name

**Steps**
1. Open the Validation panel

**Expected**
- All distinct issues are listed (not just the first one)

### ACT-MVAL-012 — Clicking validation error navigates to element [P2]

**Preconditions**
- Validation panel shows at least one error for an Activity you're not currently editing

**Steps**
1. Click the error entry

**Expected**
- The diagram selects the offending Activity and the Activity Editor opens to it

---

## Auto-Save Behavior (Cross-Cutting)

These tests verify the auto-save mechanism itself. Other sheets assert that "`SaveStatusLine` cycles `Saving…` → `Saved`"; these tests verify that statement is actually accurate.

### ACT-AUTOSAVE-001 — Text field uses 500 ms debounce [P1]

**Preconditions**
- Activity selected; Basic Settings open

**Steps**
1. Click `Activity Name`
2. Type 3 characters quickly, **do not** tab out
3. Wait ~500 ms

**Expected**
- During typing: `SaveStatusLine` does not show `Saved` (status remains `Saved` from idle or transitions through `Saving…`)
- ~500 ms after the last keystroke: `SaveStatusLine` shows `Saving…` briefly, then `Saved`

**Context:** Debounce is `debounceMs = 500` in `useAutoSave`.

### ACT-AUTOSAVE-002 — Blur on text field triggers immediate save [P1]

**Preconditions**
- Activity selected; Basic Settings open

**Steps**
1. Click `Activity Name`
2. Type 1 character
3. Immediately Tab out (within < 500 ms)

**Expected**
- `SaveStatusLine` shows `Saving…` immediately (the blur calls `saveNow()` which bypasses the debounce timer)
- Then settles on `Saved`

### ACT-AUTOSAVE-003 — Checkbox / select changes save immediately [P1]

**Preconditions**
- Activity selected; Financial Settings or Failure Settings or Routing tab open

**Steps**
1. Toggle a checkbox (e.g. `Enable Financial Tracking`) or change a select (e.g. `Connect Type`)
2. Do **not** click elsewhere

**Expected**
- `SaveStatusLine` shows `Saving…` immediately on toggle (no debounce, no blur required)
- Then settles on `Saved`

**Context:** Driven by `useFlushOnChange` watching the relevant values.

### ACT-AUTOSAVE-004 — Invalid edit blocks save, fixing it resumes [P1]

**Preconditions**
- Activity selected; Basic Settings open

**Steps**
1. Clear `Activity Name` (triggers `Name is required`)
2. Observe `SaveStatusLine`
3. Type any unique name
4. Observe again

**Expected**
- Step 2: `SaveStatusLine` shows `Fix errors to save` (yellow triangle); no save fires while the name is empty
- Step 4: After ~500 ms (or on blur), `SaveStatusLine` cycles `Saving…` → `Saved`

### ACT-AUTOSAVE-005 — Element switch flushes pending edit [P1]

**Preconditions**
- Two Activities A and B in the model
- Activity A selected; Basic Settings open

**Steps**
1. Click `Activity Capacity`, change `1` to `7`
2. Without blurring, immediately click Activity B in the diagram
3. Click Activity A again

**Expected**
- Activity A's capacity is `7` after returning — the element-switch effect detected the change and dispatched a save with the pending draft (drained silently if a save was already in flight)

**Context:** This is the auto-save hook's element-switch flush behavior; matches `ACT-SYNC-002`.
