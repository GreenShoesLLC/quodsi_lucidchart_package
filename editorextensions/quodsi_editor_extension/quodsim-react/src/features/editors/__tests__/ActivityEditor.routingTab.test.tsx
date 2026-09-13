import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActivityEditor from "../ActivityEditor";
import { StateListManager } from "@quodsi/lucid-shared";
import { setView } from "quodsi_studio/platforms/shared";

// This file predates Complexity Views and exercises the shared
// ConnectorRoutingView's State Condition / Entity Template modes, both
// 'intermediate' in the catalog. Pin the view for every test here rather
// than weaken any assertion -- view-gating itself is covered by
// viewGating.test.tsx / Studio's own viewFieldGating.test.tsx.
beforeEach(() => setView("intermediate"));
afterEach(() => setView("basic"));

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

// The editor now saves through the model-root source's batched shape queue
// (spec 2026-09-13 lucid-shape-writes §3), not a plain onSave prop. This fake
// source stands in for useModelRootSource so the second test below can
// assert on the patch handed to accessor.updateShape. `projection: null`
// keeps the editor drafting from the test's own selection fixture.
const { modelRoot } = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const snapshot = { modelDefinition: { activities: [], generators: [], workSchedules: [] }, saveStatus: "idle", saveError: null };
  return {
    modelRoot: {
      accessor: {
        subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; },
        getSnapshot: () => snapshot,
        updateShape: vi.fn(async (_id: string, _type: string, _patch: Record<string, unknown>) => {}),
        updateModel: vi.fn(async () => {}),
        flushModelImmediate: vi.fn(async () => {}),
      },
      projection: null,
      request: () => {},
    },
  };
});

vi.mock("../../../adapters/useModelRootSource", () => ({
  useModelRootSource: () => modelRoot,
  MODEL_ROOT_DEBOUNCE_MS: 400,
}));

beforeEach(() => {
  modelRoot.accessor.updateShape.mockClear();
});

vi.mock("../SaveStatusLine", () => ({
  __esModule: true,
  default: () => <div />,
}));

const referenceData = {
  activities: [
    { id: 'act-1', name: 'Intake', routing: 'probability' },
    { id: 'a2', name: 'Exam' },
    { id: 'a3', name: 'Lab' },
  ],
  connectors: [
    { id: 'c1', sourceId: 'act-1', targetId: 'a2', weight: 1 },
    { id: 'c2', sourceId: 'act-1', targetId: 'a3', weight: 1 },
  ],
  generators: [],
  entities: [],
  states: [],
  resources: [],
  resourceRequirements: [],
} as any

const activity = {
  id: 'act-1', name: 'Intake', capacity: 1, inboundCapacity: 999999, outboundCapacity: 999999,
  actions: [],
} as any

// The tab button is icon-only; its accessible name comes from the `title`
// attribute, which is TAB_CONFIG's `tooltip` field (NOT its `title` field --
// see ActivityEditor.tsx's TAB_CONFIG.map render), so the query below
// matches that tooltip text rather than the tab's own "Routing
// Configuration" label.
const ROUTING_TAB_NAME = /configure how entities are routed/i

describe('ActivityEditor — Routing Configuration tab renders the shared ConnectorRoutingView', () => {
  it('Routing Configuration tab renders the shared view with four modes', async () => {
    const user = userEvent.setup()
    render(<ActivityEditor activity={activity} states={new StateListManager()} referenceData={referenceData} />)
    await user.click(screen.getByRole('button', { name: ROUTING_TAB_NAME }))
    const select = screen.getByRole('combobox') // the view's mode select -- only one <select> renders in Probability mode
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual(['Probability', 'State Condition', 'Entity Template', 'First Available'])
    expect(screen.getByTestId('connector-routing-card-c1')).toBeInTheDocument()
  })

  it('choosing First Available flows through the editor draft to the model-root shape write', async () => {
    const user = userEvent.setup()
    render(<ActivityEditor activity={activity} states={new StateListManager()} referenceData={referenceData} />)
    await user.click(screen.getByRole('button', { name: ROUTING_TAB_NAME }))
    await user.selectOptions(screen.getByRole('combobox'), 'first_available')
    await waitFor(() => expect(modelRoot.accessor.updateShape).toHaveBeenCalled())
    const patch = modelRoot.accessor.updateShape.mock.calls.at(-1)![2] as any
    expect(patch.routing).toBe('first_available')
  })
})
