// useModelRootRefreshOnSelection (spec 2026-09-14 lucid-shared-generator-editor
// §1): a changed selection.lastUpdated asks the model-root source for a fresh
// snapshot -- canvas edits and other writers push none of their own.
import { renderHook } from '@testing-library/react'

const messaging = vi.hoisted(() => ({ current: {} as any }))
vi.mock('../../messaging/MessageProvider', () => ({ useMessaging: () => messaging.current }))

import { useModelRootRefreshOnSelection } from '../useModelRootRefreshOnSelection'

function withLastUpdated(lastUpdated: number) {
  messaging.current = { selection: { lastUpdated } }
}

describe('useModelRootRefreshOnSelection', () => {
  it('does not request on mount or on a rerender with the same lastUpdated', () => {
    withLastUpdated(1)
    const request = vi.fn()
    const { rerender } = renderHook(() => useModelRootRefreshOnSelection(request))
    rerender()
    expect(request).not.toHaveBeenCalled()
  })

  it('requests once when lastUpdated changes', () => {
    withLastUpdated(1)
    const request = vi.fn()
    const { rerender } = renderHook(() => useModelRootRefreshOnSelection(request))

    withLastUpdated(2)
    rerender()

    expect(request).toHaveBeenCalledTimes(1)
  })

  it('tolerates a messaging context without a selection', () => {
    messaging.current = {}
    expect(() => renderHook(() => useModelRootRefreshOnSelection(vi.fn()))).not.toThrow()
  })
})
