// Real ConnectorRoutingView (from the Studio shared barrel) driven by the
// real createReferenceDataAccessor over a fake updateElement sender. Ports
// the four behaviors the deleted RoutingConfigurationPanel.levers.test.tsx
// pinned (git show 3d32f98^:.../RoutingConfigurationPanel.levers.test.tsx)
// for CONNECTOR-scoped scenario-lever authoring, which lost coverage when
// that file was deleted in 3d32f98 even though ConnectorRoutingView still
// wires LeverAuthoringSection with objectType={ScenarioObjectType.CONNECTOR}
// per connector card and routes `onChange` through
// accessor.updateShape(connectorId, 'Connector', { levers: next }).
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ConnectorRoutingView } from 'quodsi_studio/platforms/shared'
import { ScenarioPropertyName, createScenarioLever, type ScenarioLever } from '@quodsi/lucid-shared'
import { createReferenceDataAccessor } from '../useReferenceDataAccessor'

const makeReferenceData = (c1Levers: ScenarioLever[] = []) => ({
  activities: [{ id: 'act-1', name: 'Intake', routing: 'probability' }],
  generators: [],
  connectors: [
    { id: 'c1', name: 'Conn One', sourceId: 'act-1', targetId: 'a2', weight: 1, levers: c1Levers },
    { id: 'c2', name: 'Conn Two', sourceId: 'act-1', targetId: 'a3', weight: 1, levers: [] },
  ],
  entities: [],
  states: [],
  resources: [],
  resourceRequirements: [],
}) as any

function renderView(referenceData: any, updateElement = vi.fn(async () => {})) {
  const updateResourceRequirements = vi.fn(async () => {})
  const source = createReferenceDataAccessor(referenceData, () => ({ updateResourceRequirements, updateElement }))
  render(<ConnectorRoutingView sourceId="act-1" sourceType="Activity" accessor={source.accessor} />)
  return { updateElement }
}

describe('ConnectorRoutingView — CONNECTOR-scoped scenario-lever authoring (seam)', () => {
  it('lever section is collapsed by default — toggle present per connector, inner WEIGHT checkbox hidden', () => {
    renderView(makeReferenceData())
    // One disclosure toggle per outgoing connector (c1, c2).
    expect(screen.getAllByRole('button', { name: /scenario levers/i }).length).toBe(2)
    // Collapsed: the inner WEIGHT checkbox is not rendered.
    expect(screen.queryByLabelText(/use Weight as a scenario lever/i)).toBeNull()
  })

  it('shows an enabled-lever count badge while collapsed when a connector already has a lever', () => {
    const c1Levers = [
      createScenarioLever({ propertyName: ScenarioPropertyName.WEIGHT, label: 'Conn One — Weight', enabled: true }),
    ]
    renderView(makeReferenceData(c1Levers))
    // Still collapsed (no inner checkbox)...
    expect(screen.queryByLabelText(/use Weight as a scenario lever/i)).toBeNull()
    // ...but the badge surfaces the one enabled lever on c1.
    expect(screen.getByTestId('lever-count')).toHaveTextContent('1')
  })

  it('renders one lever-authoring section per connector (2+ connectors)', () => {
    renderView(makeReferenceData())
    expect(screen.getAllByTestId('lever-authoring').length).toBe(2)
    // Expand both sections to reveal the inner WEIGHT checkbox.
    screen.getAllByRole('button', { name: /scenario levers/i }).forEach((btn) => fireEvent.click(btn))
    expect(screen.getAllByLabelText(/use Weight as a scenario lever/i).length).toBe(2)
  })

  it('enabling the WEIGHT lever dispatches updateElement(c1, Connector, { levers: [non-empty] })', async () => {
    const updateElement = vi.fn<(id: string, type: string, data: Record<string, unknown>) => Promise<void>>(async () => {})
    renderView(makeReferenceData(), updateElement)
    screen.getAllByRole('button', { name: /scenario levers/i }).forEach((btn) => fireEvent.click(btn))
    const checkbox = screen.getAllByLabelText(/use Weight as a scenario lever/i)[0] as HTMLInputElement
    expect(checkbox.checked).toBe(false)

    fireEvent.click(checkbox)

    await waitFor(() => expect(updateElement).toHaveBeenCalled())
    const [id, type, data] = updateElement.mock.calls.at(-1)!
    expect(id).toBe('c1')
    expect(type).toBe('Connector')
    const levers = (data as { levers: ScenarioLever[] }).levers
    expect(Array.isArray(levers)).toBe(true)
    expect(levers.length).toBeGreaterThan(0)
    expect(levers[0].propertyName).toBe(ScenarioPropertyName.WEIGHT)
    expect(levers[0].enabled).toBe(true)
  })
})
