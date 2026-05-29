# 000 — Entity Editor Tests

Suite of manual / agent-driven QA tests for the Entity Editor in the Quodsi LucidChart extension.

## How to read this file

Each test is a small block: **ID — Name [Priority]**, then **Preconditions**, **Steps**, **Expected**, and (sometimes) **Context** — author notes that explain a subtle assertion or point at the source-of-truth code. Tests can be run by a human or by an AI agent walking the file top-to-bottom.

## How to record a run

Don't edit this file. For each run, create a new file under `_qa/runs/` and **log only failures** — silence means pass. See `_qa/runs/README.md` for the run-file template.

## Auto-save model (read once)

The Entity Editor has **no Save or Cancel button**. Every change is auto-saved:

- **Text inputs** (Entity Name): change is held locally, then auto-saved ~500 ms after the last keystroke (debounced). **Tabbing out / clicking elsewhere (blur) flushes the save immediately.**
- **Element switch** (clicking a different Entity in the diagram while an edit is pending): the pending draft is **flushed**, not discarded — the opposite of the legacy Save/Cancel behavior.

A status line at the very bottom of the panel (`SaveStatusLine`) shows what's happening, using these exact strings:

| Status | Text | When it appears |
|---|---|---|
| saving | `Saving…` (spinner) | Save is in flight, or just kicked off |
| invalid | `Fix errors to save` (yellow triangle) | Local edits exist but validation fails |
| error | `Save failed — keep typing to retry` (red triangle) | Last save threw; next edit retries |
| saved | `Saved` (check) | Idle; no pending edits, last save (if any) succeeded |

When validation fails, the editor *also* shows red text immediately under the offending field (e.g. `Name is required`, `An Entity named "Customer" already exists`).

To undo a saved change, use LucidChart's native **Ctrl+Z**.

## Tab layout

The Entity Editor currently exposes **1 tab** in the tab bar. A second tab (State Definitions) is implemented but commented out in `EntityEditor.tsx` — entity-level states are managed at the Model level for now.

| # | Icon | Title | Internal id |
|---|---|---|---|
| 1 | Settings (gear) | Basic Settings | `basic` |

Hover the gear icon to see its full title in a tooltip.

---

## Tab Navigation

### ENT-NAV-001 — Navigate to Basic Settings tab [P3]

**Preconditions**
- LucidChart document open with a Quodsi model
- Click any Entity shape; the Entity Editor panel shows on the right

**Steps**
1. In the tab bar at the top of the panel, click the **gear** icon (1st icon)

**Expected**
- The gear icon is highlighted (blue underline, blue tint)
- Content area shows Basic Settings: an `Entity Name` text input with an info icon next to the label

### ENT-NAV-004 — Tab tooltip displays [P3]

**Preconditions**
- Entity selected; Entity Editor panel visible

**Steps**
1. Hover the gear icon in the tab bar
2. Hold the mouse still for 1-2 seconds

**Expected**
- A tooltip appears with the text `Configure entity template name and properties. Entity templates define the types of entities that flow through the simulation`
- The tooltip disappears when the mouse moves away

**Context:** Only one tab is currently visible — the legacy second tab ("State Definitions") is commented out in `EntityEditor.tsx`.

### ENT-NAV-005 — Only the Basic Settings tab is visible [P2]

**Preconditions**
- Entity selected

**Steps**
1. Look at the tab bar

**Expected**
- Exactly **1** tab icon is rendered (gear / Basic Settings)
- No States tab — entity-level states are managed at the Model level

**Context:** New test. The original suite mentioned "2 tab icons" in `ENT-NAV-004`, which no longer matches the code. If the States tab is re-enabled, update this test and reintroduce a States-navigation test.

---

## Basic Settings

### ENT-BASIC-001 — Edit entity name [P3]

**Preconditions**
- Entity selected; Basic Settings tab open
- Note the current entity name displayed

**Steps**
1. Click the `Entity Name` field
2. Select all and type `Customer Order`
3. Tab out of the field

**Expected**
- Field shows `Customer Order`
- `SaveStatusLine` briefly flashes `Saving…` then settles on `Saved`
- Re-selecting the entity shows the new name

### ENT-BASIC-002 — Empty name blocks save [P3]

**Preconditions**
- Entity selected; Basic Settings tab open
- Name field has some text

**Steps**
1. Click `Entity Name`
2. Select all, delete (field is empty)
3. Tab out

**Expected**
- Red text `Name is required` appears under the name field
- `SaveStatusLine` shows `Fix errors to save` (yellow triangle)
- No save fires; refreshing or re-selecting the entity reverts the displayed name to the last saved value

**Context:** Validation runs in `validateName` in `EntityEditor.tsx`.

### ENT-BASIC-003 — Special characters in name [P3]

**Preconditions**
- Entity selected; Basic Settings tab open

**Steps**
1. Click `Entity Name`, select all
2. Type `Test!@#$%Entity`
3. Tab out
4. Click off the entity, then click back

**Expected**
- Field accepts the special characters
- `SaveStatusLine` cycles `Saving…` → `Saved`
- After re-selection the special characters are preserved exactly
- No validation banner about invalid characters

### ENT-BASIC-004 — Very long entity name (500+ characters) [P3]

**Preconditions**
- Entity selected; Basic Settings tab open
- Have a 500+ character string ready (e.g. `VeryLongEntityName` × 30)

**Steps**
1. Paste the long string into `Entity Name`
2. Tab out

**Expected**
- Field accepts the long value without crashing or breaking panel layout (it may scroll horizontally inside the input)
- `SaveStatusLine` cycles `Saving…` → `Saved` (assuming the name is still unique)
- No max-length truncation in the UI; document any limits observed in the run report

### ENT-BASIC-005 — Name info tooltip [P3]

**Preconditions**
- Entity selected; Basic Settings tab open

**Steps**
1. Locate the small info icon (`i`) next to the `Entity Name` label
2. Hover and hold the cursor still for 1-2 seconds

**Expected**
- A tooltip appears with text matching `Unique identifier for this entity template. Entity templates define the types of entities that flow through the simulation (e.g., Customer, Order, Patient).`
- Tooltip disappears when the mouse moves away

### ENT-BASIC-006 — Duplicate entity name blocks save [P2]

**Preconditions**
- Model has at least 2 Entities (e.g. `Customer`, `Order`)
- You're editing the entity with the different name

**Steps**
1. Click `Entity Name`
2. Clear, type the exact name of the other entity (e.g. `Customer`)
3. Tab out

**Expected**
- Red text `An Entity named "Customer" already exists` appears under the name field
- `SaveStatusLine` shows `Fix errors to save`
- Change the name back to something unique → red text disappears, `SaveStatusLine` cycles to `Saved`

**Context:** New test. Driven by the `isNameUniqueInReferenceData` helper inside `validateName`. The original suite had no in-editor duplicate-name test, only a model-level validation test (`ENT-MVAL-005`).

---

## Form Sync

### ENT-SYNC-001 — Switch to a different entity loads new data [P1]

**Preconditions**
- Model has at least 2 Entities with distinct names; Entity A is currently in the panel

**Steps**
1. Click Entity B in the diagram
2. Inspect the panel

**Expected**
- Panel reloads with Entity B's values
- `SaveStatusLine` resets to `Saved` for the new element

### ENT-SYNC-002 — Switching entity flushes pending edits [P1]

**Preconditions**
- Model has at least 2 Entities
- Entity A selected; Basic Settings open

**Steps**
1. Click `Entity Name`, change it to `MODIFIED`
2. **Without blurring**, click Entity B in the diagram
3. Click Entity A again

**Expected**
- The mid-edit change to Entity A is **flushed** when you switch away (the auto-save hook detects the element switch and dispatches a save with the pending draft)
- When you return to Entity A, the name shows `MODIFIED` (the edit was saved, not discarded)

**Context:** **This is the opposite of the legacy Save/Cancel behavior** the original suite asserted (`ENT-SYNC-002` previously said "unsaved changes are DISCARDED"). Under debounce auto-save, element-switch acts as an implicit blur. If there's an in-flight save at switch time, the pending draft is captured and drained after the in-flight save completes (silently — no status surfaced in the new element's panel).

### ENT-SYNC-003 — External update syncs to form [P3]

**Preconditions**
- Same Quodsi document open in two browser windows
- Entity A selected in both

**Steps**
1. In Window 2: change Entity A's name to `Changed by Window 2`, blur
2. In Window 1: wait, then click off and back onto Entity A (or wait for collaborative sync)

**Expected**
- Window 1 eventually shows the new name
- Sync may be near-immediate or require re-selection — record what you observe in the run report

---

## Edge Cases

### ENT-EDGE-001 — Corrupt entity data handling [P1]

**Preconditions**
- Way to inject corrupt entity data (may need developer help — e.g. directly mutate shape data so the entity's `id` is blank)

**Steps**
1. Select the corrupted Entity in the diagram

**Expected**
- The editor shows the guard message `Invalid entity data` (red text) and nothing else
- The extension does not crash; other entities remain selectable

**Context:** Guard is at the top of the editor's render path: `if (!entity?.id) return <div ...>Invalid entity data</div>`.

### ENT-EDGE-002 — Browser refresh preserves auto-saved edits [P2]

**Preconditions**
- Entity selected; Basic Settings open

**Steps**
1. Edit `Entity Name` to a new value
2. Tab out, wait for `SaveStatusLine` to show `Saved`
3. Press F5 to refresh the browser
4. Re-select the same Entity

**Expected**
- The new name is preserved — auto-save flushed on blur before refresh
- Variant: if you refresh during the ~500 ms debounce window without blurring, the pending edit may be lost. Document observed behavior in the run report.

**Context:** **This is the opposite of the legacy expectation.** With auto-save, anything that has been flushed (blurred or 500 ms elapsed) is durable across refresh. There's no longer an "unsaved changes" warning because there's no manual save step.

---

## Model Validation

### ENT-MVAL-001 — No entities defined error [P1]

**Preconditions**
- Model that has at least one Entity shape you can delete
- Access to the Model Panel's Validation tab

**Steps**
1. Delete every Entity shape from the model
2. Open the Model Panel's Validation tab

**Expected**
- A model-level validation **error** appears, indicating the model has no entities (e.g. `No entities defined` / `Model requires at least one entity`)
- The error is marked ERROR (red), not just a warning

**Context:** This is model-level validation reported through the Validation panel, distinct from the in-editor red-text validation under fields.

### ENT-MVAL-003 — Default name warning [P2]

**Preconditions**
- Model has at least one Entity still using the default name `New Entity`

**Steps**
1. Open the Model Panel's Validation tab
2. Look for warnings about entity names

**Expected**
- A **warning** (yellow) appears for the entity still named `New Entity`
- Wording is similar to `Entity is using default name` / `Consider renaming entity from New Entity`
- Simulation can still run with the warning

**Context:** `Entity.createDefault` and the `extractEntityData` fallback both seed `New Entity` as the default; the warning targets that exact string. If no warning surfaces, the check may not be wired up — document in the run report.

### ENT-MVAL-004 — Entity not used by any generator warning [P2]

**Preconditions**
- Entity exists in the diagram
- No Generator references that entity

**Steps**
1. Add a fresh Entity, name it `Unused Entity`
2. Verify no Generator has it in its entity-type setting
3. Open the Validation tab

**Expected**
- A **warning** appears: e.g. `Entity not used by any generator` / `Entity is not referenced in the model`
- The warning identifies `Unused Entity` specifically
- Assigning the entity to a Generator clears the warning

### ENT-MVAL-005 — Duplicate entity names warning [P1]

**Preconditions**
- Model has at least 2 Entity shapes

**Steps**
1. Set Entity A's name to `CustomerOrder`
2. Set Entity B's name to `CustomerOrder` (exact match)
3. Open the Validation tab

**Expected**
- A **warning** about duplicate names (e.g. `Duplicate entity name: CustomerOrder`)
- Both entities may be listed
- Warning level (not error); the simulation may still run

**Context:** The in-editor duplicate-name check (`ENT-BASIC-006`) should prevent reaching this state during normal editing; this test still matters for imports and out-of-band data paths.

### ENT-MVAL-006 — Case-insensitive duplicate detection [P1]

**Preconditions**
- Model has at least 2 Entity shapes

**Steps**
1. Set Entity A's name to `Customer` (capital C)
2. Set Entity B's name to `customer` (lowercase c)
3. Open the Validation tab

**Expected**
- Record observed behavior in the run report — either:
  - Validation treats them as duplicates and emits the warning from `ENT-MVAL-005`, or
  - Validation treats them as distinct (no warning)
- This test is a behavior probe, not a hard pass/fail

### ENT-MVAL-008 — Fixing a validation error clears it [P1]

**Preconditions**
- Entity with a known model-level validation issue (e.g. `Unused Entity` from `ENT-MVAL-004`)

**Steps**
1. Fix the underlying issue (e.g. wire the entity into a Generator's entity-type setting)
2. Wait for auto-save to complete (`SaveStatusLine` shows `Saved`)
3. Re-check the Validation panel

**Expected**
- The error/warning entry disappears from the Validation panel as soon as the model state is corrected

### ENT-MVAL-010 — Clicking validation error navigates to element [P2]

**Preconditions**
- Validation panel shows at least one error/warning for an Entity you're not currently editing

**Steps**
1. Click the error entry

**Expected**
- The diagram selects the offending Entity and the Entity Editor opens to it
- If navigation doesn't work, document actual behavior in the run report

---

## Auto-Save Behavior (Cross-Cutting)

These tests verify the auto-save mechanism itself for the Entity Editor. Other sections assert that "`SaveStatusLine` cycles `Saving…` → `Saved`"; these tests verify that statement is actually accurate.

### ENT-AUTOSAVE-001 — Text field uses 500 ms debounce [P1]

**Preconditions**
- Entity selected; Basic Settings open

**Steps**
1. Click `Entity Name`
2. Type 3 characters quickly, **do not** tab out
3. Wait ~500 ms

**Expected**
- During typing: `SaveStatusLine` does not show `Saved` (status remains `Saved` from idle or transitions through `Saving…`)
- ~500 ms after the last keystroke: `SaveStatusLine` shows `Saving…` briefly, then `Saved`

**Context:** Debounce is `debounceMs = 500` in `useAutoSave`.

### ENT-AUTOSAVE-002 — Blur on text field triggers immediate save [P1]

**Preconditions**
- Entity selected; Basic Settings open

**Steps**
1. Click `Entity Name`
2. Type 1 character
3. Immediately Tab out (within < 500 ms)

**Expected**
- `SaveStatusLine` shows `Saving…` immediately (the blur calls `saveNow()` which bypasses the debounce timer)
- Then settles on `Saved`

**Context:** The `onBlur={saveNow}` handler on the name input drives this.

### ENT-AUTOSAVE-003 — Invalid edit blocks save, fixing it resumes [P1]

**Preconditions**
- Entity selected; Basic Settings open

**Steps**
1. Clear `Entity Name` (triggers `Name is required`)
2. Observe `SaveStatusLine`
3. Type any unique name
4. Observe again

**Expected**
- Step 2: `SaveStatusLine` shows `Fix errors to save` (yellow triangle); no save fires while the name is invalid
- Step 4: After ~500 ms (or on blur), `SaveStatusLine` cycles `Saving…` → `Saved`

**Context:** `isValid: nameError === null` is passed to `useAutoSave`, which is what gates the save.

### ENT-AUTOSAVE-004 — Element switch flushes pending edit [P1]

**Preconditions**
- Two Entities A and B in the model
- Entity A selected; Basic Settings open

**Steps**
1. Click `Entity Name`, change it from `Customer` to `Customer Order`
2. Without blurring, immediately click Entity B in the diagram
3. Click Entity A again

**Expected**
- Entity A's name is `Customer Order` after returning — the element-switch effect detected the change and dispatched a save with the pending draft (drained silently if a save was already in flight)

**Context:** This is the auto-save hook's element-switch flush behavior; matches `ENT-SYNC-002`.
