// Task 4 carried finding: GeneratorEditor's PATTERN-mode-switch lifecycle
// .catch handlers used to call setPatternLifecycleError UNCONDITIONALLY.
// accessor.updateShape/updateModel can reject up to 30s later (host error,
// or the accessor's own 30s timeout) -- by which time the user may have
// selected a different generator, so the failure message could land on a
// generator they never touched. The fix compares the generator id the
// write was issued FOR against currentGeneratorIdRef.current (kept in sync
// with the CURRENTLY selected generator) before setting the error.
//
// This suite exercises the real race: switch generator A to PATTERN (its
// shape write is deliberately delayed and made to fail), select generator B
// before the delayed rejection lands, then let the rejection land -- no
// error must appear. A control case proves the assertion isn't vacuous: the
// identical rejection DOES surface when the user is still on the generator
// the write was for.
//
// Migrated for spec 2026-09-13 lucid-shape-writes §2 (Task 3): the generator
// shape write no longer travels as its own ELEMENT_UPDATE envelope --
// accessor.updateShape now queues it into the SAME batched MODEL_ROOT_UPDATE
// as any model-root edit (arrivalPatterns here), and it is THAT envelope's
// delayed failure the fake host below simulates.

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import GeneratorEditor from "../GeneratorEditor";
import { GeneratorType, EnvelopeMessageType } from "@quodsi/lucid-shared";

const { mockUpdateElementData, mockSelectElement } = vi.hoisted(() => ({
  mockUpdateElementData: vi.fn(),
  mockSelectElement: vi.fn(),
}));

vi.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({
    selectElement: mockSelectElement,
    updateElementData: mockUpdateElementData,
    updateResourceRequirements: vi.fn(),
    updateElement: vi.fn(),
  }),
}));

// Real useFormSync (NOT mocked) -- this suite is specifically about
// behaviour when the SELECTED generator changes across a rerender, which is
// exactly what useFormSync drives, so it has to run for real rather than be
// stubbed out. The other three hooks are mocked away; their own machinery
// isn't under test here.
vi.mock("../hooks/useEditorState", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../hooks/useEditorState")>();
  return {
    ...actual,
    useSaveCompletionDetector: () => {},
    useAutoSave: () => ({ status: "idle", lastSavedAt: null, saveNow: vi.fn() }),
    useFlushOnChange: () => {},
  };
});

vi.mock("../SaveStatusLine", () => ({
  __esModule: true,
  default: () => <div />,
}));

vi.mock("../../../messaging/MessageProvider", () => ({
  useMessaging: () => ({ app: { panelType: "model" } }),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

const baseProps = {
  referenceData: { entities: [] } as any,
  states: {} as any,
};

function frequencyGenerator(id: string) {
  return { id, name: `Gen ${id}`, mode: GeneratorType.FREQUENCY, levers: [] } as any;
}

/**
 * Minimal fake host: answers MODEL_ROOT_REQUEST with a snapshot that already
 * lists `initialGenerators` (required so ensurePatternForGenerator finds the
 * generator and actually creates+links a pattern -- an empty list makes it a
 * same-model no-op, and Task 3's queueShape resolves the SHAPE half the
 * instant it is locally accepted, so only a write that also changes
 * arrivalPatterns triggers GeneratorEditor's `await
 * accessor.flushModelImmediate?.()`, the one call whose rejection this test
 * needs to observe), then answers every MODEL_ROOT_UPDATE with a FAILURE
 * after `delayMs` -- reproducing "the flushed write rejects some time after
 * it was issued" without an actual 30s wait.
 */
function createFailingFakeHost(delayMs: number, initialGenerators: any[] = []) {
  function dispatch(data: any) {
    window.dispatchEvent(new MessageEvent("message", { data }));
  }

  function handlePostMessage(envelope: any) {
    if (envelope?.type === EnvelopeMessageType.MODEL_ROOT_REQUEST) {
      dispatch({
        id: envelope.id,
        type: EnvelopeMessageType.MODEL_ROOT_SNAPSHOT,
        source: "host",
        target: "model-iframe",
        version: "1.0",
        data: { projection: { generators: initialGenerators, arrivalPatterns: [], model: {} } },
      });
      return;
    }
    if (envelope?.type === EnvelopeMessageType.MODEL_ROOT_UPDATE) {
      setTimeout(() => {
        dispatch({
          id: envelope.id,
          type: EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT,
          source: "host",
          target: "model-iframe",
          version: "1.0",
          data: { success: false, errorMessage: "simulated host failure" },
        });
      }, delayMs);
      return;
    }
  }

  return { handlePostMessage };
}

describe("GeneratorEditor PATTERN mode — lifecycle error misattribution (Task 4 carried finding)", () => {
  beforeEach(() => {
    mockUpdateElementData.mockClear();
    mockSelectElement.mockClear();
  });

  it("does not show the lifecycle error on generator B when the late rejection was for generator A", async () => {
    // The initial snapshot must already list generator A (spec 2026-09-13
    // lucid-shape-writes §2 -- see createFailingFakeHost's own comment): only
    // that makes ensurePatternForGenerator actually link a NEW pattern, which
    // is what makes GeneratorEditor await accessor.flushModelImmediate?.()
    // (and so observe this fake host's delayed rejection) rather than just
    // locally queuing the shape edit and returning.
    const fakeHost = createFailingFakeHost(50, [{ id: "g-a", name: "Gen g-a", mode: "frequency" }]);
    vi.spyOn(window.parent, "postMessage").mockImplementation((envelope: any) => {
      fakeHost.handlePostMessage(envelope);
    });

    const { rerender } = render(
      <GeneratorEditor {...baseProps} generator={frequencyGenerator("g-a")} />
    );

    const select = screen.getByRole("combobox", { name: /generator type/i });
    fireEvent.change(select, { target: { value: GeneratorType.PATTERN } });

    // Before generator A's delayed rejection lands, the user selects a
    // different generator (B) -- the exact race the fix targets.
    rerender(<GeneratorEditor {...baseProps} generator={frequencyGenerator("g-b")} />);

    // Let the delayed rejection actually land.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    expect(
      screen.queryByText(/Could not save the pattern switch/i)
    ).not.toBeInTheDocument();
  });

  it("control case: DOES show the lifecycle error when the user is still on the generator the write was for", async () => {
    const fakeHost = createFailingFakeHost(50, [{ id: "g-a", name: "Gen g-a", mode: "frequency" }]);
    vi.spyOn(window.parent, "postMessage").mockImplementation((envelope: any) => {
      fakeHost.handlePostMessage(envelope);
    });

    render(<GeneratorEditor {...baseProps} generator={frequencyGenerator("g-a")} />);

    const select = screen.getByRole("combobox", { name: /generator type/i });
    fireEvent.change(select, { target: { value: GeneratorType.PATTERN } });

    await waitFor(() => {
      expect(
        screen.getByText(/Could not save the pattern switch/i)
      ).toBeInTheDocument();
    });
  });
});
