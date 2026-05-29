# 001 — Resource Editor Tests

Suite of manual / agent-driven QA tests for the Resource Editor in the Quodsi LucidChart extension.

## How to read this file

Each test is a small block: **ID — Name [Priority]**, then **Preconditions**, **Steps**, **Expected**, and (sometimes) **Context** — author notes that explain a subtle assertion or point at the source-of-truth code. Tests can be run by a human or by an AI agent walking the file top-to-bottom.

## How to record a run

Don't edit this file. For each run, create a new file under `_qa/runs/` and **log only failures** — silence means pass. See `_qa/runs/README.md` for the run-file template.

## Auto-save model (read once)

The Resource Editor has **no Save or Cancel button**. Every change is auto-saved:

- **Text / number inputs** (Resource Name, Capacity, the 3 financial cost fields): change is held locally, then auto-saved ~500 ms after the last keystroke (debounced). **Tabbing out / clicking elsewhere (blur) flushes the save immediately.**
- **The `Enable Financial Tracking` checkbox**: saved **immediately** on change (no debounce, no blur required) via `useFlushOnChange`.

A status line at the very bottom of the panel (`SaveStatusLine`) shows what's happening, using these exact strings:

| Status | Text | When it appears |
|---|---|---|
| saving | `Saving…` (spinner) | Save is in flight, or just kicked off |
| invalid | `Fix errors to save` (yellow triangle) | Local edits exist but validation fails |
| error | `Save failed — keep typing to retry` (red triangle) | Last save threw; next edit retries |
| saved | `Saved` (check) | Idle; no pending edits, last save (if any) succeeded |

When validation fails, the inline red text appears under the offending field (e.g. `Name is required` or `A Resource named "Pump" already exists`) and `SaveStatusLine` shows `Fix errors to save`.

To undo a saved change, use LucidChart's native **Ctrl+Z**.

## Tab layout

The Resource Editor has **2 tabs** (no Save/Cancel buttons, no States tab — the States tab is currently commented out in code; states are managed at the Model level):

| # | Icon | Title | Internal id |
|---|---|---|---|
| 1 | Settings (gear) | Basic Settings | `basic` |
| 2 | Dollar sign | Financial Settings | `finance` |

Hover any icon to see its full title in a tooltip.

---

## Tab Navigation

### RES-NAV-001 — Navigate to Basic Settings tab [P1]

**Preconditions**
- LucidChart document open with a Quodsi model
- Click any Resource shape (hexagon); the Resource Editor panel shows on the right

**Steps**
1. In the tab bar at the top of the panel, click the **gear** icon (1st icon)

**Expected**
- The gear icon is highlighted (blue underline, blue tint)
- Content area shows Basic Settings: `Resource Name` text input and `Resource Capacity` number input

### RES-NAV-002 — Navigate to Financial Settings tab [P2]

**Preconditions**
- Resource selected; Resource Editor panel visible

**Steps**
1. Click the **dollar sign** icon (2nd icon) in the tab bar

**Expected**
- Dollar sign highlighted
- Content shows `Enable Financial Tracking` checkbox (unchecked by default on new resources); cost fields appear only when checked

### RES-NAV-004 — All tabs visible in tab bar [P1]

**Preconditions**
- Resource selected

**Steps**
1. Look at the tab bar
2. Hover each icon to read its tooltip

**Expected**
- Exactly **2** tab icons in this order: gear (Basic Settings), dollar (Financial Settings)
- No "States" tab — that tab is commented out in code; states are managed at the Model level

**Context:** A `Hash` icon is imported in `ResourceEditor.tsx` for an old States tab that is currently hidden. If a third tab ever reappears, this test fails and the suite needs an update.

### RES-NAV-005 — Tab tooltips display on hover [P3]

**Preconditions**
- Resource selected; Resource Editor panel visible

**Steps**
1. Hover the gear icon for ~1 second
2. Hover the dollar icon for ~1 second

**Expected**
- Gear tooltip: `Configure resource name and capacity (maximum number of concurrent uses)`
- Dollar tooltip: `Track resource costs including per-seize costs and time-based utilization costs`

**Context:** Tooltip strings come from `TAB_CONFIG` in `ResourceEditor.tsx`.

---

## Basic Settings

### RES-BASIC-001 — Edit resource name [P1]

**Preconditions**
- Resource selected; Basic Settings tab open

**Steps**
1. Click the `Resource Name` field
2. Select all and type `Test Worker`
3. Tab out of the field

**Expected**
- Field shows `Test Worker`
- `SaveStatusLine` briefly flashes `Saving…` then settles on `Saved`
- Re-selecting the resource shows the new name

### RES-BASIC-002 — Edit resource capacity [P1]

**Preconditions**
- Resource selected; Basic Settings tab open

**Steps**
1. Click the `Resource Capacity` field
2. Clear it, type `5`
3. Tab out

**Expected**
- Field shows `5`
- `SaveStatusLine` cycles `Saving…` → `Saved`
- No error message

### RES-BASIC-003 — Minimum capacity enforced (zero coerced) [P2]

**Preconditions**
- Resource selected; Basic Settings tab open

**Steps**
1. Click `Resource Capacity`
2. Clear it, type `0`
3. Tab out

**Expected**
- Either the input's `min="1"` constraint blocks `0` immediately, or the editor coerces the parsed value to `1` (the `parseInt(value) || 1` fallback). Either way, the stored capacity is ≥ 1.
- No persistent invalid state in `SaveStatusLine`

**Context:** Capacity is normalized via `parseInt(value) || 1` in `handleInputChange`.

### RES-BASIC-004 — Negative capacity coerced [P2]

**Preconditions**
- Resource selected; Basic Settings tab open

**Steps**
1. Click `Resource Capacity`
2. Clear it, type `-1`
3. Tab out

**Expected**
- Either the `min="1"` constraint blocks `-1`, or the editor coerces via `parseInt(value) || 1` to `1`. Stored capacity is ≥ 1.
- `SaveStatusLine` settles on `Saved`

### RES-BASIC-005 — Empty name blocks save [P2]

**Preconditions**
- Resource selected; Basic Settings tab open
- Name field has some text

**Steps**
1. Click `Resource Name`
2. Select all, delete
3. Tab out

**Expected**
- Red text `Name is required` appears under the name field
- `SaveStatusLine` shows `Fix errors to save` (yellow triangle)
- No save fires; re-selecting the resource reverts the displayed name to the last saved value

### RES-BASIC-006 — Duplicate resource name blocks save [P2]

**Preconditions**
- Model has at least 2 Resources (e.g. `Pump A`, `Pump B`)
- You're editing the resource with the different name

**Steps**
1. Click `Resource Name`
2. Clear, type the exact name of the other resource (e.g. `Pump A`)
3. Tab out

**Expected**
- Red text `A Resource named "Pump A" already exists` appears under the name field
- `SaveStatusLine` shows `Fix errors to save`
- Change the name back to something unique → red text disappears, `SaveStatusLine` cycles to `Saved`

**Context:** Validation is per the `isNameUniqueInReferenceData` helper, scoped to `SimulationObjectType.Resource`.

### RES-BASIC-007 — Special characters in name [P3]

**Preconditions**
- Resource selected; Basic Settings tab open

**Steps**
1. Click `Resource Name`
2. Select all and type `Test!@#$%Resource`
3. Tab out

**Expected**
- Field shows `Test!@#$%Resource`
- `SaveStatusLine` cycles `Saving…` → `Saved` (assuming the name is unique)

### RES-BASIC-008 — Capacity info tooltip displays [P3]

**Preconditions**
- Resource selected; Basic Settings tab open

**Steps**
1. Hover the small info icon next to the `Resource Capacity` label

**Expected**
- A native browser tooltip appears containing the text: `Maximum number of entities that can use this resource simultaneously. For example, capacity of 3 means up to 3 entities can seize the resource at the same time.`

### RES-BASIC-009 — Name info tooltip displays [P3]

**Preconditions**
- Resource selected; Basic Settings tab open

**Steps**
1. Hover the small info icon next to the `Resource Name` label

**Expected**
- A native browser tooltip appears containing the text: `A descriptive name for this resource. Resources are constraining factors that entities must acquire (seize) before performing activities (e.g., machines, workers, rooms, tools).`

---

## Financial Settings

### RES-FIN-001 — Enable financial tracking [P1]

**Preconditions**
- Resource selected; Financial Settings tab open
- `Enable Financial Tracking` checkbox is unchecked

**Steps**
1. Click the `Enable Financial Tracking` checkbox

**Expected**
- Checkbox becomes checked
- Cost fields appear below: `Cost Per Seize`, `Cost Per Hour Utilized`, `Cost Per Hour Idle`
- `SaveStatusLine` cycles `Saving…` → `Saved` (checkbox change saves immediately via `useFlushOnChange`; no blur needed)

**Context:** Resource has its own `ResourceFinancialProperties` (different from Activity's): only `costPerSeize`, `costPerHourUtilized`, `costPerHourIdle` — no `fixedCost`, no `costPerEntity`, no `resourceCostMultiplier`.

### RES-FIN-002 — Disable financial tracking hides cost fields [P1]

**Preconditions**
- Resource with financial tracking ENABLED

**Steps**
1. Click `Enable Financial Tracking` to uncheck it

**Expected**
- All cost fields disappear from the panel; only the checkbox row remains
- `SaveStatusLine` cycles `Saving…` → `Saved` immediately

**Context:** Cost values are retained in storage even when the checkbox is unchecked (re-enabling restores them); fields just stop rendering.

### RES-FIN-003 — Edit Cost Per Seize [P1]

**Preconditions**
- Resource with financial tracking enabled; Financial tab open

**Steps**
1. Click `Cost Per Seize`
2. Clear, type `100`
3. Tab out

**Expected**
- Field shows `100`
- `SaveStatusLine` cycles `Saving…` → `Saved`

### RES-FIN-004 — Edit Cost Per Hour Utilized [P1]

**Preconditions**
- Resource with financial tracking enabled

**Steps**
1. Click `Cost Per Hour Utilized`
2. Clear, type `25`
3. Tab out

**Expected**
- Field shows `25`; `SaveStatusLine` cycles `Saving…` → `Saved`

### RES-FIN-005 — Edit Cost Per Hour Idle [P2]

**Preconditions**
- Resource with financial tracking enabled

**Steps**
1. Click `Cost Per Hour Idle`
2. Clear, type `5`
3. Tab out

**Expected**
- Field shows `5`; `SaveStatusLine` cycles `Saving…` → `Saved`

### RES-FIN-006 — Zero cost values accepted [P3]

**Preconditions**
- Resource with financial tracking enabled

**Steps**
1. Set every cost field (Per Seize, Per Hour Utilized, Per Hour Idle) to `0`, tabbing out of each

**Expected**
- All fields accept `0`
- `SaveStatusLine` settles on `Saved` after each edit

### RES-FIN-007 — Decimal cost values accepted [P3]

**Preconditions**
- Resource with financial tracking enabled

**Steps**
1. In `Cost Per Seize`, type `10.50`, tab out
2. In `Cost Per Hour Utilized`, type `5.99`, tab out
3. In `Cost Per Hour Idle`, type `0.75`, tab out

**Expected**
- Each field stores and displays the decimal value
- `SaveStatusLine` cycles `Saving…` → `Saved` for each

**Context:** Input `step="0.01"`.

### RES-FIN-008 — Negative cost values are clamped [P3]

**Preconditions**
- Resource with financial tracking enabled

**Steps**
1. In `Cost Per Seize`, clear and type `-10`
2. Tab out

**Expected**
- Either the input's `min="0"` constraint blocks the negative value, or the editor coerces via `parseFloat(value) || 0`. Final stored value is `0` (or the field rejects the input).
- `SaveStatusLine` settles on `Saved` (no validation banner — negatives are silently coerced)

### RES-FIN-009 — Cost Per Seize info tooltip [P3]

**Preconditions**
- Resource with financial tracking enabled

**Steps**
1. Hover the info icon next to `Cost Per Seize`

**Expected**
- Tooltip: `Fixed cost applied each time an entity acquires (seizes) this resource. This is a one-time cost per usage, regardless of how long the resource is held.`

### RES-FIN-010 — Cost Per Hour Utilized info tooltip [P3]

**Preconditions**
- Resource with financial tracking enabled

**Steps**
1. Hover the info icon next to `Cost Per Hour Utilized`

**Expected**
- Tooltip: `Hourly cost incurred while the resource is actively being used by entities. This cost accumulates continuously based on how long the resource is seized.`

### RES-FIN-011 — Cost Per Hour Idle info tooltip [P3]

**Preconditions**
- Resource with financial tracking enabled

**Steps**
1. Hover the info icon next to `Cost Per Hour Idle`

**Expected**
- Tooltip: `Hourly cost incurred while the resource has available capacity (not being used). This represents overhead costs like maintenance, rent, or salaries paid even when the resource sits idle.`

### RES-FIN-012 — Large cost values handled [P3]

**Preconditions**
- Resource with financial tracking enabled

**Steps**
1. In `Cost Per Hour Utilized`, clear and type `999999.99`
2. Tab out

**Expected**
- Field accepts and displays `999999.99`
- No crash or freeze
- `SaveStatusLine` cycles `Saving…` → `Saved`

### RES-FIN-013 — Stepper arrows increment cost [P3]

**Preconditions**
- Resource with financial tracking enabled
- Browser shows native number-input stepper arrows on the cost field

**Steps**
1. Click the UP arrow on `Cost Per Seize` once
2. Click the DOWN arrow once

**Expected**
- UP increments by `0.01` (matches `step="0.01"`)
- DOWN decrements by `0.01`; value will not go below `0` (matches `min="0"`)
- `SaveStatusLine` cycles `Saving…` → `Saved` after debounce

**Context:** Stepper-arrow visibility/behavior depends on the browser; some hide steppers on number inputs by default. If no arrows are visible, mark this test skipped.

---

## Form Sync

### RES-SYNC-001 — Switch to a different resource loads new data [P1]

**Preconditions**
- Model has at least 2 Resources with distinct names; Resource A is currently in the panel

**Steps**
1. Click Resource B in the diagram
2. Inspect the panel

**Expected**
- Panel reloads with Resource B's values across all tabs
- `SaveStatusLine` resets to `Saved` for the new element

### RES-SYNC-002 — Switching resource flushes pending edits [P1]

**Preconditions**
- Model has at least 2 Resources
- Resource A selected; Basic Settings open

**Steps**
1. Click `Resource Name`, change it to `MODIFIED`
2. **Without blurring**, click Resource B in the diagram
3. Click Resource A again

**Expected**
- The mid-edit change to Resource A is **flushed** when you switch away (the auto-save hook detects the element switch and dispatches a save with the pending draft)
- When you return to Resource A, the name shows `MODIFIED` (the edit was saved, not discarded)

**Context:** **This is the opposite of the legacy Save/Cancel behavior.** Under debounce auto-save, element-switch acts as an implicit blur. If there's an in-flight save at switch time, the pending draft is captured and drained after the in-flight save completes (silently — no status surfaced in the new element's panel).

### RES-SYNC-003 — External update syncs to form [P3]

**Preconditions**
- Same Quodsi document open in two browser windows
- Resource A selected in both

**Steps**
1. In Window 2: change Resource A's name to `Changed by Window 2`, blur
2. In Window 1: wait, then click off and back onto Resource A (or wait for collaborative sync)

**Expected**
- Window 1 eventually shows the new name
- Sync may be near-immediate or require re-selection — record what you observe in the run report

---

## Edge Cases

### RES-EDGE-001 — Corrupt resource data handling [P2]

**Preconditions**
- Way to inject corrupt resource data (may need developer help — e.g. directly mutate shape data so `id` is missing)

**Steps**
1. Select the corrupted Resource in the diagram

**Expected**
- The editor shows the guard message `Invalid resource data — Resource data missing required properties` (red box) and nothing else
- The extension does not crash; other resources remain selectable

**Context:** Guard is at the top of the editor's render path, triggered when `localResourceDraft.id` is empty.

### RES-EDGE-002 — Browser refresh preserves auto-saved edits [P3]

**Preconditions**
- Resource selected; Basic Settings open

**Steps**
1. Edit `Resource Name` to a new value
2. Tab out, wait for `SaveStatusLine` to show `Saved`
3. Press F5 to refresh the browser
4. Re-select the same Resource

**Expected**
- The new name is preserved — auto-save flushed on blur before refresh
- Variant: if you refresh during the ~500 ms debounce window without blurring, the pending edit may be lost. Document observed behavior in the run report.

**Context:** **This is the opposite of the legacy expectation.** With auto-save, anything that has been flushed (blurred or 500 ms elapsed) is durable across refresh. There's no longer an "unsaved changes" warning because there's no manual save step.

### RES-EDGE-003 — Very high capacity value [P3]

**Preconditions**
- Resource selected; Basic Settings open

**Steps**
1. Click `Resource Capacity`
2. Clear and type `999999`
3. Tab out, then re-select the resource

**Expected**
- Field persists `999999` after re-select
- `SaveStatusLine` settles on `Saved`

### RES-EDGE-004 — Non-numeric input in Capacity field [P3]

**Preconditions**
- Resource selected; Basic Settings open

**Steps**
1. Click `Resource Capacity`
2. Clear and type `abc`
3. Tab out

**Expected**
- The `type="number"` input either blocks the alphabetic characters at the keyboard layer, or `parseInt('abc') || 1` coerces the stored value to `1`
- `SaveStatusLine` settles on `Saved`

### RES-EDGE-005 — Non-numeric input in cost fields [P3]

**Preconditions**
- Resource with financial tracking enabled

**Steps**
1. Click any cost field (e.g. `Cost Per Seize`)
2. Clear and type `abc`
3. Tab out

**Expected**
- The `type="number"` input blocks alphabetic characters, or `parseFloat('abc') || 0` coerces the stored value to `0`
- `SaveStatusLine` settles on `Saved`

### RES-EDGE-006 — Very long resource name (500+ characters) [P3]

**Preconditions**
- Resource selected; Basic Settings open
- Have a 500+ character string ready (e.g. `LongResourceName` × 35)

**Steps**
1. Paste the long string into `Resource Name`
2. Tab out

**Expected**
- Field accepts the long value without crashing or breaking panel layout (it may scroll horizontally inside the input)
- `SaveStatusLine` cycles `Saving…` → `Saved` (assuming the name is still unique)
- No max-length truncation in the UI; document any limits observed in the run report

---

## Model Validation

### RES-MVAL-001 — Missing resource name [P1]

**Preconditions**
- Resource selected; Basic Settings open

**Steps**
1. Try clearing the name field; the **editor** blocks save and shows red `Name is required`
2. If you can force an empty name into the model (e.g. via import), check the Validation panel

**Expected**
- Editor blocks the empty value at write time (this means model-level Validation panel may never see an empty name in normal use)
- If empty name is somehow present (import path), Validation panel shows an **error** for the resource

### RES-MVAL-002 — Invalid capacity (zero / negative) [P1]

**Preconditions**
- Resource selected; Basic Settings open

**Steps**
1. Set `Resource Capacity` to `0` or `-1`
2. Check the Validation panel

**Expected**
- Editor coerces input via `parseInt(value) || 1` so the stored capacity is ≥ 1 in normal use
- If a sub-1 capacity reaches the model (import or coercion bypass), Validation panel shows an **error**

### RES-MVAL-003 — Non-integer capacity [P2]

**Preconditions**
- Resource selected; Basic Settings open

**Steps**
1. Try typing `2.5` into `Resource Capacity`
2. Tab out, then check the Validation panel

**Expected**
- The number input's behavior plus `parseInt('2.5') || 1` will store `2` (truncation) or `1` (fallback if parse fails). Stored capacity is a positive integer in normal use.
- If a non-integer reaches the model (import path), Validation panel may show an **error** about non-integer capacity — document what you observe

### RES-MVAL-004 — Very high capacity shows warning [P2]

**Preconditions**
- Resource selected; Basic Settings open

**Steps**
1. Set `Resource Capacity` to a very large value (e.g. paste `1000001`)
2. Check the Validation panel

**Expected**
- The number input has no `max` cap on capacity, so the value should be accepted
- Validation panel may show a **warning** about unusually high capacity. If no warning is reported, document the observation in the run report — this check may not be wired up yet.

### RES-MVAL-005 — Unused resource shows warning [P1]

**Preconditions**
- Resource exists in the model
- No Activity has a Resource Requirement referencing it

**Steps**
1. Open the Validation panel

**Expected**
- A **warning** appears noting the resource is not used by any activity. If no warning is reported, document the observation in the run report — this check may not be wired up yet.

### RES-MVAL-006 — Invalid resource-requirement reference shows error [P2]

**Preconditions**
- An Activity has a Resource Requirement that references a non-existent Resource (e.g. orphaned after deletion or bad import)

**Steps**
1. Open the Validation panel

**Expected**
- An **error** appears identifying the offending Activity and the dangling resource reference

### RES-MVAL-007 — Invalid resource quantity (zero / negative) shows error [P2]

**Preconditions**
- An Activity has a Seize Resource action with quantity `0` or `-1`

**Steps**
1. Open the Validation panel

**Expected**
- An **error** appears about the invalid quantity (quantity must be ≥ 1)

### RES-MVAL-008 — Reference to deleted resource shows error [P1]

**Preconditions**
- An Activity has a Resource Requirement referencing Resource X
- Resource X is then deleted from the diagram

**Steps**
1. Open the Validation panel

**Expected**
- An **error** appears for the Activity, indicating it references a non-existent resource

### RES-MVAL-010 — Fixing a validation error clears it [P1]

**Preconditions**
- Resource with a known model-level validation error (e.g. unused, or referenced-but-deleted)

**Steps**
1. Fix the underlying issue (e.g. add a Resource Requirement that uses it, or re-create the deleted resource)
2. Wait for auto-save to complete (`SaveStatusLine` shows `Saved` for any open editor)
3. Re-check the Validation panel

**Expected**
- The error entry disappears from the Validation panel as soon as the model state is corrected

### RES-MVAL-011 — Multiple validation issues shown for same resource [P2]

**Preconditions**
- Create a Resource with multiple problems (e.g. unused AND referenced by an Activity with invalid quantity)

**Steps**
1. Open the Validation panel

**Expected**
- All distinct issues are listed (not just the first one)

### RES-MVAL-012 — Clicking validation error navigates to element [P2]

**Preconditions**
- Validation panel shows at least one error for a Resource you're not currently editing

**Steps**
1. Click the error entry

**Expected**
- The diagram selects the offending Resource and the Resource Editor opens to it

---

## Auto-Save Behavior (Cross-Cutting)

These tests verify the auto-save mechanism itself. Other sections assert that "`SaveStatusLine` cycles `Saving…` → `Saved`"; these tests verify that statement is actually accurate.

### RES-AUTOSAVE-001 — Text field uses 500 ms debounce [P1]

**Preconditions**
- Resource selected; Basic Settings open

**Steps**
1. Click `Resource Name`
2. Type 3 characters quickly, **do not** tab out
3. Wait ~500 ms

**Expected**
- During typing: `SaveStatusLine` does not show `Saved` (status remains `Saved` from idle or transitions through `Saving…`)
- ~500 ms after the last keystroke: `SaveStatusLine` shows `Saving…` briefly, then `Saved`

**Context:** Debounce is `debounceMs = 500` in `useAutoSave`.

### RES-AUTOSAVE-002 — Blur on text field triggers immediate save [P1]

**Preconditions**
- Resource selected; Basic Settings open

**Steps**
1. Click `Resource Name`
2. Type 1 character
3. Immediately Tab out (within < 500 ms)

**Expected**
- `SaveStatusLine` shows `Saving…` immediately (the blur calls `saveNow()` which bypasses the debounce timer)
- Then settles on `Saved`

### RES-AUTOSAVE-003 — Financial-enabled checkbox saves immediately [P1]

**Preconditions**
- Resource selected; Financial Settings open

**Steps**
1. Toggle `Enable Financial Tracking`
2. Do **not** click elsewhere

**Expected**
- `SaveStatusLine` shows `Saving…` immediately on toggle (no debounce, no blur required)
- Then settles on `Saved`

**Context:** Driven by `useFlushOnChange(localResourceDraft.financialProperties?.enabled, saveNow)` in `ResourceEditor.tsx`. Checkboxes have no `onBlur`, so this effect-based flush is what makes the toggle save instantly.

### RES-AUTOSAVE-004 — Invalid name blocks save, fixing it resumes [P1]

**Preconditions**
- Resource selected; Basic Settings open

**Steps**
1. Clear `Resource Name` (triggers `Name is required`)
2. Observe `SaveStatusLine`
3. Type any unique name
4. Observe again

**Expected**
- Step 2: `SaveStatusLine` shows `Fix errors to save` (yellow triangle); no save fires while the name is empty
- Step 4: After ~500 ms (or on blur), `SaveStatusLine` cycles `Saving…` → `Saved`

### RES-AUTOSAVE-005 — Element switch flushes pending edit [P1]

**Preconditions**
- Two Resources A and B in the model
- Resource A selected; Basic Settings open

**Steps**
1. Click `Resource Capacity`, change `1` to `7`
2. Without blurring, immediately click Resource B in the diagram
3. Click Resource A again

**Expected**
- Resource A's capacity is `7` after returning — the element-switch effect detected the change and dispatched a save with the pending draft (drained silently if a save was already in flight)

**Context:** This is the auto-save hook's element-switch flush behavior; matches `RES-SYNC-002`.
