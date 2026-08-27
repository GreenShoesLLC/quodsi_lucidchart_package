// Real ConnectorRoutingView (from the Studio shared barrel) driven by the
// real createReferenceDataAccessor over a fake updateElement sender. Ports
// the four behaviors the deleted RoutingConfigurationPanel.levers.test.tsx
// pinned (git show 3d32f98^:.../RoutingConfigurationPanel.levers.test.tsx)
// for CONNECTOR-scoped scenario-lever authoring, which lost coverage when
// that file was deleted in 3d32f98 even though ConnectorRoutingView still
// wires LeverAuthoringSection with objectType={ScenarioObjectType.CONNECTOR}
// per connector card and routes `onChange` through
// accessor.updateShape(connectorId, 'Connector', { levers: next }).
import { describe, it, expect, vi, type Mock } from 'vitest'
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

type UpdateElementMock = Mock<(id: string, type: string, data: Record<string, unknown>) => Promise<void>>

function renderView(referenceData: any, updateElement: UpdateElementMock = vi.fn(async () => {})) {
  const updateResourceRequirements = vi.fn(async () => {})
  const source = createReferenceDataAccessor(referenceData, () => ({ updateResourceRequirements, updateElement }))
  render(<ConnectorRoutingView sourceId="act-1" sourceType="Activity" accessor={source.accessor} />)
  return { updateElement }
}

/** Cards are an accordion (Studio, 2026-08-26): Lever authoring renders only
 *  on the EXPANDED card, and nothing is expanded until a header is clicked
 *  (or the view is given a selectedConnectorId). */
const expandCard = (id: string) => fireEvent.click(screen.getByTestId(`connector-header-${id}`))

describe('ConnectorRoutingView — CONNECTOR-scoped scenario-lever authoring (seam)', () => {
  it('lever section is absent while cards are collapsed, and collapsed itself once a card opens', () => {
    renderView(makeReferenceData())
    expect(screen.queryByTestId('lever-authoring')).toBeNull()
    expandCard('c1')
    // One disclosure toggle: the open card's.
    expect(screen.getAllByRole('button', { name: /scenario levers/i }).length).toBe(1)
    // Collapsed: the inner WEIGHT checkbox is not rendered.
    expect(screen.queryByLabelText(/use Weight as a scenario lever/i)).toBeNull()
  })

  it('shows an enabled-lever count badge while collapsed when a connector already has a lever', () => {
    const c1Levers = [
      createScenarioLever({ propertyName: ScenarioPropertyName.WEIGHT, label: 'Conn One — Weight', enabled: true }),
    ]
    renderView(makeReferenceData(c1Levers))
    expandCard('c1')
    // Still collapsed (no inner checkbox)...
    expect(screen.queryByLabelText(/use Weight as a scenario lever/i)).toBeNull()
    // ...but the badge surfaces the one enabled lever on c1.
    expect(screen.getByTestId('lever-count')).toHaveTextContent('1')
  })

  it('each connector gets its own lever-authoring section, one open at a time', () => {
    renderView(makeReferenceData())
    expandCard('c1')
    expect(screen.getAllByTestId('lever-authoring').length).toBe(1)
    fireEvent.click(screen.getByRole('button', { name: /scenario levers/i }))
    expect(screen.getAllByLabelText(/use Weight as a scenario lever/i).length).toBe(1)
    // Opening c2 closes c1: still exactly one section, now c2's.
    expandCard('c2')
    expect(screen.getAllByTestId('lever-authoring').length).toBe(1)
    expect(screen.getByTestId('connector-routing-card-c2')).toContainElement(screen.getByTestId('lever-authoring'))
  })

  it('enabling the WEIGHT lever dispatches updateElement(c1, Connector, { levers: [non-empty] })', async () => {
    const updateElement = vi.fn<(id: string, type: string, data: Record<string, unknown>) => Promise<void>>(async () => {})
    renderView(makeReferenceData(), updateElement)
    expandCard('c1')
    fireEvent.click(screen.getByRole('button', { name: /scenario levers/i }))
    const checkbox = screen.getByLabelText(/use Weight as a scenario lever/i) as HTMLInputElement
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
