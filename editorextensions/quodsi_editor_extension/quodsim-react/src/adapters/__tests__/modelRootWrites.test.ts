import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  flushAllModelRootWrites,
  hasPendingModelRootWrites,
  registerModelRootSource,
  resetModelRootWritesForTests,
} from '../modelRootWrites'

function fakeSource(pending = false) {
  return {
    flush: vi.fn().mockResolvedValue(undefined),
    hasPendingWrites: vi.fn(() => pending),
  }
}

afterEach(() => {
  resetModelRootWritesForTests()
  vi.restoreAllMocks()
})

describe('modelRootWrites (spec 2026-09-12 lucid-model-root-batching §3)', () => {
  it('flushes every registered source and resolves even when one is refused', async () => {
    const a = fakeSource()
    const b = fakeSource()
    b.flush.mockRejectedValueOnce(new Error('refused'))
    registerModelRootSource(a)
    registerModelRootSource(b)

    await expect(flushAllModelRootWrites()).resolves.toBeUndefined()

    expect(a.flush).toHaveBeenCalledTimes(1)
    expect(b.flush).toHaveBeenCalledTimes(1)
  })

  it('reports pending writes from any registered source, and forgets an unregistered one', () => {
    registerModelRootSource(fakeSource(false))
    expect(hasPendingModelRootWrites()).toBe(false)

    const unregister = registerModelRootSource(fakeSource(true))
    expect(hasPendingModelRootWrites()).toBe(true)

    unregister()
    expect(hasPendingModelRootWrites()).toBe(false)
  })

  it.each(['blur', 'pagehide', 'beforeunload'])('flushes on window %s', (eventName) => {
    const source = fakeSource(true)
    registerModelRootSource(source)

    window.dispatchEvent(new Event(eventName))

    expect(source.flush).toHaveBeenCalledTimes(1)
  })

  it('does not flush a source that has unregistered', () => {
    const source = fakeSource(true)
    const unregister = registerModelRootSource(source)
    unregister()

    window.dispatchEvent(new Event('blur'))

    expect(source.flush).not.toHaveBeenCalled()
  })

  it('installs the window listeners once, however many sources register', () => {
    const add = vi.spyOn(window, 'addEventListener')

    registerModelRootSource(fakeSource())
    registerModelRootSource(fakeSource())

    expect(add.mock.calls.filter(([type]) => type === 'blur')).toHaveLength(1)
  })
})
