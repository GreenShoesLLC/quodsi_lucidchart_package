// ElementEditor's Model case keys ModelEditorForPage on the Lucid page id
// (spec 2026-09-12 §4): a page switch unmounts the whole Model editor -- its
// source, draft and any open dialog -- and requests the new page's snapshot,
// so nothing can act on the previous page's data. Replaces the per-tab
// page-switch tests (StatesTab / EntitiesTab), whose keys moved here.
import React from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { EnvelopeMessageType, SimulationObjectType, StateListManager } from '@quodsi/lucid-shared'
import { setView } from 'quodsi_studio/platforms/shared'

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

const STATE = { id: 'state_a', name: 'state_a', componentType: 'model', dataType: 'number', initialValue: 0, collectStatistics: true }

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
              pageId, id: pageId, name: `Model ${pageId}`, replications: 10, levers: [],
              generators: [], arrivalPatterns: [], activities: [], connectors: [], entities: [],
              resources: [], resourceRequirements: [], states: [STATE],
              model: { id: pageId, name: `Model ${pageId}`, replications: 10, levers: [] },
            },
          },
        },
      }),
    )
  })
}

const props = (pageId: string) => ({
  elementType: SimulationObjectType.Model,
  elementData: { id: pageId },
  onSave: vi.fn(),
  referenceData: {} as any,
  states: new StateListManager(),
  activeTab: 'states' as const,
  onTabChange: vi.fn(),
})

describe('ElementEditor — the Model editor is one source per Lucid page', () => {
  beforeEach(() => {
    setView('intermediate')
    setPage('page-a')
    installHost()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    setView('basic')
  })

  it('remounts on a page switch: a new request, and an open delete dialog is gone', async () => {
    const { rerender } = render(<ElementEditor {...props('page-a')} />)
    expect(requests).toBe(1)

    fireEvent.click(await screen.findByLabelText('Delete state_a'))
    expect(screen.getByRole('button', { name: 'Delete State' })).toBeInTheDocument()

    setPage('page-b')
    rerender(<ElementEditor {...props('page-b')} />)

    expect(requests).toBe(2)
    expect(screen.queryByRole('button', { name: 'Delete State' })).toBeNull()
  })

  it('keeps the source and an open dialog on a rerender for the same page', async () => {
    const { rerender } = render(<ElementEditor {...props('page-a')} />)

    fireEvent.click(await screen.findByLabelText('Delete state_a'))
    rerender(<ElementEditor {...props('page-a')} />)

    expect(requests).toBe(1)
    expect(screen.getByRole('button', { name: 'Delete State' })).toBeInTheDocument()
  })
})
