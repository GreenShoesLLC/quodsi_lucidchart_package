// ActivityEditor.shapeWrites.test.tsx
//
// Spec 2026-09-13 lucid-shape-writes §3: Lucid's Activity editor keeps its
// draft and 0.5 s autosave, but saves through the model-root source as a
// batched shape edit on MODEL_ROOT_UPDATE, refills its draft from the
// snapshot's full record, and shows the source's save status. The real hook
// runs; only window.parent.postMessage (the host) is faked.
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import ActivityEditor from "../ActivityEditor";
import { EnvelopeMessageType } from "@quodsi/lucid-shared";
import { MODEL_ROOT_DEBOUNCE_MS } from "../../../adapters/useModelRootSource";

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

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
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

function installHost(options: { refuseWith?: string } = {}) {
  const posted: any[] = [];
  vi.spyOn(window.parent, "postMessage").mockImplementation((envelope: any) => {
    posted.push(envelope);
    if (envelope?.type === EnvelopeMessageType.MODEL_ROOT_UPDATE && options.refuseWith) {
      window.dispatchEvent(new MessageEvent("message", {
        data: {
          id: envelope.id,
          type: EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT,
          data: { success: false, errorMessage: options.refuseWith },
        },
      }));
    }
  });
  return posted;
}

let snapshotCount = 0;
function pushSnapshot(activities: any[]) {
  act(() => {
    window.dispatchEvent(new MessageEvent("message", {
      data: {
        id: `snap-${++snapshotCount}`,
        type: EnvelopeMessageType.MODEL_ROOT_SNAPSHOT,
        data: { projection: { pageId: "page-1", generators: [], arrivalPatterns: [], activities, model: {} } },
      },
    }));
  });
}

function renderEditor() {
  return render(<ActivityEditor activity={selectionActivity} referenceData={{} as any} states={{} as any} />);
}

describe("ActivityEditor — shape writes through the model-root source", () => {
  it("autosaves the editor's fields as a batched shape edit, with its two clears", async () => {
    vi.useFakeTimers();
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
    vi.useFakeTimers();
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
