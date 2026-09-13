import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'
import { useModelOpsSender } from '../modelOpsSender'
import { consumePendingModelEditorTab } from '../../../utils/pendingNavigation'

const { send } = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock('../useSender', () => ({ useSender: () => send }))
vi.mock('../../MessageContext', () => ({ useMessagingDispatch: () => vi.fn() }))

describe('useModelOpsSender.selectElement', () => {
  beforeEach(() => {
    send.mockClear()
    consumePendingModelEditorTab()
  })

  it('stores the target tab, then selects the model', () => {
    const { result } = renderHook(() => useModelOpsSender())
    result.current.selectElement('model', { targetTab: 'States' })
    expect(send).toHaveBeenCalledWith(EnvelopeMessageType.ELEMENT_SELECT, { elementId: 'model' })
    expect(consumePendingModelEditorTab()).toBe('States')
  })

  it('stores no tab when none is given', () => {
    const { result } = renderHook(() => useModelOpsSender())
    result.current.selectElement('model')
    expect(send).toHaveBeenCalledWith(EnvelopeMessageType.ELEMENT_SELECT, { elementId: 'model' })
    expect(consumePendingModelEditorTab()).toBeNull()
  })
})
