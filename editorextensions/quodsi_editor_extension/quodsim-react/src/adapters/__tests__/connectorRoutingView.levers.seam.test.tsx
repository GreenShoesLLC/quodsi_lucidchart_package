// Real ConnectorEditor (from the Studio shared barrel) driven by the real
// createReferenceDataAccessor over a fake updateElement sender. Ports the
// behaviors the deleted RoutingConfigurationPanel.levers.test.tsx pinned
// (git show 3d32f98^:.../RoutingConfigurationPanel.levers.test.tsx) for
// CONNECTOR-scoped scenario-lever authoring.
//
// 2026-09-03 (Renee's Basic review): lever authoring left the routing card
// for ConnectorEditor's own Levers tab, so this file now renders the editor
// the Lucid ElementEditor Connector case renders (ConnectorEditor), not the
// bare ConnectorRoutingView. The write path is unchanged: the Levers tab
// routes `onChange` through accessor.updateShape(connectorId, 'Connector',
// { levers: next }), which the adapter sends as ELEMENT_UPDATE.
import { describe, it, expect, vi, type Mock } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ConnectorEditor } from 'quodsi_studio/platforms/shared'
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

function renderEditor(referenceData: any, shapeId = 'c1', updateElement: UpdateElementMock = vi.fn(async () => {})) {
  const updateResourceRequirements = vi.fn(async () => {})
  const source = createReferenceDataAccessor(referenceData, () => ({ updateResourceRequirements, updateElement }))
  render(<ConnectorEditor shapeId={shapeId} accessor={source.accessor} />)
  return { updateElement }
}

const openLeversTab = () => fireEvent.click(screen.getByRole('tab', { name: 'Levers' }))

describe('ConnectorEditor — CONNECTOR-scoped scenario-lever authoring (seam)', () => {
  it('routing card carries no lever section; the Levers tab renders it flat, without a disclosure', () => {
    renderEditor(makeReferenceData())
    // Routing is the default tab and the selected card opens expanded.
    expect(screen.getByTestId('connector-routing-card-c1')).toBeInTheDocument()
    expect(screen.queryByTestId('lever-authoring')).toBeNull()

    openLeversTab()
    expect(screen.getByTestId('lever-authoring')).toBeInTheDocument()
    // Flat variant: no "Scenario levers" disclosure to open first.
    expect(screen.queryByRole('button', { name: /scenario levers/i })).toBeNull()
    expect(screen.getByLabelText(/use Weight as a scenario lever/i)).toBeInTheDocument()
  })

  it('badges the Levers tab with the enabled-lever count when a connector already has a lever', () => {
    const c1Levers = [
      createScenarioLever({ propertyName: ScenarioPropertyName.WEIGHT, label: 'Conn One — Weight', enabled: true }),
    ]
    renderEditor(makeReferenceData(c1Levers))
    expect(screen.getByRole('tab', { name: 'Levers' })).toHaveTextContent('1')
    openLeversTab()
    expect((screen.getByLabelText(/use Weight as a scenario lever/i) as HTMLInputElement).checked).toBe(true)
  })

  it('authors the SELECTED connector only: c2 shows its own (empty) levers, not c1\'s', () => {
    const c1Levers = [
      createScenarioLever({ propertyName: ScenarioPropertyName.WEIGHT, label: 'Conn One — Weight', enabled: true }),
    ]
    renderEditor(makeReferenceData(c1Levers), 'c2')
    expect(screen.getByRole('tab', { name: 'Levers' })).not.toHaveTextContent('1')
    openLeversTab()
    expect(screen.getAllByTestId('lever-authoring').length).toBe(1)
    expect((screen.getByLabelText(/use Weight as a scenario lever/i) as HTMLInputElement).checked).toBe(false)
  })

  it('enabling the WEIGHT lever dispatches updateElement(c1, Connector, { levers: [non-empty] })', async () => {
    const updateElement = vi.fn<(id: string, type: string, data: Record<string, unknown>) => Promise<void>>(async () => {})
    renderEditor(makeReferenceData(), 'c1', updateElement)
    openLeversTab()
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
