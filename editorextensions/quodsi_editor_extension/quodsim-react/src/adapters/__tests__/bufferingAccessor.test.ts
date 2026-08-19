import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createBufferingAccessor } from '../bufferingAccessor'

function makeBase(initial: any = { generators: [], arrivalPatterns: [], model: {} }) {
  let def = initial
  const listeners = new Set<() => void>()
  let snap: any = { modelDefinition: def, saveStatus: 'idle', saveError: null }
  const notifyAll = () => { listeners.forEach((l) => l()) }

  // A write on the REAL base accessor notifies twice -- 'saving', then 'saved'
  // -- and its getSnapshot rebuilds the snapshot OBJECT on either transition
  // (LucidModelStateAccessor.ts:139-150 and :180-225), while the host's
  // modelDefinition stays exactly as it was. Modelling that here is what lets
  // this suite see a bound that counts snapshot identities instead of model
  // changes: with bare `vi.fn()` writes that never notify, no test can.
  const write = async (..._args: unknown[]): Promise<void> => {
    snap = { modelDefinition: def, saveStatus: 'saving', saveError: null }
    notifyAll()
    snap = { modelDefinition: def, saveStatus: 'saved', saveError: null }
    notifyAll()
  }

  return {
    accessor: {
      subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } },
      getSnapshot: () => snap,
      updateShape: vi.fn(write),
      updateModel: vi.fn(write),
    },
    pushSnapshot(next: any) {
      def = next
      snap = { modelDefinition: def, saveStatus: 'idle', saveError: null }
      notifyAll()
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

  it('holds the flushed value visible when a STALE base snapshot arrives', async () => {
    const base = makeBase({
      generators: [{ id: 'g1', name: 'G', volume: 100 }], arrivalPatterns: [], model: {},
    })
    const buf = createBufferingAccessor(base.accessor as any, { debounceMs: 500 })

    void buf.updateShape('g1', 'Generator', { volume: 8500 })
    await buf.flush()

    // A snapshot the host built BEFORE our write landed, so it still reports the
    // old volume. Snapshots arrive unsolicited (a canvas edit, another panel's
    // write, a refresh), not only as the echo of our own write -- so "a snapshot
    // arrived" must never be read as "our write committed".
    base.pushSnapshot({
      generators: [{ id: 'g1', name: 'G', volume: 100 }], arrivalPatterns: [], model: {},
    })

    // The user must not watch their value snap back to 100 for a round trip.
    expect((buf.getSnapshot().modelDefinition as any).generators[0].volume).toBe(8500)

    // ...and when the real echo does arrive, the base takes over cleanly.
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

  it('stops masking the base once the host echo has failed to match', async () => {
    const base = makeBase({
      generators: [{ id: 'g1', name: 'G', volume: 100 }], arrivalPatterns: [], model: {},
    })
    const buf = createBufferingAccessor(base.accessor as any, { debounceMs: 500 })

    void buf.updateShape('g1', 'Generator', { volume: 8500 })
    await buf.flush()

    // The host ACCEPTED the write but rebuilds what it echoes back through a
    // constructor (ModelDefinitionPageBuilder.loadArrivalPatterns forces
    // seasonMode and rehydrates withinHourOffset), so the echo need never
    // structurally equal what was sent. Unbounded, this entry would mask the
    // base for the life of the accessor -- including host-originated changes
    // like the orphaned-pattern cleanup.
    base.pushSnapshot({
      generators: [{ id: 'g1', name: 'G', volume: 8499 }], arrivalPatterns: [], model: {},
    })
    // One snapshot of grace: this one could still have been built before the write.
    expect((buf.getSnapshot().modelDefinition as any).generators[0].volume).toBe(8500)

    base.pushSnapshot({
      generators: [{ id: 'g1', name: 'G', volume: 8499 }], arrivalPatterns: [], model: {},
    })
    // Bound reached. Once the host has acked, the host is authoritative, and a
    // one-frame flicker beats an overlay that never lets go.
    expect((buf.getSnapshot().modelDefinition as any).generators[0].volume).toBe(8499)
  })

  it('never expires an edit the host has not acked, however many snapshots arrive', () => {
    const base = makeBase({
      generators: [{ id: 'g1', name: 'G', volume: 100 }], arrivalPatterns: [], model: {},
    })
    const buf = createBufferingAccessor(base.accessor as any, { debounceMs: 500 })

    void buf.updateShape('g1', 'Generator', { volume: 8500 })   // never flushed

    for (let i = 0; i < 10; i += 1) {
      base.pushSnapshot({
        generators: [{ id: 'g1', name: 'G', volume: 100 }], arrivalPatterns: [], model: {},
      })
    }

    // The bound's clock starts at the ACK, not at the edit: an unsent edit can
    // never be "stale" relative to a host that has never seen it.
    expect((buf.getSnapshot().modelDefinition as any).generators[0].volume).toBe(8500)
  })

  it('passes through the optional accessor methods the base implements', () => {
    const { accessor } = makeBase()
    const getShapeInfo = vi.fn().mockReturnValue({ shapeId: 'g1', name: 'G' })
    const classifyShape = vi.fn().mockResolvedValue(undefined)
    Object.assign(accessor, { getShapeInfo, classifyShape })
    const buf = createBufferingAccessor(accessor as any, { debounceMs: 500 })

    // Optional on the contract, so dropping them typechecks fine and turns every
    // caller's `accessor.getShapeInfo?.(...)` into a silent no-op.
    expect(buf.getShapeInfo?.('g1')).toEqual({ shapeId: 'g1', name: 'G' })
    expect(typeof buf.classifyShape).toBe('function')
    expect(getShapeInfo).toHaveBeenCalledWith('g1')
  })

  it('flushes pending edits on dispose rather than discarding them', async () => {
    const { accessor } = makeBase()
    const buf = createBufferingAccessor(accessor as any, { debounceMs: 500 })

    void buf.updateShape('g1', 'Generator', { volume: 42 })
    buf.dispose()                       // unmount, with no preceding flush()
    await vi.advanceTimersByTimeAsync(0)

    expect(accessor.updateShape).toHaveBeenCalledTimes(1)
    expect(accessor.updateShape).toHaveBeenCalledWith('g1', 'Generator', { volume: 42 })
  })

  it('arms no further timers once disposed', async () => {
    const { accessor } = makeBase()
    accessor.updateShape.mockRejectedValue(new Error('host said no'))
    const buf = createBufferingAccessor(accessor as any, { debounceMs: 500 })

    void buf.updateShape('g1', 'Generator', { volume: 42 })
    buf.dispose()                       // its final flush fails and rolls back

    await vi.advanceTimersByTimeAsync(5000)

    // A re-armed debounce would write through the base long after teardown.
    expect(accessor.updateShape).toHaveBeenCalledTimes(1)
  })

  // React 18 StrictMode (dev builds only) mounts, runs every effect cleanup,
  // then mounts again. useSyncExternalStore therefore calls subscribe ->
  // unsubscribe -> subscribe, and the consumer's own effect cleanup calls
  // dispose() in between. With a one-way `disposed` latch the accessor came
  // back from that cycle permanently dead: edits rendered locally and NOTHING
  // reached the host, in the exact build a developer runs.
  it('still writes to the host after a StrictMode-style mount -> dispose -> re-mount cycle', async () => {
    const { accessor } = makeBase()
    const buf = createBufferingAccessor(accessor as any, { debounceMs: 500 })

    // First (throwaway) StrictMode mount.
    const unsubscribe = buf.subscribe(() => {})
    unsubscribe()
    buf.dispose()

    // Second (real) mount: useSyncExternalStore subscribes again.
    buf.subscribe(() => {})

    void buf.updateShape('g1', 'Generator', { volume: 8500 })
    await vi.advanceTimersByTimeAsync(500)

    expect(accessor.updateShape).toHaveBeenCalledWith('g1', 'Generator', { volume: 8500 })
  })

  it('re-attaches to the base after revival, so host snapshots still reconcile', async () => {
    const base = makeBase({
      generators: [{ id: 'g1', name: 'G', volume: 100 }], arrivalPatterns: [], model: {},
    })
    const buf = createBufferingAccessor(base.accessor as any, { debounceMs: 500 })

    buf.subscribe(() => {})()
    buf.dispose()

    const listener = vi.fn()
    buf.subscribe(listener)

    // A host-originated change must still reach both the merged snapshot and
    // the (re-)subscribed listener -- a revived accessor that never re-attached
    // to the base would serve the snapshot it was frozen with.
    base.pushSnapshot({
      generators: [{ id: 'g1', name: 'G', volume: 777 }], arrivalPatterns: [], model: {},
    })

    expect(listener).toHaveBeenCalled()
    expect((buf.getSnapshot().modelDefinition as any).generators[0].volume).toBe(777)
  })

  it('reports an earlier failure to a close-path flush() that has nothing of its own', async () => {
    const { accessor } = makeBase()
    accessor.updateShape.mockRejectedValueOnce(new Error('host said no'))
    const buf = createBufferingAccessor(accessor as any, { debounceMs: 500 })

    void buf.updateShape('g1', 'Generator', { volume: 42 })
    const debounced = buf.flush()       // takes the batch
    const onClose = buf.flush()         // nothing left to promote -- just drains

    await expect(debounced).rejects.toThrow(/host said no/)
    // The close path must not be told "all written" when the last write failed.
    await expect(onClose).rejects.toThrow(/host said no/)
  })

  it('does not spend the bound on save-status churn from an unrelated write', async () => {
    const base = makeBase({
      generators: [{ id: 'g1', name: 'G', volume: 100 }],
      arrivalPatterns: [{ id: 'ap1', name: 'P' }],
      model: {},
    })
    const buf = createBufferingAccessor(base.accessor as any, { debounceMs: 500 })

    // A model-root write: acked by the host, but not yet echoed back.
    void buf.updateModel({ arrivalPatterns: [{ id: 'ap1', name: 'RENAMED' }] })
    await buf.flush()

    // Now an UNRELATED shape write. The base accessor rebuilds its snapshot
    // twice for it ('saving', then 'saved') with the host's modelDefinition
    // untouched. Those are not host-originated changes, so they must not spend
    // the model overlay's allowance -- one unrelated write would otherwise burn
    // the whole default of 2 and revert the panel to the pre-edit patterns.
    void buf.updateShape('g1', 'Generator', { volume: 8500 })
    await buf.flush()

    const patterns = (buf.getSnapshot().modelDefinition as any).arrivalPatterns
    expect(patterns[0].name).toBe('RENAMED')
  })

  it('does not start the bound clock until the host actually acks the write', async () => {
    const base = makeBase({
      generators: [{ id: 'g1', name: 'G', volume: 100 }], arrivalPatterns: [], model: {},
    })
    let release: () => void = () => {}
    base.accessor.updateShape.mockImplementation(
      () => new Promise<void>((resolve) => { release = resolve }),
    )
    const buf = createBufferingAccessor(base.accessor as any, { debounceMs: 500 })

    void buf.updateShape('g1', 'Generator', { volume: 8500 })
    const flushing = buf.flush()   // promoted into inFlight -- but NOT yet acked
    await vi.advanceTimersByTimeAsync(0)   // let sendBatch reach the (hanging) write

    // Host model changes keep arriving while our write is still in the air.
    for (let i = 0; i < 5; i += 1) {
      base.pushSnapshot({
        generators: [{ id: 'g1', name: 'G', volume: 100 + i }], arrivalPatterns: [], model: {},
      })
    }

    // A bound started at PROMOTION would have discarded this edit several
    // snapshots ago, while it was still legitimately in flight to a slow host.
    // The clock may only start once the host has definitively received it.
    expect((buf.getSnapshot().modelDefinition as any).generators[0].volume).toBe(8500)

    release()
    await flushing
  })

  it('keeps reporting an earlier failure while its rolled-back edit is still buffered', async () => {
    const { accessor } = makeBase()
    accessor.updateShape.mockRejectedValueOnce(new Error('host said no'))
    const buf = createBufferingAccessor(accessor as any, { debounceMs: 500 })

    void buf.updateShape('g1', 'Generator', { volume: 42 })
    const failing = buf.flush()      // batch A: fails, rolls the overlay back into pending
    void buf.updateShape('g2', 'Generator', { volume: 7 })
    const succeeding = buf.flush()   // batch B: promoted before A ran, chained after it
    const onClose = buf.flush()      // nothing of its own -- drains and reports

    await expect(failing).rejects.toThrow(/host said no/)
    await succeeding

    // B succeeded, but A's edit is back in `pending` and unsent. "A later write
    // worked" is not "everything is written", and the close path must not be
    // told that it is.
    await expect(onClose).rejects.toThrow(/host said no/)
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
