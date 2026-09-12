// Lucid's Resources tab mounts the shared ResourcesEditor in host mode (spec
// 2026-09-11 resource delete cleanup): the dialog counts from the Model
// editor's referenceData accessor, and the delete goes to the host with the
// user's choice -- no shape writes from the panel.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const NURSE = 'r1'

// vi.mock factories are hoisted above module-level consts; build the shared
// accessor in vi.hoisted so the mock can reference it.
const { makeAccessor, modelRoot } = vi.hoisted(() => {
  const makeAccessor = (modelDefinition: Record<string, unknown>) => {
    const snapshot = { modelDefinition, saveStatus: 'idle' as const, saveError: null }
    return {
      subscribe: () => () => {},
      getSnapshot: () => snapshot,
      updateShape: vi.fn(async () => {}),
      updateModel: vi.fn(async () => {}),
    }
  }
  return {
    makeAccessor,
    modelRoot: makeAccessor({ resources: [{ id: 'r1', name: 'Nurse', capacity: 1 }], resourceRequirements: [] }),
  }
})

vi.mock('../../../adapters/useModelRootSource', () => ({
  useModelRootSource: () => ({ accessor: modelRoot, projection: {} }),
}))
vi.mock('../../../messaging/MessageProvider', () => ({
  useMessaging: () => ({ sendMessage: vi.fn() }),
}))

import { ResourcesTab } from '../ResourcesTab'

describe('ResourcesTab (host cleanup)', () => {
  it('counts from referenceSource and sends the delete with the choice, never writing shapes', async () => {
    const referenceSource = makeAccessor({
      resources: [{ id: NURSE, name: 'Nurse' }],
      resourceRequirements: [{ id: NURSE, name: 'Nurse', rootClause: { id: 'c', mode: 'require_all', requests: [{ resourceId: NURSE }] } }],
      activities: [{ id: 'a1', name: 'Intake', actions: [{ id: 's1', type: 'seize', resourceRequirementId: NURSE }] }],
    })
    render(<ResourcesTab referenceSource={referenceSource as never} />)

    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }))
    expect(screen.getByText('1 Seize/Release step uses them:')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'Remove the steps' }))
    fireEvent.click(screen.getByRole('button', { name: /delete resource/i }))

    await waitFor(() => expect(modelRoot.updateModel).toHaveBeenCalledWith({ resources: [] }, { seizeRelease: 'remove' }))
    expect(modelRoot.updateShape).not.toHaveBeenCalled()
    expect(referenceSource.updateShape).not.toHaveBeenCalled()
  })
})
