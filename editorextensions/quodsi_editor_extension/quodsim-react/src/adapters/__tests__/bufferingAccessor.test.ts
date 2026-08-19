import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createBufferingAccessor } from '../bufferingAccessor'

function makeBase(initial: any = { generators: [], arrivalPatterns: [], model: {} }) {
  let def = initial
  const listeners = new Set<() => void>()
  let snap = { modelDefinition: def, saveStatus: 'idle' as const, saveError: null }
  return {
    accessor: {
      subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } },
      getSnapshot: () => snap,
      updateShape: vi.fn().mockResolvedValue(undefined),
      updateModel: vi.fn().mockResolvedValue(undefined),
    },
    pushSnapshot(next: any) {
      def = next
      snap = { modelDefinition: def, saveStatus: 'idle', saveError: null }
      listeners.forEach((l) => l())
    },
  }
}

describe('createBufferingAccessor', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('returns a stable snapshot reference when nothing changes', () => {
    const { accessor } = makeBase()
    const buf = createBufferingAccessor(accessor as any, { debounceMs: 500 })
    expect(buf.getSnapshot()).toBe(buf.getSnapshot())
  })

  it('reflects an edit IMMEDIATELY, before any flush', async () => {
    const { accessor } = makeBase({
      generators: [{ id: 'g1', name: 'G', volume: 100 }], arrivalPatterns: [], model: {},
    })
    const buf = createBufferingAccessor(accessor as any, { debounceMs: 500 })

    void buf.updateShape('g1', 'Generator', { volume: 8500 })

    const def = buf.getSnapshot().modelDefinition as any
    expect(def.generators[0].volume).toBe(8500)
    expect(accessor.updateShape).not.toHaveBeenCalled()   // not yet written
  })

  it('notifies subscribers on an edit so React re-renders at once', () => {
    const { accessor } = makeBase({
      generators: [{ id: 'g1', name: 'G', volume: 100 }], arrivalPatterns: [], model: {},
    })
    const buf = createBufferingAccessor(accessor as any, { debounceMs: 500 })
    const listener = vi.fn()
    buf.subscribe(listener)

    void buf.updateShape('g1', 'Generator', { volume: 8500 })

    expect(listener).toHaveBeenCalled()
  })

  it('coalesces a burst into ONE write per target', async () => {
    const { accessor } = makeBase({
      generators: [{ id: 'g1', name: 'G', volume: 0 }], arrivalPatterns: [], model: {},
    })
    const buf = createBufferingAccessor(accessor as any, { debounceMs: 500 })

    void buf.updateShape('g1', 'Generator', { volume: 1 })
    void buf.updateShape('g1', 'Generator', { volume: 12 })
    void buf.updateShape('g1', 'Generator', { volume: 123 })

    await vi.advanceTimersByTimeAsync(600)

    expect(accessor.updateShape).toHaveBeenCalledTimes(1)
    expect(accessor.updateShape).toHaveBeenCalledWith('g1', 'Generator', { volume: 123 })
  })

  it('flushes shape writes BEFORE model writes', async () => {
    const { accessor } = makeBase()
    const order: string[] = []
    accessor.updateShape.mockImplementation(async () => { order.push('shape') })
    accessor.updateModel.mockImplementation(async () => { order.push('model') })
    const buf = createBufferingAccessor(accessor as any, { debounceMs: 500 })

    void buf.updateModel({ arrivalPatterns: [{ id: 'ap1', name: 'P' }] })
    void buf.updateShape('g1', 'Generator', { arrivalPatternId: 'ap1' })

    await vi.advanceTimersByTimeAsync(600)

    expect(order).toEqual(['shape', 'model'])
  })

  it('flush() commits immediately without waiting for the debounce', async () => {
    const { accessor } = makeBase()
    const buf = createBufferingAccessor(accessor as any, { debounceMs: 500 })

    void buf.updateShape('g1', 'Generator', { volume: 42 })
    await buf.flush()

    expect(accessor.updateShape).toHaveBeenCalledTimes(1)
  })

  it('keeps the pending value visible until the base snapshot catches up', async () => {
    const base = makeBase({
      generators: [{ id: 'g1', name: 'G', volume: 100 }], arrivalPatterns: [], model: {},
    })
    const buf = createBufferingAccessor(base.accessor as any, { debounceMs: 500 })

    void buf.updateShape('g1', 'Generator', { volume: 8500 })
    await buf.flush()

    // Host has not echoed the write back yet — the edit must NOT flicker back.
    expect((buf.getSnapshot().modelDefinition as any).generators[0].volume).toBe(8500)

    base.pushSnapshot({
      generators: [{ id: 'g1', name: 'G', volume: 8500 }], arrivalPatterns: [], model: {},
    })
    expect((buf.getSnapshot().modelDefinition as any).generators[0].volume).toBe(8500)
  })

  it('does not clobber an edit made while a flush was in flight', async () => {
    const base = makeBase({
      generators: [{ id: 'g1', name: 'G', volume: 100 }], arrivalPatterns: [], model: {},
    })
    const buf = createBufferingAccessor(base.accessor as any, { debounceMs: 500 })

    void buf.updateShape('g1', 'Generator', { volume: 8500 })
    const flushing = buf.flush()
    void buf.updateShape('g1', 'Generator', { volume: 9000 })   // typed during the flush
    await flushing

    base.pushSnapshot({
      generators: [{ id: 'g1', name: 'G', volume: 8500 }], arrivalPatterns: [], model: {},
    })

    // The later edit must survive the older snapshot.
    expect((buf.getSnapshot().modelDefinition as any).generators[0].volume).toBe(9000)
  })

  it('retains the edit when a flush fails, so it is not silently lost', async () => {
    const { accessor } = makeBase({
      generators: [{ id: 'g1', name: 'G', volume: 100 }], arrivalPatterns: [], model: {},
    })
    accessor.updateShape.mockRejectedValueOnce(new Error('host said no'))
    const buf = createBufferingAccessor(accessor as any, { debounceMs: 500 })

    void buf.updateShape('g1', 'Generator', { volume: 8500 })
    await expect(buf.flush()).rejects.toThrow(/host said no/)

    expect((buf.getSnapshot().modelDefinition as any).generators[0].volume).toBe(8500)
  })
})
