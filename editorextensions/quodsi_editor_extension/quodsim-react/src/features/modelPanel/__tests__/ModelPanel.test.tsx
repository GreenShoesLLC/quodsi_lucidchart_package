// @quodsi/lucid-shared (pulled in by ModelPanel.tsx) transitively loads
// shared/dist/services/lucidApi.js -> axios ESM, which CRA's Jest transformer
// can't parse. (Same pattern as ModelEditor.test.tsx.)
vi.mock("axios", () => ({}));

import React from "react";
import { render } from "@testing-library/react";
import { ModelPanel } from "../ModelPanel";

// --- controllable hook state ---------------------------------------------
const mockUseModelPanel = {
  modelName: "Test Model",
  currentElement: null,
  validationState: null,
  isLoading: false,
  needsInitialization: false,
  diagramElementType: null,
  referenceData: {} as any,
  simulationStatus: null,
  states: [],
  resourceRequirements: [],
  outgoingConnectors: [],
  onElementUpdate: vi.fn(),
  onElementTypeChange: vi.fn(),
  onValidate: vi.fn(),
  onSimulate: vi.fn(),
  onRemoveModel: vi.fn(),
  onConvertPage: vi.fn(),
};

vi.mock("../../../messaging/hooks/useModelPanel", () => ({
  useModelPanel: () => mockUseModelPanel,
}));

vi.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({
    updateStates: vi.fn(),
    requestModelJson: vi.fn(),
  }),
}));

vi.mock("../../../messaging/MessageProvider", () => ({
  useMessaging: () => ({
    selection: { documentContext: { documentId: "doc-1" } },
  }),
}));

// EditorTab is a type-only import at runtime — stub the heavy ModelEditor tree.
vi.mock("../../editors/ModelEditor", () => ({}));

// Shallow-stub heavy children so the test isolates ModelPanel's hook order.
vi.mock("../../shared", () => ({ AccountStrip: () => <div /> }));
vi.mock("../PanelHeader", () => ({ PanelHeader: () => <div /> }));
vi.mock("../ElementEditor", () => ({ ElementEditor: () => <div /> }));
vi.mock("../ModelDefinitionViewer", () => ({ ModelDefinitionViewer: () => <div /> }));
vi.mock("../../../utils/pendingNavigation", () => ({
  consumePendingModelEditorTab: () => null,
}));
vi.mock("../../../utils/pendingSubmission", () => ({
  setPendingSubmission: () => {},
}));

// Mock simulationRunSender since ModelPanel now uses openDiagramMappingModal from it
vi.mock("../../../messaging/senders/simulationRunSender", () => ({
  useSimulationRunSender: () => ({
    openDiagramMappingModal: vi.fn(),
  }),
}));

describe("ModelPanel — renders without errors", () => {
  it("renders without throwing when model is loaded", () => {
    expect(() => render(<ModelPanel />)).not.toThrow();
  });

  it("rerenders without throwing (hook order is stable)", () => {
    const { rerender } = render(<ModelPanel />);
    expect(() => rerender(<ModelPanel />)).not.toThrow();
  });
});
