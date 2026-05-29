# 003 — Generator Editor Tests

Suite of manual / agent-driven QA tests for the Generator Editor in the Quodsi LucidChart extension.

## How to read this file

Each test is a small block: **ID — Name [Priority]**, then **Preconditions**, **Steps**, **Expected**, and (sometimes) **Context** — author notes that explain a subtle assertion or point at the source-of-truth code. Tests can be run by a human or by an AI agent walking the file top-to-bottom.

## How to record a run

Don't edit this file. For each run, create a new file under `_qa/runs/` and **log only failures** — silence means pass. See `_qa/runs/README.md` for the run-file template.

## Auto-save model (read once)

The Generator Editor has **no Save or Cancel button**. Every change is auto-saved:

- **Text / number inputs** (Generator Name, Periodic Occurrences, Entities Per Creation, Max Entities): change is held locally, then auto-saved ~500 ms after the last keystroke (debounced). **Tabbing out / clicking elsewhere (blur) flushes the save immediately.**
- **Select dropdowns** (Entity, Generator Type): saved **immediately** on change via `useFlushOnChange` watchers — no debounce, no blur required (selects don't have a useful blur).
- **Duration sub-editors** (Time Between Arrivals, Start Delay — both `EnhancedDurationEditor`): debounced auto-save — `EnhancedDurationEditor` fires onChange per keystroke with no buffering, so the 500 ms debounce timer resets naturally and fires once the user pauses.
- **State modifications** (inside the Event Modifications tab): unified with all other fields — debounced auto-save.

A status line at the very bottom of the panel (`SaveStatusLine`) shows what's happening, using these exact strings:

| Status | Text | When it appears |
|---|---|---|
| saving | `Saving…` (spinner) | Save is in flight, or just kicked off |
| invalid | `Fix errors to save` (yellow triangle) | Local edits exist but validation fails |
| error | `Save failed — keep typing to retry` (red triangle) | Last save threw; next edit retries |
| saved | `Saved` (check) | Idle; no pending edits, last save (if any) succeeded |

To undo a saved change, use LucidChart's native **Ctrl+Z**.

## Tab layout

The Generator Editor has **2 tabs** today (no Save/Cancel buttons, no separate Frequency / Distribution / States tabs — those have been folded or hidden):

| # | Icon | Title | Internal id |
|---|---|---|---|
| 1 | Settings (gear) | Settings | `settings` |
| 2 | Zap (lightning) | Event Modifications | `events` |

Hover any icon to see its full tooltip.

**Notes on missing tabs:**

- **Frequency Settings is NOT a separate tab.** It's a section inside the Settings tab that appears when `Generator Type = Frequency-Based`. The "Time Between Arrivals" field is always-visible; Periodic Occurrences / Start Delay / Entities Per Creation / Max Entities live inside a collapsible `Advanced Settings` row.
- **Time Distribution is NOT a separate tab.** The Time-Distributed mode is `disabled` in the `Generator Type` dropdown (label `"Time-Distributed (Coming Soon)"`). The Time-Patterns + Distribution-Configs UI exists in source but is unreachable through the dropdown — tests for it are marked **[SKIP-COMING-SOON]** below.
- **States is NOT a tab.** Per the Activity Editor migration, States are managed at the **Model** level. The States tab is commented out in `TAB_CONFIG` in `GeneratorEditor.tsx`.

---

## Tab Navigation

### GEN-NAV-001 — Navigate to Settings tab [P1]

**Preconditions**
- LucidChart document open with a Quodsi model
- Click any Generator shape; the Generator Editor panel shows on the right

**Steps**
1. In the tab bar at the top of the panel, click the **gear** icon (1st icon)

**Expected**
- The gear icon is highlighted (blue underline, blue text)
- Content area shows Settings: `Generator Name` text input, `Entity` dropdown, `Generator Type` dropdown, `Time Between Arrivals` duration editor, an `Advanced Settings` collapsible row

### GEN-NAV-002 — Navigate to Event Modifications tab [P2]

**Preconditions**
- Generator selected; Generator Editor panel visible

**Steps**
1. Click the **lightning bolt** icon (2nd icon) in the tab bar

**Expected**
- Lightning bolt icon highlighted
- Content shows Initial State Modifications: list area (may be empty) and controls to add/edit/delete state modifications referencing model-level states

### GEN-NAV-003 — Exactly 2 tabs visible in tab bar [P1]

**Preconditions**
- Generator selected

**Steps**
1. Look at the tab bar
2. Hover each icon to read its tooltip

**Expected**
- Exactly **2** tab icons in this order: gear (Settings), lightning bolt (Event Modifications)
- No separate Frequency, Distribution, or States tab — see "Tab layout" above for why

**Context:** `TAB_CONFIG` in `GeneratorEditor.tsx` only registers `settings` and `events`. The old `states` entry is commented out.

### GEN-NAV-004 — Frequency UI appears in Settings tab when type is Frequency-Based [P1]

**Preconditions**
- Generator selected; Settings tab open; `Generator Type` is `Frequency-Based`

**Steps**
1. Look below the `Generator Type` dropdown

**Expected**
- A `Time Between Arrivals` duration editor is visible (always shown in Frequency mode)
- An `Advanced Settings` collapsible row is visible (default collapsed)
- The two together replace what used to be the separate "Frequency Settings" tab

**Context:** Replaces the old `GEN-NAV-002` (frequency tab). Frequency UI is now inline.

### GEN-NAV-005 — Distribution UI not reachable (Time-Distributed disabled) [SKIP-COMING-SOON] [P3]

**Preconditions**
- Generator selected; Settings tab open

**Steps**
1. Open the `Generator Type` dropdown

**Expected**
- The dropdown shows exactly two options: `Frequency-Based` (enabled) and `Time-Distributed (Coming Soon)` (**disabled** — cannot be selected)
- Because Time-Distributed cannot be selected through the UI, the Time Patterns + Distribution Configs section is unreachable in production today

**Context:** `<option value={GeneratorType.TIME_DISTRIBUTED} disabled>` in `GeneratorEditor.tsx`. The implementation exists (modals, list views) but the entry point is gated off. All `GEN-DIST-*` tests below are marked SKIP-COMING-SOON for the same reason.

---

## Settings — Basic Fields

### GEN-BASIC-001 — Edit generator name [P1]

**Preconditions**
- Generator selected; Settings tab open

**Steps**
1. Click the `Generator Name` field
2. Select all and type `Customer Arrivals`
3. Tab out of the field

**Expected**
- Field shows `Customer Arrivals`
- `SaveStatusLine` briefly flashes `Saving…` then settles on `Saved`
- Re-selecting the generator shows the new name

### GEN-BASIC-002 — Empty name blocks save [P2]

**Preconditions**
- Generator selected; Settings tab open
- Name field has some text

**Steps**
1. Click `Generator Name`
2. Select all, delete
3. Tab out

**Expected**
- Red text `Name is required` appears under the name field
- `SaveStatusLine` shows `Fix errors to save` (yellow triangle)
- No save fires; re-selecting the generator reverts the displayed name to the last saved value

**Context:** `validateName` in `GeneratorEditor.tsx` returns `'Name is required'` on empty input; `useAutoSave` sees `isValid = nameError === null` and gates saves.

### GEN-BASIC-003 — Duplicate generator name blocks save [P2]

**Preconditions**
- Model has at least 2 Generators (e.g. `Generator A`, `Generator B`)
- You're editing the generator with the different name

**Steps**
1. Click `Generator Name`
2. Clear, type the exact name of the other generator (e.g. `Generator A`)
3. Tab out

**Expected**
- Red text `A Generator named "Generator A" already exists` appears under the name field
- `SaveStatusLine` shows `Fix errors to save`
- Change the name back to something unique → red text disappears, `SaveStatusLine` cycles to `Saved`

**Context:** Validation uses the shared `isNameUniqueInReferenceData` helper, scoped to `SimulationObjectType.Generator`.

### GEN-BASIC-004 — Special characters in name accepted [P3]

**Preconditions**
- Generator selected; Settings tab open

**Steps**
1. Click `Generator Name`
2. Clear and type `Test!@#$%^&*()Gen`
3. Tab out

**Expected**
- Field accepts every character
- `SaveStatusLine` cycles `Saving…` → `Saved` (assuming the name is still unique)

### GEN-BASIC-005 — Change entity selection [P1]

**Preconditions**
- Generator selected; Settings tab open
- At least 2 Entity types exist in the model

**Steps**
1. Open the `Entity` dropdown
2. Select a different entity than currently selected

**Expected**
- Dropdown shows the new selection
- `SaveStatusLine` shows `Saving…` immediately on change (selects save without blur, via `useFlushOnChange`), then settles on `Saved`
- The generator now produces entities of the new type

**Context:** `useFlushOnChange(localGeneratorDraft.generationConfig.entityId, saveNow)` fires `saveNow` whenever `entityId` changes.

### GEN-BASIC-006 — Entity dropdown lists every model entity [P2]

**Preconditions**
- Model has multiple Entity types defined (e.g. `Customer`, `Order`, `Product`)
- Generator selected; Settings tab open

**Steps**
1. Open the `Entity` dropdown
2. Read the list

**Expected**
- Every entity defined in the model appears as an option, no duplicates
- Selection persists after save + re-select

### GEN-BASIC-007 — Generator Type dropdown options [P1]

**Preconditions**
- Generator selected; Settings tab open

**Steps**
1. Open the `Generator Type` dropdown

**Expected**
- Exactly two options:
  - `Frequency-Based` — enabled
  - `Time-Distributed (Coming Soon)` — **disabled**
- Selecting `Frequency-Based` (or attempting to select the disabled option) does NOT toggle a tab change; there is no separate Frequency or Distribution tab.

**Context:** Replaces old `GEN-BASIC-004` (which assumed a working type-swap and disappearing/appearing tabs). Today the Frequency UI is conditional within Settings, and Time-Distributed is gated.

---

## Settings — Time Between Arrivals

### GEN-FREQ-001 — Edit interarrival time value [P1]

**Preconditions**
- Generator selected with type `Frequency-Based`; Settings tab open

**Steps**
1. In the `Time Between Arrivals` editor (top of the duration section), edit the numeric value (e.g. type `10`)
2. Click somewhere else to blur

**Expected**
- Field shows `10`
- `SaveStatusLine` cycles `Saving…` → `Saved` (debounced save fires on pause or blur)

**Context:** Distribution input mechanics are covered by `004_Duration_Editor_Tests`. `EnhancedDurationEditor.onChange` runs per keystroke; auto-save debounces.

### GEN-FREQ-002 — Change interarrival time unit [P2]

**Preconditions**
- Generator with Frequency type; Settings tab open

**Steps**
1. In `Time Between Arrivals`, change the period-unit dropdown (e.g. Hours → Minutes)

**Expected**
- The numeric value is unchanged; only the unit changes
- `SaveStatusLine` cycles `Saving…` → `Saved`

**Context:** Period units come from `PeriodUnit`; covered exhaustively in `004_Duration_Editor_Tests`.

### GEN-FREQ-003 — Change interarrival distribution type [P2]

**Preconditions**
- Generator with Frequency type; Settings tab open

**Steps**
1. In `Time Between Arrivals`, change the distribution dropdown (e.g. Constant → Exponential or Uniform)

**Expected**
- The parameter inputs change to match the new distribution (Constant: single value; Exponential: mean; Uniform: min/max; Normal: mean + stdev; etc.)
- `SaveStatusLine` cycles `Saving…` → `Saved`

**Context:** Distribution input mechanics are owned by `EnhancedDurationEditor` (`004_Duration_Editor_Tests`).

### GEN-FREQ-004 — Negative interarrival value flagged via model validation [P3]

**Preconditions**
- Generator with Frequency type; Settings tab open

**Steps**
1. Try setting `Time Between Arrivals` distribution value to `-1`
2. Check the model Validation panel

**Expected**
- The duration editor may clamp the input at write time (input `min="0"` where present)
- If a negative value reaches the model, `GeneratorValidation` raises an ERROR: `Duration value must be non-negative`
- No in-editor `Fix to save:` banner exists for this case — the editor's own validity is only gated on name (`isValid = nameError === null`); duration values are not blocked at the editor level today

**Context:** `GeneratorValidation.validateDurationSettings` uses `getDurationValue` to extract Constant values and pushes `'period interval duration'` issues. Stochastic distributions are skipped.

---

## Settings — Advanced Settings (collapsible)

### GEN-ADV-001 — Expand and collapse Advanced Settings [P2]

**Preconditions**
- Generator selected with Frequency type; Settings tab open

**Steps**
1. Locate the `Advanced Settings` row (below Time Between Arrivals)
2. Click to expand (chevron rotates from right → down)
3. Click again to collapse

**Expected**
- Default state is **collapsed** on a freshly selected generator
- Expanded view reveals: `Periodic Occurrences`, `Start Delay` (a duration editor), and a `Generation Limits` 2-column grid containing `Entities Per` (= entitiesPerCreation) and `Max Entities`

### GEN-FREQ-005 — Edit periodic occurrences [P1]

**Preconditions**
- Generator with Frequency type; Settings tab open; Advanced Settings expanded

**Steps**
1. Click `Periodic Occurrences`
2. Clear, type `100`
3. Tab out

**Expected**
- Field shows `100`
- `SaveStatusLine` cycles `Saving…` → `Saved`

### GEN-FREQ-006 — Unlimited periodic occurrences (999999) [P2]

**Preconditions**
- Generator with Frequency type; Settings tab open; Advanced Settings expanded

**Steps**
1. In `Periodic Occurrences`, clear and type `999999`
2. Tab out

**Expected**
- Field accepts `999999` (the editor's `INFINITY_DISPLAY_VALUE`)
- `SaveStatusLine` cycles `Saving…` → `Saved`

**Context:** `INFINITY_DISPLAY_VALUE = 999999` in `GeneratorEditor.tsx`. The model validator treats only the JS `Infinity` sentinel as "unlimited"; `999999` flows through as a plain finite number to validation, which is still > 0 and so passes.

### GEN-FREQ-007 — Zero periodic occurrences blocked by validation [P3]

**Preconditions**
- Generator with Frequency type; Settings tab open; Advanced Settings expanded

**Steps**
1. In `Periodic Occurrences`, clear and type `0`
2. Tab out
3. Open the Validation panel

**Expected**
- The editor's `parseInt(value) || INFINITY_DISPLAY_VALUE` fallback **converts the input `0` to `999999`** before storage (because `0` is falsy in JS) — i.e. you typically can't store a literal `0` here through normal typing
- If a `0` reaches the model (import path or paste of negative coerced to 0), `GeneratorValidation` raises an ERROR: `periodic occurrences — Must be Infinity or a number greater than 0`

**Context:** `handleInputChange`'s `parseInt(value) || INFINITY_DISPLAY_VALUE` pattern.

### GEN-FREQ-008 — Edit start delay [P2]

**Preconditions**
- Generator with Frequency type; Settings tab open; Advanced Settings expanded

**Steps**
1. In the `Start Delay` duration editor, edit the numeric value (e.g. `30`)
2. Blur

**Expected**
- `SaveStatusLine` cycles `Saving…` → `Saved`
- The generator waits the new delay before its first creation event

### GEN-FREQ-009 — Edit entities per creation [P1]

**Preconditions**
- Generator with Frequency type; Settings tab open; Advanced Settings expanded

**Steps**
1. In the `Entities Per` field (left side of `Generation Limits` grid), clear and type `5`
2. Tab out

**Expected**
- Field shows `5`
- `SaveStatusLine` cycles `Saving…` → `Saved`

**Context:** Validator allows 1-1000 (`MIN_ENTITIES_PER_CREATION`/`MAX_ENTITIES_PER_CREATION`).

### GEN-FREQ-010 — Edit max entities [P1]

**Preconditions**
- Generator with Frequency type; Settings tab open; Advanced Settings expanded

**Steps**
1. In the `Max Entities` field (right side of `Generation Limits` grid), clear and type `1000`
2. Tab out

**Expected**
- Field shows `1000`
- `SaveStatusLine` cycles `Saving…` → `Saved`

### GEN-FREQ-011 — Unlimited max entities (999999) [P2]

**Preconditions**
- Generator with Frequency type; Settings tab open; Advanced Settings expanded

**Steps**
1. In `Max Entities`, clear and type `999999`
2. Tab out

**Expected**
- Field accepts `999999`
- `SaveStatusLine` cycles `Saving…` → `Saved`

**Context:** `INFINITY_DISPLAY_VALUE`. Same caveat as occurrences: validation treats only JS `Infinity` as truly unlimited, but `999999` passes the validator's range check (`MAX_MAX_ENTITIES = 1000000`).

### GEN-FREQ-012 — Negative numeric input coerced [P3]

**Preconditions**
- Generator with Frequency type; Settings tab open; Advanced Settings expanded

**Steps**
1. Click any of: `Periodic Occurrences`, `Entities Per`, `Max Entities`
2. Clear and type `-1`
3. Tab out

**Expected**
- Either the input's `min` attribute (`min="0"` for occurrences, `min="1"` for entities-per/max) blocks `-1`, or the `parseInt(value) || …` fallback coerces the parsed `NaN` / negative outcome to the default (`INFINITY_DISPLAY_VALUE` for occurrences/max; `1` for entities per)
- `SaveStatusLine` settles on `Saved` (no `Fix errors to save` — only the name field is editor-gated)

---

## Time Distribution [SKIP-COMING-SOON]

> **All tests in this section are SKIPPED in current builds**: the `Time-Distributed` option in the `Generator Type` dropdown is `disabled` ("Coming Soon"), so users cannot reach this UI through the editor. The modal code paths exist in `GeneratorEditor.tsx` (`handleAddPattern`, `handleSaveConfig`, `TimePatternEditorModal`, `TimeDistributedConfigEditorModal`) but are gated. When Time-Distributed ships, un-skip these and update the precondition for each to "force `generatorType = TIME_DISTRIBUTED` (currently requires direct model edit / dev override)".

### GEN-DIST-001 — Add new time pattern [P1] [SKIP-COMING-SOON]

**Preconditions**
- Generator selected with `generatorType = TIME_DISTRIBUTED` (force via dev override)
- Settings tab open; Time Patterns section visible

**Steps**
1. Click the blue `Add Pattern` button

**Expected**
- A `TimePatternEditorModal` opens with empty fields
- Save in the modal adds the new pattern to the list and updates reference data
- Cancel closes the modal without changes

### GEN-DIST-002 — Edit existing time pattern [P1] [SKIP-COMING-SOON]

**Preconditions**
- TIME_DISTRIBUTED generator with at least one existing pattern

**Steps**
1. Click `Edit` on a pattern row

**Expected**
- Modal opens pre-filled with the pattern's data; Save persists changes; Cancel discards

### GEN-DIST-003 — Delete time pattern with confirm [P2] [SKIP-COMING-SOON]

**Preconditions**
- TIME_DISTRIBUTED generator with at least one pattern

**Steps**
1. Click `Delete` on a pattern row
2. Confirm the browser confirm dialog (`Are you sure you want to delete this pattern?`)

**Expected**
- Pattern is removed; reference data updates

### GEN-DIST-004 — Cancel delete time pattern [P3] [SKIP-COMING-SOON]

**Preconditions**
- TIME_DISTRIBUTED generator with at least one pattern

**Steps**
1. Click `Delete` on a pattern row
2. Click `Cancel` in the confirm dialog

**Expected**
- Pattern remains in the list; no changes

### GEN-DIST-005 — Add new distribution config [P1] [SKIP-COMING-SOON]

**Preconditions**
- TIME_DISTRIBUTED generator; Settings tab open

**Steps**
1. Click the blue `Add Config` button under Distribution Configurations

**Expected**
- A `TimeDistributedConfigEditorModal` opens; Save adds the new config

### GEN-DIST-006 — Edit existing distribution config [P1] [SKIP-COMING-SOON]

**Preconditions**
- TIME_DISTRIBUTED generator with at least one config

**Steps**
1. Click `Edit` on a config row

**Expected**
- Modal opens pre-filled; Save persists; Cancel discards

### GEN-DIST-007 — Delete distribution config with confirm [P2] [SKIP-COMING-SOON]

**Preconditions**
- TIME_DISTRIBUTED generator with at least one config

**Steps**
1. Click `Delete` on a config row; confirm

**Expected**
- Config is removed; if it was associated with the current generator, it is also removed from `timeDistributedConfigIds`

### GEN-DIST-008 — Toggle config association (check) [P1] [SKIP-COMING-SOON]

**Preconditions**
- TIME_DISTRIBUTED generator; at least one config unchecked

**Steps**
1. Click the checkbox next to an unchecked config

**Expected**
- Checkbox becomes checked; config id is added to the generator's `timeDistributedConfigIds`
- Row turns blue-tinted (`bg-blue-50` + blue border)
- `SaveStatusLine` cycles `Saving…` → `Saved` (debounced)

### GEN-DIST-009 — Toggle config association (uncheck) [P2] [SKIP-COMING-SOON]

**Preconditions**
- TIME_DISTRIBUTED generator; at least one config checked

**Steps**
1. Click the checkbox next to a checked config

**Expected**
- Checkbox empties; config id is removed from `timeDistributedConfigIds`
- Row returns to neutral styling
- `SaveStatusLine` cycles `Saving…` → `Saved`

### GEN-DIST-010 — Multiple config associations [P2] [SKIP-COMING-SOON]

**Preconditions**
- TIME_DISTRIBUTED generator; 3+ configs available

**Steps**
1. Check 3 different configs in succession
2. Re-select the generator after save settles

**Expected**
- All 3 checkboxes remain checked after re-select
- `timeDistributedConfigIds` contains all 3 ids

---

## Event Modifications (Initial State)

### GEN-EVENT-001 — View initial state modifications list [P2]

**Preconditions**
- Generator selected; Event Modifications tab open
- At least one model-level State is defined

**Steps**
1. Inspect the tab content

**Expected**
- A `StateModificationsEditor` is shown titled `Initial State Modifications` with description `Applied to new entities`
- An empty-state message or list of existing modifications appears
- A control to navigate to the Model Editor's States tab is available (`Manage states at the Model level` — opens the Model Editor on the `states` tab)

### GEN-EVENT-002 — Add initial state modification [P1]

**Preconditions**
- Generator selected; Event Modifications tab open
- At least one model-level State is defined

**Steps**
1. Add a new modification (select state + value via the `StateModificationsEditor` controls)

**Expected**
- New row appears in the list
- `SaveStatusLine` cycles `Saving…` → `Saved` after debounce — state-modification changes are routed through the unified debounced auto-save path
- After save, generated entities are seeded with this state value

**Context:** `handleStateModificationsChange` updates `localGeneratorDraft.generationConfig.initialStateModifications` and sets `hasPendingChanges = true`; `useAutoSave` dispatches the save.

### GEN-EVENT-003 — Edit existing state modification [P1]

**Preconditions**
- Generator with at least one existing initial state modification

**Steps**
1. Change the value (or state selection) on an existing modification

**Expected**
- Row updates locally
- `SaveStatusLine` cycles `Saving…` → `Saved` after debounce

### GEN-EVENT-004 — Delete state modification [P2]

**Preconditions**
- Generator with at least one existing initial state modification

**Steps**
1. Click the delete control on a modification row

**Expected**
- Row removed
- `SaveStatusLine` cycles `Saving…` → `Saved`

### GEN-EVENT-005 — Defensive cleanup of stale state references [P3]

**Preconditions**
- Generator with an initial state modification referencing State X
- Delete State X from the Model Editor

**Steps**
1. Return to the Generator's Event Modifications tab

**Expected**
- The modification for the deleted state is filtered out automatically (defensive `mods.filter(mod => states.getByUniqueId(mod.stateUniqueId) !== undefined)`)
- `SaveStatusLine` settles on `Saved` after the cleanup save

**Context:** `handleStateModificationsChange` defensively drops modifications whose `stateUniqueId` is no longer present.

---

## Form Sync

### GEN-SYNC-001 — Switch to a different generator loads new data [P1]

**Preconditions**
- Model has at least 2 Generators with distinct names; Generator A is in the panel

**Steps**
1. Click Generator B in the diagram
2. Inspect the panel

**Expected**
- Panel reloads with Generator B's values across all visible fields
- `SaveStatusLine` resets to `Saved` for the new element

### GEN-SYNC-002 — Switching generator flushes pending edits [P1]

**Preconditions**
- Model has at least 2 Generators
- Generator A selected; Settings tab open

**Steps**
1. Click `Generator Name`, change it to `MODIFIED`
2. **Without blurring**, click Generator B in the diagram
3. Click Generator A again

**Expected**
- The mid-edit change is **flushed** when you switch away (the auto-save hook detects the element switch and dispatches the pending draft)
- When you return to Generator A, the name shows `MODIFIED` (the edit was saved, not discarded)

**Context:** **This is the opposite of the legacy Save/Cancel behavior.** Under debounce auto-save, element-switch acts as an implicit blur. The pending draft is captured and drained after any in-flight save completes (silently — no status surfaced in the new element's panel).

### GEN-SYNC-003 — External update syncs to form [P3]

**Preconditions**
- Same Quodsi document open in two browser windows
- Generator A selected in both

**Steps**
1. In Window 2: change Generator A's name to `Changed by Window 2`, blur, wait for `Saved`
2. In Window 1: wait, then click off and back onto Generator A (or wait for collaborative sync)

**Expected**
- Window 1 eventually shows the new name
- Sync may be near-immediate or require re-selection — record observed behavior

---

## Edge Cases

### GEN-EDGE-001 — Very long generator name (500+ characters) [P3]

**Preconditions**
- Generator selected; Settings tab open
- Have a 500+ character string ready (e.g. `abcdefghij` × 50)

**Steps**
1. Paste the long string into `Generator Name`
2. Tab out

**Expected**
- Field accepts the long value without crashing or breaking panel layout (may scroll horizontally)
- `SaveStatusLine` cycles `Saving…` → `Saved` (assuming the name is still unique)
- No max-length truncation in the UI; document any limits observed

### GEN-EDGE-002 — Rapid successive edits collapse into one save [P3]

**Preconditions**
- Generator selected; Settings tab open

**Steps**
1. Click `Generator Name`
2. Type many characters very quickly (e.g. 20 chars in < 500 ms), do NOT blur
3. Stop typing and watch `SaveStatusLine`

**Expected**
- During rapid typing, no save fires (debounce timer keeps resetting)
- ~500 ms after the last keystroke, `SaveStatusLine` briefly shows `Saving…` then `Saved`
- Only ONE save round-trip occurs (replaces the legacy "rapid Save button clicks" test, which no longer applies)

**Context:** `debounceMs = 500` in `useAutoSave`. The old rapid-click test is obsolete because there's no Save button to spam.

### GEN-EDGE-003 — Very large numbers in numeric fields [P3]

**Preconditions**
- Generator with Frequency type; Settings tab open; Advanced Settings expanded

**Steps**
1. In any numeric field (`Periodic Occurrences`, `Entities Per`, `Max Entities`), try `999999999` (9 nines)
2. Tab out
3. Open the Validation panel

**Expected**
- The field accepts the value (no client-side `max` attribute caps it on these inputs)
- For `Max Entities`, validation flags an ERROR: `Must be Infinity or between 1 and 1000000` (value exceeds `MAX_MAX_ENTITIES`)
- For `Entities Per Creation`, validation flags an ERROR: `Must be between 1 and 1000` (exceeds `MAX_ENTITIES_PER_CREATION`)
- For `Periodic Occurrences`, no upper cap — passes validation
- `SaveStatusLine` still settles on `Saved` (editor isn't gated on these validators — they surface only in the Validation panel)

### GEN-EDGE-004 — Browser refresh preserves auto-saved edits [P3]

**Preconditions**
- Generator selected; Settings tab open

**Steps**
1. Edit `Generator Name` to a new value
2. Tab out, wait for `SaveStatusLine` to show `Saved`
3. Press F5 to refresh the browser
4. Re-select the same Generator

**Expected**
- The new name is preserved — auto-save flushed on blur before refresh
- Variant: if you refresh during the ~500 ms debounce window without blurring, the pending edit may be lost. Document observed behavior.

**Context:** **This is the opposite of the legacy expectation.** With auto-save, anything that has been flushed (blurred or 500 ms elapsed) is durable across refresh. There's no longer an "unsaved changes" warning because there's no manual save step.

### GEN-EDGE-005 — Corrupt generator data handling [P3]

**Preconditions**
- Way to inject corrupt generator data (may need developer help — e.g. directly mutate shape data so `generator.id` is empty)

**Steps**
1. Select the corrupted Generator in the diagram

**Expected**
- The editor renders the guard message `Invalid generator data` (red text) and nothing else
- The extension does not crash; other generators remain selectable

**Context:** Guard at the top of the render path: `if (!generator?.id) { return <div className="text-red-500 text-sm">Invalid generator data</div>; }`.

---

## Model Validation

### GEN-MVAL-001 — Generator without exit connector shows ERROR [P1]

**Preconditions**
- A Generator with no outgoing connector

**Steps**
1. Open the Validation panel
2. Look for entries referencing this generator

**Expected**
- A model-level validation **ERROR** appears for the generator with message similar to `Generator must have an exit connector to route generated entities` (from `GeneratorValidation.validateExitConnector`) and/or `Generator <name> has no outgoing connectors. Entities cannot flow into the system.` (from `GeneratorPathValidation`)

**Context:** Two validators fire on this case: `GeneratorValidation` (no exit connector) and `GeneratorPathValidation` (no terminal reachable). Both raise ERROR severity.

### GEN-MVAL-002 — Generator with multiple exit connectors shows WARNING [P2]

**Preconditions**
- A Generator with 2+ outgoing connectors (e.g. to Activity A and Activity B)

**Steps**
1. Open the Validation panel

**Expected**
- A model-level **WARNING** appears with message similar to `Generator '<name>' has N exit connectors; only the first will be used for routing`

**Context:** Generators route all created entities to a single destination — extras are dropped. Source: `GeneratorValidation.validateExitConnector`.

### GEN-MVAL-003 — Missing entity reference shows ERROR [P2]

**Preconditions**
- A Generator referencing an Entity that has been deleted from the model

**Steps**
1. Open the Validation panel

**Expected**
- A model-level **ERROR** appears: `References non-existent entity <entityId>` (from `GeneratorValidation.validateEntitySettings`)

### GEN-MVAL-004 — Missing generator name shows ERROR [P1]

**Preconditions**
- A Generator whose name is empty (the editor blocks this in normal use; reachable via import or external edit)

**Steps**
1. Open the Validation panel

**Expected**
- Editor blocks empty-name save in-place (`Name is required` + `Fix errors to save`)
- If an empty name reaches the model (import path), Validation panel shows the missing-name issue (`ValidationMessages.missingName('Generator', …)`)

### GEN-MVAL-005 — Missing generationConfig shows ERROR [P2]

**Preconditions**
- Corrupt-data scenario: a Generator with no `generationConfig` object (typically requires dev intervention)

**Steps**
1. Open the Validation panel

**Expected**
- A model-level **ERROR** appears: `Generator is missing generationConfig - please re-edit and save` (from `GeneratorValidation.validate`)

### GEN-MVAL-006 — Invalid entities per creation shows ERROR [P1]

**Preconditions**
- Generator with `entitiesPerCreation = 0` or `> 1000` (typically reachable via large paste — the editor's `parseInt || 1` coerces `0`/NaN to `1`, so this is mostly an import-path case)

**Steps**
1. Open the Validation panel

**Expected**
- A model-level **ERROR** appears: `Must be between 1 and 1000`

**Context:** `MIN_ENTITIES_PER_CREATION = 1`, `MAX_ENTITIES_PER_CREATION = 1000`.

### GEN-MVAL-007 — Invalid max entities shows ERROR [P2]

**Preconditions**
- Generator with `maxEntities = 0`, negative, or `> 1000000`

**Steps**
1. Open the Validation panel

**Expected**
- A model-level **ERROR** appears: `Must be Infinity or between 1 and 1000000`

### GEN-MVAL-008 — Missing period interval duration shows ERROR [P2]

**Preconditions**
- Generator with no/invalid `periodIntervalDuration` (corrupt data or import edge case)

**Steps**
1. Open the Validation panel

**Expected**
- A model-level **ERROR** appears: `Must have a valid duration with distribution`

### GEN-MVAL-009 — Negative period interval duration shows ERROR [P2]

**Preconditions**
- Generator with a Constant interarrival distribution whose value is negative

**Steps**
1. Open the Validation panel

**Expected**
- A model-level **ERROR** appears: `Duration value must be non-negative`

**Context:** Only Constant distributions are evaluated; stochastic distributions are skipped (`getDurationValue` returns `undefined` for non-CONSTANT types).

### GEN-MVAL-010 — Negative start delay shows ERROR [P2]

**Preconditions**
- Generator with a Constant `periodicStartDuration` whose value is negative

**Steps**
1. Open the Validation panel

**Expected**
- A model-level **ERROR** appears: `periodic start duration — Duration value must be non-negative`

### GEN-MVAL-011 — Start delay exceeds interval shows WARNING [P2]

**Preconditions**
- Generator with Constant durations: start delay > interval (both > 0)

**Steps**
1. Open the Validation panel

**Expected**
- A model-level **WARNING** appears: `Generator '<name>' has start delay (X) longer than interval (Y)` (rule `generator_start_exceeds_interval`)

### GEN-MVAL-012 — May exceed max entities shows WARNING [P2]

**Preconditions**
- Generator with finite values where `periodicOccurrences × entitiesPerCreation > maxEntities` (e.g. 100 × 20 = 2000, maxEntities = 500)

**Steps**
1. Open the Validation panel

**Expected**
- A model-level **WARNING** appears: `Generator <id> may reach maximum entities limit before completing all periodic occurrences` (rule `generator_max_entities_limit`)

### GEN-MVAL-013 — High entity generation rate shows WARNING [P3]

**Preconditions**
- One or more Generators whose combined Constant interarrival rate exceeds 1000 entities/second (e.g. very small interval + large `entitiesPerCreation`)

**Steps**
1. Open the Validation panel

**Expected**
- A model-level **WARNING** appears: `High entity generation rate detected (<N> entities/second)` (rule `high_entity_generation_rate`)

**Context:** Computed across all generators in `validateGeneratorInteractions`; stochastic durations are excluded.

### GEN-MVAL-014 — Dead-end path from generator shows ERROR [P2]

**Preconditions**
- Generator → Activity A → (no outgoing). Wait, Activity A is a terminal — pass. Try: Generator → Activity A → Activity B, where B has an outgoing connector whose `targetId` is missing/unreachable, so B is a dead-end.

**Steps**
1. Open the Validation panel

**Expected**
- A model-level **ERROR** appears from `GeneratorPathValidation`: `Generator <name> has paths that lead to non-terminal Activities with no exit: <names>. Entities may get stuck.` (rule `generator_dead_end_path`)

**Context:** `GeneratorPathValidation` BFSes from the generator; any reachable activity that has outgoing connectors but none lead to other reachable activities is reported as a dead-end.

### GEN-MVAL-015 — No reachable terminal shows ERROR [P2]

**Preconditions**
- Generator whose paths form a closed cycle (e.g. Generator → A → B → A) with no exit

**Steps**
1. Open the Validation panel

**Expected**
- A model-level **ERROR** appears: `Generator <name> has no path to a terminal Activity. All paths lead to dead-ends or loops without exits.` (rule `generator_no_terminal_path`)

### GEN-MVAL-016 — Fixing a validation error clears it [P1]

**Preconditions**
- Generator with a known model-level validation error (e.g. no exit connector)

**Steps**
1. Fix the underlying issue (e.g. add an outgoing connector to a terminal Activity)
2. Wait for auto-save to complete (`SaveStatusLine` shows `Saved`)
3. Re-check the Validation panel

**Expected**
- The error entry disappears as soon as the model state is corrected

### GEN-MVAL-017 — Multiple validation issues shown for same generator [P2]

**Preconditions**
- Create a Generator with several problems: no exit connector, empty name, `entitiesPerCreation = 5000` (above max)

**Steps**
1. Open the Validation panel

**Expected**
- All distinct issues are listed (not just the first one): no-exit-connector ERROR, missing-name ERROR, entities-per-creation ERROR, and the path-validation `generator_no_outgoing` ERROR

### GEN-MVAL-018 — Clicking validation error navigates to element [P2]

**Preconditions**
- Validation panel shows at least one error for a Generator you're not currently editing

**Steps**
1. Click the error entry

**Expected**
- The diagram selects the offending Generator and the Generator Editor opens to it

---

## Auto-Save Behavior (Cross-Cutting)

These tests verify the auto-save mechanism itself. Other sections assert "`SaveStatusLine` cycles `Saving…` → `Saved`"; these tests verify that statement is accurate.

### GEN-AUTOSAVE-001 — Text field uses 500 ms debounce [P1]

**Preconditions**
- Generator selected; Settings tab open

**Steps**
1. Click `Generator Name`
2. Type 3 characters quickly, **do not** tab out
3. Wait ~500 ms

**Expected**
- During typing: `SaveStatusLine` does not show `Saved` settling — it transitions through `Saving…` only after typing pauses
- ~500 ms after the last keystroke: `SaveStatusLine` shows `Saving…` briefly, then `Saved`

**Context:** Debounce is `debounceMs = 500` in `useAutoSave`.

### GEN-AUTOSAVE-002 — Blur on text field triggers immediate save [P1]

**Preconditions**
- Generator selected; Settings tab open

**Steps**
1. Click `Generator Name`
2. Type 1 character
3. Immediately Tab out (within < 500 ms)

**Expected**
- `SaveStatusLine` shows `Saving…` immediately (the blur calls `saveNow()` which bypasses the debounce timer)
- Then settles on `Saved`

**Context:** The `Generator Name`, `Periodic Occurrences`, `Entities Per`, and `Max Entities` inputs all have `onBlur={saveNow}`.

### GEN-AUTOSAVE-003 — Select dropdown change saves immediately [P1]

**Preconditions**
- Generator selected; Settings tab open
- Model has at least 2 entities

**Steps**
1. Change the `Entity` dropdown to a different entity
2. Do **not** click elsewhere

**Expected**
- `SaveStatusLine` shows `Saving…` immediately on change (no debounce, no blur required)
- Then settles on `Saved`

**Context:** Driven by `useFlushOnChange(localGeneratorDraft.generationConfig.entityId, saveNow)`. The same mechanism is wired for `generatorType`, though Time-Distributed is UI-disabled so only the no-op `Frequency-Based → Frequency-Based` re-selection is possible in production.

### GEN-AUTOSAVE-004 — Invalid name blocks save, fixing it resumes [P1]

**Preconditions**
- Generator selected; Settings tab open

**Steps**
1. Clear `Generator Name` (triggers `Name is required`)
2. Observe `SaveStatusLine`
3. Type any unique name
4. Observe again

**Expected**
- Step 2: `SaveStatusLine` shows `Fix errors to save` (yellow triangle); no save fires while the name is invalid
- Step 4: After ~500 ms (or on blur), `SaveStatusLine` cycles `Saving…` → `Saved`

**Context:** `isValid: nameError === null` in the `useAutoSave` call. Only the name field is editor-gated — invalid numeric values reach the Validation panel rather than blocking the editor's own save.

### GEN-AUTOSAVE-005 — Element switch flushes pending edit [P1]

**Preconditions**
- Two Generators A and B in the model
- Generator A selected; Settings tab open

**Steps**
1. Click `Periodic Occurrences` (or `Generator Name`), change the value
2. Without blurring, immediately click Generator B in the diagram
3. Click Generator A again

**Expected**
- Generator A's change is preserved — the element-switch effect detected the pending draft and dispatched a save (drained silently if a save was already in flight)

**Context:** This is the auto-save hook's element-switch flush behavior; matches `GEN-SYNC-002`.

### GEN-AUTOSAVE-006 — State modification change uses same debounced save path [P2]

**Preconditions**
- Generator selected; Event Modifications tab open; at least one model-level State exists

**Steps**
1. Add or edit an Initial State Modification

**Expected**
- `SaveStatusLine` cycles `Saving…` → `Saved` after debounce (NOT immediately)
- This matches the unified save path called out in the editor comments ("routed through debounce; replaces previous direct-onSave path")

**Context:** `handleStateModificationsChange` updates `localGeneratorDraft` and marks `hasPendingChanges = true`; `useAutoSave` does the rest.
