// A resource delete in LucidChart host mode must keep its dialog when the
// write fails (final review I2, spec 2026-09-11 resource delete cleanup).
//
// createModelRootSource's saveModel ECHOES the patch into the projection
// before the host replies, so the deleted row leaves the Resources list the
// instant Delete Resource is clicked. If the host then times out (no
// corrective snapshot is ever sent), a dialog that rendered only while the
// row was still in the list would vanish, and the error would never be seen.
//
// Deliberately unstubbed, like ResourcesTab.projection.test.tsx: the REAL
// ResourcesEditor, fed by the REAL createModelRootSource /
// createLucidModelStateAccessor pair over the REAL projectModelRoot mapping.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { Model, ModelDefinition, Resource } from '@quodsi/lucid-shared'
import { ResourcesEditor } from 'quodsi_studio/platforms/shared'
import { projectModelRoot } from '../../../../../src/core/modelRootProjection'
import {
  createModelRootSource,
  type ModelRootTransport,
} from '../../../adapters/useModelRootSource'
import { createLucidModelStateAccessor } from '../../../adapters/LucidModelStateAccessor'

const NURSE_ID = 'res-nurse'
const TIMEOUT_MESSAGE = 'Model-root update timed out'

function buildProjection() {
  const def = new ModelDefinition(Model.createDefault('model-1'))
  def.resources.add(new Resource(NURSE_ID, 'Nurse', 2))
  return { ...projectModelRoot(def), pageId: 'page-1' }
}

/** The read-only source the dialog counts from: one activity seizing the resource. */
function referenceSourceWithSeize() {
  const snapshot = {
    modelDefinition: {
      resources: [{ id: NURSE_ID, name: 'Nurse' }],
      resourceRequirements: [],
      activities: [{ id: 'act-1', actions: [{ id: 's1', type: 'seize', resourceRequirementId: NURSE_ID }] }],
    },
    saveStatus: 'idle' as const,
    saveError: null,
  }
  return {
    subscribe: () => () => {},
    getSnapshot: () => snapshot,
    updateShape: vi.fn(async () => {}),
    updateModel: vi.fn(async () => {}),
  }
}

describe('ResourcesEditor delete against the optimistic model-root source', () => {
  beforeEach(() => {
    cleanup()
  })

  it('keeps the dialog and shows the error when the host write times out after the echo', async () => {
    // Rejects with no follow-up snapshot: the echo is never corrected.
    const transport: ModelRootTransport = {
      send: vi.fn().mockRejectedValue(new Error(TIMEOUT_MESSAGE)),
    }
    const source = createModelRootSource(transport)
    source.acceptSnapshot(buildProjection() as never)
    const accessor = createLucidModelStateAccessor(source.deps)

    render(
      <ResourcesEditor
        accessor={accessor}
        referenceCleanup="host"
        referenceSource={referenceSourceWithSeize() as never}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByText('1 Seize/Release step uses them:')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Delete Resource' }))

    await waitFor(() => expect(screen.getByText(TIMEOUT_MESSAGE)).toBeInTheDocument())
    expect(transport.send).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Delete Resource' })).toBeInTheDocument()
  })
})
