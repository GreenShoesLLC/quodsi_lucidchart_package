// LucidGeneratorEditor over the real chain (spec 2026-09-14
// lucid-shared-generator-editor §1, §3): the real composite accessor and
// Studio's real GeneratorEditor; only the host and the senders are faked.
import React from 'react'
import { render, screen, fireEvent, act, waitFor, cleanup } from '@testing-library/react'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'
import { setView } from 'quodsi_studio/platforms/shared'
import { MODEL_ROOT_DEBOUNCE_MS } from '../../../adapters/useModelRootSource'
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
  useSimulationRunSender: () => ({
    openPatternModal: vi.fn(),
    openScheduleModal: vi.fn(),
    openSettingsModal: vi.fn(),
  }),
}))

import { LucidGeneratorEditor } from '../LucidGeneratorEditor'

const ERROR = 'Could not save the type change. Try again.'

function departure() {
  return {
    id: 'as-dep',
    type: 'assign',
    name: 'Stamp arrival',
    condition: { stateId: 's1', comparison: 'equal', value: 1 },
    modifications: [{ stateId: 's1', operation: 'assign', value: 2 }],
  }
}
function arrival() {
  return { id: 'as-arr', type: 'assign', modifications: [{ stateId: 's1', operation: 'assign', value: 3 }] }
}
function generator(overrides: Record<string, unknown> = {}) {
  return {
    id: 'g1',
    name: 'Arrivals',
    entityId: 'e1',
    mode: 'frequency',
    interarrivalTime: { unit: 'minutes', value: 5 },
    levers: [],
    ...overrides,
  }
}
/** The model-root projection: connector actions are SUMMARIES (no condition, no name). */
function projection() {
  return {
    pageId: 'page-1',
    generators: [generator()],
    activities: [{ id: 'a1', name: 'Triage' }],
    connectors: [
      {
        id: 'c1',
        sourceId: 'g1',
        targetId: 'a1',
        weight: 1,
        actions: [
          { id: 'as-dep', type: 'assign', modifications: departure().modifications },
          { id: 'as-arr', type: 'assign', modifications: arrival().modifications },
        ],
      },
    ],
    entities: [{ id: 'e1', name: 'Patient' }],
    states: [],
    arrivalPatterns: [],
    arrivalSchedules: [],
    model: {},
  }
}
/** The selection's reference data: FULL connector records. */
function referenceData() {
  return {
    pageId: 'page-1',
    activities: [{ id: 'a1', name: 'Triage' }],
    generators: [{ id: 'g1', name: 'Arrivals' }],
    entities: [{ id: 'e1', name: 'Patient' }],
    states: [],
    connectors: [{ id: 'c1', sourceId: 'g1', targetId: 'a1', weight: 1, actions: [departure(), arrival()] }],
  } as any
}

function installHost(options: { refuse?: boolean } = {}) {
  const posted: any[] = []
  vi.spyOn(window.parent, 'postMessage').mockImplementation((envelope: any) => {
    posted.push(envelope)
    if (envelope?.type === EnvelopeMessageType.MODEL_ROOT_UPDATE) {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            id: envelope.id,
            type: EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT,
            data: options.refuse ? { success: false, errorMessage: 'storage write failed' } : { success: true },
          },
        }),
      )
    }
  })
  return posted
}

/** A snapshot after another window (e.g. the pattern modal) renamed the generator and changed its entity. */
function otherWindowProjection(generatorOverrides: Record<string, unknown>) {
  return {
    ...projection(),
    generators: [generator(generatorOverrides)],
    entities: [
      { id: 'e1', name: 'Patient' },
      { id: 'e2', name: 'Visitor' },
    ],
  }
}

let snapshotCount = 0
/** An unsolicited snapshot: its envelope id matches no batch this panel sent. */
function pushSnapshot(next: unknown = projection()) {
  act(() => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { id: `snap-${++snapshotCount}`, type: EnvelopeMessageType.MODEL_ROOT_SNAPSHOT, data: { projection: next } },
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
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  setView('basic')
})

describe('LucidGeneratorEditor — the shared editor over Lucid data', () => {
  it('shows "Loading model…" until the first snapshot, then the shared tabs', () => {
    setView('intermediate')
    installHost()
    render(<LucidGeneratorEditor shapeId="g1" referenceData={referenceData()} />)
    expect(screen.getByText('Loading model…')).toBeInTheDocument()

    pushSnapshot()

    for (const name of ['Basic', 'States', 'Routing', 'Levers']) {
      expect(screen.getByRole('tab', { name })).toBeInTheDocument()
    }
  })

  it('sends a name edit as one batched MODEL_ROOT_UPDATE carrying the generator shape edit', async () => {
    vi.useFakeTimers()
    const posted = installHost()
    render(<LucidGeneratorEditor shapeId="g1" referenceData={referenceData()} />)
    pushSnapshot()

    fireEvent.change(screen.getByDisplayValue('Arrivals'), { target: { value: 'Walk-ins' } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MODEL_ROOT_DEBOUNCE_MS)
    })

    const sent = updates(posted)
    expect(sent).toHaveLength(1)
    expect(sent[0].data.shapes).toEqual([
      expect.objectContaining({ shapeId: 'g1', type: 'Generator', patch: expect.objectContaining({ name: 'Walk-ins' }) }),
    ])
  })

  it('shows a generator change pushed from another window', () => {
    installHost()
    render(<LucidGeneratorEditor shapeId="g1" referenceData={referenceData()} />)
    pushSnapshot()
    expect(screen.getByDisplayValue('Arrivals')).toBeInTheDocument()

    pushSnapshot(otherWindowProjection({ name: 'Night arrivals', entityId: 'e2' }))

    expect(screen.getByDisplayValue('Night arrivals')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Visitor')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Arrivals')).toBeNull()
  })

  it("keeps a typed name that has not been sent when another window's snapshot arrives", async () => {
    vi.useFakeTimers()
    const posted = installHost()
    render(<LucidGeneratorEditor shapeId="g1" referenceData={referenceData()} />)
    pushSnapshot()

    fireEvent.change(screen.getByDisplayValue('Arrivals'), { target: { value: 'Walk-ins' } })
    pushSnapshot(otherWindowProjection({ entityId: 'e2' }))

    expect(updates(posted)).toHaveLength(0)
    expect(screen.getByDisplayValue('Walk-ins')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Visitor')).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(MODEL_ROOT_DEBOUNCE_MS)
    })

    const sent = updates(posted)
    expect(sent).toHaveLength(1)
    expect(sent[0].data.shapes).toEqual([
      expect.objectContaining({ shapeId: 'g1', type: 'Generator', patch: expect.objectContaining({ name: 'Walk-ins' }) }),
    ])
    expect(sent[0].data.shapes[0].patch).not.toHaveProperty('entityId')
  })

  it("saves a Routing move-time edit through ELEMENT_UPDATE with the departure's condition and name intact", async () => {
    const posted = installHost()
    render(<LucidGeneratorEditor shapeId="g1" referenceData={referenceData()} />)
    pushSnapshot()

    fireEvent.click(screen.getByRole('tab', { name: 'Routing' }))
    fireEvent.click(screen.getByTestId('connector-header-c1'))
    fireEvent.click(screen.getByTestId('connector-move-time-add'))

    await waitFor(() => expect(h.updateElement).toHaveBeenCalled())
    const [elementId, type, data] = h.updateElement.mock.calls[0]
    expect(elementId).toBe('c1')
    expect(type).toBe('Connector')
    const actions = (data as { actions: Array<Record<string, unknown>> }).actions
    expect(actions[0]).toEqual(expect.objectContaining({ id: 'as-dep', name: 'Stamp arrival', condition: departure().condition }))
    expect(actions[1]).toEqual(expect.objectContaining({ type: 'delay' }))
    expect(actions[2]).toEqual(expect.objectContaining({ id: 'as-arr' }))
    expect(updates(posted).some((e) => (e.data.shapes ?? []).some((s: any) => s.shapeId === 'c1'))).toBe(false)
  })

  it('shows the type-change error when the host refuses a Rate→Pattern switch', async () => {
    setView('advanced')
    installHost({ refuse: true })
    render(<LucidGeneratorEditor shapeId="g1" referenceData={referenceData()} />)
    pushSnapshot()

    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'pattern' } })

    expect(await screen.findByRole('alert')).toHaveTextContent(ERROR)
  })
})
