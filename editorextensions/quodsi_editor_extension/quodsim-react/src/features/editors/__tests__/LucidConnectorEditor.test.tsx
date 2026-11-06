// LucidConnectorEditor over the real chain: the real composite accessor and
// Studio's real ConnectorEditor; only the host and the senders are faked.
// Smoke 2026-11-06: "+ New state" (with Lever ticked) in a connector's
// condition failed with "useReferenceDataAccessor.updateModel: no persistence
// path for key(s): states, levers" -- the connector wrote through the
// reference-data accessor alone.
import React from 'react'
import { render, screen, fireEvent, act, waitFor, cleanup, within } from '@testing-library/react'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'
import { setView } from 'quodsi_studio/platforms/shared'
import { resetModelRootWritesForTests } from '../../../adapters/modelRootWrites'

const h = vi.hoisted(() => ({
  messaging: {} as any,
  updateElement: vi.fn(async (_id: string, _type: string, _data: Record<string, unknown>) => {}),
}))

vi.mock('../../../messaging/MessageProvider', () => ({ useMessaging: () => h.messaging }))
vi.mock('../../../messaging/senders/modelOpsSender', () => ({
  useModelOpsSender: () => ({
    updateResourceRequirements: vi.fn(async () => {}),
    updateElement: h.updateElement,
    selectElement: vi.fn(),
    updateElementData: vi.fn(),
  }),
}))
vi.mock('../../../messaging/senders/simulationRunSender', () => ({
  useSimulationRunSender: () => ({ openSettingsModal: vi.fn() }),
}))

import { LucidConnectorEditor } from '../LucidConnectorEditor'

const STATE = { id: 's1', name: 'route_index', componentType: 'entity', dataType: 'number', initialValue: 0 }
const CONDITION = { stateId: 's1', comparison: 'equal', value: 1 }

function projection() {
  return {
    pageId: 'page-1',
    generators: [{ id: 'g1', name: 'Arrivals', entityId: 'e1', routing: 'state_condition', levers: [] }],
    activities: [{ id: 'a1', name: 'Triage' }],
    connectors: [{ id: 'c1', sourceId: 'g1', targetId: 'a1', weight: 1, condition: CONDITION }],
    entities: [{ id: 'e1', name: 'Patient' }],
    states: [STATE],
    arrivalPatterns: [],
    arrivalSchedules: [],
    model: { levers: [] },
  }
}
function referenceData() {
  return {
    pageId: 'page-1',
    activities: [{ id: 'a1', name: 'Triage' }],
    generators: [{ id: 'g1', name: 'Arrivals', routing: 'state_condition' }],
    entities: [{ id: 'e1', name: 'Patient' }],
    states: [STATE],
    connectors: [{ id: 'c1', sourceId: 'g1', targetId: 'a1', weight: 1, condition: CONDITION }],
  } as any
}

function installHost() {
  const posted: any[] = []
  vi.spyOn(window.parent, 'postMessage').mockImplementation((envelope: any) => {
    posted.push(envelope)
    if (envelope?.type === EnvelopeMessageType.MODEL_ROOT_UPDATE) {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { id: envelope.id, type: EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT, data: { success: true } },
        }),
      )
    }
  })
  return posted
}

function pushSnapshot() {
  act(() => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { id: 'snap-1', type: EnvelopeMessageType.MODEL_ROOT_SNAPSHOT, data: { projection: projection() } },
      }),
    )
  })
}

const updates = (posted: any[]) => posted.filter((e) => e?.type === EnvelopeMessageType.MODEL_ROOT_UPDATE)

beforeEach(() => {
  h.messaging = {
    app: { panelType: 'model' },
    selection: { lastUpdated: 1, documentContext: { pageId: 'page-1' } },
    sendMessage: vi.fn(),
  }
  h.updateElement.mockClear()
})

afterEach(() => {
  cleanup()
  resetModelRootWritesForTests()
  vi.restoreAllMocks()
  setView('basic')
})

describe('LucidConnectorEditor — the shared editor over Lucid data', () => {
  it('shows "Loading model…" until the first snapshot, then the routing card', () => {
    installHost()
    render(<LucidConnectorEditor shapeId="c1" referenceData={referenceData()} />)
    expect(screen.getByText('Loading model…')).toBeInTheDocument()
    pushSnapshot()
    expect(screen.getByTestId('connector-routing-card-c1')).toBeInTheDocument()
  })

  it('creates a State with its lever from the condition through the model-root write', async () => {
    setView('intermediate')
    const posted = installHost()
    render(<LucidConnectorEditor shapeId="c1" referenceData={referenceData()} />)
    pushSnapshot()

    const card = within(screen.getByTestId('connector-routing-card-c1'))
    fireEvent.change(card.getAllByRole('combobox')[0], { target: { value: '__new_state__' } })
    fireEvent.change(screen.getByPlaceholderText('e.g. Counter'), { target: { value: 'route_flag' } })
    fireEvent.click(screen.getByLabelText('Use this starting value as a scenario lever'))
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => expect(updates(posted).length).toBeGreaterThan(0))
    const patch = updates(posted).map((e) => e.data.patch).find((p) => p.states)
    expect(patch.states.map((s: { name: string }) => s.name)).toEqual(['route_index', 'route_flag'])
    expect(patch.levers).toEqual([expect.objectContaining({ label: 'route_flag — starting value' })])
    expect(screen.queryByText(/no persistence path/)).toBeNull()
  })

  it('still saves a routing edit through ELEMENT_UPDATE', async () => {
    const posted = installHost()
    render(<LucidConnectorEditor shapeId="c1" referenceData={referenceData()} />)
    pushSnapshot()

    fireEvent.change(screen.getByTestId('connector-priority-input-c1'), { target: { value: '2' } })

    await waitFor(() => expect(h.updateElement).toHaveBeenCalledWith('c1', 'Connector', { priority: 2 }))
    expect(updates(posted)).toHaveLength(0)
  })
})
