// LucidActivityEditor over the real chain (spec 2026-09-14
// lucid-shared-activity-editor §3): the real composite accessor and Studio's
// real ActivityEditor; only the host and the senders are faked.
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
  useSimulationRunSender: () => ({ openSettingsModal: vi.fn() }),
}))

import { LucidActivityEditor } from '../LucidActivityEditor'

/** Studio's Classic/Recipe preference key (SP/hooks/useActionEditorView.ts). */
const ACTION_VIEW_KEY = 'quodsi_action_editor_view_v2'

function departure() {
  return {
    id: 'as-dep',
    type: 'assign',
    name: 'Stamp arrival',
    condition: { stateId: 's-prio', comparison: 'equal', value: 1 },
    modifications: [{ stateId: 's-prio', operation: 'assign', value: 2 }],
  }
}
function arrival() {
  return { id: 'as-arr', type: 'assign', modifications: [{ stateId: 's-prio', operation: 'assign', value: 3 }] }
}
const PRIORITY_STATE = {
  id: 's-prio',
  name: 'priority',
  componentType: 'entity',
  dataType: 'number',
  initialValue: 0,
  collectStatistics: false,
}
const NURSE_REQUIREMENT = {
  id: 'nurse',
  name: 'Nurse',
  rootClause: { id: 'c-nurse', mode: 'require_all', requests: [{ resourceId: 'nurse' }] },
}

/** The model-root projection: full activity records, connector actions as SUMMARIES (no condition, no name). */
function projection() {
  return {
    pageId: 'page-1',
    activities: [
      {
        id: 'a1',
        name: 'Triage',
        capacity: 1,
        levers: [],
        queueRanking: { stateId: 's-prio', order: 'ascending' },
        workScheduleId: 'ws1',
        actions: [
          {
            id: 'd1',
            type: 'delay_with_resource',
            resourceRequirementId: null,
            keepResource: false,
            modifications: [],
            condition: null,
            duration: { unit: 'minutes', value: 5 },
          },
        ],
      },
      { id: 'a2', name: 'Discharge', capacity: 1, levers: [], actions: [] },
      { id: 'a3', name: 'Scripted', capacity: 1, levers: [], actions: [{ id: 'sc1', type: 'script', source: 'entity.priority = 1' }] },
    ],
    generators: [],
    connectors: [
      {
        id: 'c1',
        sourceId: 'a1',
        targetId: 'a2',
        weight: 1,
        actions: [
          { id: 'as-dep', type: 'assign', modifications: departure().modifications },
          { id: 'as-arr', type: 'assign', modifications: arrival().modifications },
        ],
      },
    ],
    entities: [{ id: 'e1', name: 'Patient' }],
    states: [PRIORITY_STATE],
    resources: [{ id: 'nurse', name: 'Nurse' }],
    resourceRequirements: [NURSE_REQUIREMENT],
    workSchedules: [{ id: 'ws1', name: 'Day shift' }],
    arrivalPatterns: [],
    arrivalSchedules: [],
    model: {},
  }
}
/** The selection's reference data: FULL connector records. */
function referenceData() {
  return {
    pageId: 'page-1',
    activities: [{ id: 'a1', name: 'Triage' }, { id: 'a2', name: 'Discharge' }],
    generators: [],
    entities: [{ id: 'e1', name: 'Patient' }],
    states: [PRIORITY_STATE],
    resources: [{ id: 'nurse', name: 'Nurse' }],
    resourceRequirements: [NURSE_REQUIREMENT],
    connectors: [{ id: 'c1', sourceId: 'a1', targetId: 'a2', weight: 1, actions: [departure(), arrival()] }],
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

let snapshotCount = 0
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
  localStorage.removeItem(ACTION_VIEW_KEY)
})

describe('LucidActivityEditor — the shared editor over Lucid data', () => {
  it('shows "Loading model…" until the first snapshot, then the shared tabs', () => {
    setView('advanced')
    installHost()
    render(<LucidActivityEditor shapeId="a1" referenceData={referenceData()} />)
    expect(screen.getByText('Loading model…')).toBeInTheDocument()

    pushSnapshot()

    for (const name of ['Basic', 'Actions', 'Financial', 'Failure', 'Routing', 'Levers']) {
      expect(screen.getByRole('tab', { name })).toBeInTheDocument()
    }
  })

  it('sends a name edit as one batched MODEL_ROOT_UPDATE carrying the activity shape edit', async () => {
    vi.useFakeTimers()
    const posted = installHost()
    render(<LucidActivityEditor shapeId="a1" referenceData={referenceData()} />)
    pushSnapshot()

    fireEvent.change(screen.getByDisplayValue('Triage'), { target: { value: 'Intake' } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MODEL_ROOT_DEBOUNCE_MS)
    })

    const sent = updates(posted)
    expect(sent).toHaveLength(1)
    expect(sent[0].data.shapes).toEqual([
      expect.objectContaining({ shapeId: 'a1', type: 'Activity', patch: expect.objectContaining({ name: 'Intake' }) }),
    ])
  })

  it('warns about a duplicate name and still sends it', async () => {
    vi.useFakeTimers()
    const posted = installHost()
    render(<LucidActivityEditor shapeId="a1" referenceData={referenceData()} />)
    pushSnapshot()

    fireEvent.change(screen.getByDisplayValue('Triage'), { target: { value: 'Discharge' } })

    expect(screen.getByText('An Activity named "Discharge" already exists')).toBeInTheDocument()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MODEL_ROOT_DEBOUNCE_MS)
    })
    expect(updates(posted)[0].data.shapes[0].patch).toEqual(expect.objectContaining({ name: 'Discharge' }))
  })

  it('reports cleared queue ranking and work schedule link as clearedFields', async () => {
    vi.useFakeTimers()
    setView('advanced')
    const posted = installHost()
    render(<LucidActivityEditor shapeId="a1" referenceData={referenceData()} />)
    pushSnapshot()

    fireEvent.click(screen.getByRole('button', { name: /Advanced/i }))
    fireEvent.change(document.getElementById('queue-ranking-state') as HTMLSelectElement, { target: { value: '' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Fixed capacity' }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MODEL_ROOT_DEBOUNCE_MS)
    })

    const sent = updates(posted)
    expect(sent).toHaveLength(1)
    const shape = sent[0].data.shapes.find((s: any) => s.shapeId === 'a1')
    expect([...shape.clearedFields].sort()).toEqual(['queueRanking', 'workScheduleId'])
  })

  // The shared ActivityEditor lazy-loads ActionsTab, so the first test to open the
  // Actions tab pays a cold dynamic import (codemirror, @dnd-kit, Recipe view) that
  // can exceed Vitest's default 5s timeout under full-suite load.
  it('sends a new requirement in a flushed batch before the action points at it', async () => {
    setView('advanced')
    localStorage.setItem(ACTION_VIEW_KEY, 'classic')
    const posted = installHost()
    render(<LucidActivityEditor shapeId="a1" referenceData={referenceData()} />)
    pushSnapshot()

    fireEvent.click(screen.getByRole('tab', { name: 'Actions' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Expand action 1' }, { timeout: 15_000 }))
    fireEvent.click(screen.getByRole('button', { name: /^resource requirement$/i }))
    fireEvent.click(screen.getByRole('option', { name: /New requirement/ }))
    fireEvent.click(screen.getByRole('button', { name: /^Save( as new)?$/ }))

    await waitFor(() => expect(updates(posted).length).toBeGreaterThanOrEqual(2), { timeout: 3000 })
    const [requirementBatch, linkBatch] = updates(posted)
    const requirements = requirementBatch.data.patch.resourceRequirements as Array<{ id: string }>
    expect(requirements).toHaveLength(2)
    expect(requirementBatch.data.shapes).toBeUndefined()
    const newId = requirements[1].id
    const actions = linkBatch.data.shapes.find((s: any) => s.shapeId === 'a1').patch.actions
    expect(actions[0].resourceRequirementId).toBe(newId)
  }, 20_000)

  it("saves a Routing move-time edit through ELEMENT_UPDATE with the departure's condition and name intact", async () => {
    const posted = installHost()
    render(<LucidActivityEditor shapeId="a1" referenceData={referenceData()} />)
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

  it('shows an existing Script action read-only, with no script editor', async () => {
    setView('advanced')
    localStorage.setItem(ACTION_VIEW_KEY, 'classic')
    installHost()
    render(<LucidActivityEditor shapeId="a3" referenceData={referenceData()} />)
    pushSnapshot()

    fireEvent.click(screen.getByRole('tab', { name: 'Actions' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Expand action 1' }, { timeout: 15_000 }))

    expect(screen.getByTestId('script-action-offline')).toHaveTextContent('entity.priority = 1')
  }, 20_000)
})
