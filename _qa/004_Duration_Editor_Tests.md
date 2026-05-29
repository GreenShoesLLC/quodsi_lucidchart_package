# 004 — Duration Editor Tests

Suite of manual / agent-driven QA tests for the **Duration Editor widget** (`EnhancedDurationEditor`) used inside Activity actions, Failure Settings (MTBF/MTTR), Generators, and anywhere else a duration with a statistical distribution is configured.

## How to read this file

Each test is a small block: **ID — Name [Priority]**, then **Preconditions**, **Steps**, **Expected**, and (sometimes) **Context** — author notes that explain a subtle assertion or point at the source-of-truth code. Tests can be run by a human or by an AI agent walking the file top-to-bottom.

## How to record a run

Don't edit this file. For each run, create a new file under `_qa/runs/` and **log only failures** — silence means pass. See `_qa/runs/README.md` for the run-file template.

## What this covers

The Duration Editor is a **widget**, not a top-level editor. It's a controlled component (`EnhancedDurationEditor`) that takes a `periodUnit` + `distribution` pair in via props and pushes changes back out via `onChange` — there's no Save/Cancel button and no `SaveStatusLine` inside the widget itself. **Save behavior is the parent editor's concern**: when the widget is hosted inside the Activity Editor (Actions tab, Failure Settings) or the Generator Editor, the parent's `useAutoSave` debounces and flushes the change, and the parent's `SaveStatusLine` is the assertion of choice for confirming the save landed. These tests focus on per-distribution **input behavior** inside the widget: typing, blur, cascade adjustments, and field persistence.

## Widget layout

The widget renders three rows:

| # | Control | Notes |
|---|---|---|
| 1 | `<Label> Type` dropdown | One of: Constant, Uniform, Triangular, Normal, Exponential (the 5 UI-supported types per `isDistributionTypeSupported`). Selecting a different type creates a default distribution of that type and immediately calls `onChange`. |
| 2 | Distribution parameters | Type-specific fields (e.g. Scale for Exponential, Mean+Std for Normal). Each field is a `<input type="number">` with parameter-specific `min` and `step`. Blur is the commit point: empty/NaN reverts to last good value; cascade adjustments enforce ordering rules. |
| 3 | `Time Unit` dropdown | Seconds / Minutes / Hours / Days. Changes call `onChange` immediately. |

Default `min` for fields that require a strictly positive value (Exponential scale, Normal std) is **0.01** (Normal std minimum is **0.1**, per the cell metadata). Cascade adjustments use a **0.01** delta when shifting the partner field to maintain ordering.

---

## Exponential

### DUR-EXP-001 — Enter valid scale value [P2]

**Preconditions**
- Activity or Generator selected; Duration Editor widget visible (e.g. inside an action card or the MTBF Duration row)
- Set the distribution type dropdown to `Exponential` — the `Scale` field becomes visible

**Steps**
1. Click inside the `Scale` field
2. Clear, type `1.5`
3. Press Tab or click outside (blur)

**Expected**
- Field shows `1.5`
- Value is accepted with no error
- `onChange` fires with the new scale (parent editor's `SaveStatusLine` cycles `Saving…` → `Saved` if hosted inside an auto-save parent)

**Context:** Scale = mean time between events; in Exponential it equals the mean. Parent's `SaveStatusLine` is the assertion of record for save completion.

### DUR-EXP-002 — Enter decimal value like 0.25 [P2]

**Preconditions**
- Duration Editor visible with `Exponential` selected; `Scale` field visible

**Steps**
1. Click `Scale`, clear, type `0.25`
2. Blur

**Expected**
- Field shows `0.25`; no error
- Small scale values are valid

### DUR-EXP-003 — Zero clamped to minimum on blur [P2]

**Preconditions**
- Duration Editor visible with `Exponential` selected; `Scale` shows a valid value (e.g. `1`)

**Steps**
1. Click `Scale`, clear, type `0`
2. Blur

**Expected**
- Field does **not** keep `0`; it is clamped on blur to the minimum (`0.01`)
- Reason: exponential scale must be strictly positive

**Context:** Clamp logic: `Math.max(minValue, parsed)` in `ExponentialParameterEditor.handleBlur`; `minValue = metadata.min ?? 0.01`.

### DUR-EXP-004 — Clear field and blur reverts to previous value [P2]

**Preconditions**
- `Exponential` selected; `Scale` shows `1.5`

**Steps**
1. Click `Scale`, select all, delete (field is empty)
2. Blur

**Expected**
- Field does **not** stay empty; it reverts to `1.5` (last good value)
- `onChange` is not called

**Context:** Empty/NaN path in `handleBlur` calls `setInputValue(String(localValue))` and returns without propagating.

### DUR-EXP-005 — Spinner up arrow increments [P2]

**Preconditions**
- `Exponential` selected; `Scale` = `1`

**Steps**
1. Click the up arrow (▲) on the `Scale` spinner once

**Expected**
- Value increases by one `step` (controlled by `metadata.step` — typically `0.01` or `0.1`); record the observed step
- Value is accepted

### DUR-EXP-006 — Spinner down arrow stops at minimum [P2]

**Preconditions**
- `Exponential` selected; `Scale` = `1`

**Steps**
1. Click the down arrow (▼) repeatedly until the value stops decreasing

**Expected**
- Value floors at `0.01` (the `min` attribute on the `<input type="number">`)
- Never reaches `0` or a negative

### DUR-EXP-007 — Negative typed value clamped to minimum [P2]

**Preconditions**
- `Exponential` selected; `Scale` positive

**Steps**
1. Click `Scale`, clear, type `-1`
2. Blur

**Expected**
- Field does **not** keep `-1`; clamped to `0.01` on blur
- Same code path as DUR-EXP-003

### DUR-EXP-008 — Very large value accepted [P2]

**Preconditions**
- `Exponential` selected; `Scale` field visible

**Steps**
1. Click `Scale`, clear, type `10000`
2. Blur

**Expected**
- Field accepts `10000` and displays it
- No error (the `<input>` has no `max`)

---

## Constant

### DUR-CONST-001 — Enter positive value [P2]

**Preconditions**
- Duration Editor visible; distribution type set to `Constant` — the `Value` field becomes visible

**Steps**
1. Click `Value`, clear, type `10`
2. Blur

**Expected**
- Field shows `10`; no error
- Constant means every sampled duration equals exactly this value

### DUR-CONST-002 — Zero value accepted [P2]

**Preconditions**
- `Constant` selected; `Value` field visible

**Steps**
1. Click `Value`, clear, type `0`
2. Blur

**Expected**
- `0` is accepted (zero duration = no delay); record observed behavior if a minimum is instead enforced

### DUR-CONST-003 — Negative value behavior [P2]

**Preconditions**
- `Constant` selected; `Value` positive

**Steps**
1. Click `Value`, clear, type `-5`
2. Blur

**Expected**
- Document observed behavior: accepted as `-5`, clamped to `0`, or rejected/reverted
- Constant does not have a hard mathematical lower bound the way Exponential scale does

### DUR-CONST-004 — Decimal value accepted [P2]

**Preconditions**
- `Constant` selected

**Steps**
1. Click `Value`, clear, type `2.5`
2. Blur

**Expected**
- Field shows `2.5`; decimal accepted

### DUR-CONST-005 — Clear field and blur reverts to previous value [P2]

**Preconditions**
- `Constant` selected; `Value` shows `10`

**Steps**
1. Click `Value`, select all, delete
2. Blur

**Expected**
- Field reverts to `10`
- `onChange` is not called for the empty value

### DUR-CONST-006 — Spinner controls adjust value [P2]

**Preconditions**
- `Constant` selected; `Value` = `5`

**Steps**
1. Click the spinner up arrow once — note the new value
2. Click the spinner down arrow twice — note the new value

**Expected**
- Up increases by one `step`; down decreases by one `step` per click
- Record the observed step

---

## Normal

### DUR-NORM-001 — Enter valid mean value [P2]

**Preconditions**
- Duration Editor visible; distribution type set to `Normal` — `Mean` and `Std` (Standard Deviation) fields appear

**Steps**
1. Click `Mean`, clear, type `10`
2. Blur

**Expected**
- Field shows `10`; no error
- Mean is the center of the bell curve

### DUR-NORM-002 — Enter valid standard deviation [P2]

**Preconditions**
- `Normal` selected; `Mean` has a value

**Steps**
1. Click `Std`, clear, type `2`
2. Blur

**Expected**
- Field shows `2`; no error
- Most samples will fall within Mean ± Std

### DUR-NORM-003 — Negative mean value accepted [P2]

**Preconditions**
- `Normal` selected; `Mean` positive

**Steps**
1. Click `Mean`, clear, type `-5`
2. Blur

**Expected**
- `-5` is accepted (negative mean is mathematically valid for Normal)
- Record any UI warnings if shown

### DUR-NORM-004 — Zero std clamped to minimum [P2]

**Preconditions**
- `Normal` selected; `Std` shows `2`

**Steps**
1. Click `Std`, clear, type `0`
2. Blur

**Expected**
- `0` is not kept; clamped on blur to the `Std` minimum (`0.1`)
- Zero std would imply no variation — use Constant instead

### DUR-NORM-005 — Negative std clamped to minimum [P2]

**Preconditions**
- `Normal` selected; `Std` positive

**Steps**
1. Click `Std`, clear, type `-1`
2. Blur

**Expected**
- Clamped to `0.1` on blur

### DUR-NORM-006 — Clear mean and blur reverts [P2]

**Preconditions**
- `Normal` selected; `Mean` = `10`

**Steps**
1. Click `Mean`, select all, delete
2. Blur

**Expected**
- Reverts to `10`

### DUR-NORM-007 — Clear std and blur reverts [P2]

**Preconditions**
- `Normal` selected; `Std` = `2`

**Steps**
1. Click `Std`, select all, delete
2. Blur

**Expected**
- Reverts to `2`

### DUR-NORM-008 — Decimal values in both fields [P2]

**Preconditions**
- `Normal` selected; both fields visible

**Steps**
1. Click `Mean`, clear, type `5.5`
2. Tab to `Std`, clear, type `1.25`
3. Blur

**Expected**
- `Mean` = `5.5`, `Std` = `1.25`; both accepted

### DUR-NORM-009 — Sequential field editing (regression) [P1]

**Preconditions**
- `Normal` selected; both fields may have any values

**Steps**
1. Click `Mean`, clear, type `10`, Tab (blurs Mean)
2. Type `2` in `Std`, blur
3. Look back at `Mean`

**Expected**
- **Critical:** `Mean` still shows `10` (not blank); `Std` shows `2`
- Editing `Std` did not erase `Mean`

**Context:** Regression test for the "values disappearing" bug — exercises the per-field `isFocusedRef` + local input state in `NormalParameterEditor`.

### DUR-NORM-010 — Values persist across field changes [P2]

**Preconditions**
- `Normal` selected; `Mean` = `10`, `Std` = `2`

**Steps**
1. Change `Mean` from `10` to `15`, blur — verify `Mean` = `15`
2. Change `Std` from `2` to `3`, blur — verify `Std` = `3`
3. Re-check `Mean`

**Expected**
- `Mean` = `15`, `Std` = `3`; neither field lost its value while the other was edited

### DUR-NORM-011 — Decimal values across sequential edits [P2]

**Preconditions**
- `Normal` selected

**Steps**
1. Click `Mean`, clear, type `7.5`, blur
2. Click `Std`, clear, type `1.25`, blur
3. Click `Mean` (no change), then click `Std` (no change)

**Expected**
- `Mean` stays `7.5`; `Std` stays `1.25` throughout

---

## Uniform

### DUR-UNI-001 — Enter valid low and high [P2]

**Preconditions**
- Duration Editor visible; distribution type set to `Uniform` — `Low` and `High` fields appear

**Steps**
1. Click `Low`, clear, type `5`, Tab
2. Type `15` in `High`, blur

**Expected**
- `Low` = `5`, `High` = `15`; both accepted
- Uniform will sample with equal probability in [5, 15]

### DUR-UNI-002 — Set low equal to high triggers cascade on high [P2]

**Preconditions**
- `Uniform` selected; `Low` = `5`, `High` = `15`

**Steps**
1. Click `Low`, clear, type `15`
2. Blur

**Expected**
- `Low` = `15`; `High` auto-adjusts to `15.01` (cascade keeps `High > Low`)
- A red error caption appears under `High`: `Maximum automatically adjusted to 15.01 to maintain proper range.`

**Context:** Cascade delta is `0.01` — see `handleLowBlur` in `UniformParameterEditor`.

### DUR-UNI-003 — Set low greater than high triggers cascade on high [P2]

**Preconditions**
- `Uniform` selected; `Low` = `5`, `High` = `15`

**Steps**
1. Click `Low`, clear, type `20`
2. Blur

**Expected**
- `Low` = `20`; `High` auto-adjusts to `20.01`

### DUR-UNI-004 — Set high equal to low triggers cascade on low [P2]

**Preconditions**
- `Uniform` selected; `Low` = `5`, `High` = `15`

**Steps**
1. Click `High`, clear, type `5`
2. Blur

**Expected**
- `High` = `5`; `Low` auto-adjusts to `4.99` (`Math.max(0, parsed - 0.01)`)
- Red error caption appears under `Low`

### DUR-UNI-005 — Set high less than low triggers cascade on low [P2]

**Preconditions**
- `Uniform` selected; `Low` = `5`, `High` = `15`

**Steps**
1. Click `High`, clear, type `2`
2. Blur

**Expected**
- `High` = `2`; `Low` auto-adjusts to `1.99`

### DUR-UNI-006 — Decimal values [P2]

**Preconditions**
- `Uniform` selected

**Steps**
1. Click `Low`, clear, type `0.5`, Tab
2. Type `2.75` in `High`, blur

**Expected**
- `Low` = `0.5`, `High` = `2.75`; both accepted

### DUR-UNI-007 — Clear low and blur reverts [P2]

**Preconditions**
- `Uniform` selected; `Low` = `5`, `High` = `15`

**Steps**
1. Click `Low`, select all, delete
2. Blur

**Expected**
- Reverts to `5`

### DUR-UNI-008 — Clear high and blur reverts [P2]

**Preconditions**
- `Uniform` selected; `Low` = `5`, `High` = `15`

**Steps**
1. Click `High`, select all, delete
2. Blur

**Expected**
- Reverts to `15`

### DUR-UNI-009 — Sequential field editing (regression) [P1]

**Preconditions**
- `Uniform` selected; fields may have any values

**Steps**
1. Click `Low`, clear, type `5`, Tab (blurs Low)
2. Type `15` in `High`, blur
3. Look back at `Low`

**Expected**
- **Critical:** `Low` still shows `5` (not blank); `High` shows `15`

**Context:** Regression test for the values-disappearing bug; exercises per-field focus tracking in `UniformParameterEditor`.

### DUR-UNI-010 — Values persist across field changes [P2]

**Preconditions**
- `Uniform` selected; `Low` = `5`, `High` = `15`

**Steps**
1. Change `Low` from `5` to `3`, blur
2. Change `High` from `15` to `20`, blur
3. Re-check `Low`

**Expected**
- `Low` = `3`, `High` = `20`; neither lost its value

### DUR-UNI-011 — Cascade preserves the other field [P2]

**Preconditions**
- `Uniform` selected; `Low` = `5`, `High` = `15`

**Steps**
1. Set `Low` to `20` (triggers `High` cascade to `20.01`)
2. Edit `High` to `30`, blur

**Expected**
- After cascade: `Low` = `20`, `High` = `20.01`
- After editing High to 30: `Low` = `20`, `High` = `30`
- Cascade did not erase or reset the other field; subsequent edits work

---

## Triangular

### DUR-TRI-001 — Enter valid left/mode/right [P2]

**Preconditions**
- Duration Editor visible; distribution type set to `Triangular` — `Left`, `Mode`, `Right` fields appear

**Steps**
1. Click `Left`, clear, type `1`, blur
2. Click `Mode`, clear, type `5`, blur
3. Click `Right`, clear, type `10`, blur

**Expected**
- `Left` = `1`, `Mode` = `5`, `Right` = `10`
- All values accepted; rule `Left ≤ Mode ≤ Right` holds

### DUR-TRI-002 — Set left greater than mode triggers cascade on mode and right [P2]

**Preconditions**
- `Triangular` selected; `Left` = `1`, `Mode` = `5`, `Right` = `10`

**Steps**
1. Click `Left`, clear, type `7` (greater than `Mode`)
2. Blur

**Expected**
- `Left` = `7`; `Mode` auto-adjusts upward (e.g. `8`); `Right` auto-adjusts further upward (e.g. `9`)
- Maintains `Left < Mode < Right`

### DUR-TRI-003 — Set right less than mode triggers cascade on mode and left [P2]

**Preconditions**
- `Triangular` selected; `Left` = `1`, `Mode` = `5`, `Right` = `10`

**Steps**
1. Click `Right`, clear, type `3` (less than `Mode`)
2. Blur

**Expected**
- `Right` = `3`; `Mode` auto-adjusts downward (e.g. `2`); `Left` auto-adjusts further down if needed
- Maintains `Left < Mode < Right`

### DUR-TRI-004 — Set mode below left triggers cascade on left [P2]

**Preconditions**
- `Triangular` selected; `Left` = `1`, `Mode` = `5`, `Right` = `10`

**Steps**
1. Click `Mode`, clear, type `0` (less than `Left`)
2. Blur

**Expected**
- `Mode` = `0`; `Left` auto-adjusts downward (e.g. `-0.01` or to the field's minimum)
- Record actual adjusted value

### DUR-TRI-005 — Set mode above right triggers cascade on right [P2]

**Preconditions**
- `Triangular` selected; `Left` = `1`, `Mode` = `5`, `Right` = `10`

**Steps**
1. Click `Mode`, clear, type `15` (greater than `Right`)
2. Blur

**Expected**
- `Mode` = `15`; `Right` auto-adjusts upward (e.g. `15.01`)
- `Left` unchanged

### DUR-TRI-006 — Decimal values in all fields [P2]

**Preconditions**
- `Triangular` selected

**Steps**
1. Click `Left`, clear, type `0.5`, blur
2. Click `Mode`, clear, type `1.75`, blur
3. Click `Right`, clear, type `3.25`, blur

**Expected**
- All three fields accept decimals; rule `0.5 < 1.75 < 3.25` maintained

### DUR-TRI-007 — All three equal forces minimum spread [P2]

**Preconditions**
- `Triangular` selected; fields valid

**Steps**
1. Set `Left` = `5`, blur
2. Set `Mode` = `5`, blur (cascade likely fires)
3. Set `Right` = `5`, blur (cascade likely fires)

**Expected**
- The widget enforces a minimum spread; e.g. final state could be `Left` = `4.98`, `Mode` = `4.99`, `Right` = `5`
- Record observed final values

### DUR-TRI-008 — Clear left and blur reverts [P2]

**Preconditions**
- `Triangular` selected; `Left` = `1`, `Mode` = `5`, `Right` = `10`

**Steps**
1. Click `Left`, select all, delete
2. Blur

**Expected**
- Reverts to `1`

### DUR-TRI-009 — Clear mode and blur reverts [P2]

**Preconditions**
- `Triangular` selected; `Left` = `1`, `Mode` = `5`, `Right` = `10`

**Steps**
1. Click `Mode`, select all, delete
2. Blur

**Expected**
- Reverts to `5`

### DUR-TRI-010 — Clear right and blur reverts [P2]

**Preconditions**
- `Triangular` selected; `Left` = `1`, `Mode` = `5`, `Right` = `10`

**Steps**
1. Click `Right`, select all, delete
2. Blur

**Expected**
- Reverts to `10`

### DUR-TRI-011 — Sequential field editing (regression) [P1]

**Preconditions**
- `Triangular` selected; fields may have any values

**Steps**
1. Click `Left`, clear, type `1`, blur
2. Click `Mode`, clear, type `5`, blur
3. Click `Right`, clear, type `10`, blur
4. Look back at `Left` and `Mode`

**Expected**
- **Critical:** `Left` still shows `1`; `Mode` still shows `5`; `Right` shows `10`
- No field erased by editing the others

### DUR-TRI-012 — Values persist across all field changes [P2]

**Preconditions**
- `Triangular` selected; `Left` = `1`, `Mode` = `5`, `Right` = `10`

**Steps**
1. Change `Left` to `2`, blur — verify `Left` = `2`
2. Change `Mode` to `6`, blur — verify `Mode` = `6`, `Left` still `2`
3. Change `Right` to `12`, blur

**Expected**
- Final state: `Left` = `2`, `Mode` = `6`, `Right` = `12`

### DUR-TRI-013 — Cascade preserves unrelated fields [P2]

**Preconditions**
- `Triangular` selected; `Left` = `1`, `Mode` = `5`, `Right` = `10`

**Steps**
1. Set `Left` to `7` (triggers cascade on `Mode` and `Right`)
2. After cascade, edit `Right` to `15`, blur

**Expected**
- After step 1 cascade: `Left` = `7`, `Mode` ≈ `8`, `Right` ≈ `9`
- After step 2: `Left` = `7`, `Mode` = `8`, `Right` = `15`
- Cascade did not reset `Left`; subsequent edits work

---

## Decimal Input

These tests guard against a regression where typing a decimal point (`.`) would reset the field.

### DUR-DEC-001 — Type .25 starting with a decimal point [P2]

**Preconditions**
- Duration Editor visible; `Exponential` selected; `Scale` field visible

**Steps**
1. Click `Scale`, clear
2. Type `.25` character by character (no leading zero)
3. Blur

**Expected**
- While typing: field shows `.`, then `.2`, then `.25`
- On blur: field shows `.25` or `0.25`
- Value is **not** reset while typing

**Context:** Regression test for the decimal-typing fix. The input value is stored as a string in `inputValue` (not coerced through `parseFloat` on every keystroke), so the `.` is preserved until blur.

### DUR-DEC-002 — Type 0.25 with leading zero [P2]

**Preconditions**
- `Exponential` selected; `Scale` visible

**Steps**
1. Click `Scale`, clear
2. Type `0.25` character by character (`0`, `.`, `2`, `5`)
3. Blur

**Expected**
- While typing: field shows `0`, `0.`, `0.2`, `0.25` progressively
- On blur: `0.25`
- No jump or reset during typing

### DUR-DEC-003 — Progressive decimal: 0, then ., then 2, then 5 [P1]

**Preconditions**
- `Exponential` selected; `Scale` visible

**Steps**
1. Click `Scale`, clear
2. Type `0` — verify field shows `0`
3. Type `.` — verify field shows `0.` (not reset!)
4. Type `2` — verify `0.2`
5. Type `5` — verify `0.25`
6. Blur

**Expected**
- **Critical:** After typing `.`, the field shows `0.` and does **not** clear
- Final blurred value: `0.25`

**Context:** Key regression test for the decimal-typing fix.

### DUR-DEC-004 — Type decimal in Normal mean field [P2]

**Preconditions**
- `Normal` selected; `Mean` and `Std` visible

**Steps**
1. Click `Mean`, clear
2. Type `0.5` character by character
3. Tab to `Std`

**Expected**
- Field progressively shows `0`, `0.`, `0.5`
- After Tab: `Mean` = `0.5`, focus moves to `Std`
- `Mean` value persists

### DUR-DEC-005 — Type decimal in Normal std field [P2]

**Preconditions**
- `Normal` selected; `Mean` has a value; `Std` accessible

**Steps**
1. Click `Std`, clear
2. Type `0.25` character by character
3. Blur

**Expected**
- Field progressively shows `0`, `0.`, `0.2`, `0.25`
- On blur: `0.25`
- Note: very small `Std` may be clamped to the `0.1` minimum

### DUR-DEC-006 — Type decimal in Uniform low field [P2]

**Preconditions**
- `Uniform` selected; `Low` and `High` visible

**Steps**
1. Click `Low`, clear
2. Type `0.1` character by character
3. Tab to `High`

**Expected**
- `Low` progressively shows `0`, `0.`, `0.1`; persists after Tab

### DUR-DEC-007 — Type decimal in Uniform high field [P2]

**Preconditions**
- `Uniform` selected; `Low` = `0.1`; `High` accessible

**Steps**
1. Click `High`, clear
2. Type `2.5` character by character
3. Blur

**Expected**
- `High` progressively shows `2`, `2.`, `2.5`
- On blur: `High` = `2.5`; `Low` still shows `0.1`

### DUR-DEC-008 — Type decimals in all Triangular fields [P2]

**Preconditions**
- `Triangular` selected; `Left`, `Mode`, `Right` visible

**Steps**
1. Click `Left`, clear, type `0.5`, blur
2. Click `Mode`, clear, type `1.5`, blur
3. Click `Right`, clear, type `2.5`, blur

**Expected**
- Final: `Left` = `0.5`, `Mode` = `1.5`, `Right` = `2.5`
- No field resets during typing; ordering rule `0.5 < 1.5 < 2.5` holds

### DUR-DEC-009 — Clear and retype decimal [P2]

**Preconditions**
- Any distribution selected; a numeric field has value `5`

**Steps**
1. Click the field, Ctrl+A, Delete
2. Type `0.75` character by character
3. Blur

**Expected**
- During typing: `0`, `0.`, `0.7`, `0.75`
- On blur: `0.75`

### DUR-DEC-010 — Very small decimal with multiple leading zeros [P2]

**Preconditions**
- Any distribution selected; numeric field accessible

**Steps**
1. Click the field, clear
2. Type `0.001` character by character
3. Blur

**Expected**
- During typing: `0`, `0.`, `0.0`, `0.00`, `0.001`
- On blur: either `0.001` or the field's minimum (e.g. `0.01` for Exponential scale) — record which

---

## Edge Cases

### DUR-EDGE-001 — Very large number [P2]

**Preconditions**
- Duration Editor visible with any distribution; a numeric field accessible

**Steps**
1. Click the field, clear
2. Type `999999999`
3. Blur

**Expected**
- Field accepts the value OR clamps to an enforced maximum (record which)
- No crash, no JS error in console

### DUR-EDGE-002 — Very small decimal (0.0001) [P2]

**Preconditions**
- Any distribution; numeric field accessible (e.g. Exponential `Scale`)

**Steps**
1. Click the field, clear
2. Type `0.0001`
3. Blur

**Expected**
- Field accepts the value, possibly clamped to the parameter's minimum (e.g. `0.01` for Exponential scale)
- Record observed display (may show scientific notation in some browsers)

### DUR-EDGE-003 — Many decimal places (1.123456789) [P2]

**Preconditions**
- Any distribution; numeric field accessible

**Steps**
1. Click the field, clear
2. Type `1.123456789`
3. Blur

**Expected**
- Field accepts the value (possibly rounded or truncated to fixed precision)
- No errors
- Record observed precision

### DUR-EDGE-004 — Rapid focus/blur cycling [P2]

**Preconditions**
- Any distribution; numeric field has value `5`

**Steps**
1. Click the field (focus), then immediately click outside (blur)
2. Repeat 10 times

**Expected**
- Field value stays `5` throughout
- No flickering, no JS errors
- No race conditions or state corruption

### DUR-EDGE-005 — Tab navigation through all fields [P2]

**Preconditions**
- Duration Editor visible; select a multi-field distribution (Normal or Triangular)

**Steps**
1. Focus the distribution-type dropdown
2. Press Tab repeatedly through every field in the widget

**Expected**
- Focus moves dropdown → first numeric field → next numeric field → … → Time Unit dropdown
- Each focused field is visually highlighted
- No fields are skipped

### DUR-EDGE-006 — Arrow keys increment/decrement [P2]

**Preconditions**
- Any distribution; a numeric field is focused (e.g. Exponential `Scale` = `5`)

**Steps**
1. Press the ↑ arrow key
2. Press the ↓ arrow key

**Expected**
- ↑ increases by one `step`; ↓ decreases by one `step`
- Minimum is enforced (e.g. cannot go below `0.01` for Exponential scale)

### DUR-EDGE-007 — Paste invalid text (abc) [P2]

**Preconditions**
- Any distribution; numeric field accessible
- `abc` on clipboard

**Steps**
1. Click the field, clear
2. Paste (`Ctrl+V`)
3. Blur

**Expected**
- Field rejects non-numeric input. Possible behaviors:
  - Browser blocks the paste at the `<input type="number">` level (field stays empty), then blur reverts to the last good value
  - Field shows empty during edit and reverts on blur (same path as DUR-EXP-004)
- No JS errors

**Context:** The widget's blur handler treats `isNaN(parseFloat(inputValue))` the same as empty — both revert to the last good value.

### DUR-EDGE-008 — Scientific notation (1e5 / 1E-3) [P2]

**Preconditions**
- Any distribution; numeric field accessible

**Steps**
1. Click the field, clear
2. Type `1e5` (or try `1E-3`)
3. Blur

**Expected**
- `parseFloat` accepts scientific notation, so the field likely commits as `100000` (or `0.001`). Record observed behavior — some browsers display the scientific form, some normalize.
- No crash

### DUR-EDGE-009 — Switch distribution types rapidly [P3]

**Preconditions**
- Duration Editor visible; dropdown accessible

**Steps**
1. Select `Exponential`, wait ~1 second
2. Select `Normal`
3. Select `Uniform`
4. Continue switching 5 times rapidly
5. End on a specific type and check fields

**Expected**
- Each change shows the correct fields for the selected type
- Final state matches the last-selected type
- No JS errors

**Context:** Each type change calls `createDefaultDistribution(type)` and replaces the entire distribution; parameters from the previous type are discarded.

### DUR-EDGE-010 — Edit one field immediately after another [P3]

**Preconditions**
- `Normal` (Mean + Std) or `Uniform` (Low + High) selected

**Steps**
1. Click `Mean` (or `Low`), type `10` (do not blur)
2. Immediately click the second field (blurs the first); type `2`
3. Immediately click back to the first field

**Expected**
- First field shows `10` after the implicit blur
- Second field shows `2` after being edited
- No value loss from rapid sequential editing
