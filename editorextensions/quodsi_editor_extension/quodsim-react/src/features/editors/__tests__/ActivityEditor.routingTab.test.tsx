import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActivityEditor from "../ActivityEditor";
import { StateListManager } from "@quodsi/lucid-shared";

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
    render(<ActivityEditor activity={activity} onSave={vi.fn()} states={new StateListManager()} onStatesChange={vi.fn()} referenceData={referenceData} />)
    await user.click(screen.getByRole('button', { name: ROUTING_TAB_NAME }))
    const select = screen.getByRole('combobox') // the view's mode select -- only one <select> renders in Probability mode
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual(['Probability', 'State Condition', 'Entity Template', 'First Available'])
    expect(screen.getByTestId('connector-routing-card-c1')).toBeInTheDocument()
  })

  it('choosing First Available flows through the editor draft to onSave', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<ActivityEditor activity={activity} onSave={onSave} states={new StateListManager()} onStatesChange={vi.fn()} referenceData={referenceData} />)
    await user.click(screen.getByRole('button', { name: ROUTING_TAB_NAME }))
    await user.selectOptions(screen.getByRole('combobox'), 'first_available')
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSave.mock.calls.at(-1)![0].routing).toBe('first_available')
  })
})
