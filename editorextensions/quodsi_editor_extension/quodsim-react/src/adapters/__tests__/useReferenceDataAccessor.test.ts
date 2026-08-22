import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { EditorReferenceData, ISerializedResourceRequirement } from '@quodsi/lucid-shared'
import { createReferenceDataAccessor, useReferenceDataAccessor, isPlainAutoRequirement } from '../useReferenceDataAccessor'

const auto = (id: string, name: string) => ({ id, name, rootClause: { id: 'clause-1', mode: 'require_all', requests: [{ resourceId: id }] } })
const custom = { id: 'req-1', name: 'Triage', rootClause: { id: 'root', mode: 'require_any', requests: [{ resourceId: 'doc' }, { resourceId: 'nurse', quantity: 2 }] } }

function refData(overrides: Partial<EditorReferenceData> = {}): EditorReferenceData {
  return {
    resources: [{ id: 'doc', name: 'Doctor' }, { id: 'nurse', name: 'Nurse' }],
    resourceRequirements: [auto('doc', 'Doctor'), auto('nurse', 'Nurse'), custom] as never,
    activities: [{ id: 'a1', name: 'Intake', actions: [{ id: 'x', type: 'delay_with_resource', resourceRequirementId: 'req-1' }] }],
    ...overrides,
  }
}

type Def = { resources: unknown[]; resourceRequirements: Array<{ id: string; name: string }>; activities: unknown[] }
const def = (s: { modelDefinition: unknown }) => s.modelDefinition as Def

describe('createReferenceDataAccessor', () => {
  it('projects resources / resourceRequirements / activities from the prop', () => {
    const { accessor } = createReferenceDataAccessor(refData(), () => ({ updateResourceRequirements: vi.fn() }))
    const snap = accessor.getSnapshot()
    expect(def(snap).resources).toHaveLength(2)
    expect(def(snap).resourceRequirements.map((r) => r.id)).toEqual(['doc', 'nurse', 'req-1'])
    expect(def(snap).activities).toHaveLength(1)
    expect(snap.saveStatus).toBe('idle')
    expect(accessor.getSnapshot()).toBe(snap) // cached between changes
  })

  it('notifies subscribers on a new prop reference, not on the same one', () => {
    const source = createReferenceDataAccessor(refData(), () => ({ updateResourceRequirements: vi.fn() }))
    const listener = vi.fn()
    source.accessor.subscribe(listener)
    const same = refData()
    source.setReferenceData(same)
    expect(listener).toHaveBeenCalledTimes(1)
    source.setReferenceData(same)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(def(source.accessor.getSnapshot()).resources).toHaveLength(2)
  })

  it('updateModel strips autos, sends, resolves only on the host result, then overlays', async () => {
    let resolveSend!: () => void
    const updateResourceRequirements = vi.fn<(list: ISerializedResourceRequirement[]) => Promise<void>>(() => new Promise<void>((r) => { resolveSend = r }))
    const source = createReferenceDataAccessor(refData(), () => ({ updateResourceRequirements }))
    const created = { id: 'req-2', name: '1 Doctor and 1 Nurse', rootClause: { id: 'root', mode: 'require_all', clauses: [] } }
    const next = [...def(source.accessor.getSnapshot()).resourceRequirements, created]

    let settled = false
    const p = source.accessor.updateModel({ resourceRequirements: next }).then(() => { settled = true })
    expect(updateResourceRequirements).toHaveBeenCalledTimes(1)
    const sent = updateResourceRequirements.mock.calls[0][0] as Array<{ id: string }>
    expect(sent.map((r) => r.id)).toEqual(['req-1', 'req-2'])          // autos stripped
    expect(source.accessor.getSnapshot().saveStatus).toBe('saving')
    await Promise.resolve()
    expect(settled).toBe(false)                                         // not before the host result
    resolveSend()
    await p
    expect(settled).toBe(true)
    expect(source.accessor.getSnapshot().saveStatus).toBe('saved')
    expect(def(source.accessor.getSnapshot()).resourceRequirements.map((r) => r.id)).toEqual(['doc', 'nurse', 'req-1', 'req-2']) // overlay incl. autos

    source.setReferenceData(refData())                                  // next prop clears the overlay
    expect(def(source.accessor.getSnapshot()).resourceRequirements.map((r) => r.id)).toEqual(['doc', 'nurse', 'req-1'])
  })

  it('updateModel rejects and reports saveError when the host fails; no overlay', async () => {
    const source = createReferenceDataAccessor(refData(), () => ({ updateResourceRequirements: vi.fn(async () => { throw new Error('page not available') }) }))
    await expect(source.accessor.updateModel({ resourceRequirements: [] })).rejects.toThrow('page not available')
    expect(source.accessor.getSnapshot().saveStatus).toBe('failed')
    expect(source.accessor.getSnapshot().saveError).toBe('page not available')
    expect(def(source.accessor.getSnapshot()).resourceRequirements).toHaveLength(3)
  })

  it('updateModel with any other key throws before sending', async () => {
    const updateResourceRequirements = vi.fn()
    const { accessor } = createReferenceDataAccessor(refData(), () => ({ updateResourceRequirements }))
    await expect(accessor.updateModel({ resources: [] })).rejects.toThrow('no persistence path for key(s): resources')
    expect(updateResourceRequirements).not.toHaveBeenCalled()
  })

  it('updateShape throws', async () => {
    const { accessor } = createReferenceDataAccessor(refData(), () => ({ updateResourceRequirements: vi.fn() }))
    await expect(accessor.updateShape('a1', 'Activity', {})).rejects.toThrow('not supported')
  })

  it('tolerates an undefined referenceData', () => {
    const { accessor } = createReferenceDataAccessor(undefined, () => ({ updateResourceRequirements: vi.fn() }))
    expect(def(accessor.getSnapshot())).toEqual({ resources: [], resourceRequirements: [], activities: [] })
  })

  // C1: an entry whose id collides with a resource id is NOT automatically
  // the plain auto-requirement — the extension supports a custom override
  // stored under an auto id (ModelDefinitionPageBuilder.
  // loadAndMergeResourceRequirements), and stripping it on save would
  // silently revert that override on the next reload.
  describe('isPlainAutoRequirement', () => {
    const doctor = { id: 'doc', name: 'Doctor' }

    it('is true for the plain auto shape', () => {
      expect(isPlainAutoRequirement(auto('doc', 'Doctor'), doctor)).toBe(true)
    })

    it('is true for a sparse auto (requests only, no clauses/quantity keys)', () => {
      const sparseAuto = { id: 'doc', name: 'Doctor', rootClause: { id: 'clause-1', mode: 'require_all', requests: [{ resourceId: 'doc' }] } }
      expect(isPlainAutoRequirement(sparseAuto, doctor)).toBe(true)
    })

    it('is false when the name differs from the resource (a custom override stored under the auto id)', () => {
      const renamed = { id: 'doc', name: 'Senior Doctor', rootClause: { id: 'clause-1', mode: 'require_all', requests: [{ resourceId: 'doc' }] } }
      expect(isPlainAutoRequirement(renamed, doctor)).toBe(false)
    })

    it('is false when quantity is not 1 (a custom override stored under the auto id)', () => {
      const qty2 = { id: 'doc', name: 'Doctor', rootClause: { id: 'clause-1', mode: 'require_all', requests: [{ resourceId: 'doc', quantity: 2 }] } }
      expect(isPlainAutoRequirement(qty2, doctor)).toBe(false)
    })

    it('is false when there are sub-clauses', () => {
      const withClauses = { id: 'doc', name: 'Doctor', rootClause: { id: 'clause-1', mode: 'require_all', requests: [{ resourceId: 'doc' }], clauses: [{ id: 'c2', mode: 'require_all' }] } }
      expect(isPlainAutoRequirement(withClauses, doctor)).toBe(false)
    })

    it('is false when mode is not require_all', () => {
      const requireAny = { id: 'doc', name: 'Doctor', rootClause: { id: 'clause-1', mode: 'require_any', requests: [{ resourceId: 'doc' }] } }
      expect(isPlainAutoRequirement(requireAny, doctor)).toBe(false)
    })
  })

  it('updateModel sends an id-colliding entry through when its name differs from the resource (custom override survives)', async () => {
    const updateResourceRequirements = vi.fn<(list: ISerializedResourceRequirement[]) => Promise<void>>(async () => {})
    const source = createReferenceDataAccessor(refData(), () => ({ updateResourceRequirements }))
    const overriddenDoc = { id: 'doc', name: 'Senior Doctor', rootClause: { id: 'clause-1', mode: 'require_all', requests: [{ resourceId: 'doc' }] } }
    const next = [overriddenDoc, auto('nurse', 'Nurse'), custom]

    await source.accessor.updateModel({ resourceRequirements: next })

    const sent = updateResourceRequirements.mock.calls[0][0] as Array<{ id: string; name: string }>
    expect(sent.map((r) => r.id)).toEqual(['doc', 'req-1'])
    expect(sent.find((r) => r.id === 'doc')?.name).toBe('Senior Doctor')
  })

  it('updateModel sends an id-colliding entry through when its quantity is 2 (custom override survives)', async () => {
    const updateResourceRequirements = vi.fn<(list: ISerializedResourceRequirement[]) => Promise<void>>(async () => {})
    const source = createReferenceDataAccessor(refData(), () => ({ updateResourceRequirements }))
    const qty2Doc = { id: 'doc', name: 'Doctor', rootClause: { id: 'clause-1', mode: 'require_all', requests: [{ resourceId: 'doc', quantity: 2 }] } }
    const next = [qty2Doc, auto('nurse', 'Nurse'), custom]

    await source.accessor.updateModel({ resourceRequirements: next })

    const sent = updateResourceRequirements.mock.calls[0][0] as Array<{ id: string }>
    expect(sent.map((r) => r.id)).toEqual(['doc', 'req-1'])
  })

  it('updateModel still strips the plain auto and a sparse auto (no clauses/quantity keys)', async () => {
    const updateResourceRequirements = vi.fn<(list: ISerializedResourceRequirement[]) => Promise<void>>(async () => {})
    const source = createReferenceDataAccessor(refData(), () => ({ updateResourceRequirements }))
    const sparseDoc = { id: 'doc', name: 'Doctor', rootClause: { id: 'clause-1', mode: 'require_all', requests: [{ resourceId: 'doc' }] } }
    const next = [sparseDoc, auto('nurse', 'Nurse'), custom]

    await source.accessor.updateModel({ resourceRequirements: next })

    const sent = updateResourceRequirements.mock.calls[0][0] as Array<{ id: string }>
    expect(sent.map((r) => r.id)).toEqual(['req-1'])
  })
})

describe('useReferenceDataAccessor', () => {
  it('returns a stable accessor and follows prop changes', () => {
    const senders = { updateResourceRequirements: vi.fn() }
    const first = refData()
    const { result, rerender } = renderHook(({ rd }) => useReferenceDataAccessor(rd, senders), { initialProps: { rd: first } })
    const accessor = result.current
    expect(def(accessor.getSnapshot()).resources).toHaveLength(2)
    const second = refData({ resources: [{ id: 'doc', name: 'Doctor' }] })
    act(() => { rerender({ rd: second }) })
    expect(result.current).toBe(accessor)
    expect(def(accessor.getSnapshot()).resources).toHaveLength(1)
  })
})
