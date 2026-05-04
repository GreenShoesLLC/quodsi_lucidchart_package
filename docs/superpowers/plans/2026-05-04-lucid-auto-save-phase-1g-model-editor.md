# Lucid Auto-Save — Phase 1G (ModelEditor Migration) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `ModelEditor.tsx` to auto-save. This is the **last editor in the Group A sweep** — after Phase 1G lands, all 7 editors (Entity, Resource, Generator, Activity, Connectors, Model, plus the previously-disabled-via-comment "Group A" wave) consume `useAutoSave` + `<SaveStatusLine />`. ModelEditor is moderate complexity (1118 LOC) with a unique twist: `handleSave` does meaningful field defaulting (DEFAULT_RANDOM_SEED, time-mode defaults, etc.) that must be preserved.

**Architecture:** Wire `useAutoSave<Model>` into ModelEditor with `isValid: true` (no name uniqueness validation; only one Model per document). Wrap `onSave` in a `useCallback` that applies the existing `handleSave` defaulting logic — preserves the normalize-on-save behavior while routing through the hook. Add `onBlur={saveNow}` to 7 typed inputs (name, reps, runClockPeriod, warmupClockPeriod, startDateTime, finishDateTime, warmupDateTime) and 4 `useFlushOnChange` watchers for selects (simulationTimeType, runClockPeriodUnit, oneClockUnit, warmupClockPeriodUnit). Remove the now-purposeless `<form onSubmit>` wrapper. Replace the Save/Cancel button row with `<SaveStatusLine />`. Delete `handleSave` and `handleCancel`. Sub-components on other tabs (StatesEditor, ResourceRequirementsManager, ScenariosAndRunsPanel, ValidationDashboard) are NOT touched — they auto-save via parent callbacks or are read-only.

**Tech Stack:** React 18.3, TypeScript 4.9, `@testing-library/react` 13.4, Jest.

**Repo:** This plan lives in the LucidChart extension repo (`quodsi_lucidchart_package/`). All file paths and commands below are relative to that repo's root. Confirm you are on branch `feature/auto-save-phase-1g` with `git status` before starting.

**Spec:** Phase 0 architectural spec at `../quodsi/docs/superpowers/specs/2026-05-03-lucid-extension-auto-save-design.md`. Phase 1G is the **final editor migration** under Phase 1 of that spec's rollout.

---

## Key context discovered during brainstorming

**1. `handleSave` has meaningful defaulting that must be preserved.**

`ModelEditor.tsx:678-698` constructs the saved Model with fallbacks for every field:
```ts
const modelToSave: Model = {
  ...localModelDraft,
  type: "Model" as any,
  reps: localModelDraft.reps || 1,
  seed: localModelDraft.seed || DEFAULT_RANDOM_SEED,
  simulationTimeType: localModelDraft.simulationTimeType || SimulationTimeType.Clock,
  oneClockUnit: localModelDraft.oneClockUnit || PeriodUnit.HOURS,
  warmupClockPeriod: localModelDraft.warmupClockPeriod || 0,
  warmupClockPeriodUnit: localModelDraft.warmupClockPeriodUnit || PeriodUnit.HOURS,
  runClockPeriod: localModelDraft.runClockPeriod || 0,
  runClockPeriodUnit: localModelDraft.runClockPeriodUnit || PeriodUnit.HOURS,
  warmupDateTime: localModelDraft.warmupDateTime || null,
  startDateTime: localModelDraft.startDateTime || null,
  finishDateTime: localModelDraft.finishDateTime || null,
};
onSave(modelToSave);
```

Auto-save's direct `onSave(draft)` would skip this defaulting. **Solution**: wrap `onSave` in a `useCallback` that applies the same normalization. The hook calls the wrapper, which calls the parent `onSave` with the normalized Model. Net behavior preserved.

Note: `seed` is NOT a UI field — it has no input. Defaulting it from `localModelDraft.seed` (which equals the initial value or `undefined`) to `DEFAULT_RANDOM_SEED` ensures every saved Model has a valid seed.

**2. The `<form onSubmit>` wrapper exists only for the Save button.**

Line 748: `<form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="w-full">`. Line 992: `<button type="submit" ...>`. The form wrapper catches Enter-key submission via the type="submit" Save button. After we replace the button with `<SaveStatusLine />`, the form wrapper has no purpose — there's nothing to submit. Remove it. Inputs still render the same; the `<div>`/`<form>` swap is invisible to the user.

**3. No name validation.**

ModelEditor doesn't check for name uniqueness — there's only one Model per document. There's no `nameError` state, no `validateName` function. `isValid: true` works.

**4. Sub-components on other tabs auto-save via parent callbacks.**

- **States tab** (`StatesEditor`): receives `onStatesChange`, parent persists immediately
- **Requirements tab** (`ResourceRequirementsManager` + `ResourceRequirementModal`): receives `onAdd`/`onEdit`/`onDelete`, parent calls `updateResourceRequirements` immediately
- **Scenarios tab** (`ScenariosAndRunsPanel`): receives `onScenariosChange`, parent calls `updateScenarioDefinitions` immediately
- **Validation tab** (`ValidationDashboard`): read-only

These are all out of scope for Phase 1G. The migration only touches the Basic tab's form fields and the Save/Cancel buttons.

**5. `referenceData` already passed correctly.**

`ElementEditor.tsx:143` passes `referenceData={referenceData}`. ModelEditor's `Props` interface marks it optional but the parent always passes it. No bundled bug fix this phase.

**6. Conditional rendering by simulationTimeType.**

The Basic tab's Advanced Settings section conditionally renders fields based on `simulationTimeType`:
- **Clock mode**: shows runClockPeriod/runClockPeriodUnit at top + oneClockUnit/warmupClockPeriod/warmupClockPeriodUnit in Advanced
- **CalendarDate mode**: shows startDateTime/finishDateTime/warmupDateTime in Advanced

Watchers fire based on state (not DOM visibility), so adding `useFlushOnChange` for all 4 selects works correctly across mode switches.

---

## File Structure

**Modify:**
- `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ModelEditor.tsx`

**Do NOT touch:**
- `useEditorState.ts`, `SaveStatusLine.tsx` — feature-complete
- `EntityEditor.tsx`, `ResourceEditor.tsx`, `GeneratorEditor.tsx`, `ActivityEditor.tsx`, `ConnectorsEditor.tsx` — already migrated
- `StatesEditor.tsx`, `ResourceRequirementsManager.tsx`, `ResourceRequirementModal.tsx`, `ScenariosAndRunsPanel` (inline within ModelEditor.tsx but treated as a separate concern — only its containing usage is touched, not its body), `ValidationDashboard.tsx` — sub-components auto-save via parent callbacks or are read-only
- `ElementEditor.tsx` — already passes `referenceData` to ModelEditor
- Any test file (no new tests; existing 47 must continue to pass)
- `modelEditorHelpers.ts` (the file `extractModelData`/`updateModelImmutably` come from) — its API is unchanged

---

## Task 1: Setup verification

**Files:** none (verification only)

- [ ] **Step 1: Confirm branch and clean state**

Run: `git status && git log --oneline -3`
Expected: branch `feature/auto-save-phase-1g`, clean working tree, recent commits include the Phase 1F merge commit `70cebb8`.

- [ ] **Step 2: Confirm tests pass on baseline**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false`
Expected: 47 tests passing across 4 suites. Zero failures.

- [ ] **Step 3: Confirm TypeScript clean**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: zero output (no errors).

- [ ] **Step 4: Confirm starting state of ModelEditor**

Run: `grep -n "useAutoSave\|SaveStatusLine\|handleSave\|handleCancel" editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ModelEditor.tsx`

Expected: matches for `handleSave` (around line 678) and `handleCancel` (around line 711) and the Save/Cancel button onClick lines (around lines 984, 992-993). NO references to `useAutoSave` or `SaveStatusLine`. This confirms Phase 1G hasn't started.

- [ ] **Step 5: Confirm five editors are already migrated (Phase 1B-1F)**

Run: `grep -rn "useAutoSave\|SaveStatusLine" editorextensions/quodsi_editor_extension/quodsim-react/src --include="*.tsx" --include="*.ts" | grep -v __tests__ | grep -v useEditorState.ts | grep -v SaveStatusLine.tsx`

Expected: matches in `EntityEditor.tsx`, `ResourceEditor.tsx`, `GeneratorEditor.tsx`, `ActivityEditor.tsx`, AND `ConnectorsEditor.tsx`. No `ModelEditor.tsx` (it hasn't been migrated yet). No other editor files.

---

## Task 2: Migrate ModelEditor

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ModelEditor.tsx`

This task is structured as a sequence of small, independently-runnable edits. After each edit, the file should still typecheck (you can run `npx tsc --noEmit` between edits if uncertain). Final commit happens once all edits are in.

- [ ] **Step 1: Add imports for `useAutoSave`, `useFlushOnChange`, and `SaveStatusLine`**

Find:
```ts
import { useFormSync, useSaveCompletionDetector } from "./hooks/useEditorState";
```

Replace with:
```ts
import { useFormSync, useSaveCompletionDetector, useAutoSave, useFlushOnChange } from "./hooks/useEditorState";
import SaveStatusLine from "./SaveStatusLine";
```

The React import already includes `useCallback` (line 1), so no change needed there.

- [ ] **Step 2: Add `onSaveWithDefaults` callback + wire `useAutoSave` + 4 `useFlushOnChange` calls**

Find the existing block (around lines 617-624):
```ts
useSaveCompletionDetector(isSaving, setHasPendingChanges);

// Trigger validation when validation tab is selected
useEffect(() => {
  if (activeTab === 'validation' && onValidate) {
    onValidate();
  }
}, [activeTab, onValidate]);
```

Insert a new block immediately after `useSaveCompletionDetector(...)` and BEFORE the validation `useEffect`:
```ts
useSaveCompletionDetector(isSaving, setHasPendingChanges);

// Wrap onSave with defaulting logic preserved from the deleted handleSave.
// Auto-save dispatches the raw draft; this callback applies fallbacks for
// fields that may be falsy (e.g., seed has no UI input — always defaults).
const onSaveWithDefaults = useCallback(
  (draft: Model) => {
    const modelToSave: Model = {
      ...draft,
      type: "Model" as any, // Cast: SimulationObjectType.Model is enum; type field expects string literal
      reps: draft.reps || 1,
      seed: draft.seed || DEFAULT_RANDOM_SEED,
      simulationTimeType: draft.simulationTimeType || SimulationTimeType.Clock,
      oneClockUnit: draft.oneClockUnit || PeriodUnit.HOURS,
      warmupClockPeriod: draft.warmupClockPeriod || 0,
      warmupClockPeriodUnit: draft.warmupClockPeriodUnit || PeriodUnit.HOURS,
      runClockPeriod: draft.runClockPeriod || 0,
      runClockPeriodUnit: draft.runClockPeriodUnit || PeriodUnit.HOURS,
      warmupDateTime: draft.warmupDateTime || null,
      startDateTime: draft.startDateTime || null,
      finishDateTime: draft.finishDateTime || null,
    };
    onSave(modelToSave);
  },
  [onSave]
);

const { status, lastSavedAt, saveNow } = useAutoSave<Model>({
  draft: localModelDraft,
  hasPendingChanges,
  isValid: true,
  onSave: onSaveWithDefaults,
  isSaving,
  elementId: localModelDraft.id,
});

// Decisive selects (no useful onBlur): flush save on change.
useFlushOnChange(localModelDraft.simulationTimeType, saveNow);
useFlushOnChange(localModelDraft.runClockPeriodUnit, saveNow);
useFlushOnChange(localModelDraft.oneClockUnit, saveNow);
useFlushOnChange(localModelDraft.warmupClockPeriodUnit, saveNow);

// Trigger validation when validation tab is selected
useEffect(() => {
  if (activeTab === 'validation' && onValidate) {
    onValidate();
  }
}, [activeTab, onValidate]);
```

- [ ] **Step 3: Add `onBlur={saveNow}` to the name input**

Find (around lines 760-767):
```tsx
<input
  type="text"
  name="name"
  className="w-full px-2 py-1 text-xs border rounded"
  value={localModelDraft.name}
  placeholder="Enter model name"
  onChange={handleChange}
/>
```

Replace with:
```tsx
<input
  type="text"
  name="name"
  className="w-full px-2 py-1 text-xs border rounded"
  value={localModelDraft.name}
  placeholder="Enter model name"
  onChange={handleChange}
  onBlur={saveNow}
/>
```

- [ ] **Step 4: Add `onBlur={saveNow}` to the runClockPeriod input**

Find (around lines 782-789):
```tsx
<input
  type="number"
  name="runClockPeriod"
  className="w-full px-2 py-1 text-xs border rounded"
  value={localModelDraft.runClockPeriod || 0}
  onChange={handleChange}
  min="0"
/>
```

Replace with:
```tsx
<input
  type="number"
  name="runClockPeriod"
  className="w-full px-2 py-1 text-xs border rounded"
  value={localModelDraft.runClockPeriod || 0}
  onChange={handleChange}
  min="0"
  onBlur={saveNow}
/>
```

- [ ] **Step 5: Add `onBlur={saveNow}` to the reps input**

Find (around lines 823-830):
```tsx
<input
  type="number"
  name="reps"
  className="w-full px-2 py-1 text-xs border rounded"
  value={localModelDraft.reps}
  onChange={handleChange}
  min="1"
/>
```

Replace with:
```tsx
<input
  type="number"
  name="reps"
  className="w-full px-2 py-1 text-xs border rounded"
  value={localModelDraft.reps}
  onChange={handleChange}
  min="1"
  onBlur={saveNow}
/>
```

- [ ] **Step 6: Add `onBlur={saveNow}` to the warmupClockPeriod input**

Find (around lines 895-902):
```tsx
<input
  type="number"
  name="warmupClockPeriod"
  className="w-full px-2 py-1 text-xs border rounded"
  value={localModelDraft.warmupClockPeriod || 0}
  onChange={handleChange}
  min="0"
/>
```

Replace with:
```tsx
<input
  type="number"
  name="warmupClockPeriod"
  className="w-full px-2 py-1 text-xs border rounded"
  value={localModelDraft.warmupClockPeriod || 0}
  onChange={handleChange}
  min="0"
  onBlur={saveNow}
/>
```

- [ ] **Step 7: Add `onBlur={saveNow}` to the startDateTime input**

Find (around lines 932-938):
```tsx
<input
  type="datetime-local"
  name="startDateTime"
  className="w-full px-2 py-1 text-xs border rounded"
  value={localModelDraft.startDateTime?.toISOString().slice(0, 16) || ""}
  onChange={handleChange}
/>
```

Replace with:
```tsx
<input
  type="datetime-local"
  name="startDateTime"
  className="w-full px-2 py-1 text-xs border rounded"
  value={localModelDraft.startDateTime?.toISOString().slice(0, 16) || ""}
  onChange={handleChange}
  onBlur={saveNow}
/>
```

- [ ] **Step 8: Add `onBlur={saveNow}` to the finishDateTime input**

Find (around lines 949-955):
```tsx
<input
  type="datetime-local"
  name="finishDateTime"
  className="w-full px-2 py-1 text-xs border rounded"
  value={localModelDraft.finishDateTime?.toISOString().slice(0, 16) || ""}
  onChange={handleChange}
/>
```

Replace with:
```tsx
<input
  type="datetime-local"
  name="finishDateTime"
  className="w-full px-2 py-1 text-xs border rounded"
  value={localModelDraft.finishDateTime?.toISOString().slice(0, 16) || ""}
  onChange={handleChange}
  onBlur={saveNow}
/>
```

- [ ] **Step 9: Add `onBlur={saveNow}` to the warmupDateTime input**

Find (around lines 966-972):
```tsx
<input
  type="datetime-local"
  name="warmupDateTime"
  className="w-full px-2 py-1 text-xs border rounded"
  value={localModelDraft.warmupDateTime?.toISOString().slice(0, 16) || ""}
  onChange={handleChange}
/>
```

Replace with:
```tsx
<input
  type="datetime-local"
  name="warmupDateTime"
  className="w-full px-2 py-1 text-xs border rounded"
  value={localModelDraft.warmupDateTime?.toISOString().slice(0, 16) || ""}
  onChange={handleChange}
  onBlur={saveNow}
/>
```

- [ ] **Step 10: Remove the `<form>` wrapper and replace the Save/Cancel button row with `<SaveStatusLine />`**

Find the entire block (around lines 746-1006):
```tsx
{activeTab === "basic" && (
  <>
    <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="w-full">
      <div className="space-y-2">
        {/* Model Name - Always Visible WITH LABEL */}
        ...
        {/* Advanced Settings - Accordion */}
        <AccordionSection
          ...
        </AccordionSection>
      </div>

      {/* Save/Cancel Buttons */}
      <div className="flex justify-end gap-2 pt-2 border-t">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isSaving}
          className={`px-3 py-1.5 text-xs border rounded ${
            isSaving ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
          }`}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!hasPendingChanges || isSaving}
          className={`px-3 py-1.5 text-xs rounded ${
            hasPendingChanges && !isSaving
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  </>
)}
```

Make TWO changes:
1. Replace the opening `<form ...>` and closing `</form>` with no wrapper at all (the inner content stays). Also drop the now-unnecessary `<>...</>` Fragment around the form.
2. Replace the entire Save/Cancel button row block with `<SaveStatusLine ... />`.

The replacement (around lines 746-1006) becomes:
```tsx
{activeTab === "basic" && (
  <div className="w-full">
    <div className="space-y-2">
      {/* Model Name - Always Visible WITH LABEL */}
      ...
      {/* Advanced Settings - Accordion */}
      <AccordionSection
        ...
      </AccordionSection>
    </div>

    {/* Auto-save status */}
    <SaveStatusLine status={status} lastSavedAt={lastSavedAt} />
  </div>
)}
```

Concretely, the operation has three sub-edits:

**Sub-edit 10a**: Find the opening lines (line ~746-748):
```tsx
{activeTab === "basic" && (
  <>
    <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="w-full">
      <div className="space-y-2">
```

Replace with:
```tsx
{activeTab === "basic" && (
  <div className="w-full">
    <div className="space-y-2">
```

**Sub-edit 10b**: Find the Save/Cancel button block (around lines 980-1003):
```tsx
      {/* Save/Cancel Buttons */}
      <div className="flex justify-end gap-2 pt-2 border-t">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isSaving}
          className={`px-3 py-1.5 text-xs border rounded ${
            isSaving ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
          }`}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!hasPendingChanges || isSaving}
          className={`px-3 py-1.5 text-xs rounded ${
            hasPendingChanges && !isSaving
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
```

Replace with:
```tsx
      {/* Auto-save status */}
      <SaveStatusLine status={status} lastSavedAt={lastSavedAt} />
```

**Sub-edit 10c**: Find the closing lines (around lines 1004-1006):
```tsx
    </form>
  </>
)}
```

Replace with:
```tsx
  </div>
)}
```

Verify after all three sub-edits that the file's brace/JSX balance is intact: open the file, jump to line 746, scan forward for the closing `</div>` matching the new opening `<div className="w-full">`, and confirm it lands at the previous `</form>` location (now `</div>`).

- [ ] **Step 11: Delete `handleSave` function**

Find and delete the entire JSDoc + function (around lines 669-698):
```ts
/**
 * Saves the current model draft state.
 *
 * Constructs a complete Model object with all required properties and defaults,
 * then invokes the parent onSave callback. Redux manages the isSaving state automatically.
 *
 * Note: Does NOT directly modify hasPendingChanges - that's handled by the
 * save completion detector to avoid race conditions.
 */
const handleSave = () => {
  const modelToSave: Model = {
    ...localModelDraft,
    type: "Model" as any, // Cast needed: SimulationObjectType.Model is enum, type field expects string literal
    // Ensure all properties have defaults
    reps: localModelDraft.reps || 1,
    seed: localModelDraft.seed || DEFAULT_RANDOM_SEED,
    simulationTimeType: localModelDraft.simulationTimeType || SimulationTimeType.Clock,
    oneClockUnit: localModelDraft.oneClockUnit || PeriodUnit.HOURS,
    warmupClockPeriod: localModelDraft.warmupClockPeriod || 0,
    warmupClockPeriodUnit: localModelDraft.warmupClockPeriodUnit || PeriodUnit.HOURS,
    runClockPeriod: localModelDraft.runClockPeriod || 0,
    runClockPeriodUnit: localModelDraft.runClockPeriodUnit || PeriodUnit.HOURS,
    warmupDateTime: localModelDraft.warmupDateTime || null,
    startDateTime: localModelDraft.startDateTime || null,
    finishDateTime: localModelDraft.finishDateTime || null,
  };

  onSave(modelToSave);
  // Note: isSaving state is now managed by Redux through elementOpsState
};
```

The defaulting logic is now preserved in `onSaveWithDefaults` (Step 2).

- [ ] **Step 12: Delete `handleCancel` function**

Find and delete the entire JSDoc + function (around lines 700-715):
```ts
/**
 * Cancels editing and closes the editor.
 *
 * Discards all pending changes by:
 * - Re-extracting fresh data from model prop
 * - Clearing hasPendingChanges flag (disables Save button)
 * - Calling onCancel prop to close the editor panel
 *
 * Note: State, requirement, and scenario changes were already auto-saved,
 * so they can't be canceled.
 */
const handleCancel = () => {
  setLocalModelDraft(extractModelData(model));
  setHasPendingChanges(false);
  onCancel();
};
```

The `onCancel` prop on `Props` (line 48) AND the destructured `onCancel` parameter (line 573) STAY — vestigial, matching Phase 1B/1C/1D/1E/1F.

- [ ] **Step 13: Update the component-level JSDoc**

Find (around lines 539-571):
```ts
/**
 * ModelEditor - Component for editing model-level simulation settings
 *
 * The ModelEditor orchestrates the configuration of simulation model settings across
 * multiple tabs, including basic properties, state variables, resource requirements,
 * simulation scenarios, and validation. It acts as a container for specialized sub-editors.
 *
 * Features:
 * - Five-tab interface: Basic Settings, State Definitions, Resource Requirements, Scenarios, and Validation
 * - Controlled component with immediate UI updates
 * - Manual save for basic fields (name, reps, seed, time settings)
 * - Auto-save for states, requirements, and scenarios (handled by sub-editors)
 *
 * Tabs:
 * - Basic: Model name, simulation parameters (reps, seed), and time configuration
 * - States: Model-level state variables accessible throughout the simulation
 * - Requirements: Reusable resource requirement templates for activities
 * - Scenarios: Simulation scenario configuration and management
 * - Validation: View and resolve model validation issues
 *
 * State Management:
 * - Maintains local draft state (localModelDraft) for immediate UI updates
 * - Syncs with Redux for save state tracking (isSaving)
 * - Uses custom hooks for model switching and save completion detection
 *
 * Save Behavior:
 * - Basic tab: Requires Save button click to persist changes
 * - States tab: Auto-saves immediately (Save/Cancel buttons hidden)
 * - Requirements tab: Auto-saves immediately
 * - Scenarios tab: Auto-saves immediately
 *
 * @param props - Component props
 * @returns Rendered model editor component
 */
```

Replace with:
```ts
/**
 * ModelEditor - Component for editing model-level simulation settings
 *
 * The ModelEditor orchestrates the configuration of simulation model settings across
 * multiple tabs, including basic properties, state variables, resource requirements,
 * simulation scenarios, and validation. It acts as a container for specialized sub-editors.
 *
 * Features:
 * - Five-tab interface: Basic Settings, State Definitions, Resource Requirements, Scenarios, and Validation
 * - Controlled component with immediate UI updates
 * - Auto-save for all fields via useAutoSave hook (debounce + onBlur flush;
 *   useFlushOnChange flush for select dropdowns)
 *
 * Tabs:
 * - Basic: Model name, simulation parameters (reps, seed), and time configuration
 * - States: Model-level state variables accessible throughout the simulation
 * - Requirements: Reusable resource requirement templates for activities
 * - Scenarios: Simulation scenario configuration and management
 * - Validation: View and resolve model validation issues
 *
 * State Management:
 * - Maintains local draft state (localModelDraft) for immediate UI updates
 * - Syncs with Redux for save state tracking (isSaving)
 * - Uses custom hooks for model switching and save completion detection
 * - Single save path: all Basic-tab field changes route through useAutoSave (debounced)
 *
 * Save Behavior:
 * - Basic tab — Typed inputs (name, reps, runClockPeriod, warmupClockPeriod,
 *   startDateTime, finishDateTime, warmupDateTime): debounced auto-save on edit;
 *   immediate save on blur or element switch.
 * - Basic tab — Selects (simulationTimeType, runClockPeriodUnit, oneClockUnit,
 *   warmupClockPeriodUnit): immediate save via useFlushOnChange (selects have no
 *   useful onBlur).
 * - Save defaulting: onSave is wrapped in onSaveWithDefaults that applies fallbacks
 *   for falsy fields (DEFAULT_RANDOM_SEED for seed, PeriodUnit.HOURS for unit
 *   selectors, etc.) so every saved Model is fully populated even if the user
 *   blanked optional fields.
 * - States tab: Auto-saves immediately via parent onStatesChange.
 * - Requirements tab: Auto-saves immediately via updateResourceRequirements.
 * - Scenarios tab: Auto-saves immediately via updateScenarioDefinitions.
 * - Validation tab: Read-only.
 * - Status surfaced via SaveStatusLine ("Saved" / "Saving…" / "Save failed —
 *   keep typing to retry"). Native LucidChart Ctrl+Z reverses saved changes.
 *
 * @param props - Component props (onCancel kept as vestigial; see Phase 0 spec)
 * @returns Rendered model editor component
 */
```

- [ ] **Step 14: Update `handleChange` JSDoc**

Find (around lines 640-652):
```ts
/**
 * Handles changes to form input fields with automatic type conversion.
 *
 * Updates are applied immediately to localModelDraft for responsive UI,
 * and marked as pending (requiring Save button click to persist).
 *
 * Type conversion:
 * - number inputs: Parsed as float with fallback to 0 for invalid values
 * - datetime-local inputs: Converted to Date objects or null
 * - all other inputs: Kept as strings
 *
 * @param e - Input change event
 */
```

Replace with:
```ts
/**
 * Handles changes to form input fields with automatic type conversion.
 *
 * Updates are applied immediately to localModelDraft for responsive UI,
 * and marked as pending. Auto-save fires after debounce (typed inputs),
 * on blur (typed inputs), or via useFlushOnChange (selects).
 *
 * Type conversion:
 * - number inputs: Parsed as float with fallback to 0 for invalid values
 * - datetime-local inputs: Converted to Date objects or null
 * - all other inputs: Kept as strings
 *
 * @param e - Input change event
 */
```

- [ ] **Step 15: Run TypeScript check**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: zero output. If errors, read carefully:
- Mismatched braces from Step 10's three sub-edits → re-verify the open/close matching
- Unused variable warnings (e.g., `setLocalModelDraft` if Step 12's deletion stranded a variable) → not expected; setLocalModelDraft is still used by handleChange and useFormSync

- [ ] **Step 16: Run the test suite**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false`
Expected: 47 tests passing across 4 suites. Zero failures. (No new tests added — the hook contract is unchanged from Phase 1A.)

- [ ] **Step 17: Run a production build**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm run build`
Expected: `Compiled successfully.` with no errors.

- [ ] **Step 18: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ModelEditor.tsx
git commit -m "feat(react): migrate ModelEditor to auto-save (Phase 1G)

Final editor migration in the Group A sweep. After Phase 1G, all 7
editors (Entity, Resource, Generator, Activity, Connectors, Model)
consume useAutoSave + SaveStatusLine.

Mirror Phase 1B-1F pattern with one ModelEditor-specific twist:
handleSave's defaulting logic is preserved by wrapping onSave in
a useCallback that applies the same fallbacks (DEFAULT_RANDOM_SEED,
PeriodUnit.HOURS for units, null for dates, etc.). The hook
dispatches through this wrapper so every saved Model is fully
populated even if the user blanked optional fields.

- Wire useAutoSave<Model> with isValid: true (no name uniqueness
  check; only one Model per document)
- Wrap onSave in onSaveWithDefaults (preserves handleSave's
  defaulting; replaces the deleted handleSave function)
- 7 onBlur={saveNow} additions (name, reps, runClockPeriod,
  warmupClockPeriod, 3 datetime-local inputs)
- 4 useFlushOnChange calls (simulationTimeType, 3 unit selects)
- Replace Save/Cancel button row with SaveStatusLine
- Remove <form onSubmit> wrapper (no submit button to bind to)
- Delete handleSave and handleCancel (onCancel prop kept vestigial)
- JSDoc updates: component-level, handleChange

Out of scope (sub-components untouched):
- StatesEditor (auto-saves via onStatesChange)
- ResourceRequirementsManager + ResourceRequirementModal (auto-save
  via updateResourceRequirements)
- ScenariosAndRunsPanel (auto-saves via updateScenarioDefinitions)
- ValidationDashboard (read-only)"
```

---

## Task 3: Final verification + manual smoke

**Files:** none (verification only)

- [ ] **Step 1: Confirm SIX editors now consume auto-save (the entire Group A sweep)**

Run: `grep -rn "useAutoSave\|SaveStatusLine" editorextensions/quodsi_editor_extension/quodsim-react/src --include="*.tsx" --include="*.ts" | grep -v __tests__ | grep -v useEditorState.ts | grep -v SaveStatusLine.tsx`

Expected: matches in `EntityEditor.tsx`, `ResourceEditor.tsx`, `GeneratorEditor.tsx`, `ActivityEditor.tsx`, `ConnectorsEditor.tsx`, AND `ModelEditor.tsx`. No other editor files.

- [ ] **Step 2: Confirm `useFlushOnChange` usage count**

Run: `grep -rn "useFlushOnChange" editorextensions/quodsi_editor_extension/quodsim-react/src --include="*.tsx" --include="*.ts" | grep -v __tests__`

Expected:
- 1 declaration in `useEditorState.ts`
- ResourceEditor: 1 import + 1 call
- GeneratorEditor: 1 import + 2 calls
- ActivityEditor: 1 import + 5 calls
- ConnectorsEditor: 1 import + 1 call
- ModelEditor: 1 import + 4 calls — NEW in Phase 1G

Total helper calls across editors: 13.

- [ ] **Step 3: Final TypeScript check**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: zero output.

- [ ] **Step 4: Final test run**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false`
Expected: 47 tests passing across 4 suites.

- [ ] **Step 5: Final production build**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm run build`
Expected: `Compiled successfully.`

- [ ] **Step 6: Confirm commit history is clean**

Run: `git log --oneline main..HEAD`
Expected: 2 commits — the plan doc commit + the migration commit.

- [ ] **Step 7: Hand off to Daniel for manual smoke**

Manual smoke checklist (Daniel runs in LucidChart locally):

**Basic tab — always visible fields:**
1. Open the Model panel → ModelEditor renders on the Basic tab
2. Edit Model Name → debounce → "Saved"; blur name → immediate save
3. Open Advanced Settings accordion → reps input visible
4. Edit reps → debounce → Saved; blur → immediate save

**Time mode switching (decisive):**
5. Change Time Mode select from Clock to CalendarDate → save fires immediately (watcher); UI flips to show date pickers

**Clock mode (re-enter Clock mode for steps 6-9):**
6. Edit runClockPeriod number → debounce → Saved; blur → immediate
7. Change runClockPeriodUnit select → save fires (watcher)
8. Change oneClockUnit select → save fires (watcher)
9. Edit warmupClockPeriod / warmupClockPeriodUnit → debounce / watcher → Saved

**CalendarDate mode (switch to CalendarDate):**
10. Edit Start Date / Finish Date / Warmup Date → debounce → Saved; blur → immediate save

**Tab switching (sub-component coverage — verify no regression):**
11. States tab → edit a state definition → still auto-saves immediately (parent path unchanged)
12. Requirements tab → add/edit/delete a resource requirement → still auto-saves
13. Scenarios tab → add/run/delete a scenario → still auto-saves
14. Validation tab → read-only, displays validation results

**Cross-cutting:**
15. With pending edits on Basic, switch to a different element (e.g., an Activity) → flushes pending Model edits
16. Native Ctrl+Z reverses Basic-tab changes
17. Browser console clean — no errors or warnings introduced by Phase 1G

If smoke fails on any item: fix on this branch before merge.
If smoke passes: merge `feature/auto-save-phase-1g` to `main` and push. **This completes the Group A sweep.**
