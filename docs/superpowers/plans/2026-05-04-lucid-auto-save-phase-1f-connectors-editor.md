# Lucid Auto-Save — Phase 1F (ConnectorsEditor Migration) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `ConnectorsEditor.tsx` to consume the auto-save hook + `<SaveStatusLine />` component, primarily for visual feedback consistency. ConnectorsEditor was already auto-saving (calls `updateElementData` directly on connectType change), so this migration adds status display rather than removing Save buttons. Also replaces a manual `useEffect`-based prop sync with `useFormSync` to gain the pending-changes guard.

**Architecture:** Wire `useAutoSave<Activity>` into ConnectorsEditor with `isValid: true` (no validation in this editor). Wrap the existing `updateElementData(activity.id, "Activity", activity)` call in an `onSave` callback that the hook can dispatch. Use `useFlushOnChange(localActivityDraft.connectType, saveNow)` to fire immediate save on routing-type change (preserves the current immediate-save UX, just routed through the hook). Refactor `handleConnectTypeChange` to set local state + `hasPendingChanges(true)` instead of calling `updateElementData` directly. Add `<SaveStatusLine />` below `<RoutingConfigurationContent />`.

**Tech Stack:** React 18.3, TypeScript 4.9, `@testing-library/react` 13.4, Jest.

**Repo:** This plan lives in the LucidChart extension repo (`quodsi_lucidchart_package/`). All file paths and commands below are relative to that repo's root. Confirm you are on branch `feature/auto-save-phase-1f` with `git status` before starting.

**Spec:** Phase 0 architectural spec at `../quodsi/docs/superpowers/specs/2026-05-03-lucid-extension-auto-save-design.md`. Phase 1F is the **fifth editor migration** under Phase 1 of that spec's rollout.

---

## Key context discovered during brainstorming

**1. ConnectorsEditor already auto-saves.**

`ConnectorsEditor.tsx:130` calls `updateElementData(updatedActivity.id, "Activity", updatedActivity)` synchronously inside `handleConnectTypeChange`. There is no Save button to remove. This phase is about **visual feedback consistency** — adding the status line so the user sees "Saving…" → "Saved" feedback after changing routing type.

**2. Single field to migrate.**

The only field this editor manages directly is `connectType` (a select inside `RoutingConfigurationContent`). Per-connector configuration (probabilities, conditions, entity templates) lives in `RoutingConfigurationPanel`, which uses its own messaging path — out of scope.

**3. No `onSave` prop, no validation, no `nameError`.**

Unlike prior editors, ConnectorsEditor doesn't receive an `onSave` callback. We construct one locally that wraps `updateElementData`. `isValid` is hardcoded to `true` because there's no validation in this editor.

**4. Manual `useEffect` sync gets replaced by `useFormSync`.**

Lines 100-102 currently have:
```ts
useEffect(() => {
  setLocalActivityDraft(extractActivityData(activity));
}, [activity?.id]);
```

This re-extracts unconditionally on activity-id change. With auto-save, an in-flight edit could be overwritten if the activity prop updates mid-edit. `useFormSync` adds a `hasPendingChanges` guard. In practice, the activity prop only changes on element switch (where the hook's element-switch flush handles pending edits correctly), so this is defense-in-depth rather than a functional bug fix.

**5. Embedded use is unaffected.**

`RoutingConfigurationContent` is used in two places: (a) standalone via this editor, (b) embedded in ActivityEditor's connectors tab via `ActivityEditor.tsx:1632`. The embedded path uses `RoutingConfigurationContent` directly — NOT through `ConnectorsEditor`. ActivityEditor's `connectType` watcher (Phase 1E) already covers that case. Don't touch ActivityEditor or RoutingConfigurationContent.

---

## File Structure

**Modify:**
- `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ConnectorsEditor.tsx`

**Do NOT touch:**
- `useEditorState.ts` — no hook changes needed
- `SaveStatusLine.tsx` — already feature-complete
- `EntityEditor.tsx`, `ResourceEditor.tsx`, `GeneratorEditor.tsx`, `ActivityEditor.tsx` — already migrated
- `RoutingConfigurationContent.tsx` — used by both ConnectorsEditor AND ActivityEditor; behavior unchanged
- `RoutingConfigurationPanel.tsx` — uses its own messaging path; out of scope
- `ElementEditor.tsx` — passes correct props to ConnectorsEditor (no bundled bug fix)
- Any test file (no new tests needed; hook contract unchanged)

---

## Task 1: Setup verification

**Files:** none (verification only)

- [ ] **Step 1: Confirm branch and clean state**

Run: `git status && git log --oneline -3`
Expected: branch `feature/auto-save-phase-1f`, clean working tree, recent commits include the Phase 1E merge commit `1426888`.

- [ ] **Step 2: Confirm tests pass on baseline**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false`
Expected: 47 tests passing across 4 suites. Zero failures.

- [ ] **Step 3: Confirm TypeScript clean**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: zero output (no errors).

- [ ] **Step 4: Confirm starting state of ConnectorsEditor**

Run: `grep -n "useAutoSave\|SaveStatusLine\|useFormSync\|useSaveCompletionDetector" editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ConnectorsEditor.tsx`

Expected: zero matches. ConnectorsEditor does not yet consume any of the auto-save infrastructure.

Run: `grep -n "updateElementData" editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ConnectorsEditor.tsx`

Expected: 2 matches — the import (line ~10) and the direct call inside `handleConnectTypeChange` (line ~130).

- [ ] **Step 5: Confirm four editors are already migrated (Phase 1B-1E)**

Run: `grep -rn "useAutoSave\|SaveStatusLine" editorextensions/quodsi_editor_extension/quodsim-react/src --include="*.tsx" --include="*.ts" | grep -v __tests__ | grep -v useEditorState.ts | grep -v SaveStatusLine.tsx`

Expected: matches in `EntityEditor.tsx`, `ResourceEditor.tsx`, `GeneratorEditor.tsx`, AND `ActivityEditor.tsx` only. No `ConnectorsEditor.tsx` (it hasn't been migrated yet).

---

## Task 2: Migrate ConnectorsEditor

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ConnectorsEditor.tsx`

This task is structured as a sequence of small, independently-runnable edits. After each edit, the file should still typecheck (you can run `npx tsc --noEmit` between edits if uncertain). Final commit happens once all edits are in.

- [ ] **Step 1: Update React import to add `useCallback`**

Find:
```ts
import React, { useState, useEffect } from "react";
```

Replace with:
```ts
import React, { useState, useEffect, useCallback } from "react";
```

- [ ] **Step 2: Add the auto-save infrastructure imports**

Find:
```ts
import { RoutingConfigurationContent } from "./RoutingConfigurationContent";
import { useModelOpsSender } from "../../messaging/senders";
```

Replace with:
```ts
import { RoutingConfigurationContent } from "./RoutingConfigurationContent";
import { useModelOpsSender } from "../../messaging/senders";
import { useElementOpsState } from "../../messaging/hooks/useElementOpsState";
import { useFormSync, useSaveCompletionDetector, useAutoSave, useFlushOnChange } from "./hooks/useEditorState";
import SaveStatusLine from "./SaveStatusLine";
```

- [ ] **Step 3: Replace the manual `useEffect` sync with `useFormSync` + add `hasPendingChanges` state**

Find the existing block (around lines 95-102):
```ts
const [localActivityDraft, setLocalActivityDraft] = useState<Activity>(() =>
  extractActivityData(activity)
);

// Sync local draft when activity prop changes (e.g., user selects a different connector)
useEffect(() => {
  setLocalActivityDraft(extractActivityData(activity));
}, [activity?.id]);
```

Replace with:
```ts
const [localActivityDraft, setLocalActivityDraft] = useState<Activity>(() =>
  extractActivityData(activity)
);
const [hasPendingChanges, setHasPendingChanges] = useState(false);

// Get element operations state from Redux
const elementOpsState = useElementOpsState();
const isSaving = localActivityDraft.id
  ? elementOpsState.isSaving(localActivityDraft.id)
  : false;

// Sync local draft when activity prop changes — guards against overwriting in-flight edits.
useFormSync(
  activity.id,
  hasPendingChanges,
  () => extractActivityData(activity),
  setLocalActivityDraft,
  setHasPendingChanges
);

useSaveCompletionDetector(isSaving, setHasPendingChanges);

// Wrap updateElementData in the onSave shape the hook expects.
const onSave = useCallback(
  (updated: Activity) => {
    updateElementData(updated.id, "Activity", updated);
  },
  [updateElementData]
);

const { status, lastSavedAt, saveNow } = useAutoSave<Activity>({
  draft: localActivityDraft,
  hasPendingChanges,
  isValid: true,
  onSave,
  isSaving,
  elementId: localActivityDraft.id,
});

// Fire saveNow when routing type changes (no debounce — connectType is decisive).
useFlushOnChange(localActivityDraft.connectType, saveNow);
```

- [ ] **Step 4: Refactor `handleConnectTypeChange` to use the hook**

Find (around lines 108-131):
```ts
/**
 * Handles changes to the activity's routing type (ConnectType).
 * Auto-saves immediately by sending the updated Activity to the extension.
 */
const handleConnectTypeChange = (
  e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
) => {
  const newConnectType = e.target.value as ConnectType;
  const updatedActivity = new Activity(
    localActivityDraft.id,
    localActivityDraft.name,
    localActivityDraft.capacity,
    localActivityDraft.inboundQueueCapacity,
    localActivityDraft.outboundQueueCapacity,
    localActivityDraft.actions,
    localActivityDraft.x,
    localActivityDraft.y
  );
  updatedActivity.connectType = newConnectType;
  updatedActivity.financialProperties = localActivityDraft.financialProperties;

  setLocalActivityDraft(updatedActivity);
  updateElementData(updatedActivity.id, "Activity", updatedActivity);
};
```

Replace with:
```ts
/**
 * Handles changes to the activity's routing type (ConnectType).
 *
 * Updates local draft and marks pending — useFlushOnChange watching connectType
 * fires saveNow on the next render, which dispatches the save through useAutoSave.
 * Status surfaced via SaveStatusLine.
 */
const handleConnectTypeChange = (
  e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
) => {
  const newConnectType = e.target.value as ConnectType;
  const updatedActivity = new Activity(
    localActivityDraft.id,
    localActivityDraft.name,
    localActivityDraft.capacity,
    localActivityDraft.inboundQueueCapacity,
    localActivityDraft.outboundQueueCapacity,
    localActivityDraft.actions,
    localActivityDraft.x,
    localActivityDraft.y
  );
  updatedActivity.connectType = newConnectType;
  updatedActivity.financialProperties = localActivityDraft.financialProperties;

  setLocalActivityDraft(updatedActivity);
  setHasPendingChanges(true);
};
```

The two changes:
- The direct `updateElementData(...)` call at the end is replaced by `setHasPendingChanges(true)`.
- The JSDoc is updated to describe the new auto-save flow.

- [ ] **Step 5: Add `<SaveStatusLine />` to the render**

Find (around lines 137-148):
```tsx
return (
  <div className="space-y-2">
    <RoutingConfigurationContent
      localData={localActivityDraft}
      handleChange={handleConnectTypeChange}
      outgoingConnectors={outgoingConnectors}
      selectedConnectorId={selectedConnectorId}
      referenceData={referenceData}
      states={states}
    />
  </div>
);
```

Replace with:
```tsx
return (
  <div className="space-y-2">
    <RoutingConfigurationContent
      localData={localActivityDraft}
      handleChange={handleConnectTypeChange}
      outgoingConnectors={outgoingConnectors}
      selectedConnectorId={selectedConnectorId}
      referenceData={referenceData}
      states={states}
    />

    {/* Auto-save status */}
    <SaveStatusLine status={status} lastSavedAt={lastSavedAt} />
  </div>
);
```

- [ ] **Step 6: Update the component-level JSDoc**

Find (around lines 29-37):
```ts
/**
 * ConnectorsEditor - Dedicated editor for Activity routing configuration
 *
 * Can be used:
 * 1. Standalone when a Connector/Line is selected (shows source Activity's routing)
 * 2. Embedded in ActivityEditor's "connectors" tab
 *
 * When selectedConnectorId is provided, highlights that connector in the list
 */
```

Replace with:
```ts
/**
 * ConnectorsEditor - Dedicated editor for Activity routing configuration
 *
 * Used standalone when a Connector/Line is selected (shows source Activity's
 * routing). When selectedConnectorId is provided, highlights that connector
 * in the list.
 *
 * NOTE: ActivityEditor's "connectors" tab uses RoutingConfigurationContent
 * directly (not this component); ActivityEditor handles its own auto-save
 * for connectType.
 *
 * Save Behavior:
 * - Routing type (connectType) change: immediate save via useFlushOnChange
 *   (selects have no useful onBlur). Status surfaced via SaveStatusLine
 *   ("Saved" / "Saving…" / "Save failed — keep typing to retry"). Native
 *   LucidChart Ctrl+Z reverses saved changes.
 * - Per-connector configuration (probabilities, conditions, entity mappings):
 *   handled by RoutingConfigurationPanel via its own messaging path —
 *   outside this editor's auto-save scope.
 */
```

- [ ] **Step 7: Run TypeScript check**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: zero output. If errors, read carefully — most likely a missing import or a typo.

- [ ] **Step 8: Run the test suite**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false`
Expected: 47 tests passing across 4 suites. Zero failures. (No new tests added — the hook contract is unchanged from Phase 1A.)

- [ ] **Step 9: Run a production build**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm run build`
Expected: `Compiled successfully.` with no errors.

- [ ] **Step 10: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ConnectorsEditor.tsx
git commit -m "feat(react): migrate ConnectorsEditor to auto-save (Phase 1F)

Adds visual feedback consistency. ConnectorsEditor was already
auto-saving via direct updateElementData calls — this phase routes
the save through useAutoSave so the user sees Saving/Saved status
flicker after changing the routing type.

- Wire useAutoSave<Activity> with isValid=true (no validation in
  this editor; no name field, no per-action checks)
- Wrap updateElementData in an onSave callback for the hook
- useFlushOnChange watching connectType fires saveNow on change
  (preserves the immediate-save UX, just routed through the hook)
- Replace the manual useEffect sync with useFormSync (gains the
  pending-changes guard against overwriting in-flight edits)
- Add SaveStatusLine below RoutingConfigurationContent
- handleConnectTypeChange refactored: setHasPendingChanges(true)
  instead of direct updateElementData call

Out of scope:
- RoutingConfigurationPanel (per-connector probabilities/conditions
  via its own messaging path)
- ActivityEditor's connectors tab (uses RoutingConfigurationContent
  directly; ActivityEditor's connectType watcher from Phase 1E
  already covers that path)"
```

---

## Task 3: Final verification + manual smoke

**Files:** none (verification only)

- [ ] **Step 1: Confirm five editors now consume auto-save**

Run: `grep -rn "useAutoSave\|SaveStatusLine" editorextensions/quodsi_editor_extension/quodsim-react/src --include="*.tsx" --include="*.ts" | grep -v __tests__ | grep -v useEditorState.ts | grep -v SaveStatusLine.tsx`

Expected: matches in `EntityEditor.tsx`, `ResourceEditor.tsx`, `GeneratorEditor.tsx`, `ActivityEditor.tsx`, AND `ConnectorsEditor.tsx`. No other editor files (ModelEditor still pending — Phase 1G).

- [ ] **Step 2: Confirm `useFlushOnChange` usage count**

Run: `grep -rn "useFlushOnChange" editorextensions/quodsi_editor_extension/quodsim-react/src --include="*.tsx" --include="*.ts" | grep -v __tests__`

Expected:
- 1 declaration in `useEditorState.ts`
- ResourceEditor: 1 import + 1 call (financialEnabled)
- GeneratorEditor: 1 import + 2 calls (entityId, generatorType)
- ActivityEditor: 1 import + 5 calls (financialEnabled, failureEnabled, failureClockMode, repairResourceRequirementId, connectType)
- ConnectorsEditor: 1 import + 1 call (connectType) — NEW in Phase 1F

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

1. Click on a Connector/Line in LucidChart → ConnectorsEditor renders standalone (the panel shows "Routing Configuration for: <Activity Name>" header)
2. Change routing type select from Probability to State Condition (or vice versa) → status flashes "Saving…" then "Saved"
3. Click on a different Connector with a different parent Activity → editor switches; status resets per the new activity
4. Verify the EMBEDDED path still works correctly: click on the parent Activity, switch to its "Connectors" tab → routing UI renders the same as before (Phase 1E's ActivityEditor connectType watcher handles this path; should be unchanged from Phase 1E behavior)
5. Native Ctrl+Z reverses routing-type changes
6. Browser console clean — no errors or warnings introduced by Phase 1F

If smoke fails on any item: fix on this branch before merge.
If smoke passes: merge `feature/auto-save-phase-1f` to `main` and push.
