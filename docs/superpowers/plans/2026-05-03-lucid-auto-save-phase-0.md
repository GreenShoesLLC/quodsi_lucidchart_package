# Lucid Auto-Save — Phase 0 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the foundation for the LucidChart auto-save refactor — the new `useAutoSave<T>` hook plus a `<SaveStatusLine />` component, with a thorough unit-test suite — without any editor importing the new code yet (zero observable behavior change).

**Architecture:** New code lives next to existing hooks at `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/useEditorState.ts` (additions) and a new sibling `SaveStatusLine.tsx` next to the editor components. Internal state in `useAutoSave` is held in refs synced each render (so timer callbacks see fresh values without stale-closure bugs). The hook coordinates with the existing `useSaveCompletionDetector` via a shared `isSaving` signal.

**Tech Stack:** React 18.3, TypeScript 4.9, `@testing-library/react` 13.4 (provides `renderHook`), Jest (via `react-scripts test`), Tailwind CSS for the status line.

**Repo:** This plan lives in the LucidChart extension repo (`quodsi_lucidchart_package/`). All file paths and commands below are relative to that repo's root. Confirm you are on branch `feature/auto-save-phase-0` with `git status` before starting.

**Spec:** `docs/superpowers/specs/2026-05-03-lucid-extension-auto-save-design.md` — **lives in the sibling monorepo at `../quodsi/`**, not in this repo. Read it before starting; the hook contract and edge cases are defined there.

---

## File Structure

**Modify:**
- `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/useEditorState.ts`
  - Add `SaveStatus` type
  - Add `UseAutoSaveArgs<T>` and `UseAutoSaveResult` interfaces
  - Add `useAutoSave<T>` function
  - Existing `useFormSync` and `useSaveCompletionDetector` are untouched

**Create:**
- `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/__tests__/useAutoSave.test.tsx`
  - All hook unit tests
- `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/SaveStatusLine.tsx`
  - The status-line presentation component
- `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/__tests__/SaveStatusLine.test.tsx`
  - Component tests for each status state

**Do NOT touch:** any editor file (EntityEditor.tsx, etc.). Phase 0 lands the foundation only.

---

## Task 1: Scaffold types and stub the hook

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/useEditorState.ts`

- [ ] **Step 1: Read the existing hook file**

Run: `cat editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/useEditorState.ts | head -20`
Expected: First line is `import { useEffect, useRef } from "react";` followed by the existing `useFormSync` and `useSaveCompletionDetector` exports.

- [ ] **Step 2: Add the type definitions and stub hook**

Open the file. Update the React import line to include `useCallback` and `useState`, then add the new exports at the end of the file (after `useSaveCompletionDetector`):

```ts
// Replace the existing import line at the top of the file:
import { useCallback, useEffect, useRef, useState } from "react";

// Append at the end of the file (after the existing useSaveCompletionDetector export):

/**
 * Status reported by useAutoSave for rendering in the SaveStatusLine.
 * - "saved": idle; no pending edits, last save (if any) succeeded.
 * - "saving": save is in flight, or about to fire from a debounce timer.
 * - "invalid": pending edits exist but draft fails validation; no save will fire.
 * - "error": last save threw. The next edit retriggers debounce → automatic retry.
 */
export type SaveStatus = "saved" | "saving" | "invalid" | "error";

export interface UseAutoSaveArgs<T> {
  /** Current local draft. */
  draft: T;
  /** Whether the user has unsaved changes (existing dirty flag — kept). */
  hasPendingChanges: boolean;
  /** Whether the draft passes validation. When false, no save fires. */
  isValid: boolean;
  /** Existing save callback — receives the draft when auto-save fires. */
  onSave: (draft: T) => void;
  /** True while a save is in flight (from Redux elementOpsState). */
  isSaving: boolean;
  /** ID of the currently selected element. Switching this flushes pending edits. */
  elementId: string;
  /** Debounce delay in ms. Defaults to 500. */
  debounceMs?: number;
}

export interface UseAutoSaveResult {
  status: SaveStatus;
  lastSavedAt: number | null;
  /** Imperative flush — bypasses debounce. Use from onBlur and discrete-event handlers. */
  saveNow: () => void;
}

/**
 * Auto-save hook for inline panel editors.
 *
 * Phase 0 stub — types and signature only; no save fires yet. Subsequent tasks
 * implement debounce, saveNow, validation gating, in-flight coalescing,
 * element-switch flush, unmount flush, and error handling.
 */
export function useAutoSave<T>(_args: UseAutoSaveArgs<T>): UseAutoSaveResult {
  const [status] = useState<SaveStatus>("saved");
  const [lastSavedAt] = useState<number | null>(null);
  const saveNow = useCallback(() => {
    /* implemented in later tasks */
  }, []);
  return { status, lastSavedAt, saveNow };
}
```

- [ ] **Step 3: Verify the file compiles**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: clean exit (exit code 0). No editor imports the new types yet, so no other files should break.

- [ ] **Step 4: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/useEditorState.ts
git commit -m "feat(react): scaffold useAutoSave hook types + stub"
```

---

## Task 2: Test infrastructure + first behavior — debounced save fires

**Files:**
- Create: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/__tests__/useAutoSave.test.tsx`
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/useEditorState.ts`

- [ ] **Step 1: Create the test file with the first failing test**

```tsx
// editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/__tests__/useAutoSave.test.tsx
import { renderHook, act } from "@testing-library/react";
import { useAutoSave, UseAutoSaveArgs } from "../useEditorState";

type TestDraft = { id: string; name: string };

const baseArgs = (overrides: Partial<UseAutoSaveArgs<TestDraft>> = {}): UseAutoSaveArgs<TestDraft> => ({
  draft: { id: "e1", name: "initial" },
  hasPendingChanges: false,
  isValid: true,
  onSave: jest.fn(),
  isSaving: false,
  elementId: "e1",
  debounceMs: 500,
  ...overrides,
});

describe("useAutoSave", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("debounce", () => {
    it("fires onSave after debounceMs when dirty + valid + not saving", () => {
      const onSave = jest.fn();
      const { rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      expect(onSave).not.toHaveBeenCalled();

      // User edits → draft changes + hasPendingChanges flips true
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true }));

      expect(onSave).not.toHaveBeenCalled();

      // Just before debounce — still no save
      act(() => {
        jest.advanceTimersByTime(499);
      });
      expect(onSave).not.toHaveBeenCalled();

      // Debounce expires
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith({ id: "e1", name: "edited" });
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false useAutoSave.test.tsx`
Expected: 1 failing test. Failure message indicates `onSave` was called 0 times (the stub doesn't save).

- [ ] **Step 3: Implement debounce in `useAutoSave`**

Replace the stub `useAutoSave` in `useEditorState.ts` with:

```ts
export function useAutoSave<T>(args: UseAutoSaveArgs<T>): UseAutoSaveResult {
  const { draft, hasPendingChanges, isValid, onSave, isSaving, debounceMs = 500 } = args;

  const [status, setStatus] = useState<SaveStatus>("saved");
  const [lastSavedAt] = useState<number | null>(null);

  // Refs synced each render so timer callbacks see fresh values
  const draftRef = useRef(draft);
  const onSaveRef = useRef(onSave);
  const hasPendingRef = useRef(hasPendingChanges);
  const isValidRef = useRef(isValid);
  const isSavingRef = useRef(isSaving);
  draftRef.current = draft;
  onSaveRef.current = onSave;
  hasPendingRef.current = hasPendingChanges;
  isValidRef.current = isValid;
  isSavingRef.current = isSaving;

  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dispatchSave = useCallback(() => {
    setStatus("saving");
    onSaveRef.current(draftRef.current);
  }, []);

  const saveNow = useCallback(() => {
    /* implemented in later tasks */
  }, []);

  // Schedule debounced save on draft/dirty changes
  useEffect(() => {
    if (!hasPendingChanges || !isValid || isSaving) {
      return;
    }
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      dispatchSave();
    }, debounceMs);
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, hasPendingChanges, isValid, isSaving, debounceMs]);

  return { status, lastSavedAt, saveNow };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false useAutoSave.test.tsx`
Expected: 1 passing test.

- [ ] **Step 5: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/
git commit -m "test(react): debounced save fires after delay (useAutoSave)"
```

---

## Task 3: `saveNow` flushes immediately

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/__tests__/useAutoSave.test.tsx`
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/useEditorState.ts`

- [ ] **Step 1: Add the failing test**

Append inside `describe("useAutoSave", ...)` after the `describe("debounce", ...)` block:

```tsx
  describe("saveNow", () => {
    it("flushes immediately, bypassing the debounce timer", () => {
      const onSave = jest.fn();
      const { result, rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true }));

      // saveNow before debounce expires
      act(() => {
        result.current.saveNow();
      });

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith({ id: "e1", name: "edited" });
    });

    it("does not fire onSave again when the debounce timer later expires", () => {
      const onSave = jest.fn();
      const { result, rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true }));

      act(() => {
        result.current.saveNow();
      });
      expect(onSave).toHaveBeenCalledTimes(1);

      // Advance well past the debounce window
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(onSave).toHaveBeenCalledTimes(1); // still just one
    });

    it("does nothing when there are no pending changes", () => {
      const onSave = jest.fn();
      const { result } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave, hasPendingChanges: false }) }
      );

      act(() => {
        result.current.saveNow();
      });

      expect(onSave).not.toHaveBeenCalled();
    });
  });
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false useAutoSave.test.tsx`
Expected: 1 passing, 3 failing — saveNow currently does nothing.

- [ ] **Step 3: Implement `saveNow`**

In `useEditorState.ts`, replace the stub `saveNow`:

```ts
  const saveNow = useCallback(() => {
    clearTimer();
    if (!hasPendingRef.current) return;
    if (!isValidRef.current) {
      setStatus("invalid");
      return;
    }
    if (isSavingRef.current) {
      // Save in flight — handled in later task (in-flight coalescing).
      return;
    }
    dispatchSave();
  }, [clearTimer, dispatchSave]);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false useAutoSave.test.tsx`
Expected: 4 passing tests.

- [ ] **Step 5: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/
git commit -m "test(react): saveNow flushes immediately and cancels timer"
```

---

## Task 4: Validation gate

**Files:**
- Modify: test file
- Modify: `useEditorState.ts`

- [ ] **Step 1: Add failing tests**

Append a new `describe` block:

```tsx
  describe("validation gate", () => {
    it("does not fire onSave when draft is invalid", () => {
      const onSave = jest.fn();
      const { rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true, isValid: false }));

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(onSave).not.toHaveBeenCalled();
    });

    it("reports status='invalid' when dirty + invalid", () => {
      const { result, rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs() }
      );

      expect(result.current.status).toBe("saved");

      rerender(baseArgs({ draft: { id: "e1", name: "edited" }, hasPendingChanges: true, isValid: false }));

      expect(result.current.status).toBe("invalid");
    });

    it("schedules and fires save when draft becomes valid again", () => {
      const onSave = jest.fn();
      const { rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      // Become invalid
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true, isValid: false }));
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(onSave).not.toHaveBeenCalled();

      // Become valid
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true, isValid: true }));
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it("saveNow reports status='invalid' instead of saving when invalid", () => {
      const onSave = jest.fn();
      const { result, rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true, isValid: false }));

      act(() => {
        result.current.saveNow();
      });

      expect(onSave).not.toHaveBeenCalled();
      expect(result.current.status).toBe("invalid");
    });
  });
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false useAutoSave.test.tsx`
Expected: 7 passing, 1 failing. Three of the four new tests already pass against the post-Task-3 implementation (the debounce effect returns early on `!isValid` so onSave doesn't fire; `saveNow` already sets `status="invalid"`; the valid→reschedule path works via dep change). The failure is the "reports status='invalid' when dirty + invalid" test, because the debounce effect does not yet *set* the status.

- [ ] **Step 3: Implement the validation status**

In `useEditorState.ts`, update the debounce-scheduling effect to set `"invalid"` when invalid:

```ts
  // Schedule debounced save on draft/dirty changes
  useEffect(() => {
    if (!hasPendingChanges) {
      return;
    }
    if (!isValid) {
      clearTimer();
      setStatus("invalid");
      return;
    }
    if (isSaving) {
      return; // handled in later task
    }
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      dispatchSave();
    }, debounceMs);
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, hasPendingChanges, isValid, isSaving, debounceMs]);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false useAutoSave.test.tsx`
Expected: 8 passing tests.

- [ ] **Step 5: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/
git commit -m "test(react): hold save while invalid; resume when valid"
```

---

## Task 5: In-flight coalescing — trailing save

**Files:**
- Modify: test file
- Modify: `useEditorState.ts`

- [ ] **Step 1: Add failing tests**

Append a new `describe` block:

```tsx
  describe("in-flight coalescing", () => {
    it("does not fire a second onSave while one is in flight", () => {
      const onSave = jest.fn();
      const { rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      // First save fires
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v1" }, hasPendingChanges: true, isSaving: false }));
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(onSave).toHaveBeenCalledTimes(1);

      // Save in flight + new edit
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v2" }, hasPendingChanges: true, isSaving: true }));
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(onSave).toHaveBeenCalledTimes(1); // still just one — second is queued
    });

    it("fires one trailing save after isSaving flips false", () => {
      const onSave = jest.fn();
      const { rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave, draft: { id: "e1", name: "v1" }, hasPendingChanges: true, isSaving: true }) }
      );

      // Edit during in-flight save
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v2" }, hasPendingChanges: true, isSaving: true }));

      // Save completes
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v2" }, hasPendingChanges: true, isSaving: false }));

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenLastCalledWith({ id: "e1", name: "v2" });
    });

    it("fires only ONE trailing save even if multiple edits occur during in-flight save", () => {
      const onSave = jest.fn();
      const { rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave, draft: { id: "e1", name: "v1" }, hasPendingChanges: true, isSaving: true }) }
      );

      // Multiple edits during in-flight save
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v2" }, hasPendingChanges: true, isSaving: true }));
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v3" }, hasPendingChanges: true, isSaving: true }));
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v4" }, hasPendingChanges: true, isSaving: true }));

      // Save completes
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v4" }, hasPendingChanges: true, isSaving: false }));

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenLastCalledWith({ id: "e1", name: "v4" });
    });
  });
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false useAutoSave.test.tsx`
Expected: 9 passing, 2 failing. The "does not fire a second onSave while one is in flight" test already passes (the debounce effect's early-return on `isSaving` prevents a second dispatch). The two trailing-save tests fail because the saving→not-saving transition does not yet retry.

- [ ] **Step 3: Implement coalescing**

In `useEditorState.ts`, add `wasSavingRef` and `trailingSaveNeededRef` near the other refs:

```ts
  const wasSavingRef = useRef(isSaving);
  const trailingSaveNeededRef = useRef(false);
```

Update the debounce effect to set the trailing flag instead of scheduling when `isSaving`:

```ts
  // Schedule debounced save on draft/dirty changes
  useEffect(() => {
    if (!hasPendingChanges) {
      return;
    }
    if (!isValid) {
      clearTimer();
      setStatus("invalid");
      return;
    }
    if (isSaving) {
      trailingSaveNeededRef.current = true;
      setStatus("saving");
      return;
    }
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      if (isSavingRef.current) {
        // Save raced into flight between schedule and timer firing.
        trailingSaveNeededRef.current = true;
        return;
      }
      dispatchSave();
    }, debounceMs);
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, hasPendingChanges, isValid, isSaving, debounceMs]);
```

Add a new effect after the debounce effect, watching the saving→not-saving transition:

```ts
  // Detect saving→not-saving transition; fire trailing save if requested.
  useEffect(() => {
    if (wasSavingRef.current && !isSaving) {
      if (trailingSaveNeededRef.current) {
        trailingSaveNeededRef.current = false;
        if (hasPendingRef.current && isValidRef.current) {
          dispatchSave();
        }
      }
    }
    wasSavingRef.current = isSaving;
  }, [isSaving, dispatchSave]);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false useAutoSave.test.tsx`
Expected: 11 passing tests.

- [ ] **Step 5: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/
git commit -m "test(react): coalesce edits during in-flight save into one trailing save"
```

---

## Task 6: Element-switch flush

**Files:**
- Modify: test file
- Modify: `useEditorState.ts`

- [ ] **Step 1: Add failing tests**

Append a new `describe` block:

```tsx
  describe("element-switch flush", () => {
    it("flushes pending edit when elementId changes", () => {
      const onSave = jest.fn();
      const { rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      // Pending edit on element e1
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true, elementId: "e1" }));
      // Note: do NOT advance timers — switch happens before debounce expires

      // Switch to element e2 (parent will provide a new draft, but we test the
      // flush-of-old-draft semantics by simulating the order: useFormSync's
      // setLocalDraft is queued; useAutoSave still sees old draft via ref)
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true, elementId: "e2" }));

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith({ id: "e1", name: "edited" });
    });

    it("does not flush when elementId changes with no pending changes", () => {
      const onSave = jest.fn();
      const { rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave, elementId: "e1" }) }
      );

      rerender(baseArgs({ onSave, elementId: "e2" }));

      expect(onSave).not.toHaveBeenCalled();
    });

    it("does not flush when elementId changes while invalid", () => {
      const onSave = jest.fn();
      const { rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true, isValid: false, elementId: "e1" }));
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true, isValid: false, elementId: "e2" }));

      expect(onSave).not.toHaveBeenCalled();
    });

    it("cancels any pending debounce timer on element switch", () => {
      const onSave = jest.fn();
      const { rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave, elementId: "e1" }) }
      );

      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true, elementId: "e1" }));
      // Switch before timer expires
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true, elementId: "e2" }));

      expect(onSave).toHaveBeenCalledTimes(1); // flush only

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(onSave).toHaveBeenCalledTimes(1); // no extra fire from old timer
    });
  });
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false useAutoSave.test.tsx`
Expected: 13 passing, 2 failing. The two "does not flush when ..." tests pass trivially (no element-switch logic = no save fires either way). The "flushes pending edit when elementId changes" and "cancels any pending debounce timer on element switch" tests fail because no flush mechanism exists yet.

- [ ] **Step 3: Implement element-switch flush**

In `useEditorState.ts`, add a `prevElementIdRef` near the other refs:

```ts
  const prevElementIdRef = useRef(args.elementId);
```

Add a new effect (after the saving-transition effect) watching `elementId`:

```ts
  // Element switch flush — see spec section "Edge cases" for ordering rationale.
  // useFormSync's setLocalDraft is queued for the next render, so draftRef.current
  // still holds the previous element's draft when this effect runs.
  useEffect(() => {
    if (prevElementIdRef.current !== args.elementId) {
      if (hasPendingRef.current && isValidRef.current && !isSavingRef.current) {
        clearTimer();
        dispatchSave();
      }
      trailingSaveNeededRef.current = false;
      prevElementIdRef.current = args.elementId;
    }
  }, [args.elementId, clearTimer, dispatchSave]);
```

(Note: `args.elementId` is referenced rather than the destructured `elementId` because the destructure was at function top — equivalent.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false useAutoSave.test.tsx`
Expected: 15 passing tests.

- [ ] **Step 5: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/
git commit -m "test(react): flush previous element on element switch"
```

---

## Task 7: Unmount flush

**Files:**
- Modify: test file
- Modify: `useEditorState.ts`

- [ ] **Step 1: Add failing tests**

Append a new `describe` block:

```tsx
  describe("unmount flush", () => {
    it("fires onSave when unmounted with pending edits", () => {
      const onSave = jest.fn();
      const { rerender, unmount } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true }));
      // Unmount before debounce expires
      unmount();

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith({ id: "e1", name: "edited" });
    });

    it("does not fire onSave on unmount when no pending edits", () => {
      const onSave = jest.fn();
      const { unmount } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      unmount();

      expect(onSave).not.toHaveBeenCalled();
    });

    it("does not fire onSave on unmount when invalid", () => {
      const onSave = jest.fn();
      const { rerender, unmount } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true, isValid: false }));
      unmount();

      expect(onSave).not.toHaveBeenCalled();
    });
  });
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false useAutoSave.test.tsx`
Expected: 17 passing, 1 failing — the "fires onSave when unmounted with pending edits" test fails (no unmount flush yet). The two "does not fire onSave on unmount" tests pass trivially.

- [ ] **Step 3: Implement unmount flush**

In `useEditorState.ts`, add a final mount-only effect with cleanup:

```ts
  // Unmount flush
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (hasPendingRef.current && isValidRef.current && !isSavingRef.current) {
        try {
          onSaveRef.current(draftRef.current);
        } catch {
          // Component is unmounting — cannot update state.
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false useAutoSave.test.tsx`
Expected: 18 passing tests.

- [ ] **Step 5: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/
git commit -m "test(react): flush pending edits on unmount"
```

---

## Task 8: Status transitions and `lastSavedAt`

**Files:**
- Modify: test file
- Modify: `useEditorState.ts`

- [ ] **Step 1: Add failing tests**

Append a new `describe` block:

```tsx
  describe("status state machine and lastSavedAt", () => {
    it("starts in 'saved' with lastSavedAt null", () => {
      const { result } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs() }
      );

      expect(result.current.status).toBe("saved");
      expect(result.current.lastSavedAt).toBeNull();
    });

    it("transitions saved → saving → saved on a successful save", () => {
      const onSave = jest.fn();
      const { result, rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true }));

      // Debounce expires → dispatchSave sets status='saving'
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(result.current.status).toBe("saving");

      // Parent reflects in-flight save
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true, isSaving: true }));
      expect(result.current.status).toBe("saving");

      // Save completes — parent sets isSaving=false; useSaveCompletionDetector
      // (in real usage) would also clear hasPendingChanges. We mirror that here.
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: false, isSaving: false }));
      expect(result.current.status).toBe("saved");
      expect(result.current.lastSavedAt).not.toBeNull();
    });

    it("updates lastSavedAt timestamp after successful save", () => {
      const onSave = jest.fn();
      const fixedNow = 1_700_000_000_000;
      jest.spyOn(Date, "now").mockReturnValue(fixedNow);

      const { result, rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true }));
      act(() => {
        jest.advanceTimersByTime(500);
      });
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true, isSaving: true }));
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: false, isSaving: false }));

      expect(result.current.lastSavedAt).toBe(fixedNow);
    });
  });
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false useAutoSave.test.tsx`
Expected: 19 passing (the first new one — "starts in 'saved'..." — already passes), 2 failing — `setLastSavedAt` is not yet wired, and the `saved` transition doesn't update `lastSavedAt`.

- [ ] **Step 3: Wire `setLastSavedAt` in the saving-transition effect**

In `useEditorState.ts`, change the `lastSavedAt` state declaration to expose its setter:

```ts
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
```

Update the saving→not-saving transition effect to set status and timestamp on completion:

```ts
  // Detect saving→not-saving transition; fire trailing save or report saved.
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

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false useAutoSave.test.tsx`
Expected: 21 passing tests.

- [ ] **Step 5: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/
git commit -m "test(react): status state machine and lastSavedAt timestamp"
```

---

## Task 9: Error handling

**Files:**
- Modify: test file
- Modify: `useEditorState.ts`

- [ ] **Step 1: Add failing tests**

Append a new `describe` block:

```tsx
  describe("error handling", () => {
    it("transitions to 'error' when onSave throws", () => {
      const onSave = jest.fn().mockImplementation(() => {
        throw new Error("save failed");
      });
      const { result, rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      rerender(baseArgs({ onSave, draft: { id: "e1", name: "edited" }, hasPendingChanges: true }));
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(result.current.status).toBe("error");
    });

    it("retries on next edit after a thrown save", () => {
      const onSave = jest
        .fn()
        .mockImplementationOnce(() => {
          throw new Error("save failed");
        })
        .mockImplementationOnce(() => {
          /* success */
        });

      const { rerender } = renderHook(
        (props: UseAutoSaveArgs<TestDraft>) => useAutoSave(props),
        { initialProps: baseArgs({ onSave }) }
      );

      // First edit → fails
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v1" }, hasPendingChanges: true }));
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(onSave).toHaveBeenCalledTimes(1);

      // Second edit → succeeds
      rerender(baseArgs({ onSave, draft: { id: "e1", name: "v2" }, hasPendingChanges: true }));
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(onSave).toHaveBeenCalledTimes(2);
      expect(onSave).toHaveBeenLastCalledWith({ id: "e1", name: "v2" });
    });
  });
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false useAutoSave.test.tsx`
Expected: 21 passing, 2 failing — `dispatchSave` does not catch thrown errors yet, so the test crashes instead of setting status='error'.

- [ ] **Step 3: Wrap `dispatchSave` in try/catch**

In `useEditorState.ts`, update `dispatchSave`:

```ts
  const dispatchSave = useCallback(() => {
    setStatus("saving");
    try {
      onSaveRef.current(draftRef.current);
    } catch {
      setStatus("error");
    }
  }, []);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false useAutoSave.test.tsx`
Expected: 23 passing tests.

- [ ] **Step 5: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/hooks/
git commit -m "test(react): error status when onSave throws; retry on next edit"
```

---

## Task 10: `<SaveStatusLine />` component

**Files:**
- Create: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/SaveStatusLine.tsx`
- Create: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/__tests__/SaveStatusLine.test.tsx`

- [ ] **Step 1: Write the failing component tests**

Create the test file:

```tsx
// editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/__tests__/SaveStatusLine.test.tsx
import { render, screen } from "@testing-library/react";
import SaveStatusLine from "../SaveStatusLine";

describe("SaveStatusLine", () => {
  it("renders 'Saved' for status='saved'", () => {
    render(<SaveStatusLine status="saved" lastSavedAt={null} />);
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("renders 'Saving…' for status='saving'", () => {
    render(<SaveStatusLine status="saving" lastSavedAt={null} />);
    expect(screen.getByText("Saving…")).toBeInTheDocument();
  });

  it("renders 'Fix errors to save' for status='invalid'", () => {
    render(<SaveStatusLine status="invalid" lastSavedAt={null} />);
    expect(screen.getByText(/Fix errors to save/i)).toBeInTheDocument();
  });

  it("renders 'Save failed' for status='error'", () => {
    render(<SaveStatusLine status="error" lastSavedAt={null} />);
    expect(screen.getByText(/Save failed/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false SaveStatusLine.test.tsx`
Expected: failures — the component file does not exist yet.

- [ ] **Step 3: Create the component**

```tsx
// editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/SaveStatusLine.tsx
import React from "react";
import { Check, Loader2, AlertTriangle } from "lucide-react";
import type { SaveStatus } from "./hooks/useEditorState";

interface Props {
  status: SaveStatus;
  lastSavedAt: number | null;
}

const SaveStatusLine: React.FC<Props> = ({ status }) => {
  if (status === "saving") {
    return (
      <div className="flex items-center justify-end gap-1 pt-2 border-t text-xs text-gray-500">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Saving…</span>
      </div>
    );
  }
  if (status === "invalid") {
    return (
      <div className="flex items-center justify-end gap-1 pt-2 border-t text-xs text-amber-600">
        <AlertTriangle className="w-3 h-3" />
        <span>Fix errors to save</span>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="flex items-center justify-end gap-1 pt-2 border-t text-xs text-red-600">
        <AlertTriangle className="w-3 h-3" />
        <span>Save failed — keep typing to retry</span>
      </div>
    );
  }
  // status === "saved"
  return (
    <div className="flex items-center justify-end gap-1 pt-2 border-t text-xs text-gray-400">
      <Check className="w-3 h-3" />
      <span>Saved</span>
    </div>
  );
};

export default SaveStatusLine;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false SaveStatusLine.test.tsx`
Expected: 4 passing tests.

- [ ] **Step 5: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/SaveStatusLine.tsx editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/__tests__/SaveStatusLine.test.tsx
git commit -m "feat(react): add SaveStatusLine component for auto-save status"
```

---

## Task 11: Final verification

- [ ] **Step 1: Run the full React test suite**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm test -- --watchAll=false`
Expected: all tests pass — both the existing `scenarioDataMerge.test.ts` plus the new 23 + 4 = 27 added tests. Zero failures.

- [ ] **Step 2: Type-check the React app**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npx tsc --noEmit`
Expected: clean exit (exit code 0). No type errors.

- [ ] **Step 3: Build the React app**

Run: `cd editorextensions/quodsi_editor_extension/quodsim-react && npm run build`
Expected: successful build, no errors. (Warnings about bundle size are acceptable; new errors are not.)

- [ ] **Step 4: Confirm no editor imports the new code**

Run: `grep -rn "useAutoSave\|SaveStatusLine" editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors --include="*.tsx" --include="*.ts" | grep -v "__tests__\|SaveStatusLine.tsx\|useEditorState.ts"`
Expected: empty output — no editor file imports the new hook or component. Phase 0 is foundation only.

- [ ] **Step 5: Verify the commit history is clean**

Run: `git log --oneline -12`
Expected: ten new commits on the current branch (one per task that committed), each with a descriptive message. No "WIP" or "fix" commits.

- [ ] **Step 6: Final commit (only if there are leftover untracked changes)**

If `git status` shows nothing to commit, this step is a no-op.

If there are leftover changes from cleanup (e.g., trailing whitespace), commit them:

```bash
git status
# If clean, skip this commit. Otherwise:
# git add <specific files>
# git commit -m "chore(react): cleanup after Phase 0 auto-save foundation"
```

---

## Acceptance Criteria

- [ ] `useAutoSave<T>` hook exported from `hooks/useEditorState.ts` alongside the existing two hooks
- [ ] `SaveStatus` type exported
- [ ] `SaveStatusLine` component renders correctly for all four statuses
- [ ] 27 new tests passing (23 hook tests + 4 component tests)
- [ ] All previously-passing tests still pass
- [ ] React app type-checks and builds clean
- [ ] No editor (.tsx) file imports the new hook or component — zero observable behavior change
- [ ] All commits scoped to `quodsi_lucidchart_package/` repo (none in the monorepo)

## What Phase 1 will need

Phase 1 (EntityEditor migration) consumes this foundation:
- Imports `useAutoSave` and `SaveStatusLine`
- Removes `handleSave`, `handleCancel`, and the Save/Cancel button JSX block
- Adds `onBlur={saveNow}` to the name input
- Confirms an alternative panel-close path exists (X button, click-outside, or selection-change) since `handleCancel`'s `onCancel()` close call goes away

Phase 0 introduces zero risk to existing behavior because no editor imports the new code yet.
