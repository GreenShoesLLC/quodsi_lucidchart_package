# Lucid Auto-Save — Phase 1C (ResourceEditor Migration) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `ResourceEditor.tsx` from manual Save/Cancel buttons to the auto-save mechanism (Phase 0+1A). This is the second editor migration, applying the pattern proven in Phase 1B (EntityEditor) to a richer editor with multiple inputs across two tabs and a conditional finance section. Also fixes a pre-existing missing-prop bug in `ElementEditor.tsx`.

**Architecture:** Mirror the Phase 1B EntityEditor migration. Wire `useAutoSave<Resource>` into `ResourceEditor.tsx` using the existing `localResourceDraft`, `hasPendingChanges`, `nameError`, `isSaving`, and `onSave` plumbing. Add `onBlur={saveNow}` to all five text/number inputs (name, capacity, costPerSeize, costPerHourUtilized, costPerHourIdle). For the financial-enabled checkbox — which has no natural blur event — add a `useEffect` watching `localResourceDraft.financialProperties?.enabled` that calls `saveNow()` after the toggle commits. Replace the Save/Cancel button row with `<SaveStatusLine />`. Delete `handleSave` and `handleCancel`. Bundle the `ElementEditor.tsx:184-190` fix that adds `referenceData={referenceData}` so duplicate-name validation actually fires.

**Tech Stack:** React 18.3, TypeScript 4.9, `@testing-library/react` 13.4 (only for hook/component tests, which already exist), Jest.

**Repo:** This plan lives in the LucidChart extension repo (`quodsi_lucidchart_package/`). All file paths and commands below are relative to that repo's root. Confirm you are on branch `feature/auto-save-phase-1c` with `git status` before starting.

**Spec:** Phase 0 architectural spec at `../quodsi/docs/superpowers/specs/2026-05-03-lucid-extension-auto-save-design.md` in the sibling monorepo. Phase 1C is the **second editor migration** under Phase 1 of that spec's rollout.

---

## Key context discovered during brainstorming

**1. ResourceEditor's `handleCancel` actually does something (unlike EntityEditor's).**

`ResourceEditor.tsx:334-338`:
```ts
const handleCancel = () => {
  setLocalResourceDraft(extractResourceData(resource));
  setHasPendingChanges(false);
  onCancel(); // Close the editor
};
```

It rolls back the local draft from props. With auto-save, "rollback" doesn't exist — saves are real-time. Native LucidChart `Ctrl+Z` is the recovery path. `handleCancel` becomes unreachable when the Save/Cancel button row is removed. Delete the function. The `onCancel` prop on `Props` stays (vestigial, parameter-only) per Phase 0 spec.

**2. ResourceEditor doesn't receive `referenceData` from `ElementEditor.tsx` — same bug as EntityEditor pre-Phase-1B-fix.**

`ElementEditor.tsx:181-191`:
```tsx
case SimulationObjectType.Resource:
case "Resource":
  return (
    <ResourceEditor
      resource={safeElementData}
      onSave={onSave}
      onCancel={handleCancel}
      states={states}
      onStatesChange={onStatesChange}
    />
  );
```

`referenceData` is destructured at line 51 and passed to 5 other editors. Missing here means the `validateName` function's `if (referenceData && !isNameUniqueInReferenceData(...))` short-circuits to `null` — duplicate Resource names save without showing the inline error. Fix is one-line: add `referenceData={referenceData}` to the JSX. Bundle this into Phase 1C since auto-save makes the validation gate user-visible.

**3. The financial-enabled checkbox (`localResourceDraft.financialProperties.enabled`) has no `onBlur` event.**

Calling `saveNow` synchronously inside the `onChange` handler reads the *previous* render's `draftRef.current` because state updates are batched and the ref is synced via `useEffect`. The chosen pattern: a `useEffect` keyed on `localResourceDraft.financialProperties?.enabled` that compares the current value to a `useRef` of the previous value and calls `saveNow()` when they differ. The hook's internal early-return on `hasPendingChanges === false` makes the effect safe across element switches and prop sync (no spurious saves).

---

## File Structure

**Modify:**
- `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ResourceEditor.tsx`
- `editorextensions/quodsi_editor_extension/quodsim-react/src/features/modelPanel/ElementEditor.tsx` (one-line `referenceData` prop addition)

**Do NOT touch:**
- `useEditorState.ts` — the hook is feature-complete from Phase 0+1A; signature unchanged
- `SaveStatusLine.tsx` — feature-complete from Phase 0
- `EntityEditor.tsx` — Phase 1B already migrated this editor
- Any other editor (.tsx)
- Any test file (no new tests; existing 44 must continue to pass)

---

## Task 1: Setup verification

**Files:** none (verification only)

- [ ] **Step 1: Confirm branch and clean state**

Run: `git status && git log --oneline -3`
Expected: branch `feature/auto-save-phase-1c`, clean working tree, recent commits include the Phase 1B merge commit `d7562d1`.

- [ ] **Step 2: Confirm tests pass on baseline**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false`
Expected: 44 tests passing across 3 suites. Zero failures.

- [ ] **Step 3: Confirm TypeScript clean**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: zero output (no errors).

- [ ] **Step 4: Confirm starting state of ResourceEditor**

Run: `grep -n "useAutoSave\|SaveStatusLine\|handleSave\|handleCancel" editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ResourceEditor.tsx`
Expected output should include `handleSave` (around line 318) and `handleCancel` (around line 334) but NO references to `useAutoSave` or `SaveStatusLine`. This confirms Phase 1C hasn't started.

- [ ] **Step 5: Confirm starting state of ElementEditor.tsx**

Run: `grep -n "ResourceEditor\|referenceData=" editorextensions/quodsi_editor_extension/quodsim-react/src/features/modelPanel/ElementEditor.tsx`
Expected: 5 lines passing `referenceData={referenceData}` (lines 107, 143, 159, 173, 224 plus 201 which was added in Phase 1B for EntityEditor) — but no such line inside the `<ResourceEditor>` JSX block (lines 181-191). This confirms the bug is still present.

---

## Task 2: Migrate ResourceEditor + fix ElementEditor referenceData prop

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ResourceEditor.tsx`
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/modelPanel/ElementEditor.tsx`

This task is structured as a sequence of small, independently-runnable edits. After each edit, the file should still typecheck (you can run `npx tsc --noEmit` between edits if uncertain). Final commit happens once all edits are in.

- [ ] **Step 1: Add imports for `useAutoSave` and `SaveStatusLine` to ResourceEditor.tsx**

Find the existing import line:
```ts
import { useFormSync, useSaveCompletionDetector } from "./hooks/useEditorState";
```

Replace with:
```ts
import { useFormSync, useSaveCompletionDetector, useAutoSave } from "./hooks/useEditorState";
import SaveStatusLine from "./SaveStatusLine";
```

- [ ] **Step 2: Wire the `useAutoSave` hook**

Find the existing block (around line 230):
```ts
useSaveCompletionDetector(isSaving, setHasPendingChanges);

// Reset nameError when resource changes
useEffect(() => {
  setNameError(null);
}, [localResourceDraft.id]);
```

Insert a new block immediately after `useSaveCompletionDetector(...)` and BEFORE the `useEffect` that resets `nameError`:
```ts
useSaveCompletionDetector(isSaving, setHasPendingChanges);

const { status, lastSavedAt, saveNow } = useAutoSave<Resource>({
  draft: localResourceDraft,
  hasPendingChanges,
  isValid: nameError === null,
  onSave,
  isSaving,
  elementId: localResourceDraft.id,
});

// Reset nameError when resource changes
useEffect(() => {
  setNameError(null);
}, [localResourceDraft.id]);
```

- [ ] **Step 3: Add the financial-enabled saveNow effect**

Insert a new `useEffect` immediately after the `setNameError(null)` reset effect. Use a `useRef` to track the previous value and only fire `saveNow` when `enabled` actually flips:

```ts
// Fire saveNow when financial-enabled checkbox toggles.
// Checkbox has no onBlur; this runs after the state update commits so
// draftRef inside useAutoSave reflects the new value.
const prevFinancialEnabledRef = useRef<boolean | undefined>(
  localResourceDraft.financialProperties?.enabled
);
useEffect(() => {
  const current = localResourceDraft.financialProperties?.enabled;
  if (prevFinancialEnabledRef.current !== current) {
    prevFinancialEnabledRef.current = current;
    saveNow();
  }
}, [localResourceDraft.financialProperties?.enabled, saveNow]);
```

You will also need to add `useRef` to the React import at the top of the file. Find:
```ts
import React, { useState, useEffect } from "react";
```

Replace with:
```ts
import React, { useState, useEffect, useRef } from "react";
```

- [ ] **Step 4: Add `onBlur={saveNow}` to all five typed inputs**

The five inputs are: name (line ~384), capacity (line ~407), costPerSeize (line ~449), costPerHourUtilized (line ~468), costPerHourIdle (line ~490).

For each input, add `onBlur={saveNow}` as the last attribute on the `<input>` element (after `placeholder` or `step`). Example for the name input:

Before:
```tsx
<input
  type="text"
  name="name"
  className="w-full px-2 py-1.5 text-xs border rounded"
  value={localResourceDraft.name}
  onChange={handleInputChange}
  placeholder="Enter resource name"
/>
```

After:
```tsx
<input
  type="text"
  name="name"
  className="w-full px-2 py-1.5 text-xs border rounded"
  value={localResourceDraft.name}
  onChange={handleInputChange}
  placeholder="Enter resource name"
  onBlur={saveNow}
/>
```

Apply the same `onBlur={saveNow}` addition to the other four inputs (capacity, costPerSeize, costPerHourUtilized, costPerHourIdle). The checkbox is NOT included — it's handled by the `useEffect` from Step 3.

- [ ] **Step 5: Replace the Save/Cancel button row with `<SaveStatusLine />`**

Find the entire JSX block at the bottom of the component (around lines 518-542):

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
      type="button"
      onClick={handleSave}
      disabled={!hasPendingChanges || isSaving || nameError !== null}
      className={`px-3 py-1.5 text-xs rounded ${
        hasPendingChanges && !isSaving && nameError === null
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

- [ ] **Step 6: Delete `handleSave` and `handleCancel` functions**

Find and delete the entire `handleSave` JSDoc block + function (around lines 309-322):
```ts
/**
 * Saves the current resource draft state.
 * ...
 */
const handleSave = () => {
  // Save the current draft state directly
  onSave(localResourceDraft);
  // Note: isSaving state is now managed by Redux through elementOpsState
};
```

Find and delete the entire `handleCancel` JSDoc block + function (around lines 324-338):
```ts
/**
 * Cancels editing and closes the editor.
 * ...
 */
const handleCancel = () => {
  setLocalResourceDraft(extractResourceData(resource));
  setHasPendingChanges(false);
  onCancel(); // Close the editor
};
```

Both functions are now unreachable.

- [ ] **Step 7: Update the component-level JSDoc**

Find the existing component JSDoc (around lines 75-105) and replace its "Save Behavior" section. Specifically:

Before:
```
 * Save Behavior:
 * - Basic tab: Requires Save button click to persist changes
 * - Finance tab: Requires Save button click to persist changes
 * - States tab: Auto-saves immediately (Save/Cancel buttons hidden)
```

After:
```
 * Save Behavior:
 * - Basic tab (name, capacity): debounced auto-save on edit; immediate save on
 *   blur or element switch.
 * - Finance tab (enabled, 3 cost fields): cost fields auto-save on edit/blur;
 *   the enabled checkbox triggers saveNow via a useEffect since it has no blur.
 * - States tab: Auto-saves immediately (handled by StatesEditor).
 * - Status surfaced via SaveStatusLine ("Saved" / "Saving…" / "Fix errors to
 *   save" / "Save failed — keep typing to retry"). Native LucidChart Ctrl+Z
 *   reverses saved changes.
```

Also replace the "Features" bullet that says `Manual save for basic and finance tabs`:

Before:
```
 * - Manual save for basic and finance tabs
 * - Auto-save for state definitions (handled by StatesEditor)
```

After:
```
 * - Auto-save for all fields via useAutoSave hook (debounce + onBlur flush;
 *   useEffect flush for the financial-enabled checkbox)
```

Also update the `@param` line at the bottom of the JSDoc:

Before:
```
 * @param props - Component props
```

After:
```
 * @param props - Component props (onCancel kept as vestigial; see Phase 0 spec)
```

- [ ] **Step 8: Update `handleInputChange` JSDoc**

Find the existing JSDoc (around lines 251-261):

Before:
```
/**
 * Handles changes to basic input fields (name, capacity).
 *
 * Updates are applied immediately to localResourceDraft for responsive UI,
 * and marked as pending (requiring Save button click to persist).
 *
 * Special handling:
 * - capacity: Parsed as integer with minimum value of 1
 *
 * @param e - Input change event
 */
```

After:
```
/**
 * Handles changes to basic input fields (name, capacity).
 *
 * Updates are applied immediately to localResourceDraft for responsive UI,
 * validates the name, and marks the draft as pending (auto-save will fire
 * after debounce or on blur).
 *
 * Special handling:
 * - capacity: Parsed as integer with minimum value of 1
 *
 * @param e - Input change event
 */
```

- [ ] **Step 9: Update `handleFinancialChange` JSDoc**

Find the existing JSDoc (around lines 277-292):

Before:
```
 * Creates a new ResourceFinancialProperties instance with the updated field value,
 * preserving all other financial properties. Updates are applied immediately to
 * localResourceDraft for responsive UI, and marked as pending.
```

After:
```
 * Creates a new ResourceFinancialProperties instance with the updated field value,
 * preserving all other financial properties. Updates are applied immediately to
 * localResourceDraft for responsive UI, and marked as pending. Auto-save fires
 * after debounce or on blur (cost fields), or via the enabled-watching useEffect
 * (the enabled checkbox).
```

- [ ] **Step 10: Fix the missing `referenceData` prop in ElementEditor.tsx**

Open `editorextensions/quodsi_editor_extension/quodsim-react/src/features/modelPanel/ElementEditor.tsx`.

Find the JSX block (lines 181-191):
```tsx
case SimulationObjectType.Resource:
case "Resource":
  return (
    <ResourceEditor
      resource={safeElementData}
      onSave={onSave}
      onCancel={handleCancel}
      states={states}
      onStatesChange={onStatesChange}
    />
  );
```

Replace with:
```tsx
case SimulationObjectType.Resource:
case "Resource":
  return (
    <ResourceEditor
      resource={safeElementData}
      onSave={onSave}
      onCancel={handleCancel}
      states={states}
      onStatesChange={onStatesChange}
      referenceData={referenceData}
    />
  );
```

- [ ] **Step 11: Run TypeScript check**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: zero output. If any errors, read them carefully — most likely an unused-import warning if `useRef` was added but the effect was missed.

- [ ] **Step 12: Run the test suite**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false`
Expected: 44 tests passing across 3 suites. Zero failures. (No new tests added — the hook contract is unchanged from Phase 1A; the migration is pure call-site wiring.)

- [ ] **Step 13: Run a production build**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm run build`
Expected: `Compiled successfully.` with no errors. Warnings are tolerable but read them.

- [ ] **Step 14: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ResourceEditor.tsx editorextensions/quodsi_editor_extension/quodsim-react/src/features/modelPanel/ElementEditor.tsx
git commit -m "feat(react): migrate ResourceEditor to auto-save (Phase 1C)

Mirror the Phase 1B EntityEditor pattern:
- Wire useAutoSave<Resource> with existing draft/pending/saving plumbing
- onBlur={saveNow} on all 5 typed inputs (name, capacity, 3 costs)
- useEffect flush for the financial-enabled checkbox (no onBlur available)
- Replace Save/Cancel button row with SaveStatusLine
- Delete handleSave and handleCancel (unreachable)

Also fixes a pre-existing bug: ResourceEditor wasn't receiving
referenceData from ElementEditor.tsx, which broke duplicate-name
validation. Same one-line fix applied in Phase 1B for EntityEditor."
```

---

## Task 3: Final verification + manual smoke

**Files:** none (verification only)

- [ ] **Step 1: Confirm two editors now consume auto-save**

Run: `grep -rn "useAutoSave\|SaveStatusLine" editorextensions/quodsi_editor_extension/quodsim-react/src --include="*.tsx" --include="*.ts" | grep -v __tests__ | grep -v useEditorState.ts | grep -v SaveStatusLine.tsx`

Expected: matches in `EntityEditor.tsx` AND `ResourceEditor.tsx` only. No other editor files. If anything else shows up, investigate.

- [ ] **Step 2: Final TypeScript check**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: zero output.

- [ ] **Step 3: Final test run**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false`
Expected: 44 tests passing. Same number as before — Phase 1C adds no new tests (hook is unchanged).

- [ ] **Step 4: Final production build**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm run build`
Expected: `Compiled successfully.`

- [ ] **Step 5: Confirm commit history is clean**

Run: `git log --oneline main..HEAD`
Expected: 2 commits — the plan doc commit + the migration commit. No fixup or amended-for-no-reason noise.

- [ ] **Step 6: Hand off to Daniel for manual smoke**

Manual smoke checklist (Daniel runs in LucidChart locally):
1. Drop a Resource shape, edit its name → status flips to "Saving…" then "Saved"
2. Blur the name field → save fires immediately (no debounce wait)
3. Type a duplicate Resource name → inline error appears + status reads "Fix errors to save"
4. Fix the duplicate → save fires once name is unique
5. Edit capacity → debounce → Saved; blur capacity → immediate save
6. Toggle the financial-enabled checkbox → save fires (via useEffect)
7. With financial enabled, edit each of the 3 cost fields → debounce → Saved; blur → immediate save
8. With pending edits, click another element to switch → flushes the pending edit
9. Native Ctrl+Z reverses changes at sensible granularity (same as EntityEditor)
10. Close the panel and reopen → no regression, values persist
11. Browser console clean — no errors or warnings introduced by Phase 1C

If smoke fails on any item: fix on this branch before merge.
If smoke passes: merge `feature/auto-save-phase-1c` to `main` and push.
