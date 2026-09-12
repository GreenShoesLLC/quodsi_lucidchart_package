import { describe, it, expect, vi } from 'vitest'
import { createModelRootSource } from '../useModelRootSource'
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
    // Still forwarded verbatim. This snapshot carries no pageId.
    expect(send).toHaveBeenCalledWith({ resources: [{ id: 'r1', name: 'Renamed' }] }, undefined)
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

  it('a later snapshot still replaces the echoed projection', async () => {
    const source = createModelRootSource({ send: vi.fn().mockResolvedValue(undefined) })
    source.acceptSnapshot({
      generators: [], arrivalPatterns: [], resources: [{ id: 'r1', name: 'Nurse', shapeId: 'blk-9' }], model: {},
    } as any)
    await source.deps.saveModel!({ resources: [{ id: 'r1', name: 'Renamed' }] })

    source.acceptSnapshot({
      generators: [], arrivalPatterns: [], resources: [{ id: 'r1', name: 'Host Wins', shapeId: 'blk-9' }], model: {},
    } as any)

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

    await source.deps.saveModel!({ arrivalPatterns: [{ id: 'ap-1', name: 'P1' }], future: 42 })

    expect(send).toHaveBeenCalledWith(
      { arrivalPatterns: [{ id: 'ap-1', name: 'P1' }], future: 42 },
      'page-1',
    )
  })

  it('uses the page id captured BEFORE the optimistic echo', async () => {
    const send = vi.fn().mockResolvedValue(undefined)
    const source = createModelRootSource({ send })
    source.acceptSnapshot({ generators: [], arrivalPatterns: [], model: {}, pageId: 'page-9' } as any)

    await source.deps.saveModel!({ pageId: 'not-a-real-key' } as any)

    expect(send.mock.calls[0][1]).toBe('page-9')
  })

  it('forwards cleanup options to the transport only when given', async () => {
    const send = vi.fn().mockResolvedValue(undefined)
    const source = createModelRootSource({ send })
    source.acceptSnapshot({ generators: [], arrivalPatterns: [], model: {}, pageId: 'page-1' } as any)

    await source.deps.saveModel!({ resources: [] }, { seizeRelease: 'remove' })
    await source.deps.saveModel!({ resources: [] })

    expect(send.mock.calls[0]).toEqual([{ resources: [] }, 'page-1', { seizeRelease: 'remove' }])
    expect(send.mock.calls[1]).toEqual([{ resources: [] }, 'page-1'])
  })
})
