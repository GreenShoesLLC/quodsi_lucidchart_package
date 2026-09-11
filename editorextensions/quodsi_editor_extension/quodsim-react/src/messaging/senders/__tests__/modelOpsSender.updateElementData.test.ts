// Page guard (spec 2026-09-11): a model settings write (ELEMENT_UPDATE,
// type 'Model') carries the page id of the data it was based on; shape
// writes carry none.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }))
vi.mock('../useSender', () => ({ useSender: () => sendMock }))
vi.mock('../../MessageContext', () => ({ useMessagingDispatch: () => vi.fn() }))

import { useModelOpsSender } from '../modelOpsSender'

describe('useModelOpsSender.updateElementData', () => {
  beforeEach(() => sendMock.mockClear())

  it('puts basedOnPageId in the ELEMENT_UPDATE data when given', () => {
    const { result } = renderHook(() => useModelOpsSender())

    result.current.updateElementData('model-1', 'Model', { name: 'M' }, undefined, 'page-1')

    expect(sendMock).toHaveBeenCalledWith(EnvelopeMessageType.ELEMENT_UPDATE, {
      elementId: 'model-1',
      type: 'Model',
      data: { name: 'M', id: 'model-1' },
      diagramElementType: undefined,
      basedOnPageId: 'page-1',
    })
  })

  it('omits basedOnPageId for a shape write', () => {
    const { result } = renderHook(() => useModelOpsSender())

    result.current.updateElementData('act-1', 'Activity', { capacity: 2 }, 'block')

    const payload = sendMock.mock.calls[0][1] as Record<string, unknown>
    expect('basedOnPageId' in payload).toBe(false)
  })
})
