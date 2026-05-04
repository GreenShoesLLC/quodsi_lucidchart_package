# Lucid Auto-Save — Phase 1D (GeneratorEditor Migration) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `GeneratorEditor.tsx` from manual Save/Cancel buttons to the auto-save mechanism (Phase 0+1A). Third editor migration. Adds two new wrinkles vs. Phase 1B/1C: (a) two `useEffect` watchers for select-dropdown changes (`entityId`, `generatorType`) since selects have no useful blur, and (b) unification of the previously-direct-`onSave` state-modifications path through the hook (decision Q4-A: pure debounce).

**Architecture:** Wire `useAutoSave<Generator>` into `GeneratorEditor.tsx` using existing `localGeneratorDraft`, `hasPendingChanges`, `nameError`, `isSaving`, `onSave` plumbing. Add `onBlur={saveNow}` to the 4 typed inputs (name, periodicOccurrences, entitiesPerCreation, maxEntities). Add two `prevRef` watcher `useEffect`s for the entity and generator-type selects. Refactor `handleStateModificationsChange` to set `hasPendingChanges(true)` instead of calling `onSave` directly — state-mod changes now go through debounce (single save path). `EnhancedDurationEditor` already fires `onChange` per keystroke with no buffering, so debounce handles duration fields naturally with no new plumbing. Replace Save/Cancel button row with `<SaveStatusLine />`. Delete `handleSave` and `handleCancel`. The TIME_DISTRIBUTED branch (currently UI-disabled) is intentionally NOT wired — YAGNI until that feature ships.

**Tech Stack:** React 18.3, TypeScript 4.9, `@testing-library/react` 13.4 (only for hook/component tests, which already exist), Jest.

**Repo:** This plan lives in the LucidChart extension repo (`quodsi_lucidchart_package/`). All file paths and commands below are relative to that repo's root. Confirm you are on branch `feature/auto-save-phase-1d` with `git status` before starting.

**Spec:** Phase 0 architectural spec at `../quodsi/docs/superpowers/specs/2026-05-03-lucid-extension-auto-save-design.md` in the sibling monorepo. Phase 1D is the **third editor migration** under Phase 1 of that spec's rollout.

---

## Key context discovered during brainstorming

**1. `EnhancedDurationEditor` already fires `onChange` per keystroke with no buffering.**

`src/features/editors/EnhancedDurationEditor.tsx:62, 68` (the `handleDistributionTypeChange` and `handleDistributionChange` callbacks) explicitly note "Notify parent immediately (no local buffering)". This means every keystroke or selector change inside the duration editor calls `handleDurationChange` in GeneratorEditor, which calls `setLocalGeneratorDraft` + `setHasPendingChanges(true)`. Under auto-save with debounce, the timer resets on each keystroke and saves once the user pauses for 500ms. **No `onBlur` plumbing is needed for durations.**

**2. `handleStateModificationsChange` currently bypasses the auto-save mechanism.**

`GeneratorEditor.tsx:515-529`:
```ts
const handleStateModificationsChange = (mods: any[]) => {
  const validModifications = mods.filter(...);
  const updatedGenerator = updateGeneratorImmutably(localGeneratorDraft, {
    initialStateModifications: validModifications
  });
  // Auto-save immediately (Redux manages isSaving state)
  onSave(updatedGenerator);
  // Update local state to match
  setLocalGeneratorDraft(updatedGenerator);
};
```

It calls `onSave` directly without setting `hasPendingChanges`. Decision Q4-A from the brainstorm: refactor this to go through debounce — set `hasPendingChanges(true)` and let `useAutoSave` dispatch via the timer. UX cost: 500ms latency added to state-mod saves; mitigated by the element-switch flush + unmount flush from Phase 0+1A. Single save path is the goal.

**3. Selects (`entityId`, `generatorType`) have no useful blur event.**

Decision Q3-A: add two watcher `useEffect`s mirroring the ResourceEditor financial-enabled checkbox pattern (`prevRef` + compare + `saveNow()`). The hook's internal `!hasPendingRef.current` early-return makes this safe across element switches.

**4. TIME_DISTRIBUTED branch is UI-disabled.**

Line 795: `<option value={GeneratorType.TIME_DISTRIBUTED} disabled>Time-Distributed (Coming Soon)</option>`. The `handleToggleConfigAssociation` and `handleDeleteConfig` cleanup-side-effects (which set `hasPendingChanges`) are unreachable today. Auto-save will pick them up naturally via debounce IF they ever get re-enabled — no action needed in this phase.

**5. Modals (`TimePatternEditorModal`, `TimeDistributedConfigEditorModal`) affect parent-level state, not generator state.**

They call `onTimePatternsChange` / `onTimeDistributedConfigsChange` props — different state slice. Outside auto-save scope. Don't touch.

**6. `referenceData` is already passed correctly from `ElementEditor.tsx`.**

Line 173 of ElementEditor.tsx (verified during brainstorm): `referenceData={referenceData}`. The Props interface in GeneratorEditor.tsx marks `referenceData` as required (line 76). No bundled bug fix this phase.

---

## File Structure

**Modify:**
- `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/GeneratorEditor.tsx`

**Do NOT touch:**
- `useEditorState.ts` — feature-complete from Phase 0+1A; signature unchanged
- `SaveStatusLine.tsx` — feature-complete from Phase 0
- `EntityEditor.tsx`, `ResourceEditor.tsx` — already migrated
- `EnhancedDurationEditor.tsx` — debounce handles its onChange path natively
- `StateModificationsEditor.tsx` — its `onModificationsChange` callback shape is unchanged; only the GeneratorEditor handler body changes
- `ElementEditor.tsx` — already passes `referenceData` to GeneratorEditor
- Any other editor (.tsx)
- Any test file (no new tests; existing 44 must continue to pass)

---

## Task 1: Setup verification

**Files:** none (verification only)

- [ ] **Step 1: Confirm branch and clean state**

Run: `git status && git log --oneline -3`
Expected: branch `feature/auto-save-phase-1d`, clean working tree, recent commits include the Phase 1C merge commit `1025fb7`.

- [ ] **Step 2: Confirm tests pass on baseline**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false`
Expected: 44 tests passing across 3 suites. Zero failures.

- [ ] **Step 3: Confirm TypeScript clean**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: zero output (no errors).

- [ ] **Step 4: Confirm starting state of GeneratorEditor**

Run: `grep -n "useAutoSave\|SaveStatusLine\|handleSave\|handleCancel\|onSave(updatedGenerator)" editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/GeneratorEditor.tsx`

Expected output should include `handleSave` (around line 543), `handleCancel` (around line 569), `onSave(updatedGenerator)` inside `handleStateModificationsChange` (around line 526), and Save/Cancel button onClick (around lines 1110, 1117) — but NO references to `useAutoSave` or `SaveStatusLine`. This confirms Phase 1D hasn't started.

- [ ] **Step 5: Confirm two editors are already migrated (Phase 1B + 1C)**

Run: `grep -rn "useAutoSave\|SaveStatusLine" editorextensions/quodsi_editor_extension/quodsim-react/src --include="*.tsx" --include="*.ts" | grep -v __tests__ | grep -v useEditorState.ts | grep -v SaveStatusLine.tsx`

Expected: matches in `EntityEditor.tsx` AND `ResourceEditor.tsx` only. No `GeneratorEditor.tsx` (it hasn't been migrated yet). No other editor files. This confirms the baseline is clean.

---

## Task 2: Migrate GeneratorEditor

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/GeneratorEditor.tsx`

This task is structured as a sequence of small, independently-runnable edits. After each edit, the file should still typecheck (you can run `npx tsc --noEmit` between edits if uncertain). Final commit happens once all edits are in.

- [ ] **Step 1: Add `useRef` to React import**

Find:
```ts
import React, { useState, useEffect } from "react";
```

Replace with:
```ts
import React, { useState, useEffect, useRef } from "react";
```

- [ ] **Step 2: Add imports for `useAutoSave` and `SaveStatusLine`**

Find:
```ts
import { useFormSync, useSaveCompletionDetector } from "./hooks/useEditorState";
```

Replace with:
```ts
import { useFormSync, useSaveCompletionDetector, useAutoSave } from "./hooks/useEditorState";
import SaveStatusLine from "./SaveStatusLine";
```

- [ ] **Step 3: Wire the `useAutoSave` hook**

Find the existing block (around line 388-393):
```ts
useSaveCompletionDetector(isSaving, setHasPendingChanges);

// Reset nameError when generator changes
useEffect(() => {
  setNameError(null);
}, [localGeneratorDraft.id]);
```

Insert a new block immediately after `useSaveCompletionDetector(...)` and BEFORE the `useEffect` that resets `nameError`:
```ts
useSaveCompletionDetector(isSaving, setHasPendingChanges);

const { status, lastSavedAt, saveNow } = useAutoSave<Generator>({
  draft: localGeneratorDraft,
  hasPendingChanges,
  isValid: nameError === null,
  onSave,
  isSaving,
  elementId: localGeneratorDraft.id,
});

// Reset nameError when generator changes
useEffect(() => {
  setNameError(null);
}, [localGeneratorDraft.id]);
```

- [ ] **Step 4: Add the entityId watcher useEffect**

Insert immediately after the `setNameError(null)` reset effect:
```ts
// Fire saveNow when entity selection changes.
// Selects have no useful onBlur; this runs after the state update commits so
// draftRef inside useAutoSave reflects the new entityId.
const prevEntityIdRef = useRef<string | undefined>(
  localGeneratorDraft.generationConfig.entityId
);
useEffect(() => {
  const current = localGeneratorDraft.generationConfig.entityId;
  if (prevEntityIdRef.current !== current) {
    prevEntityIdRef.current = current;
    saveNow();
  }
}, [localGeneratorDraft.generationConfig.entityId, saveNow]);
```

- [ ] **Step 5: Add the generatorType watcher useEffect**

Insert immediately after the entityId watcher from Step 4:
```ts
// Fire saveNow when generator type changes (FREQUENCY <-> TIME_DISTRIBUTED).
// Currently TIME_DISTRIBUTED is UI-disabled but the watcher costs nothing and
// is ready when the feature ships.
const prevGeneratorTypeRef = useRef<GeneratorType | undefined>(
  localGeneratorDraft.generationConfig.generatorType
);
useEffect(() => {
  const current = localGeneratorDraft.generationConfig.generatorType;
  if (prevGeneratorTypeRef.current !== current) {
    prevGeneratorTypeRef.current = current;
    saveNow();
  }
}, [localGeneratorDraft.generationConfig.generatorType, saveNow]);
```

- [ ] **Step 6: Refactor `handleStateModificationsChange` to use the hook**

Find (around lines 515-529):
```ts
const handleStateModificationsChange = (mods: any[]) => {
  // Defensive: Filter out state modifications that reference deleted states
  const validModifications = mods.filter(
    mod => states.getByUniqueId(mod.stateUniqueId) !== undefined
  );

  const updatedGenerator = updateGeneratorImmutably(localGeneratorDraft, {
    initialStateModifications: validModifications
  });

  // Auto-save immediately (Redux manages isSaving state)
  onSave(updatedGenerator);
  // Update local state to match
  setLocalGeneratorDraft(updatedGenerator);
};
```

Replace with:
```ts
const handleStateModificationsChange = (mods: any[]) => {
  // Defensive: Filter out state modifications that reference deleted states
  const validModifications = mods.filter(
    mod => states.getByUniqueId(mod.stateUniqueId) !== undefined
  );

  setLocalGeneratorDraft(prev => updateGeneratorImmutably(prev, {
    initialStateModifications: validModifications
  }));
  setHasPendingChanges(true);
};
```

The direct `onSave(updatedGenerator)` call is replaced by the auto-save debounce path. The `setLocalGeneratorDraft(prev => ...)` form is preferred over the previous `(updatedGenerator)` form because we no longer have a reference outside the callback that needs to match.

- [ ] **Step 7: Add `onBlur={saveNow}` to the name input**

Find (around line 741-748):
```tsx
<input
  type="text"
  name="name"
  className="w-full px-2 py-1.5 text-xs border rounded"
  value={localGeneratorDraft.name}
  onChange={handleInputChange}
  placeholder="Enter generator name"
/>
```

Replace with:
```tsx
<input
  type="text"
  name="name"
  className="w-full px-2 py-1.5 text-xs border rounded"
  value={localGeneratorDraft.name}
  onChange={handleInputChange}
  placeholder="Enter generator name"
  onBlur={saveNow}
/>
```

- [ ] **Step 8: Add `onBlur={saveNow}` to the periodicOccurrences input**

Find (around line 862-869):
```tsx
<input
  type="number"
  name="periodicOccurrences"
  className="w-full px-2 py-1 text-xs border rounded"
  value={localGeneratorDraft.generationConfig.periodicOccurrences}
  onChange={handleInputChange}
  min="0"
/>
```

Replace with:
```tsx
<input
  type="number"
  name="periodicOccurrences"
  className="w-full px-2 py-1 text-xs border rounded"
  value={localGeneratorDraft.generationConfig.periodicOccurrences}
  onChange={handleInputChange}
  min="0"
  onBlur={saveNow}
/>
```

- [ ] **Step 9: Add `onBlur={saveNow}` to the entitiesPerCreation input**

Find (around line 913-920):
```tsx
<input
  type="number"
  name="entitiesPerCreation"
  className="w-full px-2 py-1 text-xs border rounded"
  value={localGeneratorDraft.generationConfig.entitiesPerCreation}
  onChange={handleInputChange}
  min="1"
/>
```

Replace with:
```tsx
<input
  type="number"
  name="entitiesPerCreation"
  className="w-full px-2 py-1 text-xs border rounded"
  value={localGeneratorDraft.generationConfig.entitiesPerCreation}
  onChange={handleInputChange}
  min="1"
  onBlur={saveNow}
/>
```

- [ ] **Step 10: Add `onBlur={saveNow}` to the maxEntities input**

Find (around line 931-938):
```tsx
<input
  type="number"
  name="maxEntities"
  className="w-full px-2 py-1 text-xs border rounded"
  value={localGeneratorDraft.generationConfig.maxEntities}
  onChange={handleInputChange}
  min="1"
/>
```

Replace with:
```tsx
<input
  type="number"
  name="maxEntities"
  className="w-full px-2 py-1 text-xs border rounded"
  value={localGeneratorDraft.generationConfig.maxEntities}
  onChange={handleInputChange}
  min="1"
  onBlur={saveNow}
/>
```

- [ ] **Step 11: Replace the Save/Cancel button row with `<SaveStatusLine />`**

Find the entire JSX block (around lines 1107-1127):
```tsx
{/* Save/Cancel Buttons */}
<div className="flex justify-end gap-2 pt-2 border-t">
    <button
      type="button"
      onClick={handleCancel}
      className="px-3 py-1.5 text-xs border rounded hover:bg-gray-50"
    >
      Cancel
    </button>
    <button
      type="button"
      onClick={handleSave}
      disabled={!hasPendingChanges || nameError !== null}
      className={`px-3 py-1.5 text-xs rounded ${
        hasPendingChanges && nameError === null
          ? "bg-blue-600 text-white hover:bg-blue-700"
          : "bg-gray-300 text-gray-500 cursor-not-allowed"
      }`}
    >
      Save
    </button>
</div>
```

Replace with:
```tsx
{/* Auto-save status */}
<SaveStatusLine status={status} lastSavedAt={lastSavedAt} />
```

- [ ] **Step 12: Delete `handleSave` function**

Find and delete the entire JSDoc + function (around lines 531-557):
```ts
/**
 * Saves the current generator draft to the model (manual save for basic fields).
 *
 * Key responsibilities:
 * - Filters out orphaned state modifications referencing deleted states (defensive cleanup)
 * - Triggers Redux save action via onSave callback
 * - Redux manages isSaving state and optimistic updates
 * - useSaveCompletionDetector hook clears hasPendingChanges when save completes
 *
 * Note: Does NOT directly modify hasPendingChanges - that's handled by the
 * save completion detector to avoid race conditions.
 */
const handleSave = () => {
  // Defensive: Filter out state modifications that reference deleted states
  const currentModifications = localGeneratorDraft.generationConfig.initialStateModifications || [];
  const validModifications = currentModifications.filter(
    mod => states.getByUniqueId(mod.stateUniqueId) !== undefined
  );

  // Only create updated generator if modifications were filtered out
  const generatorToSave = validModifications.length !== currentModifications.length
    ? updateGeneratorImmutably(localGeneratorDraft, { initialStateModifications: validModifications })
    : localGeneratorDraft;

  onSave(generatorToSave);
  // Note: isSaving state is now managed by Redux through elementOpsState
};
```

**Important:** the orphaned-state-modification cleanup that previously happened in `handleSave` is no longer needed at save-time because `handleStateModificationsChange` already filters mods at change-time (Step 6 preserved that filter). Auto-save dispatches whatever is in the draft, and the draft is always clean.

- [ ] **Step 13: Delete `handleCancel` function**

Find and delete the entire JSDoc + function (around lines 559-572):
```ts
/**
 * Cancels editing and resets form to original generator data.
 *
 * Discards all pending changes by:
 * - Re-extracting fresh data from generator prop
 * - Clearing hasPendingChanges flag (disables Save button)
 *
 * Note: Does NOT close the editor - that's handled by parent component.
 * Note: State modification changes were already auto-saved, so they can't be canceled.
 */
const handleCancel = () => {
  setLocalGeneratorDraft(extractGeneratorData(generator));
  setHasPendingChanges(false);
};
```

The `onCancel` prop on `Props` (line 74) and the destructured `onCancel` parameter (line 120) stay — vestigial, matching Phase 1B/1C.

- [ ] **Step 14: Update the component-level JSDoc**

Find (around lines 92-116):
```ts
/**
 * GeneratorEditor - Comprehensive editor for Generator simulation objects
 *
 * This component provides a tabbed interface for editing all aspects of a Generator:
 * - Basic: Name, generator type, entity type, entities per creation, max entities
 * - Frequency: Interarrival time, periodic occurrences, and start delay (FREQUENCY generators only)
 * - Distribution: Time patterns and configurations (TIME_DISTRIBUTED generators only)
 * - Events: Initial state modifications for created entities
 * - States: State variable definitions
 *
 * State Management:
 * - Maintains local draft state (localGeneratorDraft) for immediate UI updates
 * - Syncs with Redux for save state tracking (isSaving)
 * - Uses custom hooks for generator switching and save completion detection
 * - Mixed save behavior: Most fields use Save button, state modifications auto-save
 *
 * Key Features:
 * - Generator type selector determines which tabs are visible (FREQUENCY vs TIME_DISTRIBUTED)
 * - Automatic tab switching when generator type changes
 * - Dirty state tracking (hasPendingChanges) enables/disables Save button
 * - Guard conditions prevent data loss when switching generators
 * - Immutable updates via updateGeneratorImmutably helper
 * - Manual save for basic fields and durations (requires Save button click)
 * - Auto-save for state modifications only (immediate persistence)
 */
```

Replace with:
```ts
/**
 * GeneratorEditor - Comprehensive editor for Generator simulation objects
 *
 * This component provides a tabbed interface for editing all aspects of a Generator:
 * - Basic: Name, generator type, entity type, entities per creation, max entities
 * - Frequency: Interarrival time, periodic occurrences, and start delay (FREQUENCY generators only)
 * - Distribution: Time patterns and configurations (TIME_DISTRIBUTED generators only)
 * - Events: Initial state modifications for created entities
 * - States: State variable definitions
 *
 * State Management:
 * - Maintains local draft state (localGeneratorDraft) for immediate UI updates
 * - Syncs with Redux for save state tracking (isSaving)
 * - Uses custom hooks for generator switching and save completion detection
 * - Single save path: all field changes route through useAutoSave (debounced)
 *
 * Save Behavior:
 * - Text/number inputs (name, periodicOccurrences, entitiesPerCreation,
 *   maxEntities): debounced auto-save on edit; immediate save on blur or
 *   element switch.
 * - Select dropdowns (entityId, generatorType): immediate save via watcher
 *   useEffects (selects have no useful onBlur).
 * - Duration editors (interarrival time, start delay): debounced auto-save —
 *   EnhancedDurationEditor fires onChange per keystroke with no buffering, so
 *   the debounce timer resets naturally.
 * - State modifications: routed through debounce (unified with all other
 *   fields; replaces previous direct-onSave path).
 * - Status surfaced via SaveStatusLine ("Saved" / "Saving…" / "Fix errors to
 *   save" / "Save failed — keep typing to retry"). Native LucidChart Ctrl+Z
 *   reverses saved changes.
 *
 * Key Features:
 * - Generator type selector determines which tabs are visible (FREQUENCY vs TIME_DISTRIBUTED)
 * - Automatic tab switching when generator type changes
 * - Auto-save for all fields via useAutoSave hook (debounce + onBlur flush
 *   on typed inputs; useEffect flush for select dropdowns)
 * - Guard conditions prevent data loss when switching generators
 * - Immutable updates via updateGeneratorImmutably helper
 *
 * @param props - Component props (onCancel kept as vestigial; see Phase 0 spec)
 */
```

- [ ] **Step 15: Update `handleInputChange` JSDoc**

Find (around lines 425-432):
```ts
/**
 * Handles changes to basic input fields (name, entity, occurrences, etc.).
 *
 * Updates are applied immediately to localGeneratorDraft for responsive UI,
 * but NOT persisted until user clicks Save button.
 *
 * Sets hasPendingChanges to enable the Save button.
 */
```

Replace with:
```ts
/**
 * Handles changes to basic input fields (name, entity, occurrences, etc.).
 *
 * Updates are applied immediately to localGeneratorDraft for responsive UI,
 * validates the name, and marks the draft as pending. Auto-save fires after
 * debounce (typed inputs and durations), on blur (typed inputs), or via the
 * select-watching useEffects (entityId, generatorType).
 */
```

- [ ] **Step 16: Update `handleDurationChange` JSDoc**

Find (around lines 465-472):
```ts
/**
 * Handles changes to duration fields (interarrival time, start delay).
 *
 * Updates are applied immediately to localGeneratorDraft for responsive UI,
 * but NOT persisted until user clicks Save button (consistent with ActivityEditor).
 *
 * Sets hasPendingChanges to enable the Save button.
 */
```

Replace with:
```ts
/**
 * Handles changes to duration fields (interarrival time, start delay).
 *
 * Updates are applied immediately to localGeneratorDraft for responsive UI,
 * and marked as pending. EnhancedDurationEditor fires onChange per keystroke
 * with no buffering, so the auto-save debounce timer resets naturally and
 * fires once the user pauses for 500ms.
 */
```

- [ ] **Step 17: Update `handleStateModificationsChange` JSDoc**

Find (around lines 501-514):
```ts
/**
 * Handles changes to initial state modifications.
 *
 * IMPORTANT: This handler AUTO-SAVES IMMEDIATELY (different from basic fields).
 * State modifications are considered "committed" as soon as they're changed.
 *
 * Flow:
 * 1. Filter out state modifications that reference deleted states (defensive cleanup)
 * 2. Create updated generator with valid state modifications
 * 3. Trigger immediate save via onSave (Redux manages save state)
 * 4. Update local state to match
 *
 * This bypasses the Save button workflow - changes are persisted immediately.
 */
```

Replace with:
```ts
/**
 * Handles changes to initial state modifications.
 *
 * Routed through the auto-save hook (single save path). The change is applied
 * to localGeneratorDraft and marked as pending; the debounce timer dispatches
 * the save after 500ms idle, or immediately on element switch / unmount.
 *
 * Flow:
 * 1. Filter out state modifications that reference deleted states (defensive cleanup)
 * 2. Apply the cleaned modifications to localGeneratorDraft
 * 3. Mark draft as pending — useAutoSave handles dispatch
 */
```

- [ ] **Step 18: Run TypeScript check**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: zero output. If any errors, read them carefully — most likely an unused-import warning or a missing `useRef` if Step 1 was skipped.

- [ ] **Step 19: Run the test suite**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false`
Expected: 44 tests passing across 3 suites. Zero failures. (No new tests added — the hook contract is unchanged from Phase 1A; the migration is pure call-site wiring.)

- [ ] **Step 20: Run a production build**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm run build`
Expected: `Compiled successfully.` with no errors. Warnings are tolerable but read them.

- [ ] **Step 21: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/GeneratorEditor.tsx
git commit -m "feat(react): migrate GeneratorEditor to auto-save (Phase 1D)

Mirror the Phase 1B/1C pattern with two new wrinkles:
- Two useEffect watchers (entityId, generatorType) since selects have
  no useful onBlur
- Refactor handleStateModificationsChange to set hasPendingChanges
  instead of calling onSave directly — state mods now route through
  debounce (single save path)

Other changes:
- Wire useAutoSave<Generator> with existing draft/pending/saving plumbing
- onBlur={saveNow} on 4 typed inputs (name, periodicOccurrences,
  entitiesPerCreation, maxEntities)
- Replace Save/Cancel button row with SaveStatusLine
- Delete handleSave and handleCancel (unreachable)

Out of scope:
- EnhancedDurationEditor (its onChange already fires per-keystroke with
  no buffering; debounce handles it natively)
- TIME_DISTRIBUTED branch (UI-disabled until that feature ships)
- Modals (affect parent-level state, not generator state)"
```

---

## Task 3: Final verification + manual smoke

**Files:** none (verification only)

- [ ] **Step 1: Confirm three editors now consume auto-save**

Run: `grep -rn "useAutoSave\|SaveStatusLine" editorextensions/quodsi_editor_extension/quodsim-react/src --include="*.tsx" --include="*.ts" | grep -v __tests__ | grep -v useEditorState.ts | grep -v SaveStatusLine.tsx`

Expected: matches in `EntityEditor.tsx`, `ResourceEditor.tsx`, AND `GeneratorEditor.tsx`. No other editor files. If anything else shows up, investigate.

- [ ] **Step 2: Final TypeScript check**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: zero output.

- [ ] **Step 3: Final test run**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false`
Expected: 44 tests passing. Same number as before — Phase 1D adds no new tests (hook is unchanged).

- [ ] **Step 4: Final production build**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm run build`
Expected: `Compiled successfully.`

- [ ] **Step 5: Confirm commit history is clean**

Run: `git log --oneline main..HEAD`
Expected: 2 commits — the plan doc commit + the migration commit. No fixup or amended-for-no-reason noise.

- [ ] **Step 6: Hand off to Daniel for manual smoke**

Manual smoke checklist (Daniel runs in LucidChart locally):
1. Drop a Generator shape, edit name → debounce → "Saved"; blur name → immediate save
2. Type a duplicate Generator name → inline error + status reads "Fix errors to save"
3. Fix the duplicate → save fires
4. Change Entity dropdown → save fires immediately (entityId watcher useEffect)
5. Change Generator Type dropdown → save fires (generatorType watcher useEffect; only FREQUENCY available so the watcher won't actually flip — confirms it doesn't misfire on initial render)
6. Edit Time Between Arrivals (period unit, distribution type, distribution params) → debounce → Saved
7. Expand Advanced Settings → edit Periodic Occurrences/Entities Per Creation/Max Entities → debounce → Saved; blur → immediate save
8. Edit Start Delay duration → debounce → Saved
9. Add/remove a state modification on Events tab → debounce → Saved (note: 500ms latency is the new behavior under Q4-A unification)
10. With pending edits, click another element to switch → flushes pending edit
11. Native Ctrl+Z reverses changes at sensible granularity
12. Close + reopen panel → no regression, values persist
13. Browser console clean — no errors or warnings introduced by Phase 1D

If smoke fails on any item: fix on this branch before merge.
If smoke passes: merge `feature/auto-save-phase-1d` to `main` and push.
