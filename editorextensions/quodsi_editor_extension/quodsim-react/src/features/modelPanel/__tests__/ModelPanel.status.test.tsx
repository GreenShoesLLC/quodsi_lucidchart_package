// Status opens Studio's public /status page in a new browser tab (spec
// 2026-09-16, Lucid shared Studies surface): there is no Status modal and no
// OPEN_STATUS_MODAL any more. The Studio origin comes from the extension's
// AUTH_STATUS config; with no Studio URL the menu item is hidden (PanelHeader
// only renders Status when a handler is supplied).
import React from "react";
import { render } from "@testing-library/react";
import { ModelPanel } from "../ModelPanel";

const mocks = vi.hoisted(() => ({
  panel: {
    modelName: "Clinic",
    currentElement: null as any,
    validationState: null,
    isLoading: false,
    needsInitialization: false,
    diagramElementType: null,
    referenceData: {} as any,
    onElementUpdate: vi.fn(),
    onElementTypeChange: vi.fn(),
    onValidate: vi.fn(),
    onRemoveModel: vi.fn(),
  },
  auth: { isAuthenticated: true, config: undefined as undefined | { studioBaseUrl?: string } },
  headerProps: null as any,
}));

vi.mock("../../../messaging/hooks/useModelPanel", () => ({
  useModelPanel: () => mocks.panel,
}));
vi.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({ requestModelJson: vi.fn() }),
}));
vi.mock("../../../messaging/MessageProvider", () => ({
  useMessaging: () => ({
    selection: { documentContext: { documentId: "doc-1", pageId: "pg-1" }, lastUpdated: 1 },
    auth: mocks.auth,
  }),
}));
vi.mock("../../../messaging/senders/simulationRunSender", () => ({
  useSimulationRunSender: () => ({
    openDiagramMappingModal: vi.fn(),
    openSettingsModal: vi.fn(),
    openAdvisorModal: vi.fn(),
  }),
}));
vi.mock("../../shared", () => ({ AccountStrip: () => <div /> }));
vi.mock("../PanelHeader", () => ({
  PanelHeader: (props: any) => {
    mocks.headerProps = props;
    return <div />;
  },
}));
vi.mock("../ElementEditor", () => ({ ElementEditor: () => <div /> }));
vi.mock("../ModelDefinitionViewer", () => ({ ModelDefinitionViewer: () => <div /> }));
vi.mock("../../../utils/pendingNavigation", () => ({
  consumePendingModelEditorTab: () => null,
}));

let openSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  mocks.headerProps = null;
  mocks.auth.config = undefined;
  openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
});
afterEach(() => {
  openSpy.mockRestore();
});

describe("ModelPanel — Status opens a browser tab", () => {
  it("opens <studioBaseUrl>/status in a new tab", () => {
    mocks.auth.config = { studioBaseUrl: "https://dev-studio.quodsi.com" };
    render(<ModelPanel />);
    expect(typeof mocks.headerProps.onOpenStatus).toBe("function");
    mocks.headerProps.onOpenStatus();
    expect(openSpy).toHaveBeenCalledWith("https://dev-studio.quodsi.com/status", "_blank", "noopener");
  });

  it("offers no Status action when the extension reported no Studio URL", () => {
    render(<ModelPanel />);
    expect(mocks.headerProps.onOpenStatus).toBeUndefined();
    expect(openSpy).not.toHaveBeenCalled();
  });
});
