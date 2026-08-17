import { createLucidModelStateAccessor, ShapeInfoLike } from '../LucidModelStateAccessor'
import type { Mock } from 'vitest'

function makeDeps() {
  const listeners = new Set<() => void>()
  let modelDefinition: Record<string, unknown> = { generators: [], arrivalPatterns: [] }
  return {
    save: vi.fn().mockResolvedValue(undefined),
    getModelDefinition: () => modelDefinition,
    onModelChanged: (fn: () => void) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    // test controls
    _emit: () => listeners.forEach((fn) => fn()),
    _replace: (next: Record<string, unknown>) => {
      modelDefinition = next
    },
    _listenerCount: () => listeners.size,
  }
}

describe('LucidModelStateAccessor', () => {
  it('returns the same snapshot reference when nothing has changed', () => {
    const deps = makeDeps()
    const accessor = createLucidModelStateAccessor(deps)
    expect(accessor.getSnapshot()).toBe(accessor.getSnapshot())
  })

  it('returns a new snapshot reference after the model changes', () => {
    const deps = makeDeps()
    const accessor = createLucidModelStateAccessor(deps)
    const before = accessor.getSnapshot()
    deps._replace({ generators: [{ id: 'g1' }], arrivalPatterns: [] })
    deps._emit()
    expect(accessor.getSnapshot()).not.toBe(before)
  })

  it('notifies subscribers when the model changes', () => {
    const deps = makeDeps()
    const accessor = createLucidModelStateAccessor(deps)
    const listener = vi.fn()
    accessor.subscribe(listener)
    deps._emit()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('unsubscribing detaches the listener', () => {
    const deps = makeDeps()
    const accessor = createLucidModelStateAccessor(deps)
    const listener = vi.fn()
    accessor.subscribe(listener)()
    deps._emit()
    expect(listener).not.toHaveBeenCalled()
    expect(deps._listenerCount()).toBe(0)
  })

  it('updateShape forwards id, type and patch to the save path', async () => {
    const deps = makeDeps()
    const accessor = createLucidModelStateAccessor(deps)
    await accessor.updateShape('g1', 'Generator', { name: 'Renamed' })
    expect(deps.save).toHaveBeenCalledWith('g1', 'Generator', { name: 'Renamed' })
  })

  it('a save failure rejects rather than being swallowed', async () => {
    const deps = makeDeps()
    deps.save.mockRejectedValueOnce(new Error('storage rejected'))
    const accessor = createLucidModelStateAccessor(deps)
    await expect(accessor.updateShape('g1', 'Generator', {})).rejects.toThrow('storage rejected')
  })

  // --- Additional coverage beyond the brief's minimum: every ModelStateAccessor
  // member must be genuinely implemented (or genuinely, documentedly absent), not
  // a silent no-op. See the task report for why each of these matters.

  it('getSnapshot reflects saveStatus transitions even with no model change and no subscriber', async () => {
    const deps = makeDeps()
    const accessor = createLucidModelStateAccessor(deps)
    const idle = accessor.getSnapshot()
    expect(idle.saveStatus).toBe('idle')

    const pending = accessor.updateShape('g1', 'Generator', { name: 'x' })
    // saveStatus flips to 'saving' synchronously, before the save promise settles.
    expect(accessor.getSnapshot().saveStatus).toBe('saving')
    expect(accessor.getSnapshot()).not.toBe(idle)

    await pending
    expect(accessor.getSnapshot().saveStatus).toBe('saved')
  })

  it('updateModel forwards the FULL patch verbatim to saveModel -- no field branching, no dropped keys', async () => {
    const deps = makeDeps() as ReturnType<typeof makeDeps> & {
      saveModel: Mock
    }
    deps.saveModel = vi.fn().mockResolvedValue(undefined)
    const accessor = createLucidModelStateAccessor(deps)
    const patch = { arrivalPatterns: [{ id: 'ap1' }], someUnrelatedKey: 42 }
    await accessor.updateModel(patch)
    expect(deps.saveModel).toHaveBeenCalledTimes(1)
    expect(deps.saveModel).toHaveBeenCalledWith(patch)
  })

  it('updateModel with only arrivalPatterns reaches saveModel without being dropped (the LucidEmbedModelAccessor bug)', async () => {
    const deps = makeDeps() as ReturnType<typeof makeDeps> & {
      saveModel: Mock
    }
    deps.saveModel = vi.fn().mockResolvedValue(undefined)
    const accessor = createLucidModelStateAccessor(deps)
    await accessor.updateModel({ arrivalPatterns: [{ id: 'ap1' }] })
    expect(deps.saveModel).toHaveBeenCalledWith({ arrivalPatterns: [{ id: 'ap1' }] })
  })

  it('updateModel fails loudly (rejects + failed saveStatus) rather than silently succeeding when saveModel is not configured', async () => {
    const deps = makeDeps()
    const accessor = createLucidModelStateAccessor(deps)
    await expect(accessor.updateModel({ arrivalPatterns: [] })).rejects.toThrow('saveModel')
    expect(accessor.getSnapshot().saveStatus).toBe('failed')
    expect(accessor.getSnapshot().saveError).toContain('saveModel')
  })

  it('updateModel rejects rather than swallowing a saveModel failure', async () => {
    const deps = makeDeps() as ReturnType<typeof makeDeps> & {
      saveModel: Mock
    }
    deps.saveModel = vi.fn().mockRejectedValueOnce(new Error('model storage rejected'))
    const accessor = createLucidModelStateAccessor(deps)
    await expect(accessor.updateModel({ arrivalPatterns: [] })).rejects.toThrow('model storage rejected')
    expect(accessor.getSnapshot().saveStatus).toBe('failed')
  })

  it('getShapeInfo forwards to the dep when supplied', () => {
    const deps = makeDeps() as ReturnType<typeof makeDeps> & {
      getShapeInfo: Mock
    }
    const shape: ShapeInfoLike = {
      shapeId: 'g1',
      name: 'Gen 1',
      masterName: null,
      text: null,
      is1D: false,
      quodsiType: 'Generator',
      quodsiData: null,
    }
    deps.getShapeInfo = vi.fn().mockReturnValue(shape)
    const accessor = createLucidModelStateAccessor(deps)
    expect(accessor.getShapeInfo).toBeDefined()
    expect(accessor.getShapeInfo!('g1')).toBe(shape)
    expect(deps.getShapeInfo).toHaveBeenCalledWith('g1')
  })

  it('classifyShape forwards to the dep when supplied', async () => {
    const deps = makeDeps() as ReturnType<typeof makeDeps> & {
      classifyShape: Mock
    }
    deps.classifyShape = vi.fn().mockResolvedValue(undefined)
    const accessor = createLucidModelStateAccessor(deps)
    const shape: ShapeInfoLike = {
      shapeId: 's1',
      name: 'Shape 1',
      masterName: null,
      text: null,
      is1D: false,
      quodsiType: null,
      quodsiData: null,
    }
    expect(accessor.classifyShape).toBeDefined()
    await accessor.classifyShape!(shape, 'Activity')
    expect(deps.classifyShape).toHaveBeenCalledWith(shape, 'Activity')
  })

  it('removeClassification forwards to the dep when supplied', async () => {
    const deps = makeDeps() as ReturnType<typeof makeDeps> & {
      removeClassification: Mock
    }
    deps.removeClassification = vi.fn().mockResolvedValue(undefined)
    const accessor = createLucidModelStateAccessor(deps)
    const shape: ShapeInfoLike = {
      shapeId: 's1',
      name: 'Shape 1',
      masterName: null,
      text: null,
      is1D: false,
      quodsiType: 'Activity',
      quodsiData: null,
    }
    expect(accessor.removeClassification).toBeDefined()
    await accessor.removeClassification!(shape)
    expect(deps.removeClassification).toHaveBeenCalledWith(shape)
  })

  it('omits optional classification members entirely when the dep does not supply them', () => {
    const deps = makeDeps()
    const accessor = createLucidModelStateAccessor(deps)
    expect(accessor.getShapeInfo).toBeUndefined()
    expect(accessor.classifyShape).toBeUndefined()
    expect(accessor.removeClassification).toBeUndefined()
  })

  it('re-subscribing after unsubscribe re-attaches to the underlying host (ref-counted, not a dead subscription)', () => {
    const deps = makeDeps()
    const accessor = createLucidModelStateAccessor(deps)
    const first = vi.fn()
    const unsubFirst = accessor.subscribe(first)
    unsubFirst()
    expect(deps._listenerCount()).toBe(0)

    const second = vi.fn()
    accessor.subscribe(second)
    expect(deps._listenerCount()).toBe(1)
    deps._emit()
    expect(second).toHaveBeenCalledTimes(1)
    expect(first).not.toHaveBeenCalled()
  })

  it('multiple concurrent subscribers share one underlying subscription', () => {
    const deps = makeDeps()
    const accessor = createLucidModelStateAccessor(deps)
    const a = vi.fn()
    const b = vi.fn()
    accessor.subscribe(a)
    accessor.subscribe(b)
    expect(deps._listenerCount()).toBe(1)
    deps._emit()
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })
})
