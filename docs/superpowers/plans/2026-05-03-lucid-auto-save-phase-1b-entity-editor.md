# Lucid Auto-Save — Phase 1B (EntityEditor Migration) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `EntityEditor.tsx` from manual Save/Cancel buttons to the auto-save mechanism landed in Phase 0+1A. This is the first editor to consume `useAutoSave` and `<SaveStatusLine />` — proves the migration pattern that subsequent phases will sweep across the remaining six Group A editors.

**Architecture:** Single-file change to `EntityEditor.tsx`. Wire `useAutoSave` with the existing `localEntityDraft`, `hasPendingChanges`, `nameError`, `isSaving`, and `onSave` plumbing already in the component. Replace the Save/Cancel button row with `<SaveStatusLine />`. Add `onBlur={saveNow}` to the name input. Remove `handleSave` and `handleCancel`. The `onCancel` prop is kept (vestigial) per the Phase 0 spec.

**Tech Stack:** React 18.3, TypeScript 4.9, `@testing-library/react` 13.4 (only for hook/component tests, which already exist), Jest.

**Repo:** This plan lives in the LucidChart extension repo (`quodsi_lucidchart_package/`). All file paths and commands below are relative to that repo's root. Confirm you are on branch `feature/auto-save-phase-1b` with `git status` before starting.

**Spec:** Phase 0 spec at `docs/superpowers/specs/2026-05-03-lucid-extension-auto-save-design.md` in the sibling monorepo at `../quodsi/`. Phase 1B is the **Phase 1 (EntityEditor migration)** described in that spec — see the "Rollout" section, Phase 1.

---

## Key context discovered during brainstorming

**The current Cancel button does NOT close the panel.** `ElementEditor.tsx:89-92` (the parent that wraps EntityEditor) defines `handleCancel` as a no-op:

```ts
const handleCancel = () => {
  // Editors handle their own cancel behavior
};
```

The misleading comment in `EntityEditor.handleCancel` ("Calling onCancel prop to close the editor panel") describes intent that has never been implemented. Removing the Cancel button has zero blast radius for panel-close behavior — there is no current close path on the Save/Cancel row.

**Implication:** Phase 1B does NOT need to verify or replace a panel-close mechanism. The `onCancel` prop becomes vestigial (also vestigial in `ElementEditor.tsx`) but stays per Phase 0 spec.

---

## File Structure

**Modify:**
- `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/EntityEditor.tsx`

**Do NOT touch:**
- `useEditorState.ts` — the hook is feature-complete from Phase 0+1A
- `SaveStatusLine.tsx` — feature-complete from Phase 0
- `ElementEditor.tsx` — keep the no-op `handleCancel` and the `onCancel={handleCancel}` prop wiring as-is (vestigial cleanup is a separate concern)
- Any other editor (.tsx)

---

## Task 1: Setup verification

**Files:** none (verification only)

- [ ] **Step 1: Confirm branch and clean state**

Run: `git status && git log --oneline -3`
Expected: branch `feature/auto-save-phase-1b`, clean working tree, recent commits include the Phase 1A merge commit.

- [ ] **Step 2: Confirm tests pass on baseline**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false`
Expected: 44 tests passing across 3 suites. Zero failures.

- [ ] **Step 3: Confirm TypeScript clean**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: clean exit.

No commit for Task 1 — verification only.

---

## Task 2: Migrate EntityEditor to auto-save

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/EntityEditor.tsx`

This is the substantive change. All edits are within `EntityEditor.tsx`.

- [ ] **Step 1: Update the imports**

Find the existing import line for the hook utilities:

```ts
import { useFormSync, useSaveCompletionDetector } from "./hooks/useEditorState";
```

Replace with:

```ts
import { useFormSync, useSaveCompletionDetector, useAutoSave } from "./hooks/useEditorState";
import SaveStatusLine from "./SaveStatusLine";
```

- [ ] **Step 2: Add the `useAutoSave` call**

Find the existing `useSaveCompletionDetector` call (around line 193):

```ts
useSaveCompletionDetector(isSaving, setHasPendingChanges);
```

Add the `useAutoSave` call IMMEDIATELY AFTER it:

```ts
useSaveCompletionDetector(isSaving, setHasPendingChanges);

const { status, lastSavedAt, saveNow } = useAutoSave<Entity>({
  draft: localEntityDraft,
  hasPendingChanges,
  isValid: nameError === null,
  onSave,
  isSaving,
  elementId: localEntityDraft.id,
});
```

- [ ] **Step 3: Add `onBlur={saveNow}` to the name input**

Find the name input element (around line 301):

```tsx
<input
  type="text"
  name="name"
  className="w-full px-2 py-1.5 text-xs border rounded"
  value={localEntityDraft.name}
  onChange={handleInputChange}
  placeholder="Enter entity name"
/>
```

Add `onBlur={saveNow}`:

```tsx
<input
  type="text"
  name="name"
  className="w-full px-2 py-1.5 text-xs border rounded"
  value={localEntityDraft.name}
  onChange={handleInputChange}
  onBlur={saveNow}
  placeholder="Enter entity name"
/>
```

- [ ] **Step 4: Replace the Save/Cancel button row with `<SaveStatusLine />`**

Find the Save/Cancel button block at the bottom of the component (around lines 327-351):

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

Replace the entire block (the comment and the `<div>`) with:

```tsx
{/* Auto-save status */}
<SaveStatusLine status={status} lastSavedAt={lastSavedAt} />
```

- [ ] **Step 5: Remove `handleSave` and `handleCancel`**

Find and delete the entire `handleSave` function and its JSDoc (around lines 226-239):

```ts
/**
 * Saves the current entity draft state.
 *
 * Invokes the parent onSave callback with the current localEntityDraft.
 * Redux manages the isSaving state automatically.
 *
 * Note: Does NOT directly modify hasPendingChanges - that's handled by the
 * save completion detector to avoid race conditions.
 */
const handleSave = () => {
  // Save the current draft state directly
  onSave(localEntityDraft);
  // Note: isSaving state is now managed by Redux through elementOpsState
};
```

Find and delete the entire `handleCancel` function and its JSDoc (around lines 241-255):

```ts
/**
 * Cancels editing and closes the editor.
 *
 * Discards all pending changes by:
 * - Re-extracting fresh data from entity prop
 * - Clearing hasPendingChanges flag (disables Save button)
 * - Calling onCancel prop to close the editor panel
 *
 * Note: State definition changes were already auto-saved, so they can't be canceled.
 */
const handleCancel = () => {
  setLocalEntityDraft(extractEntityData(entity));
  setHasPendingChanges(false);
  onCancel(); // Close the editor
};
```

⚠ **Do NOT remove the `onCancel` prop from the `Props` interface or the destructure.** The prop is now vestigial but per the Phase 0 spec we keep it (parents may still need it for unrelated close events; cleanup is a separate concern).

- [ ] **Step 6: Update the component-level JSDoc**

Find the JSDoc on the `EntityEditor` component (around lines 62-85). The "Save Behavior" section is now stale. Replace this block:

```ts
/**
 * EntityEditor - Component for editing entity template properties
 *
 * Entity templates define the types of entities that flow through a simulation.
 * Each entity can have a name and associated state variables.
 *
 * Features:
 * - Two-tab interface: Basic properties and State definitions
 * - Controlled component with immediate UI updates
 * - Manual save for basic fields (name)
 * - Auto-save for state definitions (handled by StatesEditor)
 *
 * State Management:
 * - Maintains local draft state (localEntityDraft) for immediate UI updates
 * - Syncs with Redux for save state tracking (isSaving)
 * - Uses custom hooks for entity switching and save completion detection
 *
 * Save Behavior:
 * - Basic tab: Requires Save button click to persist changes
 * - States tab: Auto-saves immediately (Save/Cancel buttons hidden)
 *
 * @param props - Component props
 * @returns Rendered entity editor component
 */
```

Replace with:

```ts
/**
 * EntityEditor - Component for editing entity template properties
 *
 * Entity templates define the types of entities that flow through a simulation.
 * Each entity can have a name and associated state variables.
 *
 * Features:
 * - Two-tab interface: Basic properties and State definitions
 * - Controlled component with immediate UI updates
 * - Auto-save for all fields via useAutoSave hook (debounce + onBlur flush)
 *
 * State Management:
 * - Maintains local draft state (localEntityDraft) for immediate UI updates
 * - Syncs with Redux for save state tracking (isSaving)
 * - Uses custom hooks for entity switching and save completion detection
 *
 * Save Behavior:
 * - Name field: debounced auto-save on edit; immediate save on blur or
 *   element switch. Status surfaced via SaveStatusLine ("Saved" / "Saving…" /
 *   "Fix errors to save" / "Save failed — keep typing to retry"). Native
 *   LucidChart Ctrl+Z reverses saved changes.
 * - States tab: Auto-saves immediately (handled by StatesEditor)
 *
 * @param props - Component props (onCancel kept as vestigial; see Phase 0 spec)
 * @returns Rendered entity editor component
 */
```

- [ ] **Step 7: Run TypeScript and tests**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: clean exit.

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false`
Expected: 44 tests still passing (no new tests added; nothing should regress).

- [ ] **Step 8: Run the React build to confirm production bundle is clean**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm run build`
Expected: successful build with no new errors.

- [ ] **Step 9: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/EntityEditor.tsx
git commit -m "feat(react): migrate EntityEditor to auto-save (Phase 1B)"
```

---

## Task 3: Final verification + manual smoke checklist

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite one more time**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false`
Expected: 44 passing across 3 suites.

- [ ] **Step 2: TypeScript and build**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm run build`
Expected: both clean.

- [ ] **Step 3: Confirm the new code is now actually imported**

Run: `grep -rn "useAutoSave\|SaveStatusLine" editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors --include="*.tsx" --include="*.ts" | grep -v "__tests__\|hooks/useEditorState.ts\|features/editors/SaveStatusLine.tsx"`
Expected: ONE file shows imports — `EntityEditor.tsx`. This is the first observable behavior change since Phase 0 — Phase 1B has now wired the foundation into a real editor.

- [ ] **Step 4: Confirm clean commit history**

Run: `git log --oneline main..HEAD`
Expected: 1 commit on this branch — `feat(react): migrate EntityEditor to auto-save (Phase 1B)`. (If a Phase 1B plan-doc commit was made earlier, count is 2.)

- [ ] **Step 5: Manual smoke test (REQUIRED before merge)**

Per the Phase 0 spec's per-phase manual smoke checklist (in the design doc's "Rollout" section). Run the LucidChart extension locally and verify each:

  - [ ] Edit the entity name field — observe SaveStatusLine: `Saving…` (after ~500ms) → `Saved`
  - [ ] Click outside the name field (blur) — `Saving…` fires immediately, no debounce wait
  - [ ] Enter a duplicate entity name — inline error shows AND status shows `Fix errors to save`. No save fires.
  - [ ] Fix the duplicate — save fires; status returns to `Saved`
  - [ ] Switch to a different element with a pending edit — previous element's edit persists (verify by switching back); new element loads cleanly
  - [ ] Press `Ctrl+Z` — verify the LucidChart canvas reverses the auto-saved change at sensible granularity (one debounce window = one undo step is the goal)
  - [ ] Close and reopen the entity panel — no regression; data round-trips
  - [ ] Browser console — no new errors or warnings introduced by the migration (the existing `ReactDOMTestUtils.act` deprecation is OK; new errors are not)

If any smoke test fails, STOP and investigate before merging.

- [ ] **Step 6: No additional commit unless cleanup is needed**

Run: `git status`
Expected: clean working tree.

---

## Acceptance Criteria

- [ ] `EntityEditor.tsx` imports `useAutoSave` and `SaveStatusLine`
- [ ] `useAutoSave` is called with `draft`, `hasPendingChanges`, `isValid`, `onSave`, `isSaving`, `elementId` correctly threaded
- [ ] Name input has `onBlur={saveNow}`
- [ ] `<SaveStatusLine />` renders in place of the old Save/Cancel row
- [ ] `handleSave` and `handleCancel` functions removed
- [ ] `onCancel` prop in Props interface and destructure preserved (vestigial)
- [ ] All 44 hook + component + scenarioDataMerge tests still pass
- [ ] TypeScript clean, build clean
- [ ] Manual smoke checklist all green
- [ ] One commit on this branch (excluding any plan-doc commit) with a descriptive message

## What Phase 1C will need

Phase 1C migrates the next editor — likely `ResourceEditor.tsx` per the spec's "Rollout" sequence (Phase 2 in the original numbering). The Phase 1B migration pattern (six discrete edits to a single editor file) becomes the template.

If `Ctrl+Z` granularity surfaces as a problem during Phase 1B's smoke test, Phase 1C's first task is to investigate the LucidChart SDK's batch-write or undo-grouping API before continuing the editor sweep.
