// ModelEditorForPage (spec 2026-09-12 §4): one model-root source per mount,
// nothing editable before the first snapshot, and a fresh snapshot whenever a
// selection message lands (canvas edits, the Advisor's Apply and embedded
// Studio writes push no MODEL_ROOT_SNAPSHOT of their own).
import React from 'react'
import { render, screen, act, cleanup } from '@testing-library/react'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'

const messaging = vi.hoisted(() => ({ current: {} as any }))
vi.mock('../../../messaging/MessageProvider', () => ({ useMessaging: () => messaging.current }))

import { ModelEditorForPage } from '../ModelEditorForPage'

const posted: any[] = []
const requests = () => posted.filter((e) => e?.type === EnvelopeMessageType.MODEL_ROOT_REQUEST).length

function pushSnapshot() {
  act(() => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          id: 'snap-1',
          type: EnvelopeMessageType.MODEL_ROOT_SNAPSHOT,
          source: 'host',
          target: 'model-iframe',
          version: '1.0',
          data: {
            projection: {
              pageId: 'page-1', id: 'model-1', name: 'Clinic', replications: 10, levers: [],
              generators: [], arrivalPatterns: [],
              model: { id: 'model-1', name: 'Clinic', replications: 10, levers: [] },
            },
          },
        },
      }),
    )
  })
}

beforeEach(() => {
  posted.length = 0
  vi.spyOn(window.parent, 'postMessage').mockImplementation((envelope: any) => { posted.push(envelope) })
  messaging.current = {
    app: { panelType: 'model' },
    selection: { lastUpdated: 1, documentContext: { pageId: 'page-1' } },
    sendMessage: vi.fn(),
  }
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ModelEditorForPage', () => {
  it('shows a loading line until the first snapshot, from exactly one model-root request', () => {
    render(<ModelEditorForPage />)

    expect(screen.getByText('Loading model…')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Enter model name')).toBeNull()
    expect(requests()).toBe(1)

    pushSnapshot()

    expect(screen.getByDisplayValue('Clinic')).toBeInTheDocument()
    expect(requests()).toBe(1)
  })

  it('re-requests a snapshot when selection.lastUpdated changes, and not on a same-value rerender', () => {
    const { rerender } = render(<ModelEditorForPage />)
    rerender(<ModelEditorForPage />)
    expect(requests()).toBe(1)

    messaging.current = { ...messaging.current, selection: { ...messaging.current.selection, lastUpdated: 2 } }
    rerender(<ModelEditorForPage />)

    expect(requests()).toBe(2)
  })
})
