// GeneratorEditor.initialStates.test.tsx
//
// Spec 2026-09-13 lucid-state-modifications-editor: the Generator's initial
// state modifications use the shared editor. With no states, its link opens
// the Model editor on States; the Generator still drops modifications whose
// state was deleted when the list changes (handleStateModificationsChange).
// Mocks mirror GeneratorEditor.settingsModal.test.tsx.
import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import GeneratorEditor from "../GeneratorEditor";
import { ComponentType, State, StateListManager, StateType } from "@quodsi/lucid-shared";
import { setView } from "quodsi_studio/platforms/shared";

const { mockSelectElement } = vi.hoisted(() => ({ mockSelectElement: vi.fn() }));

vi.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({
    selectElement: mockSelectElement,
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

vi.mock("../../../messaging/MessageProvider", () => ({
  useMessaging: () => ({ app: { panelType: "model" }, sendMessage: vi.fn() }),
}));

const qty = new State("s-qty", "Qty", ComponentType.ENTITY, StateType.NUMBER, 0);

function renderInitialStates(states: StateListManager, initialStates: unknown[] = []) {
  render(
    <GeneratorEditor
      onSave={vi.fn()}
      referenceData={{} as any}
      states={states}
      generator={{ id: "g1", name: "Arrivals", mode: "frequency", levers: [], initialStates } as any}
    />
  );
  // Icon-only tabs: the tooltip is the accessible name.
  fireEvent.click(screen.getByTitle("Set initial state values for entities when they are created"));
}

describe("GeneratorEditor — initial state modifications in the shared editor", () => {
  beforeEach(() => {
    localStorage.clear();
    setView("intermediate");
    mockSelectElement.mockClear();
  });
  afterEach(() => setView("basic"));

  it("links to the Model editor's States tab when the model has no states", () => {
    renderInitialStates(new StateListManager());
    fireEvent.click(screen.getByRole("button", { name: "Define one on the States tab" }));
    expect(mockSelectElement).toHaveBeenCalledWith("model", { targetTab: "States" });
  });

  it("still drops a modification whose state was deleted when the list changes", () => {
    const states = new StateListManager();
    states.add(qty);
    renderInitialStates(states, [{ stateId: "s-gone", operation: "assign", value: 1 }]);
    expect(screen.getByText("(missing state: s-gone)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add modification" }));
    const dialog = screen.getByText("Add State Modification").parentElement as HTMLElement;
    fireEvent.click(within(dialog).getByRole("button", { name: "Add" }));

    expect(screen.queryByText("(missing state: s-gone)")).toBeNull();
    expect(screen.getByText("Qty")).toBeInTheDocument();
  });
});
