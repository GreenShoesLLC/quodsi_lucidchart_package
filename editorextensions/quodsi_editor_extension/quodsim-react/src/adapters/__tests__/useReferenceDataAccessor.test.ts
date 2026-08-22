import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { EditorReferenceData, ISerializedResourceRequirement } from '@quodsi/lucid-shared'
import { createReferenceDataAccessor, useReferenceDataAccessor } from '../useReferenceDataAccessor'

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
