// Complexity Views, Lucid half (Task 11b).
//
// Proves the onOpenSettings thread: GeneratorEditor's ViewTell mount is
// given onOpenSettings, so clicking its "Switch to X" affordance opens the
// real Lucid Settings modal (OPEN_SETTINGS_MODAL) instead of ViewTell's own
// fallback (setView(target), which silently changes the viewer's
// preference with no visible screen). Mirrors
// GeneratorEditor.patternGenerator.test.tsx's "asks the host to open the
// schedule modal" test: only the terminal sendMessage is a spy, so this
// exercises the REAL useSimulationRunSender -> useSender ->
// useMessaging().sendMessage chain building the OPEN_SETTINGS_MODAL
// payload, not a stub.

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import GeneratorEditor from "../GeneratorEditor";
import { EnvelopeMessageType, DEFAULT_MODAL_SIZE } from "@quodsi/lucid-shared";
import { getView, setView } from "quodsi_studio/platforms/shared";

vi.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({
    selectElement: vi.fn(),
    updateElementData: vi.fn(),
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

// vi.hoisted keeps ONE stable reference the mock factory below can close
// over -- same idiom GeneratorEditor.patternGenerator.test.tsx uses.
const { mockSendMessage } = vi.hoisted(() => ({
  mockSendMessage: vi.fn(),
}));

vi.mock("../../../messaging/MessageProvider", () => ({
  useMessaging: () => ({ app: { panelType: "model" }, sendMessage: mockSendMessage }),
}));

const baseProps = {
  onSave: vi.fn(),
  states: {} as any,
  onStatesChange: vi.fn(),
  referenceData: {} as any,
};

describe("GeneratorEditor — the tell's switch affordance opens Settings, not the view directly", () => {
  beforeEach(() => {
    localStorage.clear();
    setView("basic");
    mockSendMessage.mockClear();
  });

  it('sends OPEN_SETTINGS_MODAL with the modal size preference, and leaves the view untouched', () => {
    render(
      <GeneratorEditor
        {...baseProps}
        generator={{
          id: "g-states",
          name: "Arrivals",
          mode: "frequency",
          levers: [],
          initialStates: [{ stateId: "s1", value: 1 }],
        } as any}
      />
    );

    // The tell only renders because this generator carries initial state
    // modifications hidden by Basic -- see viewGating.test.tsx's identical
    // fixture for "GeneratorEditor: shows the tell when initial states are
    // configured but hidden in Basic".
    fireEvent.click(screen.getByRole("button", { name: /switch to/i }));

    expect(mockSendMessage).toHaveBeenCalledWith(
      EnvelopeMessageType.OPEN_SETTINGS_MODAL,
      { modalSize: DEFAULT_MODAL_SIZE }
    );
    // ViewTell's fallback (setView(target)) must NOT have fired -- opening
    // Settings must not itself change what the viewer sees.
    expect(getView()).toBe("basic");
  });
});
