// Complexity Views, Lucid half (Task 11b review round 1, Important 1).
//
// Review found that ActivityEditor's tab-bar tell (mounted directly under
// TAB_CONFIG, threaded onOpenSettings in the earlier commit) is not the
// only tell in this editor -- the shared ConnectorRoutingView mounts a
// SEPARATE per-connector tell inside the Routing tab (CONNECTOR_SURFACES,
// `ConnectorRoutingView.tsx:509`), and it was left without onOpenSettings.
// Before this fix, opening the Routing tab of a Basic-view model with
// entity-template routing configured showed a tell whose "Switch to
// Intermediate" button silently flipped the viewer's preference instead of
// opening Settings -- the exact defect this task exists to fix, harder to
// notice here because it lives inside a tab's content rather than the
// tab-bar itself.

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActivityEditor from "../ActivityEditor";
import { StateListManager } from "@quodsi/lucid-shared";
import { getView, setView } from "quodsi_studio/platforms/shared";
import { EnvelopeMessageType, DEFAULT_MODAL_SIZE } from "@quodsi/lucid-shared";

vi.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({
    updateResourceRequirements: vi.fn(async () => {}),
    updateElement: vi.fn(async () => {}),
    selectElement: vi.fn(),
    updateElementData: vi.fn(),
  }),
}));

vi.mock("../../../messaging/hooks/useElementOpsState", () => ({
  useElementOpsState: () => ({ isSaving: () => false }),
}));

vi.mock("../SaveStatusLine", () => ({
  __esModule: true,
  default: () => <div />,
}));

// vi.hoisted, same idiom GeneratorEditor.settingsModal.test.tsx uses: a
// hoisted spy stands in for the terminal sendMessage so the assertion below
// exercises the REAL useSimulationRunSender -> useSender ->
// useMessaging().sendMessage chain building the OPEN_SETTINGS_MODAL
// payload, not a stub.
const { mockSendMessage } = vi.hoisted(() => ({
  mockSendMessage: vi.fn(),
}));

vi.mock("../../../messaging/MessageProvider", () => ({
  useMessaging: () => ({ app: { panelType: "model" }, sendMessage: mockSendMessage }),
}));

const referenceData = {
  activities: [
    { id: 'act-1', name: 'Intake', routing: 'entity_template' },
    { id: 'a2', name: 'Exam' },
    { id: 'a3', name: 'Lab' },
  ],
  connectors: [
    // entityId present -> connectorHasEntityTemplate is true -> the surface
    // is "hidden and in use" in Basic -> the per-card ViewTell renders.
    { id: 'c1', sourceId: 'act-1', targetId: 'a2', weight: 1, entityId: 'ent-1' },
    { id: 'c2', sourceId: 'act-1', targetId: 'a3', weight: 1 },
  ],
  generators: [],
  entities: [{ id: 'ent-1', name: 'Widget' }],
  states: [],
  resources: [],
  resourceRequirements: [],
} as any

const activity = {
  id: 'act-1', name: 'Intake', capacity: 1, inboundCapacity: 999999, outboundCapacity: 999999,
  actions: [],
} as any

const ROUTING_TAB_NAME = /configure how entities are routed/i

describe("ActivityEditor's Routing tab — the shared ConnectorRoutingView's per-connector tell opens Settings, not the view directly", () => {
  beforeEach(() => {
    setView("basic");
    mockSendMessage.mockClear();
  });
  afterEach(() => setView("basic"));

  async function renderOnRoutingTab() {
    const user = userEvent.setup();
    render(
      <ActivityEditor
        activity={activity}
        onSave={vi.fn()}
        states={new StateListManager()}
        onStatesChange={vi.fn()}
        referenceData={referenceData}
      />
    );
    await user.click(screen.getByRole('button', { name: ROUTING_TAB_NAME }));
  }

  it('sends OPEN_SETTINGS_MODAL when the per-connector tell\'s switch affordance is clicked, and leaves the view untouched', async () => {
    await renderOnRoutingTab();

    // The per-connector tell -- distinct from the tab-bar tell, which is a
    // sibling `role="note"` mounted once above the tab content and would
    // not name "entity template" specifically.
    const note = screen.getByRole('note');
    expect(note).toHaveTextContent(/entity-template routing/i);

    fireEvent.click(screen.getByRole('button', { name: /switch to intermediate/i }));

    expect(mockSendMessage).toHaveBeenCalledWith(
      EnvelopeMessageType.OPEN_SETTINGS_MODAL,
      { modalSize: DEFAULT_MODAL_SIZE }
    );
    // ViewTell's fallback (setView(target)) must NOT have fired.
    expect(getView()).toBe('basic');
  });
});
