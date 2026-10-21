// Spec 2026-10-21 quodsi-version, Part C: when the API no longer supports this
// package, the panel says so in LucidChart's words.
import { act, render, screen } from '@testing-library/react'
import { CLIENT_OUTDATED_MESSAGE, emitClientOutdated, setClientOutdatedMessage } from 'quodsi_studio/platforms/shared'

let mockMessaging: any
vi.mock('../../messaging', () => ({ useMessaging: () => mockMessaging }))
vi.mock('../modelPanel', () => ({ ModelPanel: () => <div data-testid="model-panel" /> }))
vi.mock('../../messaging/senders/simulationRunSender', () => ({
  useSimulationRunSender: () => ({ openStudiesModal: vi.fn() }),
}))

import { LucidApp } from '../LucidApp'
import { LUCID_CLIENT_OUTDATED_MESSAGE, applyLucidClientOutdatedWording } from '../shared/clientOutdatedWording'

describe('LucidApp out-of-date notice', () => {
  const original = window.parent.postMessage
  beforeEach(() => {
    window.parent.postMessage = (() => {}) as never
    mockMessaging = {
      selection: { documentContext: { documentId: 'doc-1', pageId: 'pg-1', isQuodsiModel: false } },
      auth: { isAuthenticated: false },
    }
  })
  afterEach(() => {
    window.parent.postMessage = original
    setClientOutdatedMessage(CLIENT_OUTDATED_MESSAGE)
  })

  it('shows "Reload LucidChart" when the API refuses this package', () => {
    applyLucidClientOutdatedWording()
    render(<LucidApp />)
    act(() => emitClientOutdated({ code: 'client_outdated' }))
    expect(screen.getByRole('alert')).toHaveTextContent(LUCID_CLIENT_OUTDATED_MESSAGE)
    expect(LUCID_CLIENT_OUTDATED_MESSAGE).toBe('Quodsi has been updated. Reload LucidChart to get the latest version.')
  })
})
