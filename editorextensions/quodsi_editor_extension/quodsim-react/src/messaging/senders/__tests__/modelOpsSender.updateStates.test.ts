import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'
import { useModelOpsSender } from '../modelOpsSender'

vi.mock('../useSender', () => ({ useSender: () => vi.fn() }))
vi.mock('../../MessageContext', () => ({ useMessagingDispatch: () => vi.fn() }))

type Posted = { id: string; type: string; data: unknown; source: string; target: string }

describe('useModelOpsSender.updateStates', () => {
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
    window.dispatchEvent(new MessageEvent('message', { data: { id, type: EnvelopeMessageType.STATES_UPDATE_RESULT, data } }))
  }

  const state = { id: 's1', name: 'severity', componentType: 'entity', dataType: 'number', initialValue: 0, collectStatistics: true }

  it('posts STATES_UPDATE and resolves on a successful RESULT with the same id', async () => {
    const { result } = renderHook(() => useModelOpsSender())
    const p = result.current.updateStates([state as never])
    expect(posted).toHaveLength(1)
    expect(posted[0].type).toBe(EnvelopeMessageType.STATES_UPDATE)
    expect(posted[0].source).toBe('model-iframe')
    expect(posted[0].target).toBe('host')
    expect((posted[0].data as { states: unknown[] }).states).toEqual([state])
    reply('some-other-id', { success: true }) // ignored
    reply(posted[0].id, { success: true })
    await expect(p).resolves.toBeUndefined()
  })

  it('rejects with the handler error message', async () => {
    const { result } = renderHook(() => useModelOpsSender())
    const p = result.current.updateStates([])
    reply(posted[0].id, { success: false, errorMessage: 'Current page not available' })
    await expect(p).rejects.toThrow('Current page not available')
  })

  it('rejects on timeout', async () => {
    const { result } = renderHook(() => useModelOpsSender())
    const p = result.current.updateStates([])
    vi.advanceTimersByTime(30_001)
    await expect(p).rejects.toThrow('States update timed out')
  })
})
