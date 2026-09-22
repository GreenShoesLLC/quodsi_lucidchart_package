// ModelPanel hosts two shared Studio pieces (spec 2026-09-15 sections 1-2): the
// blank-slate card on an unconverted page, and the Advisor context every shared
// editor header's Advisor button reads.
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { EnvelopeMessageType } from "@quodsi/lucid-shared";
import { ModelPanel } from "../ModelPanel";

const mocks = vi.hoisted(() => ({
  panel: {
    modelName: "Clinic",
    currentElement: null as any,
    validationState: null,
    isLoading: false,
    needsInitialization: true,
    diagramElementType: null,
    referenceData: {} as any,
    onElementUpdate: vi.fn(),
    onElementTypeChange: vi.fn(),
    onValidate: vi.fn(),
    onRemoveModel: vi.fn(),
  },
  auth: { isAuthenticated: true },
  openDiagramMappingModal: vi.fn(),
  openAdvisorModal: vi.fn(),
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
    openDiagramMappingModal: mocks.openDiagramMappingModal,
    openSettingsModal: vi.fn(),
    openAdvisorModal: mocks.openAdvisorModal,
  }),
}));
vi.mock("../../shared", () => ({ AccountStrip: () => <div /> }));
vi.mock("../PanelHeader", () => ({ PanelHeader: () => <div /> }));
vi.mock("../ModelDefinitionViewer", () => ({ ModelDefinitionViewer: () => <div /> }));
vi.mock("../../../utils/pendingNavigation", () => ({
  consumePendingModelEditorTab: () => null,
}));
// Stand-in element editor: two real shared EditorHeaders, so the test drives
// the Advisor context ModelPanel supplies without mounting whole shared editors.
vi.mock("../ElementEditor", async () => {
  // `quodsi_studio/platforms/shared` is never mocked here, so a plain dynamic
  // import returns the real module. vi.importActual hits a module-resolution
  // error for this bare package specifier from inside a hoisted vi.mock
  // factory (harness quirk, unrelated to the behavior under test) — this is
  // the smallest adjustment that keeps two real EditorHeaders in the DOM.
  const { EditorHeader } = await import("quodsi_studio/platforms/shared");
  return {
    ElementEditor: () => (
      <>
        <EditorHeader type="Model" name="Clinic" />
        <EditorHeader type="Activity" name="Triage" focusId="a1" />
      </>
    ),
  };
});

type Posted = { id: string; type: string; data: any };
let posted: Posted[];
const originalPost = window.parent.postMessage;

beforeEach(() => {
  posted = [];
  window.parent.postMessage = ((msg: Posted) => { posted.push(msg); }) as never;
  localStorage.clear();
  mocks.panel.needsInitialization = true;
  mocks.panel.currentElement = null;
  mocks.auth.isAuthenticated = true;
  mocks.openDiagramMappingModal.mockClear();
  mocks.openAdvisorModal.mockClear();
});
afterEach(() => {
  window.parent.postMessage = originalPost;
});

const hostReplies = (data: object) =>
  act(() => { window.dispatchEvent(new MessageEvent("message", { data })); });
const advisorButtons = () => screen.queryAllByRole("button", { name: /ask the advisor/i });

describe("ModelPanel — unconverted page shows the shared blank-slate card", () => {
  it("asks the host for the page counts and shows them", () => {
    render(<ModelPanel />);
    expect(screen.getByText("Get started")).toBeInTheDocument();
    expect(posted.map((m) => m.type)).toContain(EnvelopeMessageType.PAGE_COUNTS_REQUEST);
    hostReplies({ id: "c", type: EnvelopeMessageType.PAGE_COUNTS, data: { pageId: "pg-1", shapeCount: 12, lineCount: 9 } });
    expect(screen.getByText(/12 shapes and 9 lines/)).toBeInTheDocument();
  });

  it("converts through AUTO_CONVERT_PAGE and shows the host's failure with Retry", async () => {
    render(<ModelPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Convert Diagram to Model" }));
    const request = posted.find((m) => m.type === EnvelopeMessageType.AUTO_CONVERT_PAGE)!;
    expect(request.data).toEqual({ documentId: "doc-1", pageId: "pg-1" });
    hostReplies({ id: request.id, type: EnvelopeMessageType.AUTO_CONVERT_PAGE_RESULT, data: { success: false, error: "page locked" } });
    expect(await screen.findByText("Conversion failed: page locked")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("opens Diagram Mapping from the review link", () => {
    render(<ModelPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Review & convert first…" }));
    expect(mocks.openDiagramMappingModal).toHaveBeenCalledTimes(1);
  });

  it("offers the Advisor on the card when signed in, focused on the model", () => {
    render(<ModelPanel />);
    fireEvent.click(screen.getByRole("button", { name: /ask the advisor/i }));
    expect(mocks.openAdvisorModal).toHaveBeenCalledWith({
      focusId: "",
      focusType: "Model",
      focusName: undefined,
      mode: "definition",
    });
  });
});

describe("ModelPanel — the Advisor for everyone signed in", () => {
  beforeEach(() => {
    mocks.panel.needsInitialization = false;
    mocks.panel.currentElement = { id: "a1", metadata: { type: "Activity" }, data: { name: "Triage" } };
  });

  it("with developer mode off, each shared editor header's Advisor button opens that element's consult", () => {
    render(<ModelPanel />);
    const [modelButton, activityButton] = advisorButtons();
    fireEvent.click(modelButton);
    expect(mocks.openAdvisorModal).toHaveBeenLastCalledWith({
      focusId: "",
      focusType: "Model",
      focusName: "Clinic",
      mode: "definition",
    });
    fireEvent.click(activityButton);
    expect(mocks.openAdvisorModal).toHaveBeenLastCalledWith({
      focusId: "a1",
      focusType: "Activity",
      focusName: "Triage",
      mode: "definition",
    });
  });

  it("signed out, no Advisor button shows, converted or not", () => {
    mocks.auth.isAuthenticated = false;
    const { unmount } = render(<ModelPanel />);
    expect(advisorButtons()).toHaveLength(0);
    unmount();

    mocks.panel.needsInitialization = true;
    render(<ModelPanel />);
    expect(advisorButtons()).toHaveLength(0);
  });
});
