import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'
import { useModelOpsSender } from '../modelOpsSender'

vi.mock('../useSender', () => ({ useSender: () => vi.fn() }))
vi.mock('../../MessageContext', () => ({ useMessagingDispatch: () => vi.fn() }))

type Posted = { id: string; type: string; data: unknown; source: string; target: string }

describe('useModelOpsSender.updateElement', () => {
  let posted: Posted[]
  const original = window.parent.postMessage

  beforeEach(() => {
    posted = []
    vi.useFakeTimers()
    window.parent.postMessage = ((msg: Posted) => { posted.push(msg) }) as never
  })
  afterEach(() => {
    window.parent.postMessage = original
    vi.useRealTimers()
  })

  function reply(id: string, data: unknown) {
    window.dispatchEvent(new MessageEvent('message', { data: { id, type: EnvelopeMessageType.ELEMENT_UPDATE_RESULT, data } }))
  }

  it('posts one ELEMENT_UPDATE and resolves on the matching RESULT', async () => {
    const { result } = renderHook(() => useModelOpsSender())
    const p = result.current.updateElement('conn-1', 'Connector', { priority: 2 })
    expect(posted).toHaveLength(1)
    expect(posted[0].type).toBe(EnvelopeMessageType.ELEMENT_UPDATE)
    expect(posted[0].data).toEqual({ elementId: 'conn-1', type: 'Connector', data: { priority: 2, id: 'conn-1' } })
    reply('other', { success: true })
    reply(posted[0].id, { success: true })
    await expect(p).resolves.toBeUndefined()
  })

  it('rejects with the handler error message', async () => {
    const { result } = renderHook(() => useModelOpsSender())
    const p = result.current.updateElement('conn-1', 'Connector', { priority: 2 })
    reply(posted[0].id, { success: false, errorMessage: 'line not found' })
    await expect(p).rejects.toThrow('line not found')
  })

  it('rejects on timeout', async () => {
    const { result } = renderHook(() => useModelOpsSender())
    const p = result.current.updateElement('conn-1', 'Connector', { priority: 2 })
    vi.advanceTimersByTime(30_001)
    await expect(p).rejects.toThrow('Element update timed out')
  })
})
