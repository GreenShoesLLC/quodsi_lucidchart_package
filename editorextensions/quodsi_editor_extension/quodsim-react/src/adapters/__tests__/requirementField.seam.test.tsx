// Real RequirementField + ResourceRequirementModal + RequirementPicker from
// the Studio barrel, driven by the real createReferenceDataAccessor over a
// fake confirmed-round-trip sender. Pins: autos are stripped from the wire,
// onChange fires only after the host result, and the overlay keeps the new
// requirement visible before the selection refresh.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RequirementField, RequirementFieldContext } from 'quodsi_studio/platforms/shared'
import type { ISerializedResourceRequirement } from '@quodsi/lucid-shared'
import { createReferenceDataAccessor } from '../useReferenceDataAccessor'

const referenceData = {
  resources: [{ id: 'doc', name: 'Doctor' }, { id: 'nurse', name: 'Nurse' }],
  resourceRequirements: [
    { id: 'doc', name: 'Doctor', rootClause: { id: 'c', mode: 'require_all', requests: [{ resourceId: 'doc' }] } },
    { id: 'nurse', name: 'Nurse', rootClause: { id: 'c', mode: 'require_all', requests: [{ resourceId: 'nurse' }] } },
  ],
  activities: [],
} as any

describe('RequirementField over useReferenceDataAccessor (seam)', () => {
  it('create from the action: strips autos, repoints only after the host result, overlays the new requirement', async () => {
    const user = userEvent.setup()
    const calls: string[] = []
    let resolveHost!: () => void
    const updateResourceRequirements = vi.fn<(list: ISerializedResourceRequirement[]) => Promise<void>>(
      () => new Promise<void>((r) => { resolveHost = () => { calls.push('host-result'); r() } }),
    )
    const source = createReferenceDataAccessor(referenceData, () => ({ updateResourceRequirements }))
    const onChange = vi.fn((id: string | null) => { calls.push(`onChange:${id}`) })

    render(
      <RequirementFieldContext.Provider value={source.accessor}>
        <RequirementField value={null} onChange={onChange} emptyLabel="(none — just a delay)" />
      </RequirementFieldContext.Provider>,
    )

    await user.click(screen.getByRole('button', { name: /resource requirement/i }))
    await user.click(screen.getByRole('option', { name: /New requirement/ }))
    await user.click(screen.getByRole('button', { name: '+ also needs…' }))   // "1 Doctor and 1 Nurse" — no structural match
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(updateResourceRequirements).toHaveBeenCalledTimes(1)
    const sent = updateResourceRequirements.mock.calls[0][0] as Array<{ id: string; name: string }>
    expect(sent).toHaveLength(1)                                  // autos stripped
    expect(sent[0].name).toBe('1 Doctor and 1 Nurse')
    expect(onChange).not.toHaveBeenCalled()                       // not before the host result

    resolveHost()
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1))
    expect(calls).toEqual(['host-result', `onChange:${sent[0].id}`])

    // Overlay: the new requirement is in the snapshot before any referenceData refresh.
    const reqs = (source.accessor.getSnapshot().modelDefinition as any).resourceRequirements as Array<{ id: string }>
    expect(reqs.map((r) => r.id)).toEqual(['doc', 'nurse', sent[0].id])
  })
})
