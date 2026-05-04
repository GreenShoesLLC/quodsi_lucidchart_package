# Lucid Auto-Save — Phase 1H (Sweep Cleanup) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address the accumulated minor items from Phase 1B-1G code reviews in a single bundled cleanup PR. One functional bug fix (status flicker in `useAutoSave`), 4 dead-code/vestigial removals, 2 polish items, and 1 upstream memoization. After Phase 1H, the auto-save sweep is fully closed out.

**Architecture:** Five mechanical tasks executed in order: (1) setup verification, (2) hook bug fix M6 with regression test, (3) editor-side cleanups (vestigial code removal + polish — touches 7 files for the `onCancel` removal alone), (4) upstream `onSave` memoization in `ModelPanel.tsx` (one `useCallback` addition), (5) final verification + smoke handoff. The hook fix is the only behavior-changing edit; everything else preserves semantics.

**Tech Stack:** React 18.3, TypeScript 4.9, `@testing-library/react` 13.4, Jest.

**Repo:** This plan lives in the LucidChart extension repo (`quodsi_lucidchart_package/`). All file paths and commands below are relative to that repo's root. Confirm you are on branch `feature/auto-save-phase-1h` with `git status` before starting.

**Spec:** Phase 0 architectural spec at `../quodsi/docs/superpowers/specs/2026-05-03-lucid-extension-auto-save-design.md`. Phase 1H is the **sweep-cleanup follow-up** to Phases 1A through 1G. No new architectural decisions — purely tying off review-flagged items.

---

## Items addressed by this phase

Carried over from prior phases' code reviews:

**Functional fix:**
- **M6 (Phase 1E)**: `useAutoSave` saving-transition effect (`useEditorState.ts:234-263`) sets `status="saved"` unconditionally after an in-flight save completes. If the user introduced a validation error mid-save, the status briefly flickers from "invalid" → "saved" → "invalid" on subsequent renders. Fix: guard the "saved" set on `!(hasPendingRef.current && !isValidRef.current)` — i.e., don't overwrite to "saved" when there are pending invalid edits. Bug exists in TWO places: the trailing-save else branch (line 253-256) and the default else branch (line 257-260).

**Dead code / vestigial removal:**
- **M4**: `onCancel` prop is now unused across all 6 editors and `ElementEditor.tsx`. Pre-Phase-1B, editors had Cancel buttons that called `onCancel`. Post-sweep, `handleCancel` is gone everywhere; the prop is plumbed but never invoked. ElementEditor.tsx defines a no-op `handleCancel = () => { /* Editors handle their own cancel behavior */ }` that's passed to all 7 child editors. Remove the prop from all 6 editors' `Props` interfaces, drop it from destructured params, drop the JSX `onCancel={handleCancel}` from 7 ElementEditor JSX call sites, delete the no-op handler.
- **M2 (Phase 1E)**: `optimisticData` computed in `ActivityEditor.tsx:537-539` but never read. Pre-existing dead code.
- **M3 (Phase 1E)**: `Hash` import in `ActivityEditor.tsx:7` only referenced in the commented-out States tab. Pre-existing dead code.
- **M5 (Phase 1E)**: `displayToBuffer` in `ActivityEditor.tsx:362` is the identity function `(value: number): number => value`. Inline its 2 call sites in `handleInputChange` (lines ~660, 662) — replace `displayToBuffer(parseInt(value) || 0)` with `parseInt(value) || 0` — and delete the function plus its JSDoc.

**Polish:**
- **M2 (Phase 1F) / MIN-2 (Phase 1G)**: `isValid: true` in `ConnectorsEditor.tsx` and `ModelEditor.tsx` is hardcoded with no comment. Add a one-line explanation.
- **MIN-1 (Phase 1G)**: `<SaveStatusLine />` in `ModelEditor.tsx` sits OUTSIDE the `space-y-2` container. Move it INSIDE for consistent vertical rhythm. Audit the other 5 editors for parity.

**Upstream architectural improvement:**
- **MIN-6 (Phase 1G)**: `ModelPanel.tsx:310` passes `onSave={data => onElementUpdate(currentElement.id, data)}` (inline arrow). Each parent render produces a new function reference, cascading through to all 6 editors' `useAutoSave` hooks (which re-memoize internally; the value-equality guard suppresses spurious saves but the effect still re-attaches each render). Fix: wrap in `useCallback`.

---

## File Structure

**Modify:**
- `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/useEditorState.ts` — M6 hook fix
- `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/__tests__/useAutoSave.test.tsx` — 1 new regression test for M6
- `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ActivityEditor.tsx` — M2 + M3 + M5 + M4 (Props onCancel removal) + MIN-1 audit
- `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ConnectorsEditor.tsx` — M2-1F (isValid comment) + M4 (Props onCancel removal — wait, ConnectorsEditor never had onCancel, skip) + MIN-1 audit
- `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/EntityEditor.tsx` — M4 (Props onCancel removal) + MIN-1 audit
- `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/GeneratorEditor.tsx` — M4 (Props onCancel removal) + MIN-1 audit
- `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ModelEditor.tsx` — MIN-2-1G (isValid comment) + MIN-1 (SaveStatusLine placement) + M4 (Props onCancel removal)
- `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ResourceEditor.tsx` — M4 (Props onCancel removal) + MIN-1 audit
- `editorextensions/quodsi_editor_extension/quodsim-react/src/features/modelPanel/ElementEditor.tsx` — M4 (drop no-op handleCancel + 7 JSX onCancel props)
- `editorextensions/quodsi_editor_extension/quodsim-react/src/features/modelPanel/ModelPanel.tsx` — MIN-6 (memoize onSave)

Note on ConnectorsEditor: its `Props` (`ConnectorsEditorProps`) has no `onCancel` field — it never had one. Verify during Step in Task 3 and skip the M4 portion for that file.

**Do NOT touch:**
- `SaveStatusLine.tsx` — feature-complete
- Any other file in the repo
- `package.json`, `package-lock.json`
- Tests other than the M6 regression test

---

## Task 1: Setup verification

**Files:** none (verification only)

- [ ] **Step 1: Confirm branch and clean state**

Run: `git status && git log --oneline -3`
Expected: branch `feature/auto-save-phase-1h`, clean working tree, recent commits include the Phase 1G merge commit `433cee3`.

- [ ] **Step 2: Confirm tests pass on baseline**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false`
Expected: 47 tests passing across 4 suites. Zero failures.

- [ ] **Step 3: Confirm TypeScript clean**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: zero output.

- [ ] **Step 4: Confirm starting state of cleanup targets**

Confirm M6 starting state:
Run: `grep -n "setStatus(\"saved\")" editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/useEditorState.ts`
Expected: 2 matches around lines 254 and 258 (the unconditional "saved" sets in the saving-transition effect).

Confirm M4 starting state — onCancel everywhere:
Run: `grep -rn "onCancel" editorextensions/quodsi_editor_extension/quodsim-react/src --include="*.tsx" --include="*.ts" | grep -v __tests__`
Expected: matches in 6 editor `Props` interfaces, 6 destructured params, 7 JSX call sites in `ElementEditor.tsx`, 1 no-op handler in `ElementEditor.tsx`. ConnectorsEditor.tsx should NOT match.

Confirm M5 starting state:
Run: `grep -n "displayToBuffer" editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ActivityEditor.tsx`
Expected: definition (around line 362) + 2 call sites in `handleInputChange` (around lines 660, 662) + 1 JSDoc reference (around line 617).

Confirm MIN-6 starting state:
Run: `grep -n "onSave={data" editorextensions/quodsi_editor_extension/quodsim-react/src/features/modelPanel/ModelPanel.tsx`
Expected: 1 match around line 310 — the inline arrow `onSave={data => onElementUpdate(currentElement.id, data)}`.

---

## Task 2: Hook bug fix (M6) + regression test

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/useEditorState.ts`
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/__tests__/useAutoSave.test.tsx`

This task is TDD: write the failing test first, watch it fail, fix the hook, watch it pass.

- [ ] **Step 1: Write the failing regression test**

Open `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/__tests__/useAutoSave.test.tsx`. Find the existing `describe("status state machine and lastSavedAt", ...)` block. Inside that block, add this test as the LAST `it(...)` test in the block:

```tsx
it("does not flicker to 'saved' if validation became invalid mid-save", async () => {
  jest.useFakeTimers();
  const onSave = jest.fn();
  const { result, rerender } = renderHook(
    ({ draft, hasPendingChanges, isValid, isSaving }) =>
      useAutoSave({
        draft,
        hasPendingChanges,
        isValid,
        onSave,
        isSaving,
        elementId: "el-1",
      }),
    {
      initialProps: {
        draft: { name: "valid" },
        hasPendingChanges: true,
        isValid: true,
        isSaving: false,
      },
    }
  );

  // 1. Trigger debounce → save dispatched (isValid=true, hasPendingChanges=true).
  act(() => {
    jest.advanceTimersByTime(500);
  });
  expect(onSave).toHaveBeenCalledTimes(1);
  expect(result.current.status).toBe("saving");

  // 2. Parent flips isSaving=true (Redux).
  rerender({
    draft: { name: "valid" },
    hasPendingChanges: true,
    isValid: true,
    isSaving: true,
  });
  expect(result.current.status).toBe("saving");

  // 3. Mid-save, user introduces a validation error (e.g., types an invalid name).
  // hasPendingChanges remains true; isValid flips false.
  rerender({
    draft: { name: "" }, // invalid (empty)
    hasPendingChanges: true,
    isValid: false,
    isSaving: true,
  });
  expect(result.current.status).toBe("invalid");

  // 4. In-flight save completes (Redux flips isSaving=false).
  // BUG WAS: saving-transition effect would set status="saved" here, briefly
  // overwriting "invalid" before the schedule effect re-evaluates.
  // FIX: saving-transition effect must NOT set "saved" while
  // (hasPendingRef.current && !isValidRef.current).
  rerender({
    draft: { name: "" },
    hasPendingChanges: true,
    isValid: false,
    isSaving: false,
  });
  expect(result.current.status).toBe("invalid");

  jest.useRealTimers();
});
```

- [ ] **Step 2: Run the new test to verify it FAILS against unfixed hook**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false useAutoSave.test.tsx`
Expected: the new test FAILS with `Expected: "invalid" Received: "saved"` at the final `expect(result.current.status).toBe("invalid")`.

If the test PASSES against the unfixed hook, STOP — the bug premise is wrong, or the test isn't reproducing it correctly. Re-read the saving-transition effect at `useEditorState.ts:234-263` and adjust the test. Do not proceed to Step 3 until you've reproduced the bug.

- [ ] **Step 3: Apply the M6 fix to `useEditorState.ts`**

Open `useEditorState.ts`. Find the saving-transition effect (around lines 230-263):
```ts
// Detect saving→not-saving transition. Three handling priorities:
// 1. Captured pending flush (from element switch) — drain silently.
// 2. Trailing save needed (edits during in-flight save) — fire it.
// 3. Default — mark the current element saved.
useEffect(() => {
  if (wasSavingRef.current && !isSaving) {
    if (pendingFlushDraftRef.current !== null) {
      // Drain the captured flush for the PREVIOUS element. Fire-and-forget:
      // failures log via console.error but do not surface in the new element's
      // UI status, because the user has already moved on.
      const captured = pendingFlushDraftRef.current;
      pendingFlushDraftRef.current = null;
      try {
        onSaveRef.current(captured);
      } catch (err) {
        console.error("[useAutoSave] pending flush failed:", err);
      }
      // Note: do NOT update status or lastSavedAt — the new element's panel
      // owns its own visual state.
    } else if (trailingSaveNeededRef.current) {
      trailingSaveNeededRef.current = false;
      if (hasPendingRef.current && isValidRef.current) {
        dispatchSave();
      } else {
        setStatus("saved");
        setLastSavedAt(Date.now());
      }
    } else {
      setStatus("saved");
      setLastSavedAt(Date.now());
    }
  }
  wasSavingRef.current = isSaving;
}, [isSaving, dispatchSave]);
```

Replace the entire `useEffect(...)` body with the fixed version that uses a `finalizeSavedStatus` helper. The helper guards against `hasPendingRef.current && !isValidRef.current` — if the user introduced invalid edits during the save, status must remain "invalid" (set by the schedule effect) rather than flicker to "saved".

```ts
// Detect saving→not-saving transition. Three handling priorities:
// 1. Captured pending flush (from element switch) — drain silently.
// 2. Trailing save needed (edits during in-flight save) — fire it.
// 3. Default — mark the current element saved.
useEffect(() => {
  // Helper: only set "saved" when the post-save state is actually clean.
  // If the user introduced invalid edits during the in-flight save, the
  // schedule effect has already set status="invalid"; do NOT overwrite that.
  const finalizeSavedStatus = () => {
    if (hasPendingRef.current && !isValidRef.current) return;
    setStatus("saved");
    setLastSavedAt(Date.now());
  };

  if (wasSavingRef.current && !isSaving) {
    if (pendingFlushDraftRef.current !== null) {
      // Drain the captured flush for the PREVIOUS element. Fire-and-forget:
      // failures log via console.error but do not surface in the new element's
      // UI status, because the user has already moved on.
      const captured = pendingFlushDraftRef.current;
      pendingFlushDraftRef.current = null;
      try {
        onSaveRef.current(captured);
      } catch (err) {
        console.error("[useAutoSave] pending flush failed:", err);
      }
      // Note: do NOT update status or lastSavedAt — the new element's panel
      // owns its own visual state.
    } else if (trailingSaveNeededRef.current) {
      trailingSaveNeededRef.current = false;
      if (hasPendingRef.current && isValidRef.current) {
        dispatchSave();
      } else {
        finalizeSavedStatus();
      }
    } else {
      finalizeSavedStatus();
    }
  }
  wasSavingRef.current = isSaving;
}, [isSaving, dispatchSave]);
```

The two `setStatus("saved")` + `setLastSavedAt(Date.now())` pairs that previously appeared at lines 254-255 and 258-259 are now consolidated into the `finalizeSavedStatus` helper, which adds the validity guard.

- [ ] **Step 4: Run the new test — should now PASS**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false useAutoSave.test.tsx`
Expected: all useAutoSave tests pass, including the new one.

- [ ] **Step 5: Run the full test suite — all 48 tests pass**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false`
Expected: 48 tests passing across 4 suites (47 prior + 1 new). Zero failures.

- [ ] **Step 6: TypeScript check**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: zero output.

- [ ] **Step 7: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/useEditorState.ts editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/__tests__/useAutoSave.test.tsx
git commit -m "fix(react): useAutoSave status no longer flickers to 'saved' on mid-save validation error

Phase 1E code review (M6) found that when the user introduces a
validation error during an in-flight save, the saving-transition
effect would briefly set status='saved' before the schedule effect
re-evaluated and reset it to 'invalid'. Data correctness was fine
(no bad data was saved), but the status line flickered.

Fix: extract a finalizeSavedStatus() helper inside useAutoSave that
guards against (hasPendingRef.current && !isValidRef.current). When
the user has dirty + invalid edits, keep the 'invalid' status set by
the schedule effect rather than overwrite it.

The bug existed in two places:
- The trailing-save else branch (line 253-256 of useEditorState.ts)
- The default else branch (line 257-260)

Both now route through finalizeSavedStatus().

Adds one regression test in useAutoSave.test.tsx covering the
mid-save-validation-error sequence (test count: 47 -> 48)."
```

---

## Task 3: Editor cleanups (M4 + M2/M3/M5 in ActivityEditor + isValid comments + SaveStatusLine placement audit)

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/modelPanel/ElementEditor.tsx`
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/EntityEditor.tsx`
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ResourceEditor.tsx`
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/GeneratorEditor.tsx`
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ActivityEditor.tsx`
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ConnectorsEditor.tsx`
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ModelEditor.tsx`

This is the largest task — 7 files modified. Mostly mechanical. Single commit at the end.

### M4: Remove `onCancel` from 6 editors + ElementEditor

- [ ] **Step 1: EntityEditor — remove `onCancel`**

Open `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/EntityEditor.tsx`.

1a. Find the `Props` interface and remove the `onCancel` field. Find:
```ts
interface Props {
  /** The entity being edited */
  entity: Entity;
  /** Callback invoked when user saves changes */
  onSave: (entity: Entity) => void;
  /** Callback invoked when user cancels editing (closes the editor) */
  onCancel: () => void;
  /** State variables associated with this entity template */
  states: StateListManager;
```

Replace with:
```ts
interface Props {
  /** The entity being edited */
  entity: Entity;
  /** Callback invoked when user saves changes */
  onSave: (entity: Entity) => void;
  /** State variables associated with this entity template */
  states: StateListManager;
```

1b. Find the destructured params (around line 89) and remove `onCancel`. Find:
```ts
const EntityEditor: React.FC<Props> = ({ entity, onSave, onCancel, states, onStatesChange, referenceData }) => {
```

Replace with:
```ts
const EntityEditor: React.FC<Props> = ({ entity, onSave, states, onStatesChange, referenceData }) => {
```

1c. Find and remove the `@param` JSDoc reference to `onCancel` if present. The component-level JSDoc at line ~86 says "@param props - Component props (onCancel kept as vestigial; see Phase 0 spec)". Find:
```ts
 * @param props - Component props (onCancel kept as vestigial; see Phase 0 spec)
```

Replace with:
```ts
 * @param props - Component props
```

- [ ] **Step 2: ResourceEditor — remove `onCancel`**

Open `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ResourceEditor.tsx`.

2a. Remove `onCancel` field from `Props`. Find:
```ts
  /** Callback invoked when user saves changes */
  onSave: (resource: Resource) => void;
  /** Callback invoked when user cancels editing (closes the editor) */
  onCancel: () => void;
  /** State variables associated with this resource */
  states: StateListManager;
```

Replace with:
```ts
  /** Callback invoked when user saves changes */
  onSave: (resource: Resource) => void;
  /** State variables associated with this resource */
  states: StateListManager;
```

2b. Remove `onCancel` from destructured params (around line 112). Find:
```ts
const ResourceEditor: React.FC<Props> = ({ resource, onSave, onCancel, states, onStatesChange, referenceData }) => {
```

Replace with:
```ts
const ResourceEditor: React.FC<Props> = ({ resource, onSave, states, onStatesChange, referenceData }) => {
```

2c. Remove the `@param` reference to onCancel if present. Find and replace `(onCancel kept as vestigial; see Phase 0 spec)` if it appears in the component-level JSDoc. If absent, skip.

- [ ] **Step 3: GeneratorEditor — remove `onCancel`**

Open `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/GeneratorEditor.tsx`.

3a. Remove `onCancel` field from `Props`. Find:
```ts
  /** Callback when user clicks Save or when auto-save triggers - receives the updated Generator */
  onSave: (generator: Generator) => void;
  /** Callback when user clicks Cancel */
  onCancel: () => void;
  /** Reference data for dropdowns (entities, etc.) - includes timePatterns and timeDistributedConfigs */
  referenceData: EditorReferenceData;
```

Replace with:
```ts
  /** Callback when user clicks Save or when auto-save triggers - receives the updated Generator */
  onSave: (generator: Generator) => void;
  /** Reference data for dropdowns (entities, etc.) - includes timePatterns and timeDistributedConfigs */
  referenceData: EditorReferenceData;
```

3b. Remove `onCancel` from the destructured params (around line 117-126). Find:
```ts
const GeneratorEditor: React.FC<Props> = ({
  generator,
  onSave,
  onCancel,
  referenceData,
  states,
  onStatesChange,
  onTimePatternsChange,
  onTimeDistributedConfigsChange,
}) => {
```

Replace with:
```ts
const GeneratorEditor: React.FC<Props> = ({
  generator,
  onSave,
  referenceData,
  states,
  onStatesChange,
  onTimePatternsChange,
  onTimeDistributedConfigsChange,
}) => {
```

3c. Remove the `@param` reference to onCancel if present. Find and replace `(onCancel kept as vestigial; see Phase 0 spec)` if it appears.

- [ ] **Step 4: ActivityEditor — remove `onCancel`**

Open `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ActivityEditor.tsx`.

4a. Remove `onCancel` from `ActivityEditorProps` (around line 234). Find:
```ts
  /** Callback when user clicks Save - receives the updated Activity */
  onSave: (activity: Activity) => void;
  /** Callback when user clicks Cancel */
  onCancel: () => void;
  /** Reference data for dropdowns (resources, requirements, etc.) */
  referenceData?: EditorReferenceData;
```

Replace with:
```ts
  /** Callback when user clicks Save - receives the updated Activity */
  onSave: (activity: Activity) => void;
  /** Reference data for dropdowns (resources, requirements, etc.) */
  referenceData?: EditorReferenceData;
```

4b. Remove `onCancel` from destructured params (around line 277-285). Find:
```ts
const ActivityEditor: React.FC<ActivityEditorProps> = ({
  activity,
  onSave,
  onCancel,
  referenceData,
  states,
  onStatesChange,
  outgoingConnectors = [],
}) => {
```

Replace with:
```ts
const ActivityEditor: React.FC<ActivityEditorProps> = ({
  activity,
  onSave,
  referenceData,
  states,
  onStatesChange,
  outgoingConnectors = [],
}) => {
```

4c. Remove the `@param props` line about vestigial onCancel from the component-level JSDoc if present.

- [ ] **Step 5: ModelEditor — remove `onCancel`**

Open `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ModelEditor.tsx`.

5a. Remove `onCancel` from `Props` (around line 47-49). Find:
```ts
  model: Model;
  onSave: (model: Model) => void;
  onCancel: () => void;
  onRemoveModel?: () => void;
```

Replace with:
```ts
  model: Model;
  onSave: (model: Model) => void;
  onRemoveModel?: () => void;
```

5b. Remove `onCancel` from destructured params (around line 587). Find:
```ts
const ModelEditor: React.FC<Props> = ({ model, onSave, onCancel, onRemoveModel, onValidate, states, onStatesChange, referenceData, resourceRequirements, validationState, activeTab: activeTabProp, onTabChange: onTabChangeProp, onSimulate }) => {
```

Replace with:
```ts
const ModelEditor: React.FC<Props> = ({ model, onSave, onRemoveModel, onValidate, states, onStatesChange, referenceData, resourceRequirements, validationState, activeTab: activeTabProp, onTabChange: onTabChangeProp, onSimulate }) => {
```

5c. Remove the `@param props - Component props (onCancel kept as vestigial; see Phase 0 spec)` line, replacing with `@param props - Component props`.

- [ ] **Step 6: ConnectorsEditor — verify no onCancel exists, then skip M4**

Open `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ConnectorsEditor.tsx`.

Run: `grep -n "onCancel" editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ConnectorsEditor.tsx`
Expected: zero matches. ConnectorsEditor never had `onCancel`. No change needed for this file in M4.

- [ ] **Step 7: ElementEditor — drop `onCancel` from JSX call sites + delete no-op `handleCancel`**

Open `editorextensions/quodsi_editor_extension/quodsim-react/src/features/modelPanel/ElementEditor.tsx`.

7a. Delete the no-op `handleCancel` definition (around lines 89-92):
```ts
  // Simple cancel handler - no accordion state to manage
  const handleCancel = () => {
    // Editors handle their own cancel behavior
  };
```

Delete those 4 lines entirely (including the comment).

7b. Remove `onCancel={handleCancel}` from each editor JSX call site. There are SEVEN JSX usages (in render functions for Model, Activity, Generator, Resource, Entity, Connector, plus the Connector embedded use). The pattern is:
```tsx
<XEditor
  ...
  onSave={onSave}
  onCancel={handleCancel}
  ...
/>
```

Replace with:
```tsx
<XEditor
  ...
  onSave={onSave}
  ...
/>
```

For each occurrence, run `grep -n "onCancel={handleCancel}" editorextensions/quodsi_editor_extension/quodsim-react/src/features/modelPanel/ElementEditor.tsx` to find the exact lines, then delete each `onCancel={handleCancel}` line entirely (preserve the surrounding props).

Expected matches before edit: 7 lines (around 138, 158, 172, 187, 199, plus 2 more in SwimLane and the conditional Connector renderer — verify count first).

Note: SwimLaneEditor's JSX call site does NOT have `onCancel` (verified during exploration). If grep finds fewer than 7 matches, that's fine — there were never 7 if SwimLane doesn't use it.

After this edit, `handleCancel` is no longer referenced. Confirm by running:
`grep -n "handleCancel" editorextensions/quodsi_editor_extension/quodsim-react/src/features/modelPanel/ElementEditor.tsx`
Expected: zero matches.

### M2 + M3 + M5: ActivityEditor dead code removal

- [ ] **Step 8: ActivityEditor M3 — remove unused `Hash` import**

Find (around line 7):
```ts
import {
  Settings,
  Plus,
  Layers,
  DollarSign,
  Hash,
  ArrowRightLeft,
  Info,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
```

Replace with:
```ts
import {
  Settings,
  Plus,
  Layers,
  DollarSign,
  ArrowRightLeft,
  Info,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
```

Verify with `grep -n "Hash" editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ActivityEditor.tsx` — should return zero matches after edit (note: a comment-out reference to `Hash` may remain inside the commented-out States tab around line 200; that's tolerable since the comment is non-executable, but the import line must go).

- [ ] **Step 9: ActivityEditor M2 — remove unused `optimisticData`**

Find (around lines 537-539):
```ts
  const isSaving = localActivityDraft.id
    ? elementOpsState.isSaving(localActivityDraft.id)
    : false;
  const optimisticData = localActivityDraft.id
    ? elementOpsState.getOptimisticData(localActivityDraft.id)
    : null;
```

Replace with:
```ts
  const isSaving = localActivityDraft.id
    ? elementOpsState.isSaving(localActivityDraft.id)
    : false;
```

- [ ] **Step 10: ActivityEditor M5 — inline `displayToBuffer` and delete the helper**

10a. Find the 2 call sites in `handleInputChange` (around lines 660, 662):
```ts
    } else if (name === "inboundQueueCapacity") {
      updates.inboundQueueCapacity = displayToBuffer(parseInt(value) || 0);
    } else if (name === "outboundQueueCapacity") {
      updates.outboundQueueCapacity = displayToBuffer(parseInt(value) || 0);
    }
```

Replace with:
```ts
    } else if (name === "inboundQueueCapacity") {
      updates.inboundQueueCapacity = parseInt(value) || 0;
    } else if (name === "outboundQueueCapacity") {
      updates.outboundQueueCapacity = parseInt(value) || 0;
    }
```

10b. Delete the `displayToBuffer` function definition + JSDoc (around lines 351-362):
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

Delete those 11 lines entirely.

10c. Update the JSDoc reference in `handleInputChange`. Find (around line 612-621):
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

The current JSDoc no longer mentions `displayToBuffer` — that was already updated in Phase 1E. No change needed if the JSDoc is current. Verify by reading lines 612-621; if it mentions `displayToBuffer`, replace it with the version above.

### Polish: isValid comments + SaveStatusLine audit

- [ ] **Step 11: ConnectorsEditor — add comment to `isValid: true`**

Open `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ConnectorsEditor.tsx`.

Find (around line 142):
```ts
  isValid: true,
```

Replace with:
```ts
  isValid: true, // No validation surface in this editor (connectType is enum-bounded).
```

- [ ] **Step 12: ModelEditor — add comment to `isValid: true`**

Open `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ModelEditor.tsx`.

Find (around line 661):
```ts
    isValid: true,
```

Replace with:
```ts
    isValid: true, // No validation: only one Model per document, no name-uniqueness check needed.
```

- [ ] **Step 13: ModelEditor — move `<SaveStatusLine />` inside `space-y-2` container (MIN-1)**

Open `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ModelEditor.tsx`.

Find the basic-tab block (around lines 994-996):
```tsx
    <div className="space-y-2">
      ...
    </div>

    {/* Auto-save status */}
    <SaveStatusLine status={status} lastSavedAt={lastSavedAt} />
  </div>  // closes <div className="w-full">
)}
```

The `<SaveStatusLine />` is currently OUTSIDE the `space-y-2` div. The fix is to move it INSIDE so it inherits the `space-y-2` vertical rhythm with the rest of the tab content. Find the EXACT lines around the closing of `space-y-2` and the SaveStatusLine. Look for:
```tsx
    {/* Advanced Settings - Accordion */}
    <AccordionSection
      ...
    </AccordionSection>
  </div>

  {/* Auto-save status */}
  <SaveStatusLine status={status} lastSavedAt={lastSavedAt} />
</div>
```

(where the `</div>` after `</AccordionSection>` closes `<div className="space-y-2">`, and the final `</div>` closes `<div className="w-full">`).

Replace with:
```tsx
    {/* Advanced Settings - Accordion */}
    <AccordionSection
      ...
    </AccordionSection>

    {/* Auto-save status */}
    <SaveStatusLine status={status} lastSavedAt={lastSavedAt} />
  </div>
</div>
```

(SaveStatusLine moves inside `space-y-2`; the now-only `</div>` after it closes `<div className="space-y-2">`; the outer `</div>` closes `<div className="w-full">`. Net brace count: unchanged. Indentation: SaveStatusLine indents one more level.)

After this edit, `tsc` must still pass. Verify with `npx tsc --noEmit`.

- [ ] **Step 14: Audit other editors for SaveStatusLine placement parity**

Run: `grep -B2 "<SaveStatusLine" editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/*.tsx`

For each editor, check whether the line immediately above `<SaveStatusLine` shows we're INSIDE a `space-y-*` container (look for the pattern: `<div className="space-y-..."`...`<SaveStatusLine ...>`...`</div>`).

Expected pattern for EntityEditor, ResourceEditor, GeneratorEditor, ActivityEditor, ConnectorsEditor: `<SaveStatusLine />` is the LAST child of a `space-y-2` container — meaning the closing `</div>` of `space-y-2` comes AFTER `<SaveStatusLine />`. This is the correct placement.

If you find an editor where `<SaveStatusLine />` is OUTSIDE the `space-y-*` container (like ModelEditor was before Step 13), apply the same fix pattern: move it inside, making sure brace balance is preserved.

If all 5 editors are already correct, document that finding in the commit message and move on.

### Verify everything before committing

- [ ] **Step 15: TypeScript check**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: zero output.

- [ ] **Step 16: Test suite**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false`
Expected: 48 tests passing across 4 suites.

- [ ] **Step 17: Production build**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm run build`
Expected: `Compiled successfully.`

- [ ] **Step 18: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/EntityEditor.tsx editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ResourceEditor.tsx editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/GeneratorEditor.tsx editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ActivityEditor.tsx editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ModelEditor.tsx editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ConnectorsEditor.tsx editorextensions/quodsi_editor_extension/quodsim-react/src/features/modelPanel/ElementEditor.tsx
git commit -m "chore(react): editor sweep cleanup (Phase 1H, batch 1)

Bundles dead-code removal + polish across 6 editors and ElementEditor:

- M4: Remove onCancel prop now-unused everywhere. Affects EntityEditor,
  ResourceEditor, GeneratorEditor, ActivityEditor, ModelEditor (Props
  interface + destructured params); ElementEditor (no-op handleCancel
  function + 7 JSX onCancel={handleCancel} call sites).
  ConnectorsEditor never had onCancel — no change there.
- M2 (Phase 1E): Remove unused optimisticData computation from
  ActivityEditor (was already pre-existing dead code).
- M3 (Phase 1E): Remove unused Hash import from ActivityEditor (only
  referenced in commented-out States tab).
- M5 (Phase 1E): Inline displayToBuffer (identity function) at its 2
  call sites in handleInputChange, delete the helper + its JSDoc.
- M2 (Phase 1F): Add explanatory one-line comment to isValid: true
  in ConnectorsEditor.
- MIN-2 (Phase 1G): Add explanatory one-line comment to isValid: true
  in ModelEditor.
- MIN-1 (Phase 1G): Move SaveStatusLine inside the space-y-2 container
  in ModelEditor for consistent vertical rhythm. Audited other 5
  editors and confirmed they were already correctly placed.

No behavior change. 48 tests pass."
```

---

## Task 4: Upstream `onSave` memoization (MIN-6)

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/modelPanel/ModelPanel.tsx`

- [ ] **Step 1: Add `useCallback` to React import**

Open `editorextensions/quodsi_editor_extension/quodsim-react/src/features/modelPanel/ModelPanel.tsx`.

Find (line 1):
```ts
import React, { useState, useEffect, useMemo } from 'react';
```

Replace with:
```ts
import React, { useState, useEffect, useMemo, useCallback } from 'react';
```

- [ ] **Step 2: Memoize the onSave callback**

Find the inline arrow at line 310:
```tsx
            onSave={data => onElementUpdate(currentElement.id, data)}
```

This needs to become a stable reference. Add a `useCallback` declaration in the component body BEFORE the JSX block, and reference the memoized name in the JSX.

Find a sensible insertion point — somewhere in the component body before the `return`/JSX, after other state/hook declarations. A good landmark is just before the `<div className="flex-1 bg-gray-50 overflow-auto">` line (around line 297).

Add:
```ts
  // Memoize onElementUpdate-bound callback so child editors' useAutoSave
  // hooks see a stable reference. Without this, the parent's inline arrow
  // produces a new function each render, cascading to all 6 editors and
  // re-attaching their internal effects (the value-equality guards
  // suppress spurious save fires, but the effects still re-run).
  const handleElementSave = useCallback(
    (data: any) => {
      if (currentElement) {
        onElementUpdate(currentElement.id, data);
      }
    },
    [onElementUpdate, currentElement?.id]
  );
```

The `if (currentElement)` guard handles the rare case where `currentElement` becomes null between callback creation and invocation. The original inline arrow had no such guard but was protected by the surrounding JSX condition `{currentElement && ...}`.

Then update the JSX call site at line ~310 (which becomes line ~322 after the insertion). Find:
```tsx
            onSave={data => onElementUpdate(currentElement.id, data)}
```

Replace with:
```tsx
            onSave={handleElementSave}
```

- [ ] **Step 3: TypeScript check**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: zero output. If TS complains about `currentElement?.id` in the dep array, that's because `currentElement` is `Element | null | undefined` — the optional chain produces `string | undefined`, which is a valid dep. No change needed.

- [ ] **Step 4: Test suite**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false`
Expected: 48 tests passing.

- [ ] **Step 5: Production build**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm run build`
Expected: `Compiled successfully.`

- [ ] **Step 6: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/modelPanel/ModelPanel.tsx
git commit -m "perf(react): memoize ModelPanel onSave callback (Phase 1H, MIN-6)

Phase 1G code review (MIN-6) flagged that ModelPanel.tsx passed an
inline arrow function as onSave to ElementEditor. Each parent render
produced a new function reference, which cascaded through all 6
editors' useAutoSave hooks: the hook re-memoizes saveNow internally
when onSave reference changes, which re-attaches all 4-13
useFlushOnChange effects per editor.

The value-equality guards inside useFlushOnChange suppress spurious
save fires (effects run, but the prevRef === current check
short-circuits before calling saveNow). So this was correctness-safe
but produced unnecessary effect work each render.

Fix: wrap onElementUpdate-bound callback in useCallback with
[onElementUpdate, currentElement?.id] deps. Now stable across
renders — child editors' useAutoSave hooks see one onSave reference
for the lifetime of the selected element.

No behavior change. 48 tests pass."
```

---

## Task 5: Final verification + manual smoke

**Files:** none (verification only)

- [ ] **Step 1: Confirm 6 editors still consume auto-save**

Run: `grep -rn "useAutoSave\|SaveStatusLine" editorextensions/quodsi_editor_extension/quodsim-react/src --include="*.tsx" --include="*.ts" | grep -v __tests__ | grep -v useEditorState.ts | grep -v SaveStatusLine.tsx`

Expected: matches in `EntityEditor.tsx`, `ResourceEditor.tsx`, `GeneratorEditor.tsx`, `ActivityEditor.tsx`, `ConnectorsEditor.tsx`, AND `ModelEditor.tsx`. No regressions.

- [ ] **Step 2: Confirm `onCancel` is fully gone from editors**

Run: `grep -rn "onCancel" editorextensions/quodsi_editor_extension/quodsim-react/src --include="*.tsx" --include="*.ts" | grep -v __tests__`

Expected: zero matches in any editor or ElementEditor.tsx. (If there's an unrelated `onCancel` somewhere — like a modal — that's fine; just check the 6 editors and ElementEditor are clean.)

- [ ] **Step 3: Confirm `displayToBuffer` is fully gone**

Run: `grep -rn "displayToBuffer" editorextensions/quodsi_editor_extension/quodsim-react/src --include="*.tsx" --include="*.ts"`
Expected: zero matches.

- [ ] **Step 4: Final TypeScript check**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: zero output.

- [ ] **Step 5: Final test run**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false`
Expected: 48 tests passing across 4 suites.

- [ ] **Step 6: Final production build**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm run build`
Expected: `Compiled successfully.`

- [ ] **Step 7: Confirm commit history is clean**

Run: `git log --oneline main..HEAD`
Expected: 4 commits — the plan doc + 3 implementation commits (hook fix, editor cleanup, memoization). No fixup or amended-for-no-reason noise.

- [ ] **Step 8: Hand off to Daniel for manual smoke**

Manual smoke checklist (Daniel runs in LucidChart locally):

**M6 regression (the bug we just fixed):**
1. Open any editor with name validation (e.g., EntityEditor or ActivityEditor)
2. Type a valid name → wait for save to complete (status: "Saved")
3. Trigger a save by editing → during the save, quickly type a duplicate name (or empty name) to make it invalid
4. Wait for save to complete → status should stay "Fix errors to save", NOT briefly flicker to "Saved" then back to "Fix errors to save"

**General regression check (everything still works):**
5. EntityEditor: edit name, blur, save fires
6. ResourceEditor: toggle financial-enabled, change cost, save fires
7. GeneratorEditor: change entity type, change generator type, save fires
8. ActivityEditor: edit name, capacity, queue capacities, action validation banners read "Fix to save:" not "Cannot save:"
9. ConnectorsEditor: change routing type, save fires
10. ModelEditor: edit name, change time mode, save fires; status line is now visually consistent with other editors

**Cross-cutting:**
11. Switch elements → flushes pending edits
12. Native Ctrl+Z reverses changes
13. Browser console clean

If smoke fails on any item: fix on this branch before merge.
If smoke passes: merge `feature/auto-save-phase-1h` to `main` and push. **The auto-save sweep is fully closed out — Phase 0 through 1H complete.**
