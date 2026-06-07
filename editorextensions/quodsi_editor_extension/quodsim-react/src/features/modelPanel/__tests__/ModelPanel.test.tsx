// @quodsi/lucid-shared (pulled in by ModelPanel.tsx) transitively loads
// shared/dist/services/lucidApi.js -> axios ESM, which CRA's Jest transformer
// can't parse. (Same pattern as ModelEditor.test.tsx.)
jest.mock("axios", () => ({}));

import React from "react";
import { render, screen } from "@testing-library/react";
import { ModelPanel } from "../ModelPanel";

// --- controllable hook state ---------------------------------------------
let mockPreviewVisible = false;

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

jest.mock("../../../messaging/hooks/useConversionPreview", () => ({
  // Closure reads mockPreviewVisible fresh each render so a rerender can flip it.
  useConversionPreview: () => ({
    isVisible: mockPreviewVisible,
    isApplying: false,
    openPreview: jest.fn(),
    applyDefaults: jest.fn(),
  }),
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
jest.mock("../../conversionPreview/ConversionPreviewPanel", () => ({
  ConversionPreviewPanel: () => <div data-testid="conversion-preview" />,
}));
jest.mock("../../../utils/pendingNavigation", () => ({
  consumePendingModelEditorTab: () => null,
}));
jest.mock("../../../utils/pendingSubmission", () => ({
  setPendingSubmission: () => {},
}));

beforeEach(() => {
  mockPreviewVisible = false;
});

describe("ModelPanel — hook order is stable when Diagram Mapping opens", () => {
  it("does not throw a Rules-of-Hooks error when isPreviewVisible flips true on rerender", () => {
    // First render: preview hidden -> reaches the bottom (all hooks run).
    const { rerender } = render(<ModelPanel />);

    // "Diagram Mapping" => openPreview() => isPreviewVisible becomes true.
    // Before the fix, the early return fires before a useCallback further
    // down, so this rerender throws "Rendered fewer hooks than expected."
    mockPreviewVisible = true;
    expect(() => rerender(<ModelPanel />)).not.toThrow();

    expect(screen.getByTestId("conversion-preview")).toBeInTheDocument();
  });
});
