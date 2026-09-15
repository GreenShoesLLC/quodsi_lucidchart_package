// The deleted AdvisorLaunchButton.test.tsx was the only panel test that ran
// the real useSimulationRunSender -> useSender -> useMessaging().sendMessage
// chain and checked the OPEN_ADVISOR_MODAL payload including modalSize.
// Mirrors that test's own convention: only the terminal sendMessage is a
// spy (useMessaging's transport target), so this exercises the real
// useSimulationRunSender and useSender code building the envelope.
import { renderHook, act } from '@testing-library/react'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'

const { mockSendMessage } = vi.hoisted(() => ({ mockSendMessage: vi.fn() }))
vi.mock('../../MessageProvider', () => ({
  useMessaging: () => ({ app: { panelType: 'model' }, sendMessage: mockSendMessage }),
}))

import { useSimulationRunSender } from '../simulationRunSender'

describe('useSimulationRunSender.openAdvisorModal', () => {
  beforeEach(() => {
    localStorage.clear()
    mockSendMessage.mockClear()
  })

  it('sends OPEN_ADVISOR_MODAL with the focus fields and the default modal size', () => {
    const { result } = renderHook(() => useSimulationRunSender())

    act(() => {
      result.current.openAdvisorModal({
        focusId: 'a1',
        focusType: 'Activity',
        focusName: 'Triage',
        mode: 'definition',
      })
    })

    expect(mockSendMessage).toHaveBeenCalledWith(EnvelopeMessageType.OPEN_ADVISOR_MODAL, {
      focusId: 'a1',
      focusType: 'Activity',
      focusName: 'Triage',
      mode: 'definition',
      modalSize: 'xlarge',
    })
  })

  it('carries a stored non-default modal size preference', () => {
    localStorage.setItem('quodsi_modal_size', 'large')
    const { result } = renderHook(() => useSimulationRunSender())

    act(() => {
      result.current.openAdvisorModal({
        focusId: '',
        focusType: 'Model',
        focusName: 'Clinic',
        mode: 'definition',
      })
    })

    expect(mockSendMessage).toHaveBeenCalledWith(EnvelopeMessageType.OPEN_ADVISOR_MODAL, {
      focusId: '',
      focusType: 'Model',
      focusName: 'Clinic',
      mode: 'definition',
      modalSize: 'large',
    })
  })
})
