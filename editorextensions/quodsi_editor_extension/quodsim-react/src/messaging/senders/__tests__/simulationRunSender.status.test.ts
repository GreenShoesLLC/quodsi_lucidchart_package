// OPEN_STATUS_MODAL is gone (spec 2026-09-16): Status opens a browser tab from
// ModelPanel, so the sender no longer offers openStatusModal.
import { renderHook } from '@testing-library/react'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'

vi.mock('../../MessageProvider', () => ({
  useMessaging: () => ({ app: { panelType: 'model' }, sendMessage: vi.fn() }),
}))

import { useSimulationRunSender } from '../simulationRunSender'

describe('useSimulationRunSender — no Status modal', () => {
  it('does not offer openStatusModal', () => {
    const { result } = renderHook(() => useSimulationRunSender())
    expect('openStatusModal' in result.current).toBe(false)
  })

  it('the OPEN_STATUS_MODAL message type no longer exists', () => {
    expect((EnvelopeMessageType as Record<string, string>).OPEN_STATUS_MODAL).toBeUndefined()
  })
})
