import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createModelRootSource,
  MODEL_ROOT_DEBOUNCE_MS,
  TAGGED_SNAPSHOT_GRACE_MS,
  ModelRootNoReplyError,
} from '../useModelRootSource'
import { MODEL_NOT_LOADED_MESSAGE } from '../pageGuardMessages'

describe('createModelRootSource', () => {
  it('returns null before any snapshot arrives', () => {
    const source = createModelRootSource({ send: vi.fn() })
    expect(source.deps.getModelDefinition()).toBeNull()
  })

  it('returns a STABLE reference between snapshots', () => {
    const source = createModelRootSource({ send: vi.fn() })
    source.acceptSnapshot({ generators: [], arrivalPatterns: [], model: {} })

    const a = source.deps.getModelDefinition()
    const b = source.deps.getModelDefinition()
    expect(a).toBe(b)
  })

  it('returns a NEW reference after a new snapshot', () => {
    const source = createModelRootSource({ send: vi.fn() })
    source.acceptSnapshot({ generators: [], arrivalPatterns: [], model: {} })
    const a = source.deps.getModelDefinition()

    source.acceptSnapshot({ generators: [], arrivalPatterns: [{ id: 'ap-1', name: 'P1' }], model: {} })
    const b = source.deps.getModelDefinition()

    expect(b).not.toBe(a)
    expect((b as any).arrivalPatterns).toHaveLength(1)
  })

  it('notifies listeners when a snapshot arrives', () => {
    const source = createModelRootSource({ send: vi.fn() })
    const listener = vi.fn()
    source.deps.onModelChanged(listener)

    source.acceptSnapshot({ generators: [], arrivalPatterns: [], model: {} })

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('stops notifying after unsubscribe', () => {
    const source = createModelRootSource({ send: vi.fn() })
    const listener = vi.fn()
    const off = source.deps.onModelChanged(listener)
    off()

    source.acceptSnapshot({ generators: [], arrivalPatterns: [], model: {} })

    expect(listener).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------
  // Optimistic echo. A controlled input whose value comes from the cached
  // projection and whose onChange calls accessor.updateModel is a round trip
  // per keystroke: without an immediate local echo the input renders the
  // pre-keystroke value until MODEL_ROOT_SNAPSHOT lands, so fast typing drops
  // and reorders characters (Studio's ResourceBasicTab name field).
  // ---------------------------------------------------------------------

  it('echoes a model-root patch into the cached projection BEFORE any snapshot arrives', async () => {
    // A send that never resolves: proof the echo does not depend on the host.
    const send = vi.fn().mockReturnValue(new Promise<void>(() => {}))
    const source = createModelRootSource({ send })
    source.acceptSnapshot({
      generators: [],
      arrivalPatterns: [],
      resources: [{ id: 'r1', name: 'Nurse', capacity: 2, shapeId: 'blk-9', shapeLabel: 'Nurse Block' }],
      model: {},
    } as any)
    const before = source.deps.getModelDefinition()
    const listener = vi.fn()
    source.deps.onModelChanged(listener)

    void source.deps.saveModel!({ resources: [{ id: 'r1', name: 'Renamed' }] })

    const after = source.deps.getModelDefinition() as any
    expect(after.resources[0].name).toBe('Renamed')
    // The transient link markers are stamped by the HOST at projection-build
    // time and are absent from any patch, so merging by id has to carry them
    // across or the Resources tab flickers to "no shape" for a round trip.
    expect(after.resources[0].shapeId).toBe('blk-9')
    expect(after.resources[0].shapeLabel).toBe('Nurse Block')
    expect(after.resources[0].capacity).toBe(2)
    // A NEW object -- the accessor's getSnapshot cache compares by identity,
    // so an in-place edit would be invisible to every subscriber.
    expect(after).not.toBe(before)
    expect(listener).toHaveBeenCalledTimes(1)
    // Nothing goes on the wire until the batch is due.
    expect(send).not.toHaveBeenCalled()
  })

  it('echo replaces non-resource keys wholesale and drops rows the patch omits', async () => {
    const source = createModelRootSource({ send: vi.fn().mockResolvedValue(undefined) })
    source.acceptSnapshot({
      generators: [],
      arrivalPatterns: [{ id: 'ap-1', name: 'P1' }],
      resourceRequirements: [{ id: 'req-1' }],
      resources: [{ id: 'r1', name: 'Nurse', shapeId: 'blk-9' }, { id: 'r2', name: 'Doctor' }],
      model: {},
    } as any)

    await source.deps.saveModel!({
      resources: [{ id: 'r2', name: 'Doctor' }],
      resourceRequirements: [],
    })

    const after = source.deps.getModelDefinition() as any
    expect(after.resources.map((r: any) => r.id)).toEqual(['r2'])
    expect(after.resourceRequirements).toEqual([])
    expect(after.arrivalPatterns).toEqual([{ id: 'ap-1', name: 'P1' }])
  })

  it('the snapshot tagged with a batch id replaces that batch', async () => {
    const send = vi.fn().mockResolvedValue(undefined)
    const source = createModelRootSource({ send })
    source.acceptSnapshot({
      generators: [], arrivalPatterns: [], resources: [{ id: 'r1', name: 'Nurse', shapeId: 'blk-9' }], model: {},
    } as any)
    void source.deps.saveModel!({ resources: [{ id: 'r1', name: 'Renamed' }] })
    await source.flush()

    source.acceptSnapshot(
      { generators: [], arrivalPatterns: [], resources: [{ id: 'r1', name: 'Host Wins', shapeId: 'blk-9' }], model: {} } as any,
      send.mock.calls[0][3],
    )

    expect((source.deps.getModelDefinition() as any).resources[0].name).toBe('Host Wins')
  })

  it('refuses a write before any snapshot arrives: rejects, sends nothing, echoes nothing', async () => {
    const send = vi.fn().mockResolvedValue(undefined)
    const source = createModelRootSource({ send })

    await expect(source.deps.saveModel!({ resources: [{ id: 'r1', name: 'Nurse' }] }))
      .rejects.toThrow(MODEL_NOT_LOADED_MESSAGE)

    expect(send).not.toHaveBeenCalled()
    expect(source.deps.getModelDefinition()).toBeNull()
  })

  it('sends the WHOLE patch verbatim with the page id of the snapshot it was based on', async () => {
    const send = vi.fn().mockResolvedValue(undefined)
    const source = createModelRootSource({ send })
    source.acceptSnapshot({ generators: [], arrivalPatterns: [], model: {}, pageId: 'page-1' } as any)

    void source.deps.saveModel!({ arrivalPatterns: [{ id: 'ap-1', name: 'P1' }], future: 42 })
    await source.flush()

    expect(send).toHaveBeenCalledWith(
      { arrivalPatterns: [{ id: 'ap-1', name: 'P1' }], future: 42 },
      'page-1',
      undefined,
      expect.any(String),
    )
  })

  it('uses the page id captured BEFORE the optimistic echo', async () => {
    const send = vi.fn().mockResolvedValue(undefined)
    const source = createModelRootSource({ send })
    source.acceptSnapshot({ generators: [], arrivalPatterns: [], model: {}, pageId: 'page-9' } as any)

    void source.deps.saveModel!({ pageId: 'not-a-real-key' } as any)
    await source.flush()

    expect(send.mock.calls[0][1]).toBe('page-9')
  })

  it('forwards cleanup options to the transport only when given', async () => {
    const send = vi.fn().mockResolvedValue(undefined)
    const source = createModelRootSource({ send })
    source.acceptSnapshot({ generators: [], arrivalPatterns: [], model: {}, pageId: 'page-1' } as any)

    await source.deps.saveModel!({ resources: [] }, { seizeRelease: 'remove' })
    void source.deps.saveModel!({ resources: [] })
    await source.flush()

    expect(send.mock.calls[0].slice(0, 3)).toEqual([{ resources: [] }, 'page-1', { seizeRelease: 'remove' }])
    expect(send.mock.calls[1].slice(0, 3)).toEqual([{ resources: [] }, 'page-1', undefined])
  })

  // spec 2026-09-12 §4: the snapshot carries each model setting flat (the
  // Model editor drafts from it) AND under `model` (the shared modals read
  // it). An echo that updated only one copy would leave the other stale for a
  // whole round trip.
  it('echoes a model-settings patch flat AND into a rebuilt nested model block', () => {
    const source = createModelRootSource({ send: vi.fn().mockResolvedValue(undefined) })
    source.acceptSnapshot({
      generators: [], arrivalPatterns: [], pageId: 'page-1',
      name: 'Old', replications: 1, levers: [{ leverId: 'lv' }],
      model: { name: 'Old', replications: 1, levers: [{ leverId: 'lv' }], timeMode: 'clock' },
    } as any)
    const before = source.deps.getModelDefinition() as any

    void source.deps.saveModel!({ name: 'New', levers: [] })

    const after = source.deps.getModelDefinition() as any
    expect(after.name).toBe('New')
    expect(after.levers).toEqual([])
    expect(after.model).toEqual({ name: 'New', replications: 1, levers: [], timeMode: 'clock' })
    expect(after.model).not.toBe(before.model)
    expect(before.model).toEqual({ name: 'Old', replications: 1, levers: [{ leverId: 'lv' }], timeMode: 'clock' })
  })

  // ModelEditor's draft resync applies only a snapshot accepted after its last
  // write settled, which it tells apart by this panel-local stamp.
  it('stamps each accepted snapshot with an increasing snapshotSeq; an echo keeps the current one', async () => {
    const send = vi.fn().mockResolvedValue(undefined)
    const source = createModelRootSource({ send })
    const incoming = { generators: [], arrivalPatterns: [], pageId: 'page-1', name: 'Old', model: { name: 'Old' } } as any

    source.acceptSnapshot(incoming)
    const first = source.deps.getModelDefinition() as any
    expect(typeof first.snapshotSeq).toBe('number')
    // A new object: the host's message is never mutated.
    expect(first).not.toBe(incoming)
    expect(incoming).not.toHaveProperty('snapshotSeq')

    void source.deps.saveModel!({ name: 'New' })
    const echoed = source.deps.getModelDefinition() as any
    expect(echoed).not.toBe(first)
    expect(echoed.name).toBe('New')
    expect(echoed.snapshotSeq).toBe(first.snapshotSeq)
    // Only the patch goes on the wire, never the stamp.
    await source.flush()
    expect(send.mock.calls[0][0]).toEqual({ name: 'New' })

    // A host snapshot that happens to carry a stamp (e.g. a copy of the
    // current projection) is re-stamped, never trusted.
    source.acceptSnapshot({ ...echoed })
    const second = source.deps.getModelDefinition() as any
    expect(second.snapshotSeq).toBeGreaterThan(first.snapshotSeq)

    source.acceptSnapshot(incoming)
    expect((source.deps.getModelDefinition() as any).snapshotSeq).toBeGreaterThan(second.snapshotSeq)
  })

  it('leaves the nested model block untouched for a patch with no model settings', () => {
    const source = createModelRootSource({ send: vi.fn().mockResolvedValue(undefined) })
    source.acceptSnapshot({ generators: [], arrivalPatterns: [], pageId: 'page-1', model: { name: 'Clinic' } } as any)
    const before = source.deps.getModelDefinition() as any

    void source.deps.saveModel!({ arrivalPatterns: [{ id: 'ap-1', name: 'P1' }], states: [] })

    const after = source.deps.getModelDefinition() as any
    expect(after.model).toBe(before.model)
    expect(after.states).toEqual([])
  })
})

describe('createModelRootSource — batching (spec 2026-09-12 lucid-model-root-batching)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const SNAPSHOT = { generators: [], arrivalPatterns: [], model: {}, pageId: 'page-1', name: 'Clinic' } as any

  function deferred() {
    let resolve!: () => void
    let reject!: (err: Error) => void
    const promise = new Promise<void>((res, rej) => { resolve = res; reject = rej })
    return { promise, resolve, reject }
  }

  function loadedSource(send = vi.fn().mockResolvedValue(undefined), request?: () => string | void) {
    const source = createModelRootSource({ send, request })
    source.acceptSnapshot(SNAPSHOT)
    return { source, send }
  }

  const current = (source: ReturnType<typeof createModelRootSource>) => source.deps.getModelDefinition() as any

  it('sends a burst of plain writes as ONE merged update after 400 ms of quiet', async () => {
    const { source, send } = loadedSource()

    await expect(source.deps.saveModel!({ name: 'A' })).resolves.toBeUndefined()
    void source.deps.saveModel!({ name: 'AB', replications: 3 })
    await vi.advanceTimersByTimeAsync(MODEL_ROOT_DEBOUNCE_MS - 1)
    expect(send).not.toHaveBeenCalled()

    void source.deps.saveModel!({ description: 'x' })
    await vi.advanceTimersByTimeAsync(MODEL_ROOT_DEBOUNCE_MS - 1)
    expect(send).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0].slice(0, 3)).toEqual([{ name: 'AB', replications: 3, description: 'x' }, 'page-1', undefined])
  })

  it('resolves at once and shows the edit before anything is sent', async () => {
    const { source, send } = loadedSource()
    let resolved = false

    void source.deps.saveModel!({ name: 'New' }).then(() => { resolved = true })

    expect(current(source).name).toBe('New')
    await Promise.resolve()
    expect(resolved).toBe(true)
    expect(send).not.toHaveBeenCalled()
  })

  it('keeps the page id captured when the batch started', async () => {
    const { source, send } = loadedSource()

    void source.deps.saveModel!({ name: 'A' })
    source.acceptSnapshot({ ...SNAPSHOT, pageId: 'page-2' })
    void source.deps.saveModel!({ name: 'AB' })
    await source.flush()

    expect(send.mock.calls[0][1]).toBe('page-1')
  })

  it('sends one batch at a time; edits made during a flight go out after it settles', async () => {
    const first = deferred()
    const send = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue(undefined)
    const { source } = loadedSource(send)

    void source.deps.saveModel!({ name: 'A' })
    await vi.advanceTimersByTimeAsync(MODEL_ROOT_DEBOUNCE_MS)
    expect(send).toHaveBeenCalledTimes(1)

    void source.deps.saveModel!({ name: 'AB' })
    await vi.advanceTimersByTimeAsync(MODEL_ROOT_DEBOUNCE_MS)
    expect(send).toHaveBeenCalledTimes(1)

    first.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(send).toHaveBeenCalledTimes(2)
    expect(send.mock.calls[1][0]).toEqual({ name: 'AB' })
  })

  it('a cleanup-option write sends pending edits first, then goes alone with the host result', async () => {
    const send = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('refused'))
    const { source } = loadedSource(send)

    void source.deps.saveModel!({ name: 'A' })
    await expect(source.deps.saveModel!({ resources: [] }, { seizeRelease: 'remove' })).rejects.toThrow('refused')

    expect(send.mock.calls.map((call) => call.slice(0, 3))).toEqual([
      [{ name: 'A' }, 'page-1', undefined],
      [{ resources: [] }, 'page-1', { seizeRelease: 'remove' }],
    ])
  })

  it('a cleanup-option write is sent even when the batch before it was refused, and is never merged', async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error('page changed')).mockResolvedValue(undefined)
    const { source } = loadedSource(send)

    void source.deps.saveModel!({ name: 'A' })
    await expect(source.deps.saveModel!({ resources: [] }, { seizeRelease: 'flag' })).resolves.toBeUndefined()
    await expect(source.deps.saveModel!({ resourceRequirements: [] }, { seizeRelease: 'remove' })).resolves.toBeUndefined()

    expect(send).toHaveBeenCalledTimes(3)
    expect(send.mock.calls[1].slice(0, 3)).toEqual([{ resources: [] }, 'page-1', { seizeRelease: 'flag' }])
    expect(send.mock.calls[2].slice(0, 3)).toEqual([{ resourceRequirements: [] }, 'page-1', { seizeRelease: 'remove' }])
  })

  it('flush sends now and resolves when the host confirms', async () => {
    const write = deferred()
    const { source, send } = loadedSource(vi.fn().mockReturnValueOnce(write.promise))

    void source.deps.saveModel!({ name: 'A' })
    let flushed = false
    const done = source.flush().then(() => { flushed = true })
    await vi.advanceTimersByTimeAsync(0)
    expect(send).toHaveBeenCalledTimes(1)
    expect(flushed).toBe(false)

    write.resolve()
    await done
    expect(flushed).toBe(true)
  })

  it('flush rejects with the host message when the batch is refused', async () => {
    const { source } = loadedSource(vi.fn().mockRejectedValue(new Error('The model page changed')))

    void source.deps.saveModel!({ name: 'A' })

    await expect(source.flush()).rejects.toThrow('The model page changed')
  })

  it('flush with nothing pending or in flight resolves at once and sends nothing', async () => {
    const { source, send } = loadedSource()

    await expect(source.flush()).resolves.toBeUndefined()

    expect(send).not.toHaveBeenCalled()
  })

  it('flush waits for a batch already in flight', async () => {
    const write = deferred()
    const { source } = loadedSource(vi.fn().mockReturnValueOnce(write.promise))

    void source.deps.saveModel!({ name: 'A' })
    await vi.advanceTimersByTimeAsync(MODEL_ROOT_DEBOUNCE_MS)
    let flushed = false
    const done = source.flush().then(() => { flushed = true })
    await vi.advanceTimersByTimeAsync(0)
    expect(flushed).toBe(false)

    write.resolve()
    await done
    expect(flushed).toBe(true)
  })

  it('reports saving while anything is pending or in flight, then saved', async () => {
    const write = deferred()
    const { source } = loadedSource(vi.fn().mockReturnValueOnce(write.promise))
    expect(source.deps.getModelWriteStatus!().status).toBe('idle')
    expect(source.hasPendingWrites()).toBe(false)

    void source.deps.saveModel!({ name: 'A' })
    expect(source.deps.getModelWriteStatus!().status).toBe('saving')
    expect(source.hasPendingWrites()).toBe(true)

    await vi.advanceTimersByTimeAsync(MODEL_ROOT_DEBOUNCE_MS)
    expect(source.deps.getModelWriteStatus!().status).toBe('saving')

    write.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(source.deps.getModelWriteStatus!()).toEqual({ status: 'saved', error: null })
    expect(source.hasPendingWrites()).toBe(false)
  })

  it('an untagged or unknown-id snapshot keeps pending and in-flight edits', async () => {
    const write = deferred()
    const { source } = loadedSource(vi.fn().mockReturnValueOnce(write.promise))

    void source.deps.saveModel!({ name: 'A' })
    await vi.advanceTimersByTimeAsync(MODEL_ROOT_DEBOUNCE_MS)
    void source.deps.saveModel!({ replications: 5 })

    source.acceptSnapshot({ ...SNAPSHOT, name: 'Stale', replications: 1 })
    expect(current(source)).toMatchObject({ name: 'A', replications: 5 })

    source.acceptSnapshot({ ...SNAPSHOT, name: 'Stale', replications: 1 }, 'some-other-write')
    expect(current(source)).toMatchObject({ name: 'A', replications: 5 })
  })

  it("the snapshot tagged with a batch id shows the host's stored value; newer pending edits still win", async () => {
    const { source, send } = loadedSource()

    void source.deps.saveModel!({ name: '' })
    await source.flush()
    void source.deps.saveModel!({ replications: 5 })

    source.acceptSnapshot({ ...SNAPSHOT, name: 'Emergency Dept', replications: 1 }, send.mock.calls[0][3])

    expect(current(source)).toMatchObject({ name: 'Emergency Dept', replications: 5 })
  })

  it('a tagged snapshot also releases the batches sent before it', async () => {
    const { source, send } = loadedSource()

    void source.deps.saveModel!({ name: 'A' })
    await source.flush()
    void source.deps.saveModel!({ description: 'B' })
    await source.flush()

    source.acceptSnapshot({ ...SNAPSHOT, name: 'Stored A', description: 'Stored B' }, send.mock.calls[1][3])
    source.acceptSnapshot({ ...SNAPSHOT, name: 'Later', description: 'Later' })

    expect(current(source)).toMatchObject({ name: 'Later', description: 'Later' })
  })

  it('ignores a late snapshot for a write older than one whose stored result is already shown', async () => {
    const { source, send } = loadedSource()

    void source.deps.saveModel!({ name: 'A' })
    await source.flush()
    void source.deps.saveModel!({ name: 'AB' })
    await source.flush()

    source.acceptSnapshot({ ...SNAPSHOT, name: 'AB' }, send.mock.calls[1][3])
    source.acceptSnapshot({ ...SNAPSHOT, name: 'A' }, send.mock.calls[0][3])

    expect(current(source).name).toBe('AB')
  })

  it("resource rows under an overlay keep the new snapshot's link markers", () => {
    const { source } = loadedSource()

    void source.deps.saveModel!({ resources: [{ id: 'r1', name: 'Renamed' }] })
    source.acceptSnapshot({ ...SNAPSHOT, resources: [{ id: 'r1', name: 'Nurse', shapeId: 'blk-2', shapeLabel: 'Triage' }] })

    expect(current(source).resources[0]).toMatchObject({ name: 'Renamed', shapeId: 'blk-2', shapeLabel: 'Triage' })
  })

  it('a refused batch reports failed, and its corrective snapshot restores the stored value', async () => {
    const { source, send } = loadedSource(vi.fn().mockRejectedValue(new Error('The model page changed')))

    void source.deps.saveModel!({ name: 'Refused' })
    await expect(source.flush()).rejects.toThrow('The model page changed')

    expect(source.deps.getModelWriteStatus!()).toEqual({ status: 'failed', error: 'The model page changed' })
    expect(current(source).name).toBe('Refused')

    source.acceptSnapshot(SNAPSHOT, send.mock.calls[0][3])
    expect(current(source).name).toBe('Clinic')
  })

  it('edits made after a refused batch was sent survive its corrective snapshot and go out next', async () => {
    const write = deferred()
    const send = vi.fn().mockReturnValueOnce(write.promise).mockResolvedValue(undefined)
    const { source } = loadedSource(send)

    void source.deps.saveModel!({ name: 'Refused' })
    await vi.advanceTimersByTimeAsync(MODEL_ROOT_DEBOUNCE_MS)
    void source.deps.saveModel!({ replications: 7 })

    write.reject(new Error('The model page changed'))
    await vi.advanceTimersByTimeAsync(0)
    source.acceptSnapshot({ ...SNAPSHOT, replications: 1 }, send.mock.calls[0][3])

    expect(current(source)).toMatchObject({ name: 'Clinic', replications: 7 })
    await vi.advanceTimersByTimeAsync(MODEL_ROOT_DEBOUNCE_MS)
    expect(send.mock.calls[1][0]).toEqual({ replications: 7 })
  })

  it('no reply: drops the overlay at once and asks for a fresh snapshot', async () => {
    const request = vi.fn(() => 'req-1')
    const { source } = loadedSource(
      vi.fn().mockRejectedValue(new ModelRootNoReplyError('Model-root update timed out')),
      request,
    )

    void source.deps.saveModel!({ name: 'Lost' })
    await expect(source.flush()).rejects.toThrow('timed out')

    expect(current(source).name).toBe('Clinic')
    expect(request).toHaveBeenCalledTimes(1)
    expect(source.deps.getModelWriteStatus!()).toEqual({ status: 'failed', error: 'Model-root update timed out' })
  })

  it('a confirmed batch whose tagged snapshot never comes asks for one after the grace period', async () => {
    const request = vi.fn(() => 'req-1')
    const { source } = loadedSource(vi.fn().mockResolvedValue(undefined), request)

    void source.deps.saveModel!({ name: 'Saved' })
    await source.flush()

    await vi.advanceTimersByTimeAsync(TAGGED_SNAPSHOT_GRACE_MS - 1)
    expect(request).not.toHaveBeenCalled()
    source.acceptSnapshot({ ...SNAPSHOT, name: 'Stale' })
    expect(current(source).name).toBe('Saved')

    await vi.advanceTimersByTimeAsync(1)
    expect(request).toHaveBeenCalledTimes(1)
    source.acceptSnapshot({ ...SNAPSHOT, name: 'Stored' }, 'req-1')
    expect(current(source).name).toBe('Stored')
  })

  it('a second grace period with no reply releases the batch outright', async () => {
    const request = vi.fn(() => 'req-1')
    const { source } = loadedSource(vi.fn().mockResolvedValue(undefined), request)

    void source.deps.saveModel!({ name: 'Saved' })
    await source.flush()
    source.acceptSnapshot({ ...SNAPSHOT, name: 'Stored' })

    await vi.advanceTimersByTimeAsync(TAGGED_SNAPSHOT_GRACE_MS * 2)

    expect(request).toHaveBeenCalledTimes(1)
    expect(current(source).name).toBe('Stored')
  })

  it('without a request transport, the grace period alone releases the batch', async () => {
    const { source } = loadedSource()

    void source.deps.saveModel!({ name: 'Saved' })
    await source.flush()
    source.acceptSnapshot({ ...SNAPSHOT, name: 'Stored' })
    expect(current(source).name).toBe('Saved')

    await vi.advanceTimersByTimeAsync(TAGGED_SNAPSHOT_GRACE_MS)
    expect(current(source).name).toBe('Stored')
  })

  it('a tagged snapshot that arrives in time cancels the safety net', async () => {
    const request = vi.fn(() => 'req-1')
    const { source, send } = loadedSource(vi.fn().mockResolvedValue(undefined), request)

    void source.deps.saveModel!({ name: 'Saved' })
    await source.flush()
    source.acceptSnapshot({ ...SNAPSHOT, name: 'Saved' }, send.mock.calls[0][3])

    await vi.advanceTimersByTimeAsync(TAGGED_SNAPSHOT_GRACE_MS * 2)
    expect(request).not.toHaveBeenCalled()
  })
})
