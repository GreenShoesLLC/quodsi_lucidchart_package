import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
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
  // Longer timeout: this test drives three separate popovers plus three
  // within-scoped container lookups, and has been observed to exceed the
  // default 5000ms under full-suite CPU contention (all 30+ files running
  // concurrently), unrelated to the assertions themselves.
  it('renders a picker (not a <select>) for Delay, Seize and Release, with the Studio labels', async () => {
    const user = userEvent.setup()
    render(<ActivityEditor activity={activity} onSave={vi.fn()} states={new StateListManager()} onStatesChange={vi.fn()} referenceData={referenceData} />)
    // Tabs are plain buttons (title-derived accessible name), not role="tab".
    await user.click(screen.getByRole('button', { name: /actions/i }))
    // Each SortableActionItem expand toggle is a button titled "Expand"/"Collapse".
    await expandAllActions(user)
    const triggers = screen.getAllByRole('button', { name: /^resource requirement$/i })
    expect(triggers).toHaveLength(3)

    // Regression guard: no native <select> lives inside any of the three
    // requirement fields' own wrapping <div> (label + control). This is NOT
    // vacuous the way `queryByRole('combobox', { name: /resource/i })` was:
    // the deleted selector's <label> was never associated with its <select>
    // (no htmlFor, and it did not wrap the control), so that old select had
    // an EMPTY accessible name and would never have matched a `/resource/i`
    // name filter either. Scoping to each field's own DOM container is what
    // makes this fail against the pre-change code, since the old <select>
    // sat inside the very same wrapping <div> as its label text.
    for (const label of ['Resource Requirement', 'Resource to Seize', 'Resource to Release']) {
      const fieldContainer = screen.getByText(label).closest('div')
      expect(fieldContainer).not.toBeNull()
      expect(within(fieldContainer as HTMLElement).queryByRole('combobox')).not.toBeInTheDocument()
    }

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
  }, 15000)

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

  it('choosing the empty row on Release saves resourceRequirementId: undefined', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    const activityWithReleaseRequirement = {
      ...activity,
      actions: [{ id: 'a3', type: 'release', resourceRequirementId: 'req-1' }],
    } as any
    render(<ActivityEditor activity={activityWithReleaseRequirement} onSave={onSave} states={new StateListManager()} onStatesChange={vi.fn()} referenceData={referenceData} />)
    await user.click(screen.getByRole('button', { name: /actions/i }))
    await expandAllActions(user)
    await user.click(screen.getByRole('button', { name: /^resource requirement$/i }))
    await user.click(screen.getByRole('option', { name: /\(release all\)/ }))
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    const saved = onSave.mock.calls.at(-1)![0]
    expect(saved.actions[0].resourceRequirementId).toBeUndefined()
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

  it('choosing the empty row on the Failure tab saves repairResourceRequirementId: ""', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    const activityWithRepair = {
      ...activity,
      failureProperties: { enabled: true, repairResourceRequirementId: 'req-1' },
    } as any
    render(<ActivityEditor activity={activityWithRepair} onSave={onSave} states={new StateListManager()} onStatesChange={vi.fn()} referenceData={referenceData} />)
    await user.click(screen.getByRole('button', { name: /failure/i }))
    await user.click(screen.getByRole('button', { name: /repair resource requirement/i }))
    await user.click(screen.getByRole('option', { name: /\(none — no resource needed\)/ }))
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    const saved = onSave.mock.calls.at(-1)![0]
    expect(saved.failureProperties.repairResourceRequirementId).toBe("")
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
