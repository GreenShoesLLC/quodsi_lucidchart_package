# Lucid Auto-Save — Phase 1A (Hook Hardening) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the four carryover items flagged by the Phase 0 final code review *before* any editor adopts the `useAutoSave` hook. Lands on its own branch with zero observable behavior change (still no editor imports the hook), so it can ship as an independently mergeable, testable foundation upgrade ahead of Phase 1B (EntityEditor migration).

**Architecture:** All work is in `useEditorState.ts` (the hook) and `useAutoSave.test.tsx` (its tests). Adds one new internal ref (`pendingFlushDraftRef`) and adjusts two existing effects (element-switch flush, saving-transition) to capture-and-drain pending edits when the element changes mid-save. No new files, no new exports beyond what already exists.

**Tech Stack:** React 18.3, TypeScript 4.9, `@testing-library/react` 13.4, Jest (via `react-scripts test`).

**Repo:** This plan lives in the LucidChart extension repo (`quodsi_lucidchart_package/`). All file paths and commands below are relative to that repo's root. Confirm you are on branch `feature/auto-save-phase-1a` with `git status` before starting.

**Spec:** Phase 0 spec at `docs/superpowers/specs/2026-05-03-lucid-extension-auto-save-design.md` (in the sibling monorepo at `../quodsi/`). Phase 1A is not in the original spec — it captures the four follow-ups documented in the Phase 0 final review. Read the **"Edge cases"** section of the spec for context on what `useAutoSave` is supposed to do at element-switch time.

---

## What Phase 1A fixes

Four items flagged by the Phase 0 final cumulative review:

1. **C1 (Critical) — Element-switch + in-flight save = silent data loss.** When `isSaving=true` at element-switch time AND the user has made edits during the in-flight save (`trailingSaveNeededRef=true`), the existing element-switch flush effect skips the save (gated by `!isSavingRef.current`) and unconditionally clears the trailing flag. The edits made during the in-flight save are silently dropped. Fix: capture the pending draft into a new `pendingFlushDraftRef`, then drain it in the saving-transition effect (silent fire-and-forget for the *previous* element; failures log via `console.error` but do not surface in the new element's UI status).

2. **I1 (Important) — Hook contract precondition is implicit.** The state machine assumes `onSave` causes Redux to flip `isSaving` false→true→false. If a consumer doesn't honor that (e.g., synchronous `onSave` with no Redux dispatch), `status` stays at `"saving"` forever. Fix: document the precondition in the `useAutoSave` JSDoc.

3. **I2 (Important) — Missing test coverage for a real branch.** The saving-transition effect's "trailing flag set but draft no longer pending/valid at transition" branch is reachable (e.g., parent optimistically clears `hasPendingChanges` after dispatching `onSave`) but has no regression test. Fix: add the missing test. (No implementation change — the branch already exists and works.)

4. **I3 (carryover) — `react-scripts` version-pin change in commit `cd47769`.** A package.json change from `"5.0.1"` to `"^5.0.1"` (and a 377-line `package-lock.json` rewrite) was bundled into a `test(react):` commit without explanation. The user accepted this at the time. Resolution: addressed via documentation only — the Phase 0 merge commit body and the Phase 1A merge commit body will reference it. **No code change in this plan.**

---

## File Structure

**Modify:**
- `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/useEditorState.ts`
  - Add `pendingFlushDraftRef` declaration
  - Update element-switch flush effect to capture pending draft when `isSaving=true`
  - Update saving-transition effect to drain `pendingFlushDraftRef` (silent, console.error on throw, no status update)
  - Update `useAutoSave` JSDoc to document the `onSave` / `isSaving` precondition
- `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/__tests__/useAutoSave.test.tsx`
  - Add `describe("phase 1a hardening", ...)` block with three new tests:
    - C1 regression: element-switch + in-flight save + trailing edit drains correctly
    - C1 failure path: captured-flush throw is logged via console.error, doesn't crash the new element
    - I2 fallthrough: trailing flag set but draft no longer pending+valid at transition → status="saved"

**Do NOT touch:**
- `SaveStatusLine.tsx` or its tests
- Any editor file (.tsx in `src/features/editors/` outside `__tests__`/`hooks/`/`SaveStatusLine.tsx`)
- `useFormSync` or `useSaveCompletionDetector` (their existing exports are stable)

---

## Task 1: Setup verification

**Files:** none (verification only)

- [ ] **Step 1: Confirm branch and clean state**

Run: `git status && git log --oneline -3`
Expected: branch `feature/auto-save-phase-1a`, clean working tree, recent commits include the Phase 0 merge commit (`Merge branch 'feature/auto-save-phase-0' into main`).

- [ ] **Step 2: Confirm tests pass on baseline (no changes yet)**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false`
Expected: 40 tests passing across 3 suites (23 useAutoSave + 4 SaveStatusLine + 13 scenarioDataMerge). Zero failures.

- [ ] **Step 3: Confirm TypeScript clean**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: clean exit (no output).

No commit for Task 1 — verification only.

---

## Task 2: I2 — Add the trailing-save fallthrough test

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/__tests__/useAutoSave.test.tsx`

This is a documentation test for an *existing* branch in the saving-transition effect. The branch was added in Task 5 (Phase 0) but never had its own regression test. The test should pass against the current code without any implementation change.

- [ ] **Step 1: Add the test**

Append a new `describe` block to the existing test file (after `describe("error handling", ...)`):

```tsx
  describe("phase 1a hardening", () => {
    // I2 — trailing-save fallthrough
    it("transitions to 'saved' when trailing flag is set but draft is no longer pending+valid", () => {
      const onSave = jest.fn();
      const { result, rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave, draft: { id: "e1", name: "v1" }, hasPendingChanges: true, isSaving: true }) }
      );

      // Edit during in-flight save → debounce effect sets trailingSaveNeededRef=true
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v2" }, hasPendingChanges: true, isSaving: true }));

      // Parent optimistically clears hasPendingChanges before the in-flight save completes
      // (this is a realistic Redux pattern — useSaveCompletionDetector clears the dirty flag).
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v2" }, hasPendingChanges: false, isSaving: true }));

      // Save completes — saving-transition effect fires with trailingSaveNeededRef=true
      // BUT hasPendingRef.current === false. The else-branch runs setStatus("saved") +
      // setLastSavedAt(Date.now()), and no second save fires.
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v2" }, hasPendingChanges: false, isSaving: false }));

      expect(onSave).not.toHaveBeenCalled(); // no save was dispatched in this scenario
      expect(result.current.status).toBe("saved");
      expect(result.current.lastSavedAt).not.toBeNull();
    });
  });
```

- [ ] **Step 2: Run tests to verify it passes (no impl change needed)**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false useAutoSave.test.tsx`
Expected: 24 passing (23 prior + 1 new).

- [ ] **Step 3: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/__tests__/useAutoSave.test.tsx
git commit -m "test(react): cover trailing-save fallthrough branch (I2 from Phase 0 review)"
```

---

## Task 3: I1 — Document the `onSave` / `isSaving` contract precondition

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/useEditorState.ts`

The hook's state machine requires `onSave` to trigger a Redux-mediated `isSaving` true→false transition. Without this, `status` stays at `"saving"` forever. Document the requirement in the JSDoc so Phase 1B+ consumers don't accidentally violate it.

- [ ] **Step 1: Read the current JSDoc**

Run: `grep -n -B 1 -A 8 "Auto-save hook for inline panel editors" editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/useEditorState.ts`
Expected: shows the existing 8-line JSDoc above the `useAutoSave` function.

- [ ] **Step 2: Replace the JSDoc**

Find the existing JSDoc (above `export function useAutoSave<T>`):

```ts
/**
 * Auto-save hook for inline panel editors.
 *
 * Debounces onSave(draft) after debounceMs when hasPendingChanges + isValid
 * + !isSaving. Also provides saveNow() for imperative flush, coalesces edits
 * during in-flight saves into a single trailing save, flushes pending edits on
 * element switch, and flushes on unmount. Error handling (status='error') is
 * added in Task 9.
 */
```

Replace with:

```ts
/**
 * Auto-save hook for inline panel editors.
 *
 * Debounces onSave(draft) after debounceMs when hasPendingChanges + isValid
 * + !isSaving. Also provides saveNow() for imperative flush, coalesces edits
 * during in-flight saves into a single trailing save, captures pending edits
 * on element switch (drained when the in-flight save completes), flushes on
 * unmount, and reports status="error" when onSave throws.
 *
 * Contract — REQUIRED of consumers:
 *   onSave MUST trigger a Redux-mediated isSaving transition (false → true →
 *   false). The hook uses the saving→not-saving transition to clear the
 *   "saving" status, fire trailing saves, and drain captured pending flushes.
 *   If onSave is synchronous and never causes isSaving to flip, status will
 *   stay at "saving" forever and trailing/captured saves will never fire.
 *
 *   In practice, every editor consumer routes onSave through Redux's
 *   elementOpsState, which dispatches ELEMENT_SAVE_START (sets isSaving=true)
 *   and ELEMENT_SAVE_SUCCESS/ERROR (sets isSaving=false). Honor that pattern.
 */
```

- [ ] **Step 3: Verify TypeScript still clean**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/useEditorState.ts
git commit -m "docs(react): document onSave/isSaving contract precondition (I1 from Phase 0 review)"
```

---

## Task 4: C1 — Add the failing regression test

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/__tests__/useAutoSave.test.tsx`

Write the regression test for the silent-data-loss bug. The test should FAIL against the current code (the captured flush mechanism doesn't exist yet) and PASS after Task 5 implements it.

- [ ] **Step 1: Add the failing test**

Append to the `describe("phase 1a hardening", ...)` block (added in Task 2):

```tsx
    // C1 — element-switch + in-flight save + trailing edit must not lose data
    it("captures and drains pending flush when element switches mid-save", () => {
      const onSave = jest.fn();
      const { rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      // Step 1: User edits element e1 → debounce expires → save fires
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v1" }, hasPendingChanges: true, elementId: "e1" }));
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenLastCalledWith({ id: "e1", name: "v1" });

      // Step 2: Save in flight (parent set isSaving=true). User edits e1 again.
      // Debounce effect sets trailingSaveNeededRef=true, no second dispatch.
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v2" }, hasPendingChanges: true, isSaving: true, elementId: "e1" }));
      expect(onSave).toHaveBeenCalledTimes(1);

      // Step 3: User clicks element e2 BEFORE the in-flight save completes.
      // The element-switch effect captures pendingFlushDraftRef = { id: "e1", name: "v2" }.
      // No save fires yet. (In real usage useFormSync's setLocalDraft is queued for
      // the NEXT render; on this render draftRef.current is still the OLD draft.)
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v2" }, hasPendingChanges: true, isSaving: true, elementId: "e2" }));
      expect(onSave).toHaveBeenCalledTimes(1);

      // Step 4: useFormSync now updates localDraft to e2's data on the next render.
      rerender(baseArgs({ onSave, draft: { id: "e2", name: "fresh" }, hasPendingChanges: false, isSaving: true, elementId: "e2" }));
      expect(onSave).toHaveBeenCalledTimes(1);

      // Step 5: In-flight save completes (parent sets isSaving=false).
      // The saving-transition effect drains pendingFlushDraftRef → onSave fires
      // with the OLD element's pending edit ({ id: "e1", name: "v2" }).
      rerender(baseArgs({ onSave, draft: { id: "e2", name: "fresh" }, hasPendingChanges: false, isSaving: false, elementId: "e2" }));

      expect(onSave).toHaveBeenCalledTimes(2);
      expect(onSave).toHaveBeenLastCalledWith({ id: "e1", name: "v2" });
    });
```

- [ ] **Step 2: Run tests to verify it FAILS**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false useAutoSave.test.tsx`
Expected: 24 passing (23 prior + the I2 test from Task 2), 1 failing — the new C1 test reports `Expected: 2, Received: 1`. The captured-flush mechanism doesn't exist yet.

- [ ] **Step 3: Commit (test only — implementation comes in Task 5)**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/__tests__/useAutoSave.test.tsx
git commit -m "test(react): failing regression test for element-switch + in-flight data loss (C1)"
```

(Yes, the test is failing at this point. That's the TDD red. Task 5 makes it green.)

---

## Task 5: C1 — Implement `pendingFlushDraftRef` capture and drain

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/useEditorState.ts`

- [ ] **Step 1: Add `pendingFlushDraftRef` declaration**

In `useEditorState.ts`, find the existing internal-state ref cluster (`wasSavingRef`, `trailingSaveNeededRef`, `prevElementIdRef`) and add `pendingFlushDraftRef` to the cluster. The exact line number varies, but the cluster should look like this after the addition:

```ts
  const wasSavingRef = useRef(isSaving);
  const trailingSaveNeededRef = useRef(false);
  const prevElementIdRef = useRef(elementId);
  const pendingFlushDraftRef = useRef<T | null>(null);
```

- [ ] **Step 2: Update the element-switch flush effect to capture when in-flight**

Find the existing element-switch flush effect (the one with the "KNOWN GAP (Phase 1 TODO)" comment). Replace its body. Before:

```ts
useEffect(() => {
  if (prevElementIdRef.current !== elementId) {
    clearTimer();
    if (hasPendingRef.current && isValidRef.current && !isSavingRef.current) {
      dispatchSave();
    }
    trailingSaveNeededRef.current = false;
    prevElementIdRef.current = elementId;
  }
}, [elementId, clearTimer, dispatchSave]);
```

After (replace the entire effect, including the KNOWN GAP comment block above it which is now obsolete):

```ts
// Element switch flush — see spec section "Edge cases" for ordering rationale.
// useFormSync's setLocalDraft is queued for the next render, so draftRef.current
// still holds the previous element's draft when this effect runs.
//
// When isSaving=true at switch time and there are pending edits, we cannot
// dispatch a second save (Redux's per-element save queueing is not verified
// for concurrent dispatch). Instead, we capture the pending draft into
// pendingFlushDraftRef; the saving-transition effect will drain it after the
// in-flight save completes. The drain is silent (no status update) because
// the user has moved on to the new element.
useEffect(() => {
  if (prevElementIdRef.current !== elementId) {
    clearTimer();
    if (hasPendingRef.current && isValidRef.current) {
      if (isSavingRef.current) {
        // Save in flight — capture pending draft for post-completion flush.
        pendingFlushDraftRef.current = draftRef.current;
      } else {
        dispatchSave();
      }
    }
    trailingSaveNeededRef.current = false;
    // Reset status to reflect the new (clean) element. If a captured flush
    // is pending in the background, its progress will not surface here.
    setStatus("saved");
    prevElementIdRef.current = elementId;
  }
}, [elementId, clearTimer, dispatchSave]);
```

- [ ] **Step 3: Update the saving-transition effect to drain `pendingFlushDraftRef` first**

Find the saving-transition effect (deps `[isSaving, dispatchSave]`). Replace its body. Before:

```ts
useEffect(() => {
  if (wasSavingRef.current && !isSaving) {
    if (trailingSaveNeededRef.current) {
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

After:

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

- [ ] **Step 4: Run tests — C1 should now pass**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false useAutoSave.test.tsx`
Expected: 25 passing (23 original + I2 test + C1 test). Zero failures.

- [ ] **Step 5: Verify TypeScript clean**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/useEditorState.ts
git commit -m "feat(react): capture+drain pending flush on element switch (C1 fix)"
```

---

## Task 6: C1 — Add the captured-flush failure test

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/__tests__/useAutoSave.test.tsx`

Verify the silent failure path: when the captured flush throws, the hook logs to console.error and continues without crashing the new element's panel.

- [ ] **Step 1: Add the test**

Append to the `describe("phase 1a hardening", ...)` block:

```tsx
    // C1 — captured flush failure path
    it("logs to console.error and recovers when the captured flush throws", () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      // First call (the regular save) succeeds; second call (the captured flush) throws.
      const onSave = jest
        .fn()
        .mockImplementationOnce(() => { /* success */ })
        .mockImplementationOnce(() => {
          throw new Error("captured flush boom");
        });

      const { result, rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      // Trigger a normal save → success.
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v1" }, hasPendingChanges: true, elementId: "e1" }));
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(onSave).toHaveBeenCalledTimes(1);

      // In-flight + edit + element switch → captured flush queued.
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v2" }, hasPendingChanges: true, isSaving: true, elementId: "e1" }));
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v2" }, hasPendingChanges: true, isSaving: true, elementId: "e2" }));
      rerender(baseArgs({ onSave, draft: { id: "e2", name: "fresh" }, hasPendingChanges: false, isSaving: true, elementId: "e2" }));

      // Save completes → captured flush drains, onSave throws, console.error logs.
      rerender(baseArgs({ onSave, draft: { id: "e2", name: "fresh" }, hasPendingChanges: false, isSaving: false, elementId: "e2" }));

      expect(onSave).toHaveBeenCalledTimes(2); // both attempts ran
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[useAutoSave] pending flush failed:",
        expect.any(Error)
      );
      // Status reflects the new element, not the failed captured flush.
      expect(result.current.status).toBe("saved");

      void consoleErrorSpy; // afterEach restores via jest.restoreAllMocks()
    });
```

- [ ] **Step 2: Run tests to verify it passes**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false useAutoSave.test.tsx`
Expected: 26 passing (25 prior + 1 new). Zero failures.

- [ ] **Step 3: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/__tests__/useAutoSave.test.tsx
git commit -m "test(react): captured flush failure logs to console.error without crashing (C1)"
```

---

## Task 7: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full React test suite**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false`
Expected: 43 passing (26 useAutoSave + 4 SaveStatusLine + 13 scenarioDataMerge). Zero failures.

- [ ] **Step 2: Type-check**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: clean exit.

- [ ] **Step 3: Build**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm run build`
Expected: successful build, no new errors.

- [ ] **Step 4: Confirm no editor imports the new code**

Run: `grep -rn "useAutoSave\|SaveStatusLine" editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors --include="*.tsx" --include="*.ts" | grep -v "__tests__\|SaveStatusLine.tsx\|useEditorState.ts"`
Expected: empty output. Phase 1A still has the zero-observable-behavior-change property.

- [ ] **Step 5: Verify clean commit history on the branch**

Run: `git log --oneline main..HEAD`
Expected: 5 commits — the I2 test, the I1 JSDoc, the C1 failing test, the C1 implementation, and the C1 failure-path test. No "WIP" or "fix" commits.

- [ ] **Step 6: No additional commit unless cleanup is needed**

Run: `git status`
Expected: clean working tree. If anything is dirty, investigate and either commit cleanly or stash before declaring Phase 1A done.

---

## Acceptance Criteria

- [ ] `pendingFlushDraftRef` declared and used in the element-switch flush effect (capture) and saving-transition effect (drain)
- [ ] `useAutoSave` JSDoc documents the `onSave` / `isSaving` contract
- [ ] 3 new tests added to `useAutoSave.test.tsx` (I2 fallthrough + C1 regression + C1 failure path)
- [ ] All 26 hook tests pass; 4 component tests pass; 13 scenarioDataMerge tests pass — 43 total
- [ ] React app type-checks and builds clean
- [ ] No editor (.tsx) file imports the new hook or component — Phase 1A still has zero observable behavior change
- [ ] All commits scoped to `quodsi_lucidchart_package/` repo

## What Phase 1B will need

Phase 1B (EntityEditor migration) consumes this hardened foundation:
- Imports `useAutoSave` and `SaveStatusLine`
- Removes `handleSave`, `handleCancel`, and the Save/Cancel button JSX block
- Adds `onBlur={saveNow}` to the name input
- Confirms an alternative panel-close path exists (X button, click-outside, or selection-change) since `handleCancel`'s `onCancel()` close call goes away
- The C1 fix means EntityEditor can rely on element-switch never silently dropping edits
- The I1 JSDoc documents the Redux contract that EntityEditor's existing `useElementOpsState` already honors

Phase 1A introduces zero risk to existing behavior because no editor imports the hook yet.
