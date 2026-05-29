# 009 — Model States Editor Tests

Suite of manual / agent-driven QA tests for the **States Editor** (model-level state definitions) in the Quodsi LucidChart extension.

## How to read this file

Each test is a small block: **ID — Name [Priority]**, then **Preconditions**, **Steps**, **Expected**, and (sometimes) **Context** — author notes that explain a subtle assertion or point at the source-of-truth code. Tests can be run by a human or by an AI agent walking the file top-to-bottom.

## How to record a run

Don't edit this file. For each run, create a new file under `_qa/runs/` and **log only failures** — silence means pass. See `_qa/runs/README.md` for the run-file template.

## Scope (read once)

States are **model-level** definitions, not activity-level. They live on the `Model` object and are edited via the **Model Editor → State Definitions tab** (the `states` tab, Hash icon). The Activity Editor no longer has a States tab — its old States tab was removed (the code is commented out in `ActivityEditor.tsx`). When you see a test refer to "the States tab" or "the States panel," it means **Model Editor → State Definitions**.

A state's `componentType` is one of `MODEL`, `ENTITY`, `RESOURCE`, `ACTIVITY`. The `componentType` is metadata that determines which simulation object the state attaches to at runtime — it does **not** put the editor onto an activity. All four are edited from the same Model Editor panel.

## Save model for the States panel (read once)

Unlike the Basic Settings tab, the States panel does **not** render a `SaveStatusLine`. State CRUD goes through a dialog:

- `+ Add State` opens `StateFormDialog`. The dialog has explicit **Add State** / **Cancel** buttons (inside the dialog only — these are not tab-level).
- Edit (pencil icon) opens the same dialog pre-populated, with **Save Changes** / **Cancel** buttons.
- Delete (trash icon) replaces the modal with an **inline red confirmation card** at the top of the list with **Delete State** / **Cancel** buttons.

Each successful dialog submit (or delete confirmation) calls `onStatesChange(updatedStates)`. Per `ModelEditor.tsx` docs ("States tab: Auto-saves immediately via parent `onStatesChange`"), the change is persisted right away by the parent — no debounce, and no tab-level save control. If you switch to the Basic Settings tab after a state edit, that tab's `SaveStatusLine` should already read `Saved`.

To undo a saved change, use LucidChart's native **Ctrl+Z**.

## Tab layout

The Model Editor has **5 tabs**. States is the 2nd:

| # | Icon | Title | Internal id |
|---|---|---|---|
| 1 | Settings (gear) | Basic Settings | `basic` |
| 2 | Hash (#) | State Definitions | `states` |
| 3 | Users | Resource Requirements | `requirements` |
| 4 | PlaySquare | Scenarios | `scenarios` |
| 5 | Alert triangle | Validation | `validation` |

Hover any icon to see its full tooltip.

---

## Tab Navigation

### SM-NAV-001 — Open States tab in Model Editor [P1]

**Preconditions**
- LucidChart document open with a Quodsi model
- Click on the canvas (no shape selected) so the Model Editor opens on the right

**Steps**
1. In the tab bar at the top of the Model Editor, click the **Hash** icon (2nd icon — tooltip: "State Definitions")

**Expected**
- Hash icon is highlighted (blue underline, blue tint)
- Content area shows the States panel: header with `States` label, a `Filter` icon + filter dropdown, an `+ Add State` button, a count line, and the list (empty or populated)

### SM-NAV-002 — Filter dropdown defaults to All Components [P1]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. Look at the filter dropdown in the panel header

**Expected**
- Dropdown shows `All Components` selected by default
- Dropdown options are: `All Components`, `MODEL Only`, `ENTITY Only`, `RESOURCE Only`, `ACTIVITY Only`

**Context:** `StatesEditor` is rendered with `defaultComponentType="ALL"` from `ModelEditor.tsx`.

### SM-NAV-003 — Filter by component type [P2]

**Preconditions**
- States of multiple component types exist (at least one MODEL + one ENTITY state)
- Model Editor → State Definitions tab open

**Steps**
1. Click the filter dropdown
2. Select `ENTITY Only`
3. Inspect the list
4. Change the filter to `MODEL Only`
5. Inspect again

**Expected**
- ENTITY filter: only `ENTITY` states are listed; the count line reads `N state(s) for entity`
- MODEL filter: only `MODEL` states are listed; the count line reads `N state(s) for model`
- Switching the filter does not delete any states — they reappear on `All Components`

### SM-NAV-004 — All Components filter shows every state [P2]

**Preconditions**
- States of multiple component types exist
- Filter currently set to a specific type

**Steps**
1. Open the filter dropdown
2. Select `All Components`

**Expected**
- All states are listed regardless of component type
- Count line reads `N states total` (or `1 state total`)

### SM-NAV-005 — Add State button always visible [P1]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. Look at the panel header (top right of the filter row)

**Expected**
- A blue `+ Add State` button is visible to the right of the filter
- Button is enabled regardless of the current filter
- Hovering shows pointer cursor

### SM-NAV-006 — States count updates dynamically [P3]

**Preconditions**
- Model Editor → State Definitions tab open
- Note the current count from the count line below the filter row

**Steps**
1. Click `+ Add State`, fill the dialog (any valid state), click `Add State`
2. Observe the count line
3. Click trash on any state, confirm `Delete State`
4. Observe the count line again

**Expected**
- Count increments after the add and the new state appears in the list
- Count decrements after the delete and the deleted state disappears
- No page reload is needed

### SM-NAV-007 — Info icon tooltip on States header [P3]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. Hover the small `i` (Info) icon next to the `States` label in the header

**Expected**
- Tooltip reads (approximately): `State variables track custom numeric or text values on simulation objects. Use states for conditional routing, tracking entity attributes (e.g., priority level), or counting occurrences.`

---

## CRUD Operations

### SM-CRUD-001 — Add a new state via the dialog [P1]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. Click `+ Add State`
2. In the dialog, enter Name `TestState`
3. Leave Data Type as `NUMBER` (default), Initial Value `0` (default)
4. Click `Add State` (footer button)

**Expected**
- Dialog closes
- A new entry `TestState` appears in the list, with its component type and type label visible
- The change is persisted immediately via `onStatesChange` (switch to Basic Settings: `SaveStatusLine` reads `Saved`)

**Context:** Dialog component is `StateFormDialog`; submit handler is `handleSave` → calls `onSave`/`onStatesChange`.

### SM-CRUD-002 — Edit a state via the pencil icon [P1]

**Preconditions**
- At least one state exists

**Steps**
1. Locate a state in the list
2. Click its **pencil/edit** icon
3. In the dialog, change Name to `UpdatedState`
4. Click `Save Changes` (footer button)

**Expected**
- Dialog header reads `Edit State`
- Dialog pre-populates with the existing state's values (Name, Component Type, Data Type, Initial Value, Description, Collect Statistics)
- After save, dialog closes and the list shows `UpdatedState`
- Other properties unchanged
- Change persisted via `onStatesChange`

### SM-CRUD-003 — Delete a state via the trash icon [P1]

**Preconditions**
- At least one state exists that you're willing to delete

**Steps**
1. Click the **trash/delete** icon on a state row
2. An inline red confirmation card appears at the top of the panel
3. Click `Delete State` in the confirmation card

**Expected**
- Confirmation card disappears
- State is removed from the list immediately
- No popup modal is used — confirmation is inline within the panel
- Change persisted via `onStatesChange`

### SM-CRUD-004 — Delete confirmation card content [P2]

**Preconditions**
- At least one state exists; note its name

**Steps**
1. Click the trash icon on that state
2. Read the inline red confirmation card

**Expected**
- Header reads `Delete State: "<name>"?`
- Card warns the state may be referenced in: Activity state modifications (pre/post processing), Generator initial state modifications, Operation step state modifications
- Card states `These references will be automatically removed. This action cannot be undone.`
- Two buttons: red `Delete State` and gray `Cancel`

### SM-CRUD-005 — Cancel delete keeps the state [P2]

**Preconditions**
- At least one state exists

**Steps**
1. Note the current state list
2. Click the trash icon on a state
3. In the inline confirmation card, click `Cancel`

**Expected**
- Confirmation card disappears
- State remains in the list, unchanged
- No `onStatesChange` save fires

### SM-CRUD-006 — States change persists across tab switches [P1]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. Add a new state named `AutoSaveTest` (any valid type and value)
2. Switch to the **Basic Settings** tab
3. Inspect the Basic Settings `SaveStatusLine`
4. Switch back to the **State Definitions** tab

**Expected**
- The States panel does **not** show a SaveStatusLine of its own (it's only on Basic Settings).
- After returning to States, `AutoSaveTest` is still in the list (the dialog's submit persists via `onStatesChange` immediately — no debounce, no separate "Save" step).
- Closing and reopening the model preserves the state.

**Context:** ModelEditor docstring: "States tab: Auto-saves immediately via parent `onStatesChange`."

### SM-CRUD-007 — Edit dialog shows existing values [P2]

**Preconditions**
- A state exists with known values, e.g. Name=`MyState`, Type=`NUMBER`, Initial=`42`, Description=`Test description`

**Steps**
1. Click the pencil icon on that state
2. Inspect each field

**Expected**
- Name field shows `MyState`
- Component Type dropdown shows the correct value
- Data Type dropdown shows `NUMBER`
- Initial Value shows `42`
- Description shows `Test description`
- Collect Statistics checkbox matches the stored value

### SM-CRUD-008 — Cancel edit discards changes [P2]

**Preconditions**
- A state exists with known values

**Steps**
1. Click the pencil icon
2. Change Name to `ChangedName` and modify Initial Value
3. Click `Cancel` (footer button) or the `X` in the dialog header

**Expected**
- Dialog closes
- The list still shows the original name and values
- Re-opening the edit dialog shows the original values
- No `onStatesChange` fires

### SM-CRUD-009 — Multiple states render in the list [P2]

**Preconditions**
- Model Editor → State Definitions tab open
- Start from a known count

**Steps**
1. Add `State1` (NUMBER, 0)
2. Add `State2` (STRING, "")
3. Add `State3` (BOOLEAN, true)

**Expected**
- All three appear in the list with the correct type labels
- Each row has its own pencil and trash icons
- The list scrolls if it exceeds the visible area (the list container has `overflow-y-auto`)

### SM-CRUD-010 — Delete warning lists known reference sites [P3]

**Preconditions**
- Create a state and reference it (e.g. in an Activity action's StateModification, or a Generator's initial state). If you can't wire up a reference, this test reduces to checking the warning text only.

**Steps**
1. Click the trash icon on the referenced state
2. Read the warning bullets in the inline confirmation card

**Expected**
- The bullets explicitly mention: Activity state modifications (pre/post processing), Generator initial state modifications, Operation step state modifications
- After confirming delete, references are removed automatically (per the card's promise: `These references will be automatically removed.`)
- If reference-cleanup is not yet wired for some site, record in Notes which sites failed to update.

---

## Component Types

### SM-COMP-001 — Create a MODEL state [P1]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. Click `+ Add State`
2. Component Type: `MODEL`
3. Name: `ModelLevelState`
4. Data Type: `NUMBER`, Initial Value: `0`
5. Click `Add State`

**Expected**
- State is created with `componentType = MODEL`
- Visible under `All Components` and under the `MODEL Only` filter

### SM-COMP-002 — Create an ENTITY state [P1]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → Component Type `ENTITY`, Name `EntityState`, Data Type `STRING`, Initial Value `default`
2. Click `Add State`

**Expected**
- State created with `componentType = ENTITY`
- Visible under `All Components` and `ENTITY Only`

### SM-COMP-003 — Create a RESOURCE state [P1]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → Component Type `RESOURCE`, Name `ResourceState`, Data Type `BOOLEAN`, Initial Value `true`
2. Click `Add State`

**Expected**
- State created with `componentType = RESOURCE`
- Visible under `All Components` and `RESOURCE Only`

### SM-COMP-004 — Create an ACTIVITY state [P1]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → Component Type `ACTIVITY`, Name `ActivityState`, Data Type `NUMBER`, Initial Value `100`
2. Click `Add State`

**Expected**
- State created with `componentType = ACTIVITY`
- Visible under `All Components` and `ACTIVITY Only`

**Context:** ACTIVITY remains a valid component type even though the Activity Editor's States tab was removed. ACTIVITY-scoped states are still created/edited from the Model Editor.

### SM-COMP-005 — Filter shows only MODEL states [P2]

**Preconditions**
- States of all 4 component types exist

**Steps**
1. Set filter to `MODEL Only`

**Expected**
- Only MODEL states are listed
- ENTITY/RESOURCE/ACTIVITY states are hidden
- Count line reads `N state(s) for model`

### SM-COMP-006 — Filter shows only ENTITY states [P2]

**Preconditions**
- States of multiple component types exist

**Steps**
1. Set filter to `ENTITY Only`

**Expected**
- Only ENTITY states listed; others hidden
- Count line reads `N state(s) for entity`

### SM-COMP-007 — Filter shows only RESOURCE states [P2]

**Preconditions**
- States of multiple component types exist

**Steps**
1. Set filter to `RESOURCE Only`

**Expected**
- Only RESOURCE states listed; others hidden
- Count line reads `N state(s) for resource`

### SM-COMP-008 — Filter shows only ACTIVITY states [P2]

**Preconditions**
- States of multiple component types exist

**Steps**
1. Set filter to `ACTIVITY Only`

**Expected**
- Only ACTIVITY states listed; others hidden
- Count line reads `N state(s) for activity`

### SM-COMP-009 — Same name allowed across different component types [P2]

**Preconditions**
- A MODEL state named `Status` exists

**Steps**
1. `+ Add State` → Component Type `ENTITY`, Name `Status` (same), Data Type `STRING`, Initial Value `active`
2. Click `Add State`

**Expected**
- Save succeeds — name uniqueness is per-component-type, not global
- Both `Status` entries appear under `All Components`
- Each appears in its own component-type filter

**Context:** `StateFormDialog.validateForm` only blocks a duplicate when an existing state with the same `name` has the same `componentType`.

### SM-COMP-010 — Component Type dropdown lists all four types [P2]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. Click `+ Add State`
2. Open the Component Type dropdown

**Expected**
- Options are exactly: `MODEL`, `ENTITY`, `RESOURCE`, `ACTIVITY`
- Only one selectable at a time

### SM-COMP-011 — Add State respects the current filter as default [P3]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. Set filter to `ENTITY Only`
2. Click `+ Add State`, observe Component Type field's default
3. Cancel; set filter to `RESOURCE Only`
4. Click `+ Add State`, observe Component Type default

**Expected**
- With ENTITY filter, dialog defaults Component Type to `ENTITY`
- With RESOURCE filter, defaults to `RESOURCE`
- With `All Components` filter, defaults to the outer `defaultComponentType` (which is `ALL` from `ModelEditor`, falling back to `MODEL`)
- User can still change the Component Type in the dialog before saving

**Context:** `defaultComponentType` resolution in `StatesEditor`: `filterComponentType !== "ALL" ? filterComponentType : defaultComponentType !== "ALL" ? defaultComponentType : ComponentType.MODEL`.

### SM-COMP-012 — Editing preserves component type by default [P2]

**Preconditions**
- An ENTITY state named `TestState` exists

**Steps**
1. Pencil → change Name to `RenamedState`, leave Component Type as `ENTITY`
2. Click `Save Changes`

**Expected**
- After save, the state is still `componentType = ENTITY` with the new name
- If you change Component Type in the dialog and save, the state moves to the new component type's filter view

---

## NUMBER States

### SM-NUM-001 — Create NUMBER state with integer initial value [P1]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → Name `Counter`, Data Type `NUMBER`, Initial Value `42`
2. Click `Add State`

**Expected**
- State is created
- Data Type displays as `NUMBER`
- Initial Value is stored as the number `42`
- Editing shows `42` in the Initial Value field

### SM-NUM-002 — Create NUMBER state with decimal initial value [P1]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → Name `Temperature`, Data Type `NUMBER`, Initial Value `98.6`
2. Click `Add State`

**Expected**
- State saved with `98.6`
- Decimal precision preserved
- Editing shows `98.6`

### SM-NUM-003 — Zero initial value [P1]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → Name `ZeroStart`, Data Type `NUMBER`, Initial Value `0`
2. Click `Add State`

**Expected**
- State saves with Initial Value `0` (default when switching to NUMBER)
- Editing shows `0` (not empty)

### SM-NUM-004 — Negative initial value [P2]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → Name `Deficit`, Data Type `NUMBER`, Initial Value `-50`
2. Click `Add State`

**Expected**
- Negative value accepted
- Editing shows `-50`

### SM-NUM-005 — NUMBER uses a number input [P2]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State`, Data Type `NUMBER`
2. Inspect the Initial Value field

**Expected**
- Initial Value renders as `<input type="number">` (browser may show spinner arrows)
- Browser typically blocks non-numeric characters; some keyboards show numeric keypad

### SM-NUM-006 — Edit a NUMBER initial value [P1]

**Preconditions**
- A NUMBER state with Initial Value `10` exists

**Steps**
1. Pencil → change Initial Value `10` → `25`
2. `Save Changes`
3. Pencil again to verify

**Expected**
- Save succeeds
- Re-opening the dialog shows `25`
- Data Type remains `NUMBER`

### SM-NUM-007 — Non-numeric initial value rejected [P2]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → Name `InvalidTest`, Data Type `NUMBER`
2. Try to enter `abc` in Initial Value (use the browser's paste or programmatic input if `<input type="number">` blocks typing)
3. Click `Add State`

**Expected**
- Validation rejects the save with `Initial value must be a valid number` shown in the red error box at the top of the dialog body
- Dialog stays open; no state created

**Context:** `validateForm` calls `isNaN(Number(initialValue))` for NUMBER.

### SM-NUM-008 — Empty NUMBER initial value blocks save [P2]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → Name `EmptyTest`, Data Type `NUMBER`
2. Clear the Initial Value field
3. Click `Add State`

**Expected**
- Red error box shows `Initial value is required`
- Dialog stays open

### SM-NUM-009 — Very large NUMBER value [P3]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → Name `LargeNumber`, Data Type `NUMBER`, Initial Value `999999999999`
2. Click `Add State`

**Expected**
- Value accepted (within JavaScript's safe-number range)
- Editing shows the full or formatted value (browsers may render very large numbers in scientific notation)

### SM-NUM-010 — NUMBER supports arithmetic operations downstream [P3]

**Preconditions**
- A NUMBER state named `Quantity` exists
- An Activity with at least one action that supports StateModifications

**Steps**
1. Open the Activity Editor → Actions tab; expand an action
2. Add or open a StateModification targeting `Quantity`
3. Inspect the operation dropdown

**Expected**
- Available operations include: ASSIGN (`=`), ADD (`+=`), SUBTRACT (`-=`), MULTIPLY (`*=`), DIVIDE (`/=`)
- These are the operations returned by `State.getSupportedOperations()` for NUMBER

**Context:** `State.isArithmeticSupported()` is true only for `NUMBER`. Cross-references the action editor — exact UI control names may vary; record discrepancies in Notes.

---

## STRING States

### SM-STR-001 — Create STRING state with text value [P1]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → Name `Status`, Data Type `STRING`, Initial Value `Active`
2. Click `Add State`

**Expected**
- State saved with Initial Value `Active`
- Editing shows `Active`

### SM-STR-002 — Empty STRING initial value is rejected [P2]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → Name `EmptyString`, Data Type `STRING`
2. Leave Initial Value empty (the dataType-change effect clears it to `""`)
3. Click `Add State`

**Expected**
- Red error box shows `Initial value is required`
- Dialog stays open

**Context:** `validateForm` rejects any falsy `initialValue.trim()`, regardless of data type.

### SM-STR-003 — STRING uses a text input [P2]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State`, Data Type `STRING`
2. Inspect the Initial Value field

**Expected**
- Initial Value renders as `<input type="text">`
- Accepts letters, digits, symbols
- No numeric spinner arrows

### SM-STR-004 — Edit a STRING initial value [P1]

**Preconditions**
- A STRING state with Initial Value `Old` exists

**Steps**
1. Pencil → change Initial Value `Old` → `New`
2. `Save Changes`
3. Pencil again

**Expected**
- Re-opening the dialog shows `New`
- Data Type stays `STRING`

### SM-STR-005 — STRING with special characters [P3]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → Name `SpecialChars`, Data Type `STRING`, Initial Value `@#$%^&*()`
2. Click `Add State`

**Expected**
- Save succeeds; all characters preserved exactly
- Editing shows the same string

### SM-STR-006 — STRING with unicode characters [P3]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → Name `UnicodeTest`, Data Type `STRING`, Initial Value `Hello 世界 🌍`
2. Click `Add State`

**Expected**
- Save succeeds
- Editing shows the same unicode characters

### SM-STR-007 — STRING with very long value (500+ chars) [P3]

**Preconditions**
- Model Editor → State Definitions tab open
- 500+ char string ready (e.g. `abcdefghij` × 50)

**Steps**
1. `+ Add State` → Name `LongString`, Data Type `STRING`
2. Paste the long string into Initial Value
3. Click `Add State`

**Expected**
- Save succeeds without truncation in storage
- List display may truncate visually; the full value is visible in the edit dialog (which may scroll)

### SM-STR-008 — STRING only supports ASSIGN downstream [P2]

**Preconditions**
- A STRING state named `Label` exists
- An Activity with at least one action that supports StateModifications

**Steps**
1. Open the Activity Editor → Actions tab; expand an action
2. Add or open a StateModification targeting `Label`
3. Inspect the operation dropdown

**Expected**
- Only ASSIGN (`=`) is available — no `+=`, `-=`, `*=`, `/=`

**Context:** `State.getSupportedOperations()` returns `[ASSIGN]` for non-NUMBER types.

---

## BOOLEAN States

### SM-BOOL-001 — Create BOOLEAN state with true [P1]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → Name `IsActive`, Data Type `BOOLEAN`, Initial Value `true` (default after type switch)
2. Click `Add State`

**Expected**
- State saved with Initial Value `true`
- Editing shows `true` in the Initial Value dropdown

### SM-BOOL-002 — Create BOOLEAN state with false [P1]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → Name `IsDisabled`, Data Type `BOOLEAN`
2. Change Initial Value to `false`
3. Click `Add State`

**Expected**
- State saved with `false`
- Editing shows `false`

### SM-BOOL-003 — BOOLEAN Initial Value renders as a dropdown [P2]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State`, Data Type `BOOLEAN`
2. Inspect the Initial Value field

**Expected**
- Initial Value renders as a `<select>` (not a text input)
- User cannot type arbitrary values

### SM-BOOL-004 — Edit a BOOLEAN initial value [P1]

**Preconditions**
- A BOOLEAN state with Initial Value `true` exists

**Steps**
1. Pencil → change Initial Value from `true` → `false`
2. `Save Changes`
3. Pencil again

**Expected**
- Re-opening the dialog shows `false` selected
- Data Type stays `BOOLEAN`

### SM-BOOL-005 — BOOLEAN dropdown lists exactly true / false [P2]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State`, Data Type `BOOLEAN`
2. Open the Initial Value dropdown

**Expected**
- Exactly two options: `true` and `false`
- No empty/null option

### SM-BOOL-006 — BOOLEAN renders correctly in the list [P2]

**Preconditions**
- BOOLEAN states with both `true` and `false` values exist

**Steps**
1. Inspect the list row for each

**Expected**
- The data type label is `BOOLEAN`
- The two states are visually distinguishable (value or icon shows `true` vs `false`)

### SM-BOOL-007 — Toggle BOOLEAN between true / false [P2]

**Preconditions**
- A BOOLEAN state with Initial Value `true` exists

**Steps**
1. Pencil → flip to `false`, `Save Changes`
2. Pencil → flip to `true`, `Save Changes`
3. Pencil again to verify

**Expected**
- Each toggle saves cleanly
- Final value after 2 toggles is `true`
- No corruption or stale state across multiple edits

### SM-BOOL-008 — BOOLEAN only supports ASSIGN downstream [P2]

**Preconditions**
- A BOOLEAN state named `Flag` exists
- An Activity with at least one action that supports StateModifications

**Steps**
1. Open the Activity Editor → Actions tab; expand an action
2. Add or open a StateModification targeting `Flag`
3. Inspect the operation dropdown

**Expected**
- Only ASSIGN (`=`) is available

---

## CATEGORY States

### SM-CAT-001 — Create CATEGORY state with 2 values [P1]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → Name `Priority`, Data Type `CATEGORY`
2. In the Category Values section, type `High` in the first row, click `+ Add Value`, type `Low` in the second row
3. Set Initial Value to `High`
4. Click `Add State`

**Expected**
- State saves with `categoryValues = ["High", "Low"]` and Initial Value `High`
- Editing shows both category values and the initial value

### SM-CAT-002 — Create CATEGORY state with 5+ values [P1]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → Name `Status`, Data Type `CATEGORY`
2. Add six values: `New`, `InProgress`, `Review`, `Testing`, `Complete`, `Archived`
3. Set Initial Value to `New`
4. Click `Add State`

**Expected**
- All six values are stored in order
- Initial Value dropdown shows all six options
- Editing shows all six values

### SM-CAT-003 — Category Values section only shows for CATEGORY type [P1]

**Preconditions**
- `+ Add State` dialog is open

**Steps**
1. Set Data Type to `NUMBER` — note whether Category Values section is shown
2. `STRING` — note
3. `BOOLEAN` — note
4. `CATEGORY` — note

**Expected**
- Category Values section is hidden for NUMBER, STRING, BOOLEAN
- Category Values section appears only when Data Type is `CATEGORY`

### SM-CAT-004 — Add Value button adds a new empty row [P1]

**Preconditions**
- Dialog open, Data Type `CATEGORY`

**Steps**
1. Click `+ Add Value`
2. Type a value
3. Click `+ Add Value` again

**Expected**
- Each click appends a new empty input row
- User can type into each one
- No upper limit on number of values

### SM-CAT-005 — Trash icon removes a category value [P2]

**Preconditions**
- Dialog open with at least 3 category values

**Steps**
1. Click the trash icon next to a value

**Expected**
- That value's row is removed; other values remain
- Trash icons only appear when there are 2+ rows (when only 1 row remains, its trash icon is hidden, preventing zero-row state in the UI)

**Context:** Per `StateFormDialog`: `{categoryValues.length > 1 && <button…><Trash2/></button>}`.

### SM-CAT-006 — Initial Value dropdown lists category values [P1]

**Preconditions**
- Dialog open, Data Type `CATEGORY`, with values `Red`, `Green`, `Blue` entered

**Steps**
1. Open the Initial Value dropdown

**Expected**
- Options are: `Select a value...` placeholder, then `Red`, `Green`, `Blue`
- Empty/whitespace-only category rows are excluded from the dropdown

### SM-CAT-007 — Initial Value must be from the category list [P1]

**Preconditions**
- Dialog open, Data Type `CATEGORY`, values `Option1`, `Option2`

**Steps**
1. Try to set Initial Value to anything other than `Option1` or `Option2`

**Expected**
- The Initial Value control is a `<select>` — no free-form text entry
- Only the defined values are selectable
- Submitting with the empty placeholder selected fails validation with `Initial value must be one of the category values`

### SM-CAT-008 — Empty / whitespace category values are filtered on save [P2]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → Data Type `CATEGORY`
2. Enter values `Valid1`, ``, `Valid2`, `   ` (empty and whitespace-only)
3. Set Initial Value to `Valid1` (only valid choices appear in the dropdown)
4. Click `Add State`

**Expected**
- State saves with `categoryValues = ["Valid1", "Valid2"]` only (empty/whitespace stripped)
- Editing shows only `Valid1` and `Valid2`

**Context:** `handleSave` filters via `categoryValues.filter((v) => v.trim() !== "")`.

### SM-CAT-009 — Edit existing category values [P2]

**Preconditions**
- A CATEGORY state with values `A`, `B`, `C` exists

**Steps**
1. Pencil → change `B` → `Updated`
2. `Save Changes`
3. Pencil again

**Expected**
- After save, the values are `A`, `Updated`, `C`
- If the old Initial Value was `B`, the state's Initial Value may need to be updated — record what you observe in Notes

### SM-CAT-010 — Add a new category value to an existing state [P2]

**Preconditions**
- A CATEGORY state with values `X`, `Y` exists

**Steps**
1. Pencil → click `+ Add Value`, enter `Z`
2. `Save Changes`
3. Pencil again

**Expected**
- After save, values are `X`, `Y`, `Z`
- The Initial Value dropdown now includes `Z`

### SM-CAT-011 — Remove a category value from an existing state [P2]

**Preconditions**
- A CATEGORY state with values `Keep`, `Remove`, `AlsoKeep`; Initial Value `Keep`

**Steps**
1. Pencil → trash the `Remove` row
2. `Save Changes`
3. Pencil again

**Expected**
- After save, values are `Keep`, `AlsoKeep`
- Initial Value `Keep` is unchanged
- `Remove` is gone from the Initial Value dropdown

### SM-CAT-012 — Cannot save with zero valid category values [P2]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → Name `EmptyCategory`, Data Type `CATEGORY`
2. Leave the single value row empty
3. Click `Add State`

**Expected**
- Red error box shows `At least one category value is required`
- Dialog stays open

**Context:** `validateForm` checks `validCategories.length === 0`.

### SM-CAT-013 — Duplicate category values [P3]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → Data Type `CATEGORY`
2. Enter `Same`, `Same`, `Different`
3. Set Initial Value to `Same`
4. Click `Add State`

**Expected**
- The State constructor's `validateCategoryConstraints()` throws on duplicates: `CATEGORY state '<name>' has duplicate categoryValues: Same`
- The dialog form-validator (`StateFormDialog.validateForm`) does **not** check for duplicates, so the error may surface as an uncaught exception at `new State(...)` time — record exactly how it surfaces (red error box, console error, or silent failure) in Notes

### SM-CAT-014 — CATEGORY only supports ASSIGN downstream [P2]

**Preconditions**
- A CATEGORY state named `Mode` exists
- An Activity with at least one action that supports StateModifications

**Steps**
1. Open the Activity Editor → Actions tab; expand an action
2. Add or open a StateModification targeting `Mode`
3. Inspect the operation dropdown

**Expected**
- Only ASSIGN (`=`) is available
- The value control restricts to the defined category values

---

## Validation

### SM-VAL-001 — Empty name blocks save [P1]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → leave Name empty
2. Data Type `NUMBER`, Initial Value `0`
3. Click `Add State`

**Expected**
- Red error box shows `Name is required`
- Dialog stays open

### SM-VAL-002 — Name with spaces blocks save [P1]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → Name `My State` (with space)
2. Data Type `NUMBER`, Initial Value `0`
3. Click `Add State`

**Expected**
- Red error box shows `Name must be a valid identifier (start with letter/underscore, contain only letters/numbers/underscores)`
- Dialog stays open

**Context:** Regex `/^[a-zA-Z_][a-zA-Z0-9_]*$/` in `validateForm`.

### SM-VAL-003 — Name starting with a number blocks save [P1]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → Name `123State`, Data Type `NUMBER`, Initial Value `0`
2. Click `Add State`

**Expected**
- Same identifier error as SM-VAL-002

### SM-VAL-004 — Name with special characters blocks save [P1]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → Name `My-State!`, Data Type `NUMBER`, Initial Value `0`
2. Click `Add State`

**Expected**
- Same identifier error as SM-VAL-002 (hyphen and `!` are not valid identifier characters)

### SM-VAL-005 — Valid identifier name is accepted [P1]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → Name `validStateName123`, Data Type `NUMBER`, Initial Value `0`
2. Click `Add State`

**Expected**
- Save succeeds, dialog closes, state appears in list
- Name follows valid identifier rules (starts with letter, then letters/digits/underscores)

### SM-VAL-006 — Underscore-prefixed name is accepted [P2]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → Name `_privateState`, Data Type `NUMBER`, Initial Value `0`
2. Click `Add State`

**Expected**
- Save succeeds
- Underscore-prefix is a valid identifier (regex allows it)
- Underscores at start, middle, end all valid (e.g. `_state`, `my_state`, `state_`)

### SM-VAL-007 — Duplicate name within the same component type blocks save [P1]

**Preconditions**
- An ENTITY state named `Counter` already exists

**Steps**
1. `+ Add State` → Component Type `ENTITY`, Name `Counter`, Data Type `NUMBER`, Initial Value `0`
2. Click `Add State`

**Expected**
- Red error box shows `A ENTITY state named "Counter" already exists` (exact string from `validateForm`)
- Dialog stays open

### SM-VAL-008 — Duplicate name across different component types allowed [P2]

**Preconditions**
- A MODEL state named `Counter` exists

**Steps**
1. `+ Add State` → Component Type `ENTITY` (different), Name `Counter`, Data Type `NUMBER`, Initial Value `0`
2. Click `Add State`

**Expected**
- Save succeeds
- Both states named `Counter` now exist (one MODEL, one ENTITY)
- See SM-COMP-009

### SM-VAL-009 — Empty initial value blocks save [P1]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → Name `TestState`, Data Type `NUMBER`
2. Clear Initial Value entirely
3. Click `Add State`

**Expected**
- Red error box shows `Initial value is required`
- Dialog stays open

### SM-VAL-010 — Errors render inside the dialog body [P2]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → leave Name empty and Initial Value empty
2. Click `Add State`

**Expected**
- A red bordered box appears at the top of the dialog body (above the Name field)
- Box contains one `<p>` per error (red text)
- Both `Name is required` and `Initial value is required` are visible

### SM-VAL-011 — Dialog submit validates before closing [P1]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → enter invalid data (e.g. empty Name)
2. Click `Add State` (or `Save Changes` if editing)

**Expected**
- `validateForm` returns false → dialog does NOT close
- Errors are surfaced in the red box
- No `onStatesChange` fires until validation passes

### SM-VAL-012 — Multiple errors render simultaneously [P2]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → leave Name empty (error 1), set Data Type `CATEGORY` and leave the only category row empty (which also leaves Initial Value invalid)
2. Click `Add State`

**Expected**
- All applicable errors render together in the red box (e.g. `Name is required`, `At least one category value is required`, `Initial value is required`)
- Fixing one does not hide the others until the next save attempt re-runs validation

---

## Edge Cases

### SM-EDGE-001 — Very long state name display [P3]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → Name `ThisIsAVeryLongStateNameThatMightCauseDisplayIssues`, Data Type `NUMBER`, Initial Value `0`
2. Click `Add State`
3. Observe the list

**Expected**
- Long name saves
- List row may truncate visually (ellipsis or clipping); the full name is visible inside the edit dialog
- No layout overflow or panel break

### SM-EDGE-002 — Many states in the list (scrolling) [P3]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. Add 20+ states (any types)
2. Scroll the states list (the list container has `flex-1 overflow-y-auto`)
3. Apply filters to reduce visible items, then return to `All Components`

**Expected**
- List scrolls smoothly
- No visible performance lag
- Filters correctly show subsets
- Add/Edit/Delete remain functional

### SM-EDGE-003 — Description is optional [P2]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → Name `NoDescription`, Data Type `NUMBER`, Initial Value `0`
2. Leave Description empty
3. Click `Add State`

**Expected**
- Save succeeds; state has no description
- Pencil shows an empty Description textarea
- Description can be added later via edit

### SM-EDGE-004 — Collect Statistics defaults to true [P2]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State`
2. Look at the `Collect statistics for this state` checkbox row

**Expected**
- Checkbox is **checked** by default on a new state
- Tooltip text mentions tracking min/max/mean/stddev over time

**Context:** `State.collectStatistics` defaults to `true` in both the type and `StateFormDialog` initial state.

### SM-EDGE-005 — Uncheck Collect Statistics persists [P2]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → enter valid Name, Data Type, Initial Value
2. Uncheck `Collect statistics for this state`
3. Click `Add State`
4. Pencil the state to verify

**Expected**
- State saves with `collectStatistics = false`
- Editing shows the checkbox unchecked
- Toggling is reliable across edits

### SM-EDGE-006 — Rapid add / delete operations [P3]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. Quickly add 5 states in succession
2. Immediately delete 3 of them
3. Add 2 more
4. Verify the final state count

**Expected**
- All operations complete without errors
- Final count is correct (4 added states)
- No race conditions, list stays in sync with model state
- Each `onStatesChange` call replaces the StateListManager with a freshly constructed one

### SM-EDGE-007 — Switching Data Type to NUMBER hides Category Values [P2]

**Preconditions**
- `+ Add State` dialog is open

**Steps**
1. Set Data Type to `CATEGORY`
2. Add values `A`, `B`, `C`
3. Switch Data Type to `NUMBER`
4. Observe the Category Values section

**Expected**
- Category Values section disappears
- Switching back to `CATEGORY` shows a single empty row (the local state `categoryValues` is not cleared by the dataType-change effect, but the prior session's values may be retained from local component state — record actual observed behavior in Notes)
- Initial Value resets per the dataType-change effect (`0` for NUMBER, `""` for STRING/CATEGORY, `true` for BOOLEAN)

**Context:** The `useEffect` watching `dataType` resets `initialValue` but does NOT reset `categoryValues`.

### SM-EDGE-008 — Switching Data Type resets Initial Value [P2]

**Preconditions**
- `+ Add State` dialog is open

**Steps**
1. Set Data Type `NUMBER`, type Initial Value `42`
2. Switch Data Type to `BOOLEAN`
3. Inspect Initial Value

**Expected**
- Initial Value control changes type (to a `<select>` for BOOLEAN)
- The displayed value resets to `true` (default after switching to BOOLEAN)
- Switching to `NUMBER` resets to `0`; `STRING`/`CATEGORY` reset to `""`

**Context:** The `useEffect` watching `dataType` writes a type-appropriate default into `initialValue`.

### SM-EDGE-009 — Cancel from the edit dialog preserves the original state [P2]

**Preconditions**
- An existing state with known values

**Steps**
1. Pencil → modify Name, Data Type, Initial Value (heavy edits)
2. Click `Cancel` (or the header `X`)
3. Pencil the state again

**Expected**
- Dialog closes without saving
- Original values intact (no partial save)
- Re-opening shows the originals

### SM-EDGE-010 — Special characters in Description [P3]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → enter valid Name, Data Type, Initial Value
2. Description: `Test <description> with "quotes" & symbols!`
3. Click `Add State`
4. Pencil to verify

**Expected**
- Save succeeds
- Description preserved exactly (no HTML escaping or stripping)

### SM-EDGE-011 — Header X button closes dialog without saving [P3]

**Preconditions**
- `+ Add State` dialog is open with some typed-in data

**Steps**
1. Click the `X` icon in the dialog header

**Expected**
- Dialog closes (same as Cancel)
- No state is added
- No `onStatesChange` fires

**Context:** Header X is wired to `onCancel` in `StateFormDialog`.

### SM-EDGE-012 — Removed Activity Editor States tab [P3]

**Preconditions**
- An Activity is selected, the Activity Editor is visible

**Steps**
1. Inspect the Activity Editor's tab bar

**Expected**
- There is **no States tab** in the Activity Editor (it was removed; the relevant code in `ActivityEditor.tsx` is commented out)
- The Activity Editor's tabs are exactly: Basic Settings, Actions, Financial Settings, Failure Settings, Routing Configuration (see `005_Activity_Tests.md` for full layout)
- ACTIVITY-scoped states must be managed from Model Editor → State Definitions

---

## Auto-Save Behavior (Cross-Cutting)

These tests cover the save semantics specific to the States panel.

### SM-AUTOSAVE-001 — States panel has no SaveStatusLine [P2]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. Inspect the bottom of the panel

**Expected**
- No `SaveStatusLine` is rendered inside the States panel
- Save semantics are dialog-bound, not field-bound — there's no "Saving…/Saved" indicator on this tab
- The Basic Settings tab is where the model-level `SaveStatusLine` lives

### SM-AUTOSAVE-002 — Dialog Add commits via onStatesChange [P1]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` → enter a valid Name and defaults
2. Click `Add State` (footer)
3. Switch to the Basic Settings tab
4. Inspect the Basic Settings `SaveStatusLine`

**Expected**
- After clicking `Add State`, `onStatesChange` is called with a new `StateListManager` containing the new entry
- Returning to States, the new state is in the list
- The Basic Settings `SaveStatusLine` reflects `Saved` (no separate save action needed for the state change)

**Context:** ModelEditor docstring: "States tab: Auto-saves immediately via parent `onStatesChange`."

### SM-AUTOSAVE-003 — Dialog Edit commits via onStatesChange [P1]

**Preconditions**
- An existing state to edit

**Steps**
1. Pencil → change any editable field
2. Click `Save Changes` (footer)

**Expected**
- Dialog closes
- The list reflects the change immediately
- The change is persisted via `onStatesChange`, no debounce

### SM-AUTOSAVE-004 — Inline delete commits via onStatesChange [P1]

**Preconditions**
- A state to delete

**Steps**
1. Trash icon → click `Delete State` in the inline confirmation card

**Expected**
- State is removed from the list
- Removal is persisted via `onStatesChange` immediately (no delay, no separate Save step)

### SM-AUTOSAVE-005 — Dialog Cancel does not invoke onStatesChange [P2]

**Preconditions**
- Model Editor → State Definitions tab open

**Steps**
1. `+ Add State` or pencil an existing state
2. Make any change in the dialog
3. Click `Cancel` (footer) or header `X`

**Expected**
- Dialog closes
- The list is unchanged
- No `onStatesChange` fires; no model save occurs
