// @quodsi/lucid-shared (pulled in by ModelPanel.tsx) transitively loads
// shared/dist/services/lucidApi.js -> axios ESM, which CRA's Jest transformer
// can't parse. (Same pattern as ModelEditor.test.tsx.)
jest.mock("axios", () => ({}));

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
  onElementUpdate: jest.fn(),
  onElementTypeChange: jest.fn(),
  onValidate: jest.fn(),
  onSimulate: jest.fn(),
  onRemoveModel: jest.fn(),
  onConvertPage: jest.fn(),
};

jest.mock("../../../messaging/hooks/useModelPanel", () => ({
  useModelPanel: () => mockUseModelPanel,
}));

jest.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({
    updateStates: jest.fn(),
    updateTimePatterns: jest.fn(),
    updateTimeDistributedConfigs: jest.fn(),
    requestModelJson: jest.fn(),
  }),
}));

jest.mock("../../../messaging/MessageProvider", () => ({
  useMessaging: () => ({
    selection: { documentContext: { documentId: "doc-1" } },
  }),
}));

// EditorTab is a type-only import at runtime — stub the heavy ModelEditor tree.
jest.mock("../../editors/ModelEditor", () => ({}));

// Shallow-stub heavy children so the test isolates ModelPanel's hook order.
jest.mock("../../shared", () => ({ AccountStrip: () => <div /> }));
jest.mock("../PanelHeader", () => ({ PanelHeader: () => <div /> }));
jest.mock("../ElementEditor", () => ({ ElementEditor: () => <div /> }));
jest.mock("../ModelDefinitionViewer", () => ({ ModelDefinitionViewer: () => <div /> }));
jest.mock("../../../utils/pendingNavigation", () => ({
  consumePendingModelEditorTab: () => null,
}));
jest.mock("../../../utils/pendingSubmission", () => ({
  setPendingSubmission: () => {},
}));

// Mock simulationRunSender since ModelPanel now uses openDiagramMappingModal from it
jest.mock("../../../messaging/senders/simulationRunSender", () => ({
  useSimulationRunSender: () => ({
    openDiagramMappingModal: jest.fn(),
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
