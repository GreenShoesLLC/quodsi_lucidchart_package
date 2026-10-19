import { act, render, screen, waitFor } from '@testing-library/react'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'
import { lucidCapacityTradeoff, readTourState, writeTourState } from 'quodsi_studio/platforms/shared'

// Cold panel open: the extension flushes the queued TOUR_START on
// REACT_APP_READY before its AUTH_STATUS broadcast arrives.
let mockMessaging: any
vi.mock('../../messaging', () => ({ useMessaging: () => mockMessaging }))
vi.mock('../modelPanel', () => ({ ModelPanel: () => <div data-testid="model-panel" /> }))
vi.mock('../../messaging/senders/simulationRunSender', () => ({
  useSimulationRunSender: () => ({ openStudiesModal: vi.fn() }),
}))

import { LucidApp } from '../LucidApp'

const USER = 'ann@example.com'
const signedOut = () => ({
  selection: { documentContext: { documentId: 'doc-1', pageId: 'pg-1', isQuodsiModel: false } },
  auth: { isAuthenticated: false },
})

describe('LucidApp tour host', () => {
  const original = window.parent.postMessage
  beforeEach(() => {
    localStorage.clear()
    window.parent.postMessage = (() => {}) as never
    mockMessaging = signedOut()
  })
  afterEach(() => { window.parent.postMessage = original })

  it('puts panel.root on the app root and mounts the tour host before auth resolves', () => {
    const { container } = render(<LucidApp />)
    expect(container.querySelector('.lucid-app')).toHaveAttribute('data-quodsi-anchor', 'panel.root')
    const host = screen.getByTestId('panel-tour-host')
    // Above the model panel.
    expect(host.compareDocumentPosition(screen.getByTestId('model-panel')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('TOUR_START arrives, then auth resolves → tour starts at welcome (reset honoured)', async () => {
    writeTourState(USER, lucidCapacityTradeoff.id, { state: 'completed' })
    const { rerender } = render(<LucidApp />)
    await act(async () => {
      window.dispatchEvent(new MessageEvent('message', {
        data: { id: '', type: EnvelopeMessageType.TOUR_START, source: 'host', target: 'model-iframe', version: '1.0', data: { reset: true } },
      }))
    })
    expect(screen.getByTestId('tour-dock').textContent).toBe('')

    mockMessaging = { ...signedOut(), auth: { isAuthenticated: true, user: { email: USER } } }
    rerender(<LucidApp />)
    await waitFor(() => expect(screen.getByTestId('tour-dock').textContent).toContain("Let's test a business change"))
    expect(readTourState(USER, lucidCapacityTradeoff.id).currentStepId).toBe('welcome')
  })
})
