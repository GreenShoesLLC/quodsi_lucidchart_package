// Status opens quodsi_studio's shared StatusPanel in a Lucid modal (ClickUp
// 86e3f949t): the panel sends OPEN_STATUS_MODAL and the extension opens
// ?view=status. It no longer opens Studio's /status in a browser tab: with
// no API base URL configured the modal itself shows a clear "not
// configured" message.
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
  auth: { isAuthenticated: true, config: undefined as undefined | Record<string, unknown> },
  headerProps: null as any,
  openStatusModal: vi.fn(),
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
    openStatusModal: mocks.openStatusModal,
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

describe("ModelPanel — Status opens the in-app status modal", () => {
  beforeEach(() => mocks.openStatusModal.mockClear());

  it("sends OPEN_STATUS_MODAL (via openStatusModal) and opens no browser tab", () => {
    mocks.auth.config = { salesEmail: "sales@quodsi.com" };
    render(<ModelPanel />);
    expect(typeof mocks.headerProps.onOpenStatus).toBe("function");
    mocks.headerProps.onOpenStatus();
    expect(mocks.openStatusModal).toHaveBeenCalledTimes(1);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("still offers Status when the extension reported no config", () => {
    render(<ModelPanel />);
    expect(typeof mocks.headerProps.onOpenStatus).toBe("function");
    mocks.headerProps.onOpenStatus();
    expect(mocks.openStatusModal).toHaveBeenCalledTimes(1);
    expect(openSpy).not.toHaveBeenCalled();
  });
});
