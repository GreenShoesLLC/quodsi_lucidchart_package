# Lucid Auto-Save — Phase 1E (ActivityEditor Migration + useFlushOnChange Helper) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `ActivityEditor.tsx` (the largest editor at 1738 LOC) to auto-save. Phase 1E also extracts a new helper hook `useFlushOnChange<T>` co-located with `useAutoSave` in `useEditorState.ts` and refactors the three existing watcher sites in `ResourceEditor.tsx` (1) and `GeneratorEditor.tsx` (2) to use it. The helper extraction is pulled forward (originally planned for sweep-end cleanup) because ActivityEditor needs **5 watchers** of its own — without the helper, that's ~65 lines of duplicated boilerplate in a single file.

**Architecture:** Two structural pieces:

1. **`useFlushOnChange<T>(value, saveNow)`** — a thin React hook that holds a `useRef` of the previous value and calls `saveNow()` on the next render where `value` differs from `prevRef.current`. Co-located in `useEditorState.ts` next to `useAutoSave`. Three new unit tests in a sibling test file: doesn't fire on mount, fires on change, doesn't fire on re-render with same value.

2. **`ActivityEditor.tsx` migration** — wire `useAutoSave<Activity>` with `isValid: nameError === null && !hasActionValidationError` (combines name validation + 4 action validation checks: Split/Create/Join/Branch missing fields). 9 `onBlur={saveNow}` additions across the Basic and Financial tabs. 5 `useFlushOnChange(...)` calls (financialEnabled, failureEnabled, failureClockMode, repairResourceRequirementId, connectType). Replace the Save/Cancel button row with `<SaveStatusLine />` while keeping the 4 red validation banners above it. Delete `handleSave` (its rebuild logic is verifiably dead — `displayToBuffer` is identity, complex properties are already preserved in the draft via `updateActivityImmutably`) and `handleCancel`. Sub-components (`ActionEditor`, `EnhancedDurationEditor`, `RoutingConfigurationContent`, `ResourceRequirementModal`) are NOT touched — they already fire onChange per keystroke; debounce handles them.

**Tech Stack:** React 18.3, TypeScript 4.9, `@testing-library/react` 13.4, Jest.

**Repo:** This plan lives in the LucidChart extension repo (`quodsi_lucidchart_package/`). All file paths and commands below are relative to that repo's root. Confirm you are on branch `feature/auto-save-phase-1e` with `git status` before starting.

**Spec:** Phase 0 architectural spec at `../quodsi/docs/superpowers/specs/2026-05-03-lucid-extension-auto-save-design.md` in the sibling monorepo. Phase 1E is the **fourth editor migration** under Phase 1 of that spec's rollout.

---

## Key context discovered during brainstorming

**1. ActivityEditor has the largest field surface of any editor.**

- Basic tab: name, capacity, inboundQueueCapacity, outboundQueueCapacity (4 typed inputs)
- Actions tab: DnD-sortable list of `ActionEditor` sub-components. Per-action validation (Split needs destination, Create needs entityTemplateId+destinationId, Join needs matchState+destinationId, Branch needs condition).
- Financial tab: `financialEnabled` checkbox + 5 cost inputs (fixedCost, costPerEntityProcessed, costPerHourActive, costPerHourIdle, resourceCostMultiplier) when enabled
- Failure tab: `failureEnabled` checkbox + MTBF/MTTR `EnhancedDurationEditor`s + failureClockMode select + repairResourceRequirementId select + Create/Edit-requirement buttons (open `ResourceRequirementModal`)
- Connectors tab: `RoutingConfigurationContent` sub-component — its `handleConnectTypeChange` updates `localActivityDraft.connectType`

**Total: 9 typed inputs, 2 checkboxes, 2 internal selects, 1 sub-component-driven select (connectType).**

**2. `handleSave`'s rebuild is verifiably dead code.**

`ActivityEditor.tsx:642-651` rebuilds the Activity from `localActivityDraft` before calling `onSave(activityToSave)`. Two reasons this is dead:
- `displayToBuffer` (line 341) is the identity function (`return value`).
- `connectType`, `financialProperties`, `failureProperties` are preserved on every change via `updateActivityImmutably` (lines 446-450). The rebuild's preservation lines just copy what's already in the draft.

Removing the rebuild and passing `localActivityDraft` directly to `onSave` is byte-equivalent at the data layer.

**3. `isValid` for `useAutoSave` must combine name validation + action validation.**

The current Save button gating is `!hasPendingChanges || isSaving || hasActionValidationError || nameError !== null` (line 1710). For auto-save:
- `isValid: nameError === null && !hasActionValidationError`
- `hasActionValidationError = hasSplitValidationError || hasCreateValidationError || hasJoinValidationError || hasBranchValidationError` (line 583)
- All four sub-checks are computed inline using `localActivityDraft.actions.filter(...)` — no closure issues.

**4. The 4 red validation banners stay.**

Lines 1664-1695 render four conditional `<div className="...border-red-200...">` banners describing each validation problem in detail. These complement the status line: banners say *what* to fix, status says *that* something is wrong. Keep them above the new `<SaveStatusLine />`.

**5. `referenceData` is already passed correctly.**

`ElementEditor.tsx:159` passes `referenceData={referenceData}`. ActivityEditor's `Props` interface marks it optional but the parent always passes it. No bundled bug fix this phase.

**6. Pulling `useFlushOnChange` extraction forward is justified by the watcher count.**

Phase 1D's reviewer noted (M1) that the watcher pattern was duplicated 3× and would be ripe for extraction at sweep-end. Phase 1E alone needs 5 more watchers — bringing the total to 8 if not extracted. The helper is ~10 lines of body + 3 unit tests, much cheaper than 5 × 13 = 65 lines of new duplication. Refactoring the existing 3 sites is part of the same Task 2 to keep the call-site count clean.

---

## File Structure

**Modify:**
- `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/useEditorState.ts` — add `useFlushOnChange<T>` export
- `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ResourceEditor.tsx` — replace `prevFinancialEnabledRef` block with 1-line helper call; remove `useRef` import
- `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/GeneratorEditor.tsx` — replace 2 watcher blocks with 2 helper calls; remove `useRef` import
- `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ActivityEditor.tsx` — auto-save migration

**Create:**
- `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/__tests__/useFlushOnChange.test.tsx` — 3 unit tests for the helper

**Do NOT touch:**
- `SaveStatusLine.tsx`, `EntityEditor.tsx` (already migrated, no watchers)
- Any sub-component (`ActionEditor`, `EnhancedDurationEditor`, `RoutingConfigurationContent`, `ResourceRequirementModal`)
- `ElementEditor.tsx` — already passes `referenceData` to ActivityEditor
- Any test file other than the new `useFlushOnChange.test.tsx`

---

## Task 1: Setup verification

**Files:** none (verification only)

- [ ] **Step 1: Confirm branch and clean state**

Run: `git status && git log --oneline -3`
Expected: branch `feature/auto-save-phase-1e`, clean working tree, recent commits include the Phase 1D merge commit `4787c83`.

- [ ] **Step 2: Confirm tests pass on baseline**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false`
Expected: 44 tests passing across 3 suites. Zero failures.

- [ ] **Step 3: Confirm TypeScript clean**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: zero output (no errors).

- [ ] **Step 4: Confirm starting state of ActivityEditor**

Run: `grep -n "useAutoSave\|SaveStatusLine\|handleSave\|handleCancel" editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ActivityEditor.tsx`

Expected output should include `handleSave` (around line 641), `handleCancel` (around line 676), and Save/Cancel button onClick (around lines 1699, 1709) — but NO references to `useAutoSave` or `SaveStatusLine`. This confirms Phase 1E hasn't started.

- [ ] **Step 5: Confirm starting state of helper extraction**

Run: `grep -n "useFlushOnChange" editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/useEditorState.ts`
Expected: zero output (helper does not yet exist).

Run: `grep -n "prevFinancialEnabledRef\|prevEntityIdRef\|prevGeneratorTypeRef" editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors`  -r
Expected: 1 match in `ResourceEditor.tsx` (`prevFinancialEnabledRef`), 2 matches in `GeneratorEditor.tsx` (`prevEntityIdRef`, `prevGeneratorTypeRef`). This confirms the 3 existing watcher sites that Task 2 will refactor.

- [ ] **Step 6: Confirm three editors are already migrated (Phase 1B + 1C + 1D)**

Run: `grep -rn "useAutoSave\|SaveStatusLine" editorextensions/quodsi_editor_extension/quodsim-react/src --include="*.tsx" --include="*.ts" | grep -v __tests__ | grep -v useEditorState.ts | grep -v SaveStatusLine.tsx`

Expected: matches in `EntityEditor.tsx`, `ResourceEditor.tsx`, AND `GeneratorEditor.tsx` only. No `ActivityEditor.tsx` (it hasn't been migrated yet). No other editor files.

---

## Task 2: Extract `useFlushOnChange<T>` helper + refactor 3 existing watcher sites

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/useEditorState.ts`
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ResourceEditor.tsx`
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/GeneratorEditor.tsx`
- Create: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/__tests__/useFlushOnChange.test.tsx`

- [ ] **Step 1: Add `useFlushOnChange<T>` to `useEditorState.ts`**

Open `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/useEditorState.ts`. Find a sensible insertion point: after the `useAutoSave` function ends (look for the closing `}` of the function and the blank line that follows). Append:

```ts
/**
 * Fire saveNow on the next render where `value` differs from the previously seen value.
 *
 * Designed for "decisive" UI controls that have no useful blur event (checkboxes,
 * selects). Wraps the prevRef-compare-and-fire pattern used in editor migrations
 * (Phase 1C/1D).
 *
 * Behavior:
 * - Does NOT fire on initial mount.
 * - Fires saveNow exactly once per change (then resets the ref).
 * - Does NOT fire when the value is the same across renders.
 *
 * Safe across element switches: useAutoSave's saveNow internally early-returns
 * when hasPendingChanges is false, so a stale prevRef-vs-new-draft mismatch on
 * a fresh element is suppressed.
 *
 * @param value - The value to watch (typically a primitive or stable reference)
 * @param saveNow - The flush callback returned by useAutoSave
 */
export function useFlushOnChange<T>(value: T, saveNow: () => void): void {
  const prevRef = useRef<T>(value);
  useEffect(() => {
    if (prevRef.current !== value) {
      prevRef.current = value;
      saveNow();
    }
  }, [value, saveNow]);
}
```

The `useRef` and `useEffect` are already imported at the top of `useEditorState.ts` (verify by inspecting line 1 of the file). No new imports needed.

- [ ] **Step 2: Create the test file with 3 failing tests**

Create `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/__tests__/useFlushOnChange.test.tsx` with this content:

```tsx
import { renderHook } from "@testing-library/react";
import { useFlushOnChange } from "../useEditorState";

describe("useFlushOnChange", () => {
  it("does not call saveNow on initial mount", () => {
    const saveNow = jest.fn();
    renderHook(({ value }) => useFlushOnChange(value, saveNow), {
      initialProps: { value: "a" },
    });
    expect(saveNow).not.toHaveBeenCalled();
  });

  it("calls saveNow when value changes", () => {
    const saveNow = jest.fn();
    const { rerender } = renderHook(
      ({ value }) => useFlushOnChange(value, saveNow),
      { initialProps: { value: "a" } }
    );
    rerender({ value: "b" });
    expect(saveNow).toHaveBeenCalledTimes(1);
  });

  it("does not call saveNow when re-rendered with the same value", () => {
    const saveNow = jest.fn();
    const { rerender } = renderHook(
      ({ value }) => useFlushOnChange(value, saveNow),
      { initialProps: { value: "a" } }
    );
    rerender({ value: "a" });
    expect(saveNow).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run the new tests to confirm they pass against the just-added helper**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false useFlushOnChange.test.tsx`
Expected: 3 tests passing in the `useFlushOnChange` describe block.

- [ ] **Step 4: Run the full test suite to confirm no regressions from the helper addition alone**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false`
Expected: 47 tests passing (44 existing + 3 new). Zero failures.

- [ ] **Step 5: Refactor `ResourceEditor.tsx` to use `useFlushOnChange`**

Open `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ResourceEditor.tsx`.

5a. Update the React import. Find:
```ts
import React, { useState, useEffect, useRef } from "react";
```
Replace with:
```ts
import React, { useState, useEffect } from "react";
```

5b. Update the useEditorState import. Find:
```ts
import { useFormSync, useSaveCompletionDetector, useAutoSave } from "./hooks/useEditorState";
```
Replace with:
```ts
import { useFormSync, useSaveCompletionDetector, useAutoSave, useFlushOnChange } from "./hooks/useEditorState";
```

5c. Replace the watcher block. Find (around lines 252-264):
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

Replace with:
```ts
// Fire saveNow when the financial-enabled checkbox toggles (no onBlur on checkboxes).
useFlushOnChange(localResourceDraft.financialProperties?.enabled, saveNow);
```

- [ ] **Step 6: Refactor `GeneratorEditor.tsx` to use `useFlushOnChange`**

Open `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/GeneratorEditor.tsx`.

6a. Update the React import. Find:
```ts
import React, { useState, useEffect, useRef } from "react";
```
Replace with:
```ts
import React, { useState, useEffect } from "react";
```

6b. Update the useEditorState import. Find:
```ts
import { useFormSync, useSaveCompletionDetector, useAutoSave } from "./hooks/useEditorState";
```
Replace with:
```ts
import { useFormSync, useSaveCompletionDetector, useAutoSave, useFlushOnChange } from "./hooks/useEditorState";
```

6c. Replace the entityId watcher block. Find (around lines 421-433):
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

Replace with:
```ts
// Fire saveNow when entity selection changes (no onBlur on selects).
useFlushOnChange(localGeneratorDraft.generationConfig.entityId, saveNow);
```

6d. Replace the generatorType watcher block. Find (around lines 435-447):
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

Replace with:
```ts
// Fire saveNow when generator type changes (TIME_DISTRIBUTED is UI-disabled today; no-op until shipped).
useFlushOnChange(localGeneratorDraft.generationConfig.generatorType, saveNow);
```

- [ ] **Step 7: Run TypeScript check after refactor**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: zero output. If errors complain about unused `useRef`, double-check that step 5a/6a actually removed it.

- [ ] **Step 8: Run the full test suite**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false`
Expected: 47 tests passing. Zero failures.

- [ ] **Step 9: Run a production build**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm run build`
Expected: `Compiled successfully.`

- [ ] **Step 10: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/useEditorState.ts editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/__tests__/useFlushOnChange.test.tsx editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ResourceEditor.tsx editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/GeneratorEditor.tsx
git commit -m "feat(react): extract useFlushOnChange hook and refactor existing watcher sites

Adds useFlushOnChange<T>(value, saveNow) helper co-located with useAutoSave
in useEditorState.ts. Encapsulates the prevRef-compare-and-fire pattern
that previously appeared 3 times across editors.

Refactors:
- ResourceEditor.tsx: financial-enabled checkbox watcher (1 site)
- GeneratorEditor.tsx: entityId + generatorType select watchers (2 sites)

Each site collapses from ~13 lines to 1. useRef import removed from both
editors (no longer needed at the call site; the helper holds the ref
internally).

3 new unit tests for useFlushOnChange:
- Does not fire on initial mount
- Fires saveNow when value changes
- Does not fire when re-rendered with the same value

Pulls forward an extraction originally planned for sweep-end cleanup
(Phase 1D code review M1) because Phase 1E (ActivityEditor) needs 5 new
watchers — extracting the helper now saves ~65 lines of duplication
in that single editor."
```

---

## Task 3: Migrate ActivityEditor

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ActivityEditor.tsx`

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

Note: `useRef` is NOT added to the React import. The watcher refs are encapsulated in `useFlushOnChange`. No call-site `useRef` is needed.

- [ ] **Step 2: Wire the `useAutoSave` hook + 5 `useFlushOnChange` calls**

**Placement note:** `useAutoSave`'s `isValid` argument references `hasActionValidationError`, which is defined inline at line 583 (after the 4 sub-validation `filter` computations). To avoid a TDZ ReferenceError, the `useAutoSave` call MUST be placed AFTER the validation block. Same for the `useFlushOnChange` calls (they depend on `saveNow` from `useAutoSave`).

Find the end of the validation block (around line 583):
```ts
  // Combined validation error flag
  const hasActionValidationError = hasSplitValidationError || hasCreateValidationError || hasJoinValidationError || hasBranchValidationError;
```

Immediately after that line, BEFORE the `// ============ EVENT HANDLERS ============` comment block (around line 585-588), insert:
```ts
  // Combined validation error flag
  const hasActionValidationError = hasSplitValidationError || hasCreateValidationError || hasJoinValidationError || hasBranchValidationError;

  // ============================================================================
  // AUTO-SAVE
  // ============================================================================

  const { status, lastSavedAt, saveNow } = useAutoSave<Activity>({
    draft: localActivityDraft,
    hasPendingChanges,
    isValid: nameError === null && !hasActionValidationError,
    onSave,
    isSaving,
    elementId: localActivityDraft.id,
  });

  // Decisive controls (no onBlur): flush save on change.
  useFlushOnChange(localActivityDraft.financialProperties?.enabled, saveNow);
  useFlushOnChange(localActivityDraft.failureProperties?.enabled, saveNow);
  useFlushOnChange(localActivityDraft.failureProperties?.failureClockMode, saveNow);
  useFlushOnChange(localActivityDraft.failureProperties?.repairResourceRequirementId, saveNow);
  useFlushOnChange(localActivityDraft.connectType, saveNow);
```

This placement is the only valid one: AFTER the validation block (line 583) and BEFORE any handler that uses `saveNow` (none currently exist — `saveNow` is only used in JSX `onBlur` handlers and is closed-over at the call site).

The previous useFormSync / useSaveCompletionDetector / nameError-reset block stays untouched at lines 521-534.

- [ ] **Step 3: (intentionally merged into Step 2 above — no separate action)**

Step 2 now wires both `useAutoSave` and the 5 `useFlushOnChange` calls in one block. Skip this step.

- [ ] **Step 4: Add `onBlur={saveNow}` to the name input**

Find (around lines 1105-1112):
```tsx
<input
  type="text"
  name="name"
  className="w-full px-2 py-1.5 text-xs border rounded"
  value={localActivityDraft.name}
  onChange={handleInputChange}
  placeholder="Enter activity name"
/>
```

Replace with:
```tsx
<input
  type="text"
  name="name"
  className="w-full px-2 py-1.5 text-xs border rounded"
  value={localActivityDraft.name}
  onChange={handleInputChange}
  placeholder="Enter activity name"
  onBlur={saveNow}
/>
```

- [ ] **Step 5: Add `onBlur={saveNow}` to the capacity input**

Find (around lines 1128-1135):
```tsx
<input
  type="number"
  name="capacity"
  className="w-full px-2 py-1 text-xs border rounded"
  value={localActivityDraft.capacity}
  onChange={handleInputChange}
  min="1"
/>
```

Replace with:
```tsx
<input
  type="number"
  name="capacity"
  className="w-full px-2 py-1 text-xs border rounded"
  value={localActivityDraft.capacity}
  onChange={handleInputChange}
  min="1"
  onBlur={saveNow}
/>
```

- [ ] **Step 6: Add `onBlur={saveNow}` to the inboundQueueCapacity input**

Find (around lines 1165-1173):
```tsx
<input
  type="number"
  name="inboundQueueCapacity"
  className="w-full px-2 py-1 text-xs border rounded"
  value={localActivityDraft.inboundQueueCapacity}
  onChange={handleInputChange}
  min="0"
  max={INFINITY_DISPLAY_VALUE}
/>
```

Replace with:
```tsx
<input
  type="number"
  name="inboundQueueCapacity"
  className="w-full px-2 py-1 text-xs border rounded"
  value={localActivityDraft.inboundQueueCapacity}
  onChange={handleInputChange}
  min="0"
  max={INFINITY_DISPLAY_VALUE}
  onBlur={saveNow}
/>
```

- [ ] **Step 7: Add `onBlur={saveNow}` to the outboundQueueCapacity input**

Find (around lines 1186-1194):
```tsx
<input
  type="number"
  name="outboundQueueCapacity"
  className="w-full px-2 py-1 text-xs border rounded"
  value={localActivityDraft.outboundQueueCapacity}
  onChange={handleInputChange}
  min="0"
  max={INFINITY_DISPLAY_VALUE}
/>
```

Replace with:
```tsx
<input
  type="number"
  name="outboundQueueCapacity"
  className="w-full px-2 py-1 text-xs border rounded"
  value={localActivityDraft.outboundQueueCapacity}
  onChange={handleInputChange}
  min="0"
  max={INFINITY_DISPLAY_VALUE}
  onBlur={saveNow}
/>
```

- [ ] **Step 8: Add `onBlur={saveNow}` to the fixedCost input**

Find (around lines 1295-1311):
```tsx
<input
  type="number"
  className="w-full px-2 py-1 text-xs border rounded"
  value={
    localActivityDraft.financialProperties?.fixedCost ||
    0
  }
  onChange={(e) =>
    handleFinancialChange(
      "fixedCost",
      parseFloat(e.target.value) || 0
    )
  }
  min="0"
  step="0.01"
  placeholder="0.00"
/>
```

Replace with:
```tsx
<input
  type="number"
  className="w-full px-2 py-1 text-xs border rounded"
  value={
    localActivityDraft.financialProperties?.fixedCost ||
    0
  }
  onChange={(e) =>
    handleFinancialChange(
      "fixedCost",
      parseFloat(e.target.value) || 0
    )
  }
  min="0"
  step="0.01"
  placeholder="0.00"
  onBlur={saveNow}
/>
```

- [ ] **Step 9: Add `onBlur={saveNow}` to the costPerEntityProcessed input**

Find (around lines 1322-1338):
```tsx
<input
  type="number"
  className="w-full px-2 py-1 text-xs border rounded"
  value={
    localActivityDraft.financialProperties
      ?.costPerEntityProcessed || 0
  }
  onChange={(e) =>
    handleFinancialChange(
      "costPerEntityProcessed",
      parseFloat(e.target.value) || 0
    )
  }
  min="0"
  step="0.01"
  placeholder="0.00"
/>
```

Replace with:
```tsx
<input
  type="number"
  className="w-full px-2 py-1 text-xs border rounded"
  value={
    localActivityDraft.financialProperties
      ?.costPerEntityProcessed || 0
  }
  onChange={(e) =>
    handleFinancialChange(
      "costPerEntityProcessed",
      parseFloat(e.target.value) || 0
    )
  }
  min="0"
  step="0.01"
  placeholder="0.00"
  onBlur={saveNow}
/>
```

- [ ] **Step 10: Add `onBlur={saveNow}` to the costPerHourActive input**

Find (around lines 1349-1365):
```tsx
<input
  type="number"
  className="w-full px-2 py-1 text-xs border rounded"
  value={
    localActivityDraft.financialProperties
      ?.costPerHourActive || 0
  }
  onChange={(e) =>
    handleFinancialChange(
      "costPerHourActive",
      parseFloat(e.target.value) || 0
    )
  }
  min="0"
  step="0.01"
  placeholder="0.00"
/>
```

Replace with:
```tsx
<input
  type="number"
  className="w-full px-2 py-1 text-xs border rounded"
  value={
    localActivityDraft.financialProperties
      ?.costPerHourActive || 0
  }
  onChange={(e) =>
    handleFinancialChange(
      "costPerHourActive",
      parseFloat(e.target.value) || 0
    )
  }
  min="0"
  step="0.01"
  placeholder="0.00"
  onBlur={saveNow}
/>
```

- [ ] **Step 11: Add `onBlur={saveNow}` to the costPerHourIdle input**

Find (around lines 1376-1392):
```tsx
<input
  type="number"
  className="w-full px-2 py-1 text-xs border rounded"
  value={
    localActivityDraft.financialProperties
      ?.costPerHourIdle || 0
  }
  onChange={(e) =>
    handleFinancialChange(
      "costPerHourIdle",
      parseFloat(e.target.value) || 0
    )
  }
  min="0"
  step="0.01"
  placeholder="0.00"
/>
```

Replace with:
```tsx
<input
  type="number"
  className="w-full px-2 py-1 text-xs border rounded"
  value={
    localActivityDraft.financialProperties
      ?.costPerHourIdle || 0
  }
  onChange={(e) =>
    handleFinancialChange(
      "costPerHourIdle",
      parseFloat(e.target.value) || 0
    )
  }
  min="0"
  step="0.01"
  placeholder="0.00"
  onBlur={saveNow}
/>
```

- [ ] **Step 12: Add `onBlur={saveNow}` to the resourceCostMultiplier input**

Find (around lines 1406-1422):
```tsx
<input
  type="number"
  className="w-full px-2 py-1 text-xs border rounded"
  value={
    localActivityDraft.financialProperties
      ?.resourceCostMultiplier || 1
  }
  onChange={(e) =>
    handleFinancialChange(
      "resourceCostMultiplier",
      parseFloat(e.target.value) || 1
    )
  }
  min="0"
  step="0.1"
  placeholder="1.0"
/>
```

Replace with:
```tsx
<input
  type="number"
  className="w-full px-2 py-1 text-xs border rounded"
  value={
    localActivityDraft.financialProperties
      ?.resourceCostMultiplier || 1
  }
  onChange={(e) =>
    handleFinancialChange(
      "resourceCostMultiplier",
      parseFloat(e.target.value) || 1
    )
  }
  min="0"
  step="0.1"
  placeholder="1.0"
  onBlur={saveNow}
/>
```

- [ ] **Step 13: Replace the Save/Cancel button row with `<SaveStatusLine />`**

Find the entire `<div className="flex justify-end gap-2">` block (around lines 1696-1719) — this is the inner block CONTAINING the two buttons. Do NOT touch the outer `<div className="pt-2 border-t">` that wraps the validation banners — those stay.

Find:
```tsx
<div className="flex justify-end gap-2">
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
    disabled={!hasPendingChanges || isSaving || hasActionValidationError || nameError !== null}
    className={`px-3 py-1.5 text-xs rounded ${
      hasPendingChanges && !isSaving && !hasActionValidationError && nameError === null
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
{/* Auto-save status (validation banners above provide details on what to fix) */}
<SaveStatusLine status={status} lastSavedAt={lastSavedAt} />
```

- [ ] **Step 14: Delete `handleSave` function**

Find and delete the entire JSDoc + function (around lines 629-665):
```ts
/**
 * Saves the current activity draft to the model.
 *
 * Key responsibilities:
 * - Converts display values back to internal format (999999 → Infinity)
 * - Triggers Redux save action via onSave callback
 * - Redux manages isSaving state and optimistic updates
 * - useSaveCompletionDetector hook clears hasPendingChanges when save completes
 *
 * Note: Does NOT directly modify hasPendingChanges - that's handled by the
 * save completion detector to avoid race conditions.
 */
const handleSave = () => {
  const activityToSave = new Activity(
    localActivityDraft.id,
    localActivityDraft.name,
    localActivityDraft.capacity,
    displayToBuffer(localActivityDraft.inboundQueueCapacity),
    displayToBuffer(localActivityDraft.outboundQueueCapacity),
    localActivityDraft.actions,
    localActivityDraft.x,
    localActivityDraft.y
  );

  // Preserve connectType
  activityToSave.connectType = localActivityDraft.connectType;

  // Preserve financialProperties
  activityToSave.financialProperties = localActivityDraft.financialProperties;

  // Preserve failureProperties
  activityToSave.failureProperties = localActivityDraft.failureProperties;

  // Save is handled through Redux - modelOpsSender will dispatch ELEMENT_SAVE_START
  onSave(activityToSave);
  // Note: isSaving state is now managed by Redux through elementOpsState
};
```

The rebuild was dead code (`displayToBuffer` is identity; the property-preservation lines just copy what's already in the draft via `updateActivityImmutably`). The hook calls `onSave(localActivityDraft)` directly via `dispatchSave`.

- [ ] **Step 15: Delete `handleCancel` function**

Find and delete the entire JSDoc + function (around lines 667-679):
```ts
/**
 * Cancels editing and resets form to original activity data.
 *
 * Discards all pending changes by:
 * - Re-extracting fresh data from activity prop
 * - Clearing hasPendingChanges flag (disables Save button)
 *
 * Note: Does NOT close the editor - that's handled by parent component.
 */
const handleCancel = () => {
  setLocalActivityDraft(extractActivityData(activity));
  setHasPendingChanges(false);
};
```

The `onCancel` prop on `Props` (line 234) and the destructured `onCancel` parameter (line 280) STAY — vestigial, matching Phase 1B/1C/1D.

- [ ] **Step 16: Delete the `displayToBuffer` helper if no longer used**

After Step 14, `displayToBuffer` was only used in `handleSave`. If `grep -n "displayToBuffer" editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ActivityEditor.tsx` returns only the function definition (around line 341), delete the entire JSDoc + function:

```ts
/**
 * Converts display values from the UI back to internal queue capacity values.
 *
 * Values are passed through as-is. The value 999999 represents unlimited
 * capacity and is stored directly (not converted to Infinity) to ensure
 * proper serialization to JSON.
 *
 * @param value - Display value from UI
 * @returns The same value (999999 represents unlimited)
 */
const displayToBuffer = (value: number): number => value;
```

If the grep returns more than one match (unexpected — would mean some code still references it), STOP and report — do not delete. The plan assumes `handleSave` was the only consumer.

- [ ] **Step 17: Update the component-level JSDoc**

Find (around lines 256-276):
```ts
/**
 * ActivityEditor - Comprehensive editor for Activity simulation objects
 *
 * This component provides a tabbed interface for editing all aspects of an Activity:
 * - Basic: Name, capacity, queue sizes
 * - Actions: Processing durations and resource requirements
 * - Financial: Cost tracking properties
 * - Connectors: Routing rules for outgoing connectors
 * - States: State definitions for the activity
 *
 * State Management:
 * - Maintains local draft state (localActivityDraft) for immediate UI updates
 * - Syncs with Redux for save state tracking (isSaving, optimisticData)
 * - Uses custom hooks for activity switching and save completion detection
 * - Only persists changes when user clicks Save button
 *
 * Key Features:
 * - Dirty state tracking (hasPendingChanges) enables/disables Save button
 * - Guard conditions prevent data loss when switching activities
 * - Immutable updates via updateActivityImmutably helper
 */
```

Replace with:
```ts
/**
 * ActivityEditor - Comprehensive editor for Activity simulation objects
 *
 * This component provides a tabbed interface for editing all aspects of an Activity:
 * - Basic: Name, capacity, queue sizes
 * - Actions: Processing durations and resource requirements
 * - Financial: Cost tracking properties
 * - Failure: MTBF/MTTR breakdown simulation
 * - Connectors: Routing rules for outgoing connectors
 * - States: State definitions for the activity
 *
 * State Management:
 * - Maintains local draft state (localActivityDraft) for immediate UI updates
 * - Syncs with Redux for save state tracking (isSaving, optimisticData)
 * - Uses custom hooks for activity switching and save completion detection
 * - Single save path: all field changes route through useAutoSave (debounced)
 *
 * Save Behavior:
 * - Typed inputs (name, capacity, queue capacities, 5 financial cost fields):
 *   debounced auto-save on edit; immediate save on blur or element switch.
 * - Decisive controls (financialEnabled, failureEnabled, failureClockMode,
 *   repairResourceRequirementId, connectType): immediate save via
 *   useFlushOnChange — selects/checkboxes have no useful onBlur.
 * - Sub-component-driven changes (ActionEditor, EnhancedDurationEditor,
 *   RoutingConfigurationContent): debounced auto-save — sub-components fire
 *   onChange per keystroke, debounce coalesces.
 * - Validation: name uniqueness + 4 action validation checks (Split needs
 *   destination, Create needs entityTemplate+destination, Join needs
 *   matchState+destination, Branch needs condition). Save is gated when
 *   any validation fails; the 4 red banners describe what to fix while
 *   SaveStatusLine summarizes status ("Fix errors to save").
 * - Status surfaced via SaveStatusLine. Native LucidChart Ctrl+Z reverses
 *   saved changes.
 *
 * Key Features:
 * - Auto-save for all fields via useAutoSave hook
 * - Guard conditions prevent data loss when switching activities
 * - Immutable updates via updateActivityImmutably helper
 *
 * @param props - Component props (onCancel kept as vestigial; see Phase 0 spec)
 */
```

- [ ] **Step 18: Update `handleInputChange` JSDoc**

Find (around lines 587-597):
```ts
/**
 * Handles changes to basic input fields (name, capacity, queue capacities).
 *
 * Updates are applied immediately to localActivityDraft for responsive UI,
 * but not persisted until user clicks Save button.
 *
 * Special handling for queue capacities: Converts display values (999999)
 * back to internal format (Infinity) using displayToBuffer helper.
 */
```

Replace with:
```ts
/**
 * Handles changes to basic input fields (name, capacity, queue capacities).
 *
 * Updates are applied immediately to localActivityDraft for responsive UI,
 * validates the name, and marks the draft as pending. Auto-save fires after
 * debounce or on blur.
 *
 * Queue capacity values are stored as-is (999999 represents unlimited; passed
 * through to JSON serialization without conversion).
 */
```

- [ ] **Step 19: Update `handleFinancialChange` JSDoc**

Find (around lines 855-873):
```ts
/**
 * Handles changes to financial property fields.
 *
 * Creates a new ActivityFinancialProperties instance with the updated field,
 * preserving all other financial properties. Financial tracking enables
 * cost analysis for activities including:
 * - Fixed costs
 * - Per-entity costs
 * - Time-based costs (active/idle)
 * - Resource cost multipliers
 *
 * Updates are applied immediately to localActivityDraft for responsive UI,
 * but NOT persisted until user clicks Save button.
 *
 * Sets hasPendingChanges to enable the Save button.
 *
 * @param field - The financial property field to update
 * @param value - The new value for the field
 */
```

Replace with:
```ts
/**
 * Handles changes to financial property fields.
 *
 * Creates a new ActivityFinancialProperties instance with the updated field,
 * preserving all other financial properties. Financial tracking enables
 * cost analysis for activities including:
 * - Fixed costs
 * - Per-entity costs
 * - Time-based costs (active/idle)
 * - Resource cost multipliers
 *
 * Updates are applied immediately to localActivityDraft for responsive UI,
 * and marked as pending. Auto-save fires after debounce or on blur (cost
 * fields), or immediately via useFlushOnChange (the financial-enabled
 * checkbox).
 *
 * @param field - The financial property field to update
 * @param value - The new value for the field
 */
```

- [ ] **Step 20: Update `handleFailureChange` JSDoc**

Find (around lines 899-905):
```ts
/**
 * Handles changes to failure property fields.
 *
 * Creates a new FailureProperties instance with the updated field,
 * preserving all other failure properties. Failure configuration enables
 * MTBF/MTTR simulation for activity breakdowns.
 */
```

Replace with:
```ts
/**
 * Handles changes to failure property fields.
 *
 * Creates a new FailureProperties instance with the updated field,
 * preserving all other failure properties. Failure configuration enables
 * MTBF/MTTR simulation for activity breakdowns. Auto-save fires after
 * debounce (MTBF/MTTR durations via EnhancedDurationEditor) or
 * immediately via useFlushOnChange (failure-enabled checkbox,
 * failureClockMode select, repairResourceRequirementId select).
 */
```

- [ ] **Step 21: Update `handleConnectTypeChange` JSDoc**

Find (around lines 925-939):
```ts
/**
 * Handles changes to the activity's routing/connect type.
 *
 * Connect type determines how entities are routed to downstream activities:
 * - Probability: Route based on connector probabilities
 * - Conditional: Route based on state conditions
 * - EntityType: Route based on entity template
 *
 * Updates are applied immediately to localActivityDraft for responsive UI,
 * but NOT persisted until user clicks Save button.
 *
 * Sets hasPendingChanges to enable the Save button.
 *
 * @param e - Change event from select or input element
 */
```

Replace with:
```ts
/**
 * Handles changes to the activity's routing/connect type.
 *
 * Connect type determines how entities are routed to downstream activities:
 * - Probability: Route based on connector probabilities
 * - Conditional: Route based on state conditions
 * - EntityType: Route based on entity template
 *
 * Updates are applied immediately to localActivityDraft for responsive UI,
 * and marked as pending. Save fires immediately via useFlushOnChange watching
 * connectType (selects have no useful onBlur).
 *
 * @param e - Change event from select or input element
 */
```

- [ ] **Step 22: Run TypeScript check**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: zero output. If errors, read carefully — most likely an unused import (e.g., `displayToBuffer` if Step 16's deletion was missed).

- [ ] **Step 23: Run the test suite**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false`
Expected: 47 tests passing across 4 suites. Zero failures. (No new tests added in Task 3 — the hook contract is unchanged.)

- [ ] **Step 24: Run a production build**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm run build`
Expected: `Compiled successfully.` with no errors. Warnings are tolerable but read them.

- [ ] **Step 25: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ActivityEditor.tsx
git commit -m "feat(react): migrate ActivityEditor to auto-save (Phase 1E)

Largest editor migration so far (1738 LOC). Mirror Phase 1B-1D pattern
plus the new useFlushOnChange helper extracted in this branch.

- Wire useAutoSave<Activity> with isValid combining nameError + 4
  action validation checks (Split/Create/Join/Branch missing fields)
- 9 onBlur={saveNow} additions across Basic + Financial tabs
- 5 useFlushOnChange calls for decisive controls:
  financialEnabled, failureEnabled, failureClockMode,
  repairResourceRequirementId, connectType
- Replace Save/Cancel button row with SaveStatusLine; keep the 4 red
  validation banners above it (they tell the user what to fix)
- Delete handleSave (rebuild was dead code: displayToBuffer is
  identity, complex properties are already preserved in the draft)
- Delete handleCancel (onCancel prop kept vestigial)
- Delete unused displayToBuffer helper
- JSDoc updates: component-level, handleInputChange,
  handleFinancialChange, handleFailureChange, handleConnectTypeChange

Out of scope (sub-components untouched):
- ActionEditor, EnhancedDurationEditor (MTBF/MTTR), RoutingConfigurationContent,
  ResourceRequirementModal — all fire onChange per keystroke; debounce
  handles them natively.
- ResourceRequirementModal saves go through updateResourceRequirements
  (parent-level state, not Activity state)."
```

---

## Task 4: Final verification + manual smoke

**Files:** none (verification only)

- [ ] **Step 1: Confirm four editors now consume auto-save**

Run: `grep -rn "useAutoSave\|SaveStatusLine" editorextensions/quodsi_editor_extension/quodsim-react/src --include="*.tsx" --include="*.ts" | grep -v __tests__ | grep -v useEditorState.ts | grep -v SaveStatusLine.tsx`

Expected: matches in `EntityEditor.tsx`, `ResourceEditor.tsx`, `GeneratorEditor.tsx`, AND `ActivityEditor.tsx`. No other editor files. If anything else shows up, investigate.

- [ ] **Step 2: Confirm `useFlushOnChange` is used in 3 editors (not just ActivityEditor)**

Run: `grep -rn "useFlushOnChange" editorextensions/quodsi_editor_extension/quodsim-react/src --include="*.tsx" --include="*.ts" | grep -v __tests__`

Expected: 1 declaration in `useEditorState.ts`, 1 import + 1 call in `ResourceEditor.tsx`, 1 import + 2 calls in `GeneratorEditor.tsx`, 1 import + 5 calls in `ActivityEditor.tsx`.

- [ ] **Step 3: Final TypeScript check**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: zero output.

- [ ] **Step 4: Final test run**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false`
Expected: 47 tests passing across 4 suites. (44 existing + 3 new from Task 2.)

- [ ] **Step 5: Final production build**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm run build`
Expected: `Compiled successfully.`

- [ ] **Step 6: Confirm commit history is clean**

Run: `git log --oneline main..HEAD`
Expected: 3 commits — the plan doc commit + the Task 2 helper-extraction commit + the Task 3 ActivityEditor migration commit. No fixup or amended-for-no-reason noise.

- [ ] **Step 7: Hand off to Daniel for manual smoke**

Manual smoke checklist (Daniel runs in LucidChart locally):

**Basic tab:**
1. Drop an Activity shape, edit name → debounce → "Saved"; blur name → immediate save
2. Type a duplicate Activity name → inline error appears + status reads "Fix errors to save"
3. Fix the duplicate → save fires
4. Edit capacity → debounce → Saved; blur capacity → immediate save
5. Open Advanced Settings → edit inbound and outbound queue capacities → debounce → Saved; blur → immediate save

**Actions tab:**
6. Click "Add" → new DelayWithResource action appears, save fires (debounce)
7. Edit action duration (in EnhancedDurationEditor) → debounce → Saved
8. Drag-reorder actions → save fires (debounce)
9. Delete an action → save fires (debounce)
10. Add a Split action without a destination → red banner appears + status "Fix errors to save"; pick a destination → save fires
11. Add a Create action without entityTemplate or destination → red banner; fix → save fires
12. Add a Join action without matchState or destination → red banner; fix → save fires
13. Add a Branch action without condition → red banner; fix → save fires

**Financial tab:**
14. Toggle financial-enabled checkbox → save fires immediately (useFlushOnChange watcher)
15. Edit each cost field (fixedCost, costPerEntityProcessed, costPerHourActive, costPerHourIdle, resourceCostMultiplier) → debounce → Saved; blur → immediate save

**Failure tab:**
16. Toggle failure-enabled checkbox → save fires immediately (watcher)
17. Edit MTBF / MTTR durations → debounce → Saved
18. Change failureClockMode select → save fires immediately (watcher)
19. Change repairResourceRequirementId select → save fires immediately (watcher)
20. Click Create-requirement button → modal opens → save in modal → updateResourceRequirements fires (parent-level; outside auto-save flow)

**Connectors tab:**
21. Change routing connect type (Probability / Conditional / EntityType) → save fires immediately (watcher)

**Cross-cutting:**
22. With pending edits, click another element to switch → flushes the pending edit
23. Native Ctrl+Z reverses changes
24. Close + reopen panel → no regression, all values persist
25. Browser console clean — no errors or warnings introduced by Phase 1E

If smoke fails on any item: fix on this branch before merge.
If smoke passes: merge `feature/auto-save-phase-1e` to `main` and push.
