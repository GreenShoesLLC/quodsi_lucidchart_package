# 002 — Connector (Routing Configuration) Tests

Suite of manual / agent-driven QA tests for the **Connector / Routing Configuration** editor in the Quodsi LucidChart extension.

## How to read this file

Each test is a small block: **ID — Name [Priority]**, then **Preconditions**, **Steps**, **Expected**, and (sometimes) **Context** — author notes that explain a subtle assertion or point at the source-of-truth code. Tests can be run by a human or by an AI agent walking the file top-to-bottom.

## How to record a run

Don't edit this file. For each run, create a new file under `_qa/runs/` and **log only failures** — silence means pass. See `_qa/runs/README.md` for the run-file template.

## What a "Connector editor" actually is

Connectors in Quodsi are LucidChart **lines** (not blocks). There is **no standalone connector editor with its own fields**. Selecting a connector opens the `ConnectorsEditor`, which renders the **source Activity's** routing configuration (Routing Type + per-connector controls) and **highlights the clicked connector** in the list. The same UI is reachable from inside the Activity Editor's **Routing Configuration** tab (last tab) — when reached that way, the blue context header is suppressed and no specific connector is highlighted.

This means:
- **The relevant editor surface IS the Activity routing config.** Picking a connector in the diagram is just a convenient way to open it focused on one row.
- **Per-connector data lives on the connector** (weight, stateCondition, entityTemplateUniqueId). The Routing Type (`connectType`) lives on the source Activity.

There is meaningful overlap with `005_Activity_Tests` § Routing Configuration (ACT-ROUTE-001…006). Those tests cover routing from the Activity-side entry point; this file covers the **connector-selection entry point**, the **context header**, **highlight behavior**, and the **per-connector controls** (weights / conditions / entity templates) that the Activity tests intentionally don't drill into.

## Auto-save model (read once)

The Connector / Routing Configuration editor has **no Save or Cancel button**. Every change is auto-saved:

- **Routing Type dropdown** (`connectType` on the source Activity): saved **immediately** on change via `useFlushOnChange` (selects have no useful blur). Bypasses the 500 ms debounce.
- **Probability weight inputs** (per connector): **commit-on-blur**. Keystrokes update local state only; on blur, the value is parsed (`parseFloat`) and — if a positive number — dispatched as a connector save. Invalid input (NaN, ≤ 0) is reverted to the last valid value on blur. No 500 ms debounce.
- **State Condition** controls (state name, comparator, value): saved **immediately** on every change.
- **Entity Template** select (per connector): saved **immediately** on change.

A status line at the bottom of the panel (`SaveStatusLine`) shows what's happening, using these exact strings:

| Status | Text | When it appears |
|---|---|---|
| saving | `Saving…` (spinner) | Save is in flight, or just kicked off |
| invalid | `Fix errors to save` (yellow triangle) | Local edits exist but validation fails |
| error | `Save failed — keep typing to retry` (red triangle) | Last save threw; next edit retries |
| saved | `Saved` (check) | Idle; no pending edits, last save (if any) succeeded |

**Note on the standalone `ConnectorsEditor`:** the SaveStatusLine here is wired to the activity-level `connectType` save only (`isValid: true`, no validation surface). Per-connector edits inside `RoutingConfigurationPanel` are dispatched directly through the messaging layer and may not visibly cycle the status line on their own; verify the change by re-selecting the connector and looking at the value.

To undo a saved change, use LucidChart's native **Ctrl+Z**.

---

## Selection Context

### CON-SEL-001 — Select connector shows routing editor [P1]

**Preconditions**
- LucidChart document open with a Quodsi model containing at least one Activity
- A connector (line) exists between two shapes
- Nothing currently selected on the canvas

**Steps**
1. Click directly on the connector line in the diagram (not on a shape)

**Expected**
- The line becomes visually selected (highlighted)
- The right panel shows the routing configuration UI for the **source Activity** of the connector
- A `Routing Type` dropdown is visible near the top
- The list of outgoing connectors for the source Activity is visible below the dropdown

### CON-SEL-002 — Context header shows source activity name [P1]

**Preconditions**
- A connector is selected (its source Activity has a non-empty name, e.g. `Process Order`)

**Steps**
1. Look at the top of the panel for the blue info-banner

**Expected**
- A blue header reads `Routing Configuration for: <source activity name>` (e.g. `Routing Configuration for: Process Order`)
- A subtitle below it reads `Selected connector is highlighted below`

**Context:** This banner appears only when the editor is opened via connector selection (`selectedConnectorId` is set). It is suppressed when the same UI is reached from the Activity Editor's Routing tab.

### CON-SEL-003 — Selected connector is highlighted in list [P1]

**Preconditions**
- The source Activity has 2+ outgoing connectors
- One of those connectors has just been clicked

**Steps**
1. In the connector list, locate the row corresponding to the clicked connector

**Expected**
- The selected connector's card has a **blue ring** (`ring-2 ring-blue-500`) and a larger drop-shadow
- Other connector cards in the list have no ring
- If the list is long enough to scroll, the selected card has been auto-scrolled into view

### CON-SEL-004 — Connector list shows destination via connector name [P2]

**Preconditions**
- A connector goes from `Activity A` to `Activity B`; the connector has been selected

**Steps**
1. Look at the selected connector's card in the list

**Expected**
- The card header shows the **connector's name** (e.g. `New Connector`, or whatever the user/auto-naming set). It is **not** literally `To: Activity B` — current UI shows the connector's own name in the header, not the destination.
- If the connector has no name, the header shows `Unnamed Connector`

**Context:** Older versions of this test expected `To: <destination>`. The current `RoutingConfigurationPanel` headers display `connector.name || "Unnamed Connector"`. The destination is implicit (the connector is the row).

### CON-SEL-005 — Deselect connector changes panel [P2]

**Preconditions**
- A connector is selected and its routing config is visible

**Steps**
1. Click on empty canvas (not on any shape or line)

**Expected**
- The connector deselects (no longer highlighted in the diagram)
- The right panel either closes, shows a no-selection state, or switches to a different editor — exact behavior depends on the host extension's panel routing. Record what you observe in **Notes** if it varies.

---

## Routing Type

### CON-ROUTE-001 — View routing type dropdown [P1]

**Preconditions**
- A connector is selected; routing config panel visible
- Source activity has 2+ outgoing connectors

**Steps**
1. Locate the `Routing Type` label near the top of the panel
2. Read the current dropdown value

**Expected**
- A select control is visible with one of three options selected: `Probability`, `State Condition`, or `Entity`
- An info icon next to the label reveals a tooltip explaining each option on hover
- Default value on new activities is `Probability`

### CON-ROUTE-002 — Change routing type to Probability [P1]

**Preconditions**
- A connector is selected; source activity has 2+ outgoing connectors
- Current routing type is **not** `Probability`

**Steps**
1. Open the `Routing Type` dropdown
2. Select `Probability`

**Expected**
- Dropdown closes showing `Probability` selected
- The connector list re-renders with **weight** inputs on each connector card (when there are ≥ 2 connectors)
- `SaveStatusLine` cycles `Saving…` → `Saved` immediately (no blur needed — selects save on change)

### CON-ROUTE-003 — Change routing type to State Condition [P1]

**Preconditions**
- A connector is selected; source activity has 2+ outgoing connectors
- Current routing type is **not** `State Condition`

**Steps**
1. Open the `Routing Type` dropdown
2. Select `State Condition`

**Expected**
- Dropdown closes showing `State Condition` selected
- The connector list re-renders to show a state-condition editor per connector (state-name dropdown + comparator + value)
- If no entity states are defined in the model, an amber banner appears: `No Entity States Defined`
- `SaveStatusLine` cycles `Saving…` → `Saved` immediately

### CON-ROUTE-004 — Change routing type to Entity [P1]

**Preconditions**
- A connector is selected; source activity has 2+ outgoing connectors
- Current routing type is **not** `Entity`

**Steps**
1. Open the `Routing Type` dropdown
2. Select `Entity`

**Expected**
- Dropdown closes showing `Entity` selected
- The connector list re-renders to show an `Entity Template` select per connector
- If no entity templates exist in the model, an amber banner appears: `No Entity Templates Available`
- `SaveStatusLine` cycles `Saving…` → `Saved` immediately

**Context:** Internal enum value is `EntityTemplate`; the UI label is `Entity`.

### CON-ROUTE-005 — Dropdown disabled with only 1 connector [P1]

**Preconditions**
- Source Activity has exactly **one** outgoing connector
- That connector is selected

**Steps**
1. Locate the `Routing Type` dropdown
2. Attempt to click / open it

**Expected**
- The select is rendered with `disabled` and has the grayed-out treatment (`disabled:bg-gray-100 disabled:cursor-not-allowed`)
- Clicking does not open the option list
- The tooltip on the info icon mentions that with only one connector the routing type is automatically Probability

### CON-ROUTE-006 — Dropdown enabled with 2+ connectors [P2]

**Preconditions**
- Source Activity has 2+ outgoing connectors; a connector is selected

**Steps**
1. Click the `Routing Type` dropdown

**Expected**
- The dropdown is not disabled, has a pointer cursor, and opens its option list on click
- All three options are selectable

### CON-ROUTE-007 — Routing type info tooltip [P2]

**Preconditions**
- A connector is selected; routing config visible

**Steps**
1. Hover the small info icon next to the `Routing Type` label
2. Wait ~1 s for the tooltip

**Expected**
- A tooltip appears describing the three options (Probability — weighted random; State Condition — based on state values; Entity — based on template type) and noting that with a single connector routing type is automatic

### CON-ROUTE-008 — Probability mode shows weight fields [P2]

**Preconditions**
- A connector selected; source has 2+ outgoing; routing type set to `Probability`

**Steps**
1. Inspect each connector card in the list

**Expected**
- Each card shows a `Weight` numeric input on the right side
- Inputs have `min="0.1"`, `step="0.1"` and accept decimals (e.g. `0.5`, `1.5`, `3`)
- Higher weight → higher relative probability; weights are normalized automatically (don't need to sum to a fixed value)

### CON-ROUTE-009 — State Condition mode shows condition fields [P2]

**Preconditions**
- A connector selected; source has 2+ outgoing; routing type set to `State Condition`
- Model has at least one entity state defined

**Steps**
1. Inspect each connector card

**Expected**
- Each card shows a `StateConditionEditor` with: state-name dropdown, comparator (`=`, `>`, `<`, etc.), and a value input
- Once a condition is filled in, a `Condition:` summary line appears beneath it (e.g. `Condition: Priority > 5`)

### CON-ROUTE-010 — Entity mode shows entity template selection [P2]

**Preconditions**
- A connector selected; source has 2+ outgoing; routing type set to `Entity`
- Model has at least one Entity template defined

**Steps**
1. Inspect each connector card

**Expected**
- Each card shows an `Entity Template` `<select>` with a placeholder option `Select an entity template...` and one option per available template

---

## Connector List

### CON-LIST-001 — View all outgoing connectors [P1]

**Preconditions**
- Source Activity has 2+ outgoing connectors; a connector is selected

**Steps**
1. Inspect the connector list section

**Expected**
- One card per outgoing connector
- Count matches the number of outgoing arrows in the diagram for the source Activity

### CON-LIST-002 — Connector card shows its name [P1]

**Preconditions**
- A connector with a custom name (e.g. `To Checkout`) is selected; source has 2+ outgoing

**Steps**
1. Locate the row for the selected connector

**Expected**
- Card header shows the connector's `name` (or `Unnamed Connector` if blank)
- Header background tint depends on routing type: blue in Probability mode, green in State Condition mode, purple in Entity mode

### CON-LIST-003 — Edit connector weight in Probability mode [P2]

**Preconditions**
- Source has 2+ outgoing; routing type = `Probability`; a connector is selected

**Steps**
1. Click the `Weight` input on any connector
2. Clear and type `5`
3. Tab out (blur) of the field

**Expected**
- Field shows `5`
- On blur, the value is committed: an `updateElementData` for that connector is dispatched (verify by reloading or re-selecting — value persists as `5`)
- Typing alone does **not** trigger a save — commit happens on blur

**Context:** Weight input uses commit-on-blur via `handleWeightBlur` so users can type decimals like `0.75` mid-stroke without partial saves.

### CON-LIST-004 — Invalid weight reverts on blur [P2]

**Preconditions**
- Source has 2+ outgoing; routing type = `Probability`; a connector with current weight `2` is selected

**Steps**
1. Click the `Weight` input; clear it (or type `0`, `-1`, or `abc`)
2. Tab out

**Expected**
- On blur, the displayed value reverts to the last valid stored value (`2`)
- No connector update is dispatched for the invalid input
- The input's HTML `min="0.1"` may also block negative/zero input at the browser level

**Context:** `handleWeightBlur` checks `isNaN(weight) || weight <= 0` and snaps back to `conn.weight ?? 1`.

### CON-LIST-005 — Edit connector state condition [P2]

**Preconditions**
- Source has 2+ outgoing; routing type = `State Condition`; at least one entity state defined; a connector is selected

**Steps**
1. In a connector card, pick a state from the state dropdown
2. Pick a comparator
3. Type a value (e.g. `5`)

**Expected**
- After each change, the connector save is dispatched immediately (no blur required)
- A `Condition:` summary line appears once both the state name and value are non-empty (e.g. `Condition: Priority > 5`)
- Re-selecting the connector preserves the condition

### CON-LIST-006 — Select entity template for connector [P2]

**Preconditions**
- Source has 2+ outgoing; routing type = `Entity`; at least one entity template defined; a connector is selected

**Steps**
1. Open the `Entity Template` select on a connector card
2. Pick a template

**Expected**
- The select shows the chosen template
- A connector save is dispatched immediately
- Re-selecting the connector preserves the assignment

### CON-LIST-007 — Multiple connectors display correctly [P2]

**Preconditions**
- Source has 3+ outgoing connectors; a connector is selected

**Steps**
1. Scroll the connector list, expanding the panel height if needed
2. Verify each connector renders its own controls

**Expected**
- Every outgoing connector has its own card
- The selected connector's card has the blue ring; others do not
- The panel remains responsive (no jank, no console errors)

### CON-LIST-008 — Empty connector list message [P3]

**Preconditions**
- An Activity has **zero** outgoing connectors

**Steps**
1. Open the Activity's Routing Configuration tab (you can't enter via connector selection because there's no connector)

**Expected**
- The connector list area shows a blue info card: `No Outgoing Connectors` with a hint to connect this activity to others
- The Routing Type dropdown is still visible above

### CON-LIST-009 — Single connector — weight field hidden [P3]

**Preconditions**
- Source Activity has **exactly one** outgoing connector; routing type = `Probability`; the connector is selected

**Steps**
1. Inspect the single connector's card

**Expected**
- The card header (connector name) is visible
- **No** weight input is rendered (the weight UI is gated on `localConnectors.length > 1`)
- The Routing Type dropdown above is disabled (see CON-ROUTE-005)

---

## Form Sync

### CON-SYNC-001 — Switching connectors loads new data [P1]

**Preconditions**
- Two Activities A and B each with their own outgoing connectors and **different** routing types (e.g. A = `Probability`, B = `State Condition`)

**Steps**
1. Click a connector from Activity A; note the routing type and connector list
2. Click a connector from Activity B
3. Inspect the panel

**Expected**
- The blue context header updates to `Routing Configuration for: <B's name>`
- The Routing Type dropdown reflects B's value
- The connector list now shows B's outgoing connectors with the newly-selected one highlighted

### CON-SYNC-002 — Switching connectors flushes pending changes [P1]

**Preconditions**
- Source has 2+ outgoing; routing type = `Probability`; a connector is selected
- You're about to make a weight edit

**Steps**
1. Click a `Weight` input; clear and type `7`
2. **Without blurring**, click a different connector in the diagram
3. Click back to the original connector

**Expected**
- **Weight edits**: because the weight commit happens on blur, clicking another element triggers blur → the `7` is committed. After returning, the original connector's weight is `7`.
- **Routing Type edits**: a routing-type change saves immediately on selection (no pending state), so switching never has a pending connectType edit to flush.

**Context:** This is the opposite of the legacy Save/Cancel expectation ("unsaved changes discarded on switch"). Under auto-save, blur-on-switch flushes the pending weight; selects save immediately on change.

### CON-SYNC-003 — External update syncs to form [P3]

**Preconditions**
- Same Quodsi document open in two browser windows
- A connector from the same Activity is selected in both

**Steps**
1. In Window 2: change the routing type to a different value
2. In Window 1: wait, then re-select the same connector (or wait for collaborative sync)

**Expected**
- Window 1 eventually shows the new routing type
- Sync may be near-immediate or require re-selection — record what you observe in **Notes**

---

## Edge Cases

### CON-EDGE-001 — Invalid activity data shows guard message [P3]

**Preconditions**
- Way to inject a connector whose source-Activity data is missing required properties (may need developer help)

**Steps**
1. Select the connector with the broken source

**Expected**
- The editor shows a red guard box: `Invalid routing configuration — Activity data missing`
- No further controls render; no JavaScript errors in console
- Other elements remain selectable

**Context:** Guard is in `ConnectorsEditor` after the hook list — it triggers when `!activity || !activity.id`.

### CON-EDGE-002 — Connector with no source activity [P3]

**Preconditions**
- An "orphaned" connector exists (source Activity was deleted but the connector wasn't)

**Steps**
1. Click the orphaned connector

**Expected**
- Either the panel shows the invalid-data guard message (CON-EDGE-001), or the host extension skips opening the routing editor entirely
- No crash, no console errors
- Other elements still selectable

### CON-EDGE-003 — Browser refresh preserves auto-saved edits [P3]

**Preconditions**
- A connector is selected; routing config visible

**Steps**
1. Change the routing type to a new value (saves immediately)
2. Wait for `SaveStatusLine` to show `Saved`
3. Press F5 to refresh
4. Re-select the same connector

**Expected**
- The new routing type is preserved — auto-save flushed before refresh
- **Variant:** if you refresh during a weight edit (after typing, before blur), the unblurred value may be lost. Document observed behavior in **Notes**.

**Context:** This is the opposite of the legacy expectation. With auto-save, anything saved (immediately for selects/conditions, on blur for weights) is durable across refresh.

### CON-EDGE-004 — Delete connector while editing it [P3]

**Preconditions**
- A connector is selected; routing panel visible

**Steps**
1. Press `Delete` on the keyboard (or right-click → Delete) to remove the connector

**Expected**
- The connector is removed from the diagram
- The panel either closes, shows a no-selection state, or switches to a different editor — exact host behavior may vary
- No crash, no console errors; other elements remain selectable

### CON-EDGE-005 — Delete source activity while editing connector [P3]

**Preconditions**
- A connector is selected with a known source Activity

**Steps**
1. Click the source Activity in the diagram
2. Press `Delete`

**Expected**
- The source Activity is removed; the connector may be cascade-deleted by Lucid, or remain as an orphan
- The panel handles the change gracefully (invalid-data guard, no-selection state, or auto-switch to the new selection)
- No crash, no console errors

---

## Model Validation

These tests verify model-level Validation panel entries (red errors / yellow warnings) — distinct from the in-editor SaveStatusLine.

### CON-MVAL-001 — Invalid source ID shows error [P1]

**Preconditions**
- A connector exists from Activity A to Activity B
- Way to remove Activity A while leaving the connector with a stale `sourceId`

**Steps**
1. Delete Activity A
2. Open the Validation panel

**Expected**
- A model-level **error** appears for the connector, indicating its source is missing/invalid

### CON-MVAL-002 — Invalid target ID shows error [P1]

**Preconditions**
- A connector exists from Activity A to Activity B
- Way to remove Activity B while leaving the connector with a stale `targetId` / `destinationUniqueId`

**Steps**
1. Delete Activity B
2. Open the Validation panel

**Expected**
- A model-level **error** appears for the connector, indicating its target is missing/invalid

### CON-MVAL-003 — Self-referencing connector flagged [P1]

**Preconditions**
- An Activity with a connector that loops back to itself (source == target)

**Steps**
1. Open the Validation panel

**Expected**
- The connector is flagged as an **error** or **warning** ("self-referencing" / "isolated"). Exact severity may differ — record what you see in **Notes**.

### CON-MVAL-004 — Missing connector name flagged [P1]

**Preconditions**
- A connector exists whose `name` is blank (may require import or direct mutation)

**Steps**
1. Open the Validation panel

**Expected**
- A model-level **error** appears for the connector, indicating it has no name
- Note: connectors are created with a default name (`New Connector`), so blank names normally require an import or direct edit

### CON-MVAL-005 — Invalid weight (zero or negative) flagged [P1]

**Preconditions**
- Routing type = `Probability`; a connector with weight 0 or negative reaches the model (input's `min="0.1"` and the blur revert normally prevent this — may require import)

**Steps**
1. Open the Validation panel

**Expected**
- A model-level **error** for the offending connector, indicating weight must be > 0

### CON-MVAL-006 — Zero weight in Probability mode warning [P2]

**Preconditions**
- Same as CON-MVAL-005 but with a weight that's exactly 0

**Steps**
1. Open the Validation panel

**Expected**
- Depending on severity classification, a **warning** (not error) may appear: a zero-weight path is unreachable but may be intentional
- If severity is `error` instead, that's also acceptable — record what you see in **Notes**

### CON-MVAL-007 — Too many outgoing connectors warning [P2]

**Preconditions**
- An Activity with 20+ outgoing connectors

**Steps**
1. Open the Validation panel

**Expected**
- A **warning** appears noting an unusually high outgoing-fan-out
- If no warning is reported, document it in **Notes** — the check may not be wired up

### CON-MVAL-008 — Circular reference A → B → A [P2]

**Preconditions**
- Activities A and B connected A→B→A

**Steps**
1. Open the Validation panel

**Expected**
- A **warning** appears about the cycle. If no warning is reported, document it in **Notes**.

**Context:** Some simulations use loops intentionally; expectation is warning, not error.

### CON-MVAL-009 — Longer circular reference A → B → C → A [P2]

**Preconditions**
- Activities A, B, C connected A→B→C→A

**Steps**
1. Open the Validation panel

**Expected**
- A **warning** about a cycle of length 3. Path display may show `A → B → C → A`. If no warning is reported, document it in **Notes**.

### CON-MVAL-010 — Fixing issue clears validation entry [P1]

**Preconditions**
- A connector has a known model-level validation entry (e.g. invalid weight)

**Steps**
1. Fix the underlying issue (e.g. set a valid weight)
2. Wait for auto-save to complete (`SaveStatusLine` shows `Saved`)
3. Re-open the Validation panel

**Expected**
- The entry disappears from the Validation panel

### CON-MVAL-011 — Multiple validation issues shown for same connector [P2]

**Preconditions**
- A connector with multiple problems (e.g. blank name AND invalid weight, via import path)

**Steps**
1. Open the Validation panel

**Expected**
- All distinct issues are listed (not just the first one)

### CON-MVAL-012 — Clicking validation entry navigates to connector [P2]

**Preconditions**
- The Validation panel shows at least one entry for a connector you're not currently editing

**Steps**
1. Click the entry

**Expected**
- The diagram selects the offending connector and the routing editor opens to it

---

## Auto-Save Behavior (Cross-Cutting)

These tests verify the auto-save mechanism for the routing editor specifically. They mirror `ACT-AUTOSAVE-*` but use the connector entry point.

### CON-AUTOSAVE-001 — Routing Type select saves immediately [P1]

**Preconditions**
- Source has 2+ outgoing; a connector is selected

**Steps**
1. Change the `Routing Type` dropdown to a new value
2. Do **not** click elsewhere

**Expected**
- `SaveStatusLine` shows `Saving…` immediately on selection (no debounce, no blur required), then settles on `Saved`

**Context:** Driven by `useFlushOnChange(localActivityDraft.connectType, saveNow)` in `ConnectorsEditor`.

### CON-AUTOSAVE-002 — Weight input commits on blur, not on keystroke [P1]

**Preconditions**
- Source has 2+ outgoing; routing type = `Probability`; a connector is selected

**Steps**
1. Click a `Weight` input; type `3` then `.` then `5` (no Enter, no Tab)
2. Wait > 500 ms without blurring
3. Tab out

**Expected**
- While typing and during the > 500 ms wait: **no save fires** (no `Saving…` on the status line for the connector; the standalone `ConnectorsEditor`'s status line tracks only `connectType`, so the cleanest verification is to re-select after blur)
- On blur: the value `3.5` is committed; re-selecting the connector shows `3.5`

**Context:** Weight uses commit-on-blur explicitly so users can type multi-character decimals without partial saves. There is no 500 ms debounce on weight.

### CON-AUTOSAVE-003 — Invalid weight blurs without saving [P1]

**Preconditions**
- A connector with current weight `2` is selected; routing type = `Probability`

**Steps**
1. Click `Weight`; clear and type `-1` (or `abc`, or leave blank)
2. Tab out

**Expected**
- On blur, the input snaps back to `2` (the last valid value)
- No update is dispatched (re-selecting confirms weight is still `2`)
- Browser `min="0.1"` may also block negative numeric input at type time

### CON-AUTOSAVE-004 — State Condition edits save immediately [P2]

**Preconditions**
- Routing type = `State Condition`; at least one entity state defined; a connector is selected

**Steps**
1. Change the state name, comparator, or value on a connector's StateConditionEditor

**Expected**
- The connector save dispatches immediately on each change (no blur required)
- Re-selecting the connector preserves the change

### CON-AUTOSAVE-005 — Entity Template selection saves immediately [P2]

**Preconditions**
- Routing type = `Entity`; at least one entity template defined; a connector is selected

**Steps**
1. Pick a different template in the `Entity Template` select

**Expected**
- The connector save dispatches immediately on change
- Re-selecting the connector preserves the assignment
