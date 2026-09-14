// ActivityEditor.shapeWrites.test.tsx
//
// Spec 2026-09-13 lucid-shape-writes §3: Lucid's Activity editor keeps its
// draft and 0.5 s autosave, but saves through the model-root source as a
// batched shape edit on MODEL_ROOT_UPDATE, refills its draft from the
// snapshot's full record, and shows the source's save status. The real hook
// runs; only window.parent.postMessage (the host) is faked.
//
// ISOLATION. EVERY test runs on fake timers, including the ones that never
// advance them. A test that edits and ends leaves a pending draft, and
// unmounting it queues that draft into its source behind the source's
// 0.4 s timer; on REAL timers that timer fires hundreds of ms later, in the
// middle of some later test, and posts through THAT test's postMessage spy.
// `afterEach` then unmounts every rendered tree (dropping each source's
// window listener and its flush-registry entries), resets the registry, and
// drops every timer still scheduled before switching back to real timers.
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import ActivityEditor from "../ActivityEditor";
import { EnvelopeMessageType } from "@quodsi/lucid-shared";
import { MODEL_ROOT_DEBOUNCE_MS } from "../../../adapters/useModelRootSource";
import { flushAllModelRootWrites, resetModelRootWritesForTests } from "../../../adapters/modelRootWrites";

vi.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({
    updateResourceRequirements: vi.fn(),
    selectElement: vi.fn(),
    updateElement: vi.fn(),
    updateElementData: vi.fn(),
  }),
}));

vi.mock("../../../messaging/MessageProvider", () => ({
  useMessaging: () => ({ app: { panelType: "model" }, sendMessage: vi.fn() }),
}));

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  resetModelRootWritesForTests();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const AUTOSAVE_MS = 500;

const selectionActivity = {
  id: "act-1",
  name: "Triage",
  capacity: 1,
  inboundCapacity: 999999,
  outboundCapacity: 999999,
  actions: [],
} as any;

/**
 * Fake host. By default it never answers a MODEL_ROOT_UPDATE; `confirm`
 * answers success, `refuseWith` answers a refusal with that message.
 */
function installHost(options: { refuseWith?: string; confirm?: boolean } = {}) {
  const posted: any[] = [];
  vi.spyOn(window.parent, "postMessage").mockImplementation((envelope: any) => {
    posted.push(envelope);
    if (envelope?.type === EnvelopeMessageType.MODEL_ROOT_UPDATE && (options.refuseWith || options.confirm)) {
      window.dispatchEvent(new MessageEvent("message", {
        data: {
          id: envelope.id,
          type: EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT,
          data: options.refuseWith ? { success: false, errorMessage: options.refuseWith } : { success: true },
        },
      }));
    }
  });
  return posted;
}

let snapshotCount = 0;
/** `id` tags the snapshot with a write's envelope id, as the host's post-write and corrective snapshots are. */
function pushSnapshot(activities: any[], id = `snap-${++snapshotCount}`) {
  act(() => {
    window.dispatchEvent(new MessageEvent("message", {
      data: {
        id,
        type: EnvelopeMessageType.MODEL_ROOT_SNAPSHOT,
        data: { projection: { pageId: "page-1", generators: [], arrivalPatterns: [], activities, model: {} } },
      },
    }));
  });
}

function renderEditor() {
  return render(<ActivityEditor activity={selectionActivity} referenceData={{} as any} states={{} as any} />);
}

const updates = (posted: any[]) => posted.filter((e) => e.type === EnvelopeMessageType.MODEL_ROOT_UPDATE);

/** The `name` of every act-1 shape edit posted so far, in send order. */
const postedNames = (posted: any[]) =>
  updates(posted).flatMap((e) =>
    (e.data.shapes ?? []).filter((s: any) => s.shapeId === "act-1").map((s: any) => s.patch.name)
  );

/**
 * Type, let the 0.5 s autosave hand the draft to the source, type again, and
 * stop inside the source's 0.4 s pause. The source is now `saving` and holds
 * "Intake A"; "Intake AB" exists only in the editor's draft.
 */
async function typePauseType(posted: any[]) {
  const name = screen.getByDisplayValue("Triage");
  fireEvent.change(name, { target: { value: "Intake A" } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(AUTOSAVE_MS);
  });
  fireEvent.change(name, { target: { value: "Intake AB" } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(100);
  });
  expect(updates(posted)).toHaveLength(0);
  return name;
}

describe("ActivityEditor — shape writes through the model-root source", () => {
  it("autosaves the editor's fields as a batched shape edit, with its two clears", async () => {
    const posted = installHost();
    renderEditor();
    pushSnapshot([{ id: "act-1", name: "Triage", capacity: 1, actions: [] }]);

    fireEvent.change(screen.getByDisplayValue("Triage"), { target: { value: "Intake" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOSAVE_MS);
      await vi.advanceTimersByTimeAsync(MODEL_ROOT_DEBOUNCE_MS);
    });

    const update = posted.find((e) => e.type === EnvelopeMessageType.MODEL_ROOT_UPDATE);
    expect(update.data.basedOnPageId).toBe("page-1");
    expect(update.data.shapes).toHaveLength(1);
    expect(update.data.shapes[0]).toEqual(expect.objectContaining({
      shapeId: "act-1",
      type: "Activity",
      clearedFields: ["queueRanking", "workScheduleId"],
    }));
    expect(update.data.shapes[0].patch).toEqual(expect.objectContaining({ name: "Intake", capacity: 1 }));
    expect(posted.some((e) => e.type === EnvelopeMessageType.ELEMENT_UPDATE)).toBe(false);
  });

  it("refills the draft from the snapshot's full record", () => {
    installHost();
    renderEditor();
    expect(screen.getByDisplayValue("Triage")).toBeInTheDocument();

    pushSnapshot([{ id: "act-1", name: "Stored name", capacity: 1, actions: [] }]);

    expect(screen.getByDisplayValue("Stored name")).toBeInTheDocument();
  });

  it("never refills over unsaved typing", () => {
    installHost();
    renderEditor();
    pushSnapshot([{ id: "act-1", name: "Triage", actions: [] }]);

    fireEvent.change(screen.getByDisplayValue("Triage"), { target: { value: "Typing" } });
    pushSnapshot([{ id: "act-1", name: "Someone else", actions: [] }]);

    expect(screen.getByDisplayValue("Typing")).toBeInTheDocument();
  });

  it("shows the host's refusal in the save status line", async () => {
    installHost({ refuseWith: "Cannot clear name on Activity" });
    renderEditor();
    pushSnapshot([{ id: "act-1", name: "Triage", actions: [] }]);

    fireEvent.change(screen.getByDisplayValue("Triage"), { target: { value: "Intake" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOSAVE_MS);
      await vi.advanceTimersByTimeAsync(MODEL_ROOT_DEBOUNCE_MS);
    });

    expect(screen.getByText("Save failed: Cannot clear name on Activity")).toBeInTheDocument();
  });
});

// Final review I2. The editor's `isSaving` is the source's combined status,
// true through the source's own 0.4 s pause after every autosave. The blur,
// unmount and pre-send saves must still push the newest draft into the source
// then, or the last edit misses a Run, or is lost on switching away.
describe("ActivityEditor — the last edit reaches the source while it holds an earlier one", () => {
  it("a blur sends the last typed value", async () => {
    const posted = installHost({ confirm: true });
    renderEditor();
    pushSnapshot([{ id: "act-1", name: "Triage", capacity: 1, actions: [] }]);

    const name = await typePauseType(posted);
    fireEvent.blur(name);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MODEL_ROOT_DEBOUNCE_MS);
    });

    // One batch, carrying the value on screen when the field lost focus.
    expect(postedNames(posted)).toEqual(["Intake AB"]);
  });

  it("switching away (unmount) sends the last typed value", async () => {
    const posted = installHost({ confirm: true });
    const { unmount } = renderEditor();
    pushSnapshot([{ id: "act-1", name: "Triage", capacity: 1, actions: [] }]);

    await typePauseType(posted);
    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MODEL_ROOT_DEBOUNCE_MS);
    });

    expect(postedNames(posted).at(-1)).toBe("Intake AB");
  });

  it("a pre-send flush (Run, Validate, JSON, modal open) has sent the last typed value when it resolves", async () => {
    const posted = installHost({ confirm: true });
    renderEditor();
    pushSnapshot([{ id: "act-1", name: "Triage", capacity: 1, actions: [] }]);

    await typePauseType(posted);
    let namesWhenFlushed: string[] = [];
    await act(async () => {
      await flushAllModelRootWrites().then(() => {
        namesWhenFlushed = postedNames(posted);
      });
    });

    expect(namesWhenFlushed.at(-1)).toBe("Intake AB");
  });

  it("a refused batch restores the stored values, and nothing sends them again", async () => {
    const posted = installHost({ refuseWith: "Cannot clear name on Activity" });
    renderEditor();
    pushSnapshot([{ id: "act-1", name: "Triage", capacity: 1, actions: [] }]);

    const name = await typePauseType(posted);
    fireEvent.blur(name);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MODEL_ROOT_DEBOUNCE_MS);
    });
    expect(postedNames(posted)).toEqual(["Intake AB"]);
    expect(screen.getByText("Save failed: Cannot clear name on Activity")).toBeInTheDocument();

    // The host's corrective snapshot, tagged with the refused batch's id.
    pushSnapshot([{ id: "act-1", name: "Triage", capacity: 1, actions: [] }], updates(posted)[0].id);
    expect(screen.getByDisplayValue("Triage")).toBeInTheDocument();

    // Well past autosave + pause (0.9 s) and the 2 s grace period, and through
    // every save path that bypasses the busy source: none has anything to send.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });
    fireEvent.blur(screen.getByDisplayValue("Triage"));
    await act(async () => {
      await flushAllModelRootWrites();
      await vi.advanceTimersByTimeAsync(3_000);
    });

    expect(updates(posted)).toHaveLength(1);
    expect(screen.getByDisplayValue("Triage")).toBeInTheDocument();
  });
});
