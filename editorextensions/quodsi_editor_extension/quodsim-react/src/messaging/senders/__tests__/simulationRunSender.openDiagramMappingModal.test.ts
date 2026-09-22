// OPEN_DIAGRAM_MAPPING_MODAL carries only the window-size preference
// (ClickUp 86e39r8e4). The host opens the Diagram Mapping screen inline from
// its own bundle (spec 2026-09-15) and reads the current page itself, so the
// documentId/pageId the sender used to include were dead payload. Same
// convention as simulationRunSender.openAdvisorModal.test.ts: only the
// terminal sendMessage is a spy.
import { renderHook, act } from '@testing-library/react'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'

const { mockSendMessage } = vi.hoisted(() => ({ mockSendMessage: vi.fn() }))
vi.mock('../../MessageProvider', () => ({
  useMessaging: () => ({ app: { panelType: 'model' }, sendMessage: mockSendMessage }),
}))

import { useSimulationRunSender } from '../simulationRunSender'

describe('useSimulationRunSender.openDiagramMappingModal', () => {
  beforeEach(() => {
    localStorage.clear()
    mockSendMessage.mockClear()
  })

  it('takes no arguments and sends only the modal size', () => {
    const { result } = renderHook(() => useSimulationRunSender())

    act(() => {
      ;(result.current.openDiagramMappingModal as () => void)()
    })

    expect(mockSendMessage).toHaveBeenCalledTimes(1)
    const [type, payload] = mockSendMessage.mock.calls[0]
    expect(type).toBe(EnvelopeMessageType.OPEN_DIAGRAM_MAPPING_MODAL)
    // Key-exact: toHaveBeenCalledWith would ignore `documentId: undefined`.
    expect(Object.keys(payload)).toEqual(['modalSize'])
    expect(payload.modalSize).toBe('xlarge')
  })
})
