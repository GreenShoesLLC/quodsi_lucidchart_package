// ElementEditor's Activity case renders Lucid's wrapper around Studio's shared
// ActivityEditor, keyed on the Lucid page (spec 2026-09-14
// lucid-shared-activity-editor §3): a page switch starts a fresh model-root
// source, a same-page rerender keeps it.
import React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import { EnvelopeMessageType, SimulationObjectType, StateListManager } from '@quodsi/lucid-shared'
import { setView } from 'quodsi_studio/platforms/shared'
import { resetModelRootWritesForTests } from '../../../adapters/modelRootWrites'

const messaging = vi.hoisted(() => ({ current: {} as any }))
vi.mock('../../../messaging/MessageProvider', () => ({ useMessaging: () => messaging.current }))
vi.mock('../../../messaging/senders/modelOpsSender', () => ({
  useModelOpsSender: () => ({
    updateResourceRequirements: vi.fn(async () => {}),
    updateElement: vi.fn(async () => {}),
    selectElement: vi.fn(),
    updateElementData: vi.fn(),
  }),
}))

import { ElementEditor } from '../ElementEditor'

let requests = 0

function setPage(pageId: string) {
  messaging.current = {
    app: { panelType: 'model' },
    selection: { lastUpdated: 1, documentContext: { pageId } },
    sendMessage: vi.fn(),
  }
}

/** Answers every MODEL_ROOT_REQUEST with a snapshot for the page the selection names. */
function installHost() {
  requests = 0
  vi.spyOn(window.parent, 'postMessage').mockImplementation((envelope: any) => {
    if (envelope?.type !== EnvelopeMessageType.MODEL_ROOT_REQUEST) return
    requests += 1
    const pageId = messaging.current.selection.documentContext.pageId
    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          id: envelope.id,
          type: EnvelopeMessageType.MODEL_ROOT_SNAPSHOT,
          source: 'host',
          target: 'model-iframe',
          version: '1.0',
          data: {
            projection: {
              pageId,
              activities: [{ id: 'a1', name: `Triage ${pageId}`, capacity: 1, levers: [], actions: [] }],
              generators: [], connectors: [], entities: [], states: [], resources: [], resourceRequirements: [],
              workSchedules: [], arrivalPatterns: [], arrivalSchedules: [], model: {},
            },
          },
        },
      }),
    )
  })
}

const props = () => ({
  elementType: SimulationObjectType.Activity,
  elementData: { id: 'a1' },
  onSave: vi.fn(),
  referenceData: { pageId: 'page-a', connectors: [] } as any,
  states: new StateListManager(),
})

describe('ElementEditor — the Activity case is the shared editor, one source per Lucid page', () => {
  beforeEach(() => {
    setView('basic')
    setPage('page-a')
    installHost()
  })

  afterEach(() => {
    cleanup()
    resetModelRootWritesForTests()
    vi.restoreAllMocks()
  })

  it('renders the shared Activity editor for a selected activity', async () => {
    render(<ElementEditor {...props()} />)
    expect(await screen.findByRole('tab', { name: 'Basic' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Triage page-a')).toBeInTheDocument()
  })

  it('starts a fresh model-root source on a page switch, and keeps it on a same-page rerender', async () => {
    const { rerender } = render(<ElementEditor {...props()} />)
    await screen.findByRole('tab', { name: 'Basic' })
    expect(requests).toBe(1)

    rerender(<ElementEditor {...props()} />)
    expect(requests).toBe(1)

    setPage('page-b')
    rerender(<ElementEditor {...props()} />)
    expect(requests).toBe(2)
    expect(await screen.findByDisplayValue('Triage page-b')).toBeInTheDocument()
  })
})
