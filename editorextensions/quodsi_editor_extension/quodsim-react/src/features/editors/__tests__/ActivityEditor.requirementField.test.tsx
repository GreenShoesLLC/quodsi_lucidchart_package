import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActivityEditor from "../ActivityEditor";
import { StateListManager } from "@quodsi/lucid-shared";

vi.mock("../../../messaging/senders/modelOpsSender", () => ({
  useModelOpsSender: () => ({
    updateResourceRequirements: vi.fn(async () => {}),
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
  resources: [{ id: 'doc', name: 'Doctor' }, { id: 'nurse', name: 'Nurse' }],
  resourceRequirements: [
    { id: 'doc', name: 'Doctor', rootClause: { id: 'c', mode: 'require_all', requests: [{ resourceId: 'doc' }] } },
    { id: 'nurse', name: 'Nurse', rootClause: { id: 'c', mode: 'require_all', requests: [{ resourceId: 'nurse' }] } },
    { id: 'req-1', name: 'Triage team', rootClause: { id: 'r', mode: 'require_any', requests: [{ resourceId: 'doc' }, { resourceId: 'nurse', quantity: 2 }] } },
  ],
  activities: [],
} as any

const activity = {
  id: 'act-1', name: 'Intake', capacity: 1, inboundCapacity: 999999, outboundCapacity: 999999,
  actions: [
    { id: 'a1', type: 'delay_with_resource', resourceRequirementId: null, duration: { value: 1, unit: 'MINUTES' } },
    { id: 'a2', type: 'seize' },
    { id: 'a3', type: 'release' },
  ],
} as any

async function expandAllActions(user: ReturnType<typeof userEvent.setup>) {
  const expandToggles = screen.getAllByRole('button', { name: /^expand$/i })
  for (const toggle of expandToggles) {
    await user.click(toggle)
  }
}

describe('ActivityEditor — shared RequirementField', () => {
  it('renders a picker (not a <select>) for Delay, Seize and Release, with the Studio labels', async () => {
    const user = userEvent.setup()
    render(<ActivityEditor activity={activity} onSave={vi.fn()} states={new StateListManager()} onStatesChange={vi.fn()} referenceData={referenceData} />)
    // Tabs are plain buttons (title-derived accessible name), not role="tab".
    await user.click(screen.getByRole('button', { name: /actions/i }))
    // Each SortableActionItem's expand toggle is a button titled "Expand"/"Collapse".
    await expandAllActions(user)
    const triggers = screen.getAllByRole('button', { name: /^resource requirement$/i })
    expect(triggers).toHaveLength(3)
    // Unrelated native selects remain (e.g. each action's own "Action Type"
    // dropdown) — scope to what a requirement select would be named.
    expect(screen.queryByRole('combobox', { name: /resource/i })).not.toBeInTheDocument()

    await user.click(triggers[0])                                    // Delay
    expect(screen.getByRole('option', { name: /\(none — just a delay\)/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /New requirement/ })).toBeInTheDocument()
    expect(screen.getByText('Requirements')).toBeInTheDocument()     // grouped
    expect(screen.getByText('Resources')).toBeInTheDocument()
    await user.keyboard('{Escape}')

    await user.click(triggers[1])                                    // Seize: no empty row
    expect(screen.queryByRole('option', { name: /none/ })).not.toBeInTheDocument()
    await user.keyboard('{Escape}')

    await user.click(triggers[2])                                    // Release
    expect(screen.getByRole('option', { name: /\(release all\)/ })).toBeInTheDocument()
  })

  it('picking a requirement writes it into the saved action', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<ActivityEditor activity={activity} onSave={onSave} states={new StateListManager()} onStatesChange={vi.fn()} referenceData={referenceData} />)
    await user.click(screen.getByRole('button', { name: /actions/i }))
    await expandAllActions(user)
    // navigate to the first action's picker as above
    await user.click(screen.getAllByRole('button', { name: /^resource requirement$/i })[0])
    await user.click(screen.getByRole('option', { name: /Triage team/ }))
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    const saved = onSave.mock.calls.at(-1)![0]
    expect(saved.actions[0].resourceRequirementId).toBe('req-1')
  })

  it('Failure tab renders the repair picker with "(none — no resource needed)"', async () => {
    const user = userEvent.setup()
    render(<ActivityEditor activity={activity} onSave={vi.fn()} states={new StateListManager()} onStatesChange={vi.fn()} referenceData={referenceData} />)
    await user.click(screen.getByRole('button', { name: /failure/i }))
    // Repair field is gated behind the "Enable Failure Simulation" checkbox.
    await user.click(screen.getByRole('checkbox', { name: /enable failure simulation/i }))
    await user.click(screen.getByRole('button', { name: /repair resource requirement/i }))
    expect(screen.getByRole('option', { name: /\(none — no resource needed\)/ })).toBeInTheDocument()
  })

  it('shows the resolved requirement name in the collapsed summary row (not "Unknown")', async () => {
    const user = userEvent.setup()
    const activityWithRequirement = {
      ...activity,
      actions: [
        { id: 'a2', type: 'seize', resourceRequirementId: 'req-1' },
      ],
    } as any
    render(<ActivityEditor activity={activityWithRequirement} onSave={vi.fn()} states={new StateListManager()} onStatesChange={vi.fn()} referenceData={referenceData} />)
    await user.click(screen.getByRole('button', { name: /actions/i }))
    // Collapsed (never expanded) — the summary row still resolves the name.
    expect(screen.getByText('Triage team')).toBeInTheDocument()
    expect(screen.queryByText('Unknown')).not.toBeInTheDocument()
  })
})
