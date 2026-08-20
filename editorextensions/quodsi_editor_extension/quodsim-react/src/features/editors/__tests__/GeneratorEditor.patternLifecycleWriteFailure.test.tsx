// Final fix wave, item 3.
//
// GeneratorEditor.tsx's PATTERN mode-switch lifecycle writes
// (accessor.updateShape via `void (async () => {...})()`) previously had no
// `.catch`. If accessor.updateShape rejects (host error, or its own 30s
// timeout), the awaited updateModel call never runs, the local draft already
// shows the new mode, and the rejection was an unhandled promise rejection --
// invisible to the user (SaveStatusLine renders useAutoSave's status, an
// unrelated write path).
//
// This test drives a real PATTERN-mode switch against a fake host that
// answers ELEMENT_UPDATE with success:false, and asserts:
//   1. the failure is logged through the shared logger (not console.*), and
//   2. it is surfaced next to the Generator Type control (patternLifecycleError).

import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import GeneratorEditor from "../GeneratorEditor";
import { GeneratorType, EnvelopeMessageType, getLogger } from "@quodsi/lucid-shared";

const { mockUpdateElementData, mockSelectElement } = vi.hoisted(() => ({
  mockUpdateElementData: vi.fn(),
  mockSelectElement: vi.fn(),
}));

vi.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({
    selectElement: mockSelectElement,
    updateElementData: mockUpdateElementData,
  }),
}));

vi.mock("../../../messaging/hooks/useElementOpsState", () => ({
  useElementOpsState: () => ({ isSaving: () => false }),
}));

vi.mock("../hooks/useEditorState", () => ({
  useFormSync: () => {},
  useSaveCompletionDetector: () => {},
  useAutoSave: () => ({ status: "idle", lastSavedAt: null, saveNow: vi.fn() }),
  useFlushOnChange: () => {},
}));

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

/** A fake host that answers MODEL_ROOT_REQUEST normally, but fails every
 *  ELEMENT_UPDATE with success:false -- simulating a host-side rejection of
 *  accessor.updateShape (e.g. a storage error, or the 30s accessor timeout). */
function installFailingHost(initialGenerators: any[]) {
  return vi.spyOn(window.parent, "postMessage").mockImplementation((envelope: any) => {
    if (envelope?.type === EnvelopeMessageType.MODEL_ROOT_REQUEST) {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            id: envelope.id,
            type: EnvelopeMessageType.MODEL_ROOT_SNAPSHOT,
            source: "host",
            target: "model-iframe",
            version: "1.0",
            data: { projection: { generators: initialGenerators, arrivalPatterns: [], model: {} } },
          },
        })
      );
      return;
    }
    if (envelope?.type === EnvelopeMessageType.ELEMENT_UPDATE) {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            id: envelope.id,
            type: EnvelopeMessageType.ELEMENT_UPDATE_RESULT,
            source: "host",
            target: "model-iframe",
            version: "1.0",
            data: { success: false, errorMessage: "storage write failed" },
          },
        })
      );
      return;
    }
  });
}

const baseProps = {
  onSave: vi.fn(),
  referenceData: { entities: [] } as any,
  states: {} as any,
  onStatesChange: vi.fn(),
};

describe("GeneratorEditor PATTERN lifecycle write failure (final fix wave item 3)", () => {
  it("logs through the shared logger and surfaces an error when accessor.updateShape rejects", async () => {
    const logger = getLogger("GeneratorEditor");
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});

    installFailingHost([{ id: "g1", name: "Arrivals", mode: "frequency" }]);

    render(
      <GeneratorEditor
        {...baseProps}
        generator={{ id: "g1", name: "Arrivals", mode: GeneratorType.FREQUENCY, levers: [] } as any}
      />
    );

    const select = screen.getByRole("combobox", { name: /generator type/i });
    fireEvent.change(select, { target: { value: GeneratorType.PATTERN } });

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalled();
    });

    // No unhandled rejection: the .catch ran, and the failure is visible
    // next to the Generator Type control (not silently swallowed).
    expect(
      await screen.findByText(/could not save the pattern switch/i)
    ).toBeInTheDocument();
  });
});
