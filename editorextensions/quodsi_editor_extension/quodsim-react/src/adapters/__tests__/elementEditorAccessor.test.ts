// createElementEditorAccessor (spec 2026-09-14 lucid-shared-generator-editor
// §1): the model-root snapshot for everything, full connectors and Connector
// writes from the selection's reference data.
import type { ModelStateAccessor, ModelStateSnapshot } from 'quodsi_studio/platforms/shared'
import { combineSaveState, createElementEditorAccessor } from '../elementEditorAccessor'

type Fake = ModelStateAccessor & { set(next: ModelStateSnapshot): void }

function fakeAccessor(initial: ModelStateSnapshot, extra: Partial<ModelStateAccessor> = {}): Fake {
  let snapshot = initial
  const listeners = new Set<() => void>()
  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getSnapshot: () => snapshot,
    updateShape: vi.fn(async () => {}),
    updateModel: vi.fn(async () => {}),
    createModel: vi.fn(async () => {}),
    createShape: vi.fn(async () => {}),
    deleteShape: vi.fn(async () => {}),
    moveShape: vi.fn(async () => {}),
    ...extra,
    set(next: ModelStateSnapshot) {
      snapshot = next
      listeners.forEach((l) => l())
    },
  } as unknown as Fake
}

function snap(
  modelDefinition: unknown,
  saveStatus: ModelStateSnapshot['saveStatus'] = 'idle',
  saveError: string | null = null,
): ModelStateSnapshot {
  return { modelDefinition, saveStatus, saveError } as unknown as ModelStateSnapshot
}

const SUMMARY = { id: 'c1', sourceId: 'g1', actions: [{ id: 'as-dep', type: 'assign' }] }
const FULL = { id: 'c1', sourceId: 'g1', actions: [{ id: 'as-dep', type: 'assign', name: 'Stamp arrival' }] }

describe('createElementEditorAccessor — snapshot', () => {
  it('takes connectors from reference data and everything else from model-root', () => {
    const modelRoot = fakeAccessor(
      snap({ generators: [{ id: 'g1', routing: 'probability' }], connectors: [SUMMARY], entities: [{ id: 'e1' }] }),
    )
    const reference = fakeAccessor(snap({ generators: [{ id: 'g1', routing: 'stale' }], connectors: [FULL] }))

    const def = createElementEditorAccessor(modelRoot, reference).getSnapshot().modelDefinition as any

    expect(def.connectors).toEqual([FULL])
    expect(def.generators).toEqual([{ id: 'g1', routing: 'probability' }])
    expect(def.entities).toEqual([{ id: 'e1' }])
  })

  it('stays null until the model-root snapshot has arrived', () => {
    const composite = createElementEditorAccessor(fakeAccessor(snap(null)), fakeAccessor(snap({ connectors: [FULL] })))
    expect(composite.getSnapshot().modelDefinition).toBeNull()
  })

  it('returns the same object until one source changes', () => {
    const modelRoot = fakeAccessor(snap({ generators: [] }))
    const reference = fakeAccessor(snap({ connectors: [] }))
    const composite = createElementEditorAccessor(modelRoot, reference)

    const first = composite.getSnapshot()
    expect(composite.getSnapshot()).toBe(first)

    reference.set(snap({ connectors: [FULL] }))
    const second = composite.getSnapshot()
    expect(second).not.toBe(first)

    modelRoot.set(snap({ generators: [{ id: 'g1' }] }))
    expect(composite.getSnapshot()).not.toBe(second)
  })

  it('carries the combined save status', () => {
    const composite = createElementEditorAccessor(
      fakeAccessor(snap({}, 'saved')),
      fakeAccessor(snap({}, 'failed', 'Element update failed')),
    )
    expect(composite.getSnapshot()).toMatchObject({ saveStatus: 'failed', saveError: 'Element update failed' })
  })
})

describe('createElementEditorAccessor — writes and subscriptions', () => {
  it('routes Connector shape edits to reference data and everything else to model-root', async () => {
    const flushModelImmediate = vi.fn(async () => {})
    const modelRoot = fakeAccessor(snap({}), { flushModelImmediate } as Partial<ModelStateAccessor>)
    const reference = fakeAccessor(snap({}))
    const composite = createElementEditorAccessor(modelRoot, reference)

    await composite.updateShape('c1', 'Connector', { weight: 2 })
    await composite.updateShape('g1', 'Generator', { name: 'Walk-ins' })
    await composite.updateModel({ arrivalPatterns: [] })
    await composite.flushModelImmediate?.()

    expect(reference.updateShape).toHaveBeenCalledWith('c1', 'Connector', { weight: 2 })
    expect(modelRoot.updateShape).toHaveBeenCalledWith('g1', 'Generator', { name: 'Walk-ins' })
    expect(reference.updateShape).toHaveBeenCalledTimes(1)
    expect(modelRoot.updateShape).toHaveBeenCalledTimes(1)
    expect((modelRoot.updateModel as any).mock.calls[0][0]).toEqual({ arrivalPatterns: [] })
    expect(reference.updateModel).not.toHaveBeenCalled()
    expect(flushModelImmediate).toHaveBeenCalledTimes(1)
  })

  it('has no flushModelImmediate when model-root has none', () => {
    const composite = createElementEditorAccessor(fakeAccessor(snap({})), fakeAccessor(snap({})))
    expect(composite.flushModelImmediate).toBeUndefined()
  })

  it('notifies a subscriber when either source changes, until it unsubscribes', () => {
    const modelRoot = fakeAccessor(snap({}))
    const reference = fakeAccessor(snap({}))
    const listener = vi.fn()
    const unsubscribe = createElementEditorAccessor(modelRoot, reference).subscribe(listener)

    modelRoot.set(snap({ generators: [] }))
    reference.set(snap({ connectors: [] }))
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
    modelRoot.set(snap({ generators: [{ id: 'g1' }] }))
    reference.set(snap({ connectors: [FULL] }))
    expect(listener).toHaveBeenCalledTimes(2)
  })
})

describe('combineSaveState', () => {
  const state = (status: ModelStateSnapshot['saveStatus'], error: string) => ({
    saveStatus: status,
    saveError: status === 'failed' ? error : null,
  })

  it.each([
    ['idle', 'idle', { saveStatus: 'idle', saveError: null }],
    ['saving', 'failed', { saveStatus: 'saving', saveError: null }],
    ['saved', 'saving', { saveStatus: 'saving', saveError: null }],
    ['failed', 'saved', { saveStatus: 'failed', saveError: 'model-root error' }],
    ['saved', 'failed', { saveStatus: 'failed', saveError: 'reference error' }],
    ['failed', 'failed', { saveStatus: 'failed', saveError: 'model-root error' }],
    ['saved', 'idle', { saveStatus: 'saved', saveError: null }],
    ['idle', 'saved', { saveStatus: 'saved', saveError: null }],
  ] as const)('model-root %s + reference %s', (modelRoot, reference, expected) => {
    expect(
      combineSaveState(state(modelRoot, 'model-root error'), state(reference, 'reference error')),
    ).toEqual(expected)
  })
})
