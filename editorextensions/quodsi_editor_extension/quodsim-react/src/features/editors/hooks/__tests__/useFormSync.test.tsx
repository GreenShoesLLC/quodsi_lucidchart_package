import { renderHook } from "@testing-library/react";
import { useFormSync } from "../useEditorState";

type Draft = { id: string; replications: number };

/**
 * ClickUp 86e34wx7y: an external write (the Advisor's run-settings Apply,
 * relayed through the extension) lands on the page, the extension re-sends
 * the selection with fresh data, the editor's props change -- and the open
 * Model editor kept showing the old values because useFormSync only
 * re-synced on an element-id change.
 */
describe("useFormSync", () => {
  function setup(initial: Draft, opts: { pending?: boolean } = {}) {
    const setLocalDraft = vi.fn();
    const setHasPendingChanges = vi.fn();
    const hook = renderHook(
      ({ source, pending }: { source: Draft; pending: boolean }) =>
        useFormSync(source.id, pending, () => source, setLocalDraft, setHasPendingChanges, source),
      { initialProps: { source: initial, pending: opts.pending ?? false } },
    );
    return { ...hook, setLocalDraft, setHasPendingChanges };
  }

  it("re-syncs the draft from props when the source changes and there are no pending edits", () => {
    const { rerender, setLocalDraft } = setup({ id: "page-1", replications: 1 });
    setLocalDraft.mockClear();

    rerender({ source: { id: "page-1", replications: 5 }, pending: false });

    expect(setLocalDraft).toHaveBeenCalledWith({ id: "page-1", replications: 5 });
  });

  it("keeps the user's pending edits when the source changes for the same element", () => {
    const { rerender, setLocalDraft } = setup({ id: "page-1", replications: 1 }, { pending: true });
    setLocalDraft.mockClear();

    rerender({ source: { id: "page-1", replications: 5 }, pending: true });

    expect(setLocalDraft).not.toHaveBeenCalled();
  });

  it("still syncs and clears pending edits on an element switch", () => {
    const { rerender, setLocalDraft, setHasPendingChanges } = setup({ id: "page-1", replications: 1 }, { pending: true });
    setLocalDraft.mockClear();
    setHasPendingChanges.mockClear();

    rerender({ source: { id: "act-2", replications: 3 }, pending: true });

    expect(setLocalDraft).toHaveBeenCalledWith({ id: "act-2", replications: 3 });
    expect(setHasPendingChanges).toHaveBeenCalledWith(false);
  });

  it("does not re-sync on a render where nothing changed", () => {
    const source = { id: "page-1", replications: 1 };
    const { rerender, setLocalDraft } = setup(source);
    setLocalDraft.mockClear();

    rerender({ source, pending: false });

    expect(setLocalDraft).not.toHaveBeenCalled();
  });
});
