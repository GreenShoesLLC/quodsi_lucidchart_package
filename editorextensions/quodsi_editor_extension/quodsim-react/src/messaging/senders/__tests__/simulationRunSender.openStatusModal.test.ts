// OPEN_STATUS_MODAL carries no payload: the host opens the shared StatusPanel
// (?view=status) at a fixed size and puts the API base URL on its URL itself.
// Same convention as simulationRunSender.openDiagramMappingModal.test.ts.
import { renderHook, act } from '@testing-library/react'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'

const { mockSendMessage } = vi.hoisted(() => ({ mockSendMessage: vi.fn() }))
vi.mock('../../MessageProvider', () => ({
  useMessaging: () => ({ app: { panelType: 'model' }, sendMessage: mockSendMessage }),
}))

import { useSimulationRunSender } from '../simulationRunSender'

describe('useSimulationRunSender.openStatusModal', () => {
  beforeEach(() => mockSendMessage.mockClear())

  it('sends OPEN_STATUS_MODAL with an empty payload', () => {
    const { result } = renderHook(() => useSimulationRunSender())
    act(() => { result.current.openStatusModal() })
    expect(mockSendMessage).toHaveBeenCalledTimes(1)
    const [type, payload] = mockSendMessage.mock.calls[0]
    expect(type).toBe(EnvelopeMessageType.OPEN_STATUS_MODAL)
    expect(Object.keys(payload ?? {})).toEqual([])
  })
})
