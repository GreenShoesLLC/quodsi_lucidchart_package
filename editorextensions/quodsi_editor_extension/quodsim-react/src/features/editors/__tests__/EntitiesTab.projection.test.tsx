// End-to-end contract test for Lucid's Entities tab (spec 2026-09-11).
//
// DELIBERATELY DOES NOT STUB THE PANEL -- same reasoning as
// ResourcesTab.projection.test.tsx. It renders the REAL shared EntitiesEditor
// against a projection built by the REAL production mapping (projectModelRoot)
// fed through the REAL createModelRootSource / createLucidModelStateAccessor
// pair, from a REAL ModelDefinition. Only useModelRootSource's React hook is
// replaced, because it needs a live postMessage parent.
//
// Pins three things:
//  1. description survives projection -> source -> accessor -> panel.
//  2. EntitiesTab mounts the editor with referenceCleanup="host": a delete of
//     an entity a generator USES sends { entities } over the model-root
//     transport and never a shape write (the projection's generators carry
//     entityId, so a client cascade WOULD fire here).
//  3. The loading gate: before the first snapshot the editor is not mounted,
//     so "Add Entity" cannot send a one-row list that updateEntities would
//     treat as deleting every existing entity.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react'
import { Entity, Generator, Model, ModelDefinition, ModelDefaults } from '@quodsi/lucid-shared'
import { projectModelRoot } from '../../../../../src/core/modelRootProjection'
import { createModelRootSource, type ModelRootTransport } from '../../../adapters/useModelRootSource'
import { createLucidModelStateAccessor } from '../../../adapters/LucidModelStateAccessor'

const hookResult: { current: { accessor: unknown; projection: unknown } } = {
  current: { accessor: null, projection: null },
}

vi.mock('../../../adapters/useModelRootSource', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../adapters/useModelRootSource')>()
  return { ...actual, useModelRootSource: () => hookResult.current }
})

import EntitiesTab from '../EntitiesTab'

const CUSTOMER_ID = 'ent-customer'

function buildModelDefinition(): ModelDefinition {
  // ModelDefinition's constructor already adds the Default Entity.
  const def = new ModelDefinition(Model.createDefault('model-1'))
  const customer = new Entity(CUSTOMER_ID, 'Customer')
  customer.description = 'A walk-in'
  def.entities.add(customer)
  def.generators.add(new Generator('gen-1', 'Arrivals', CUSTOMER_ID))
  return def
}

function mountWithProjection(transportOverrides: Partial<ModelRootTransport> = {}) {
  const transport: ModelRootTransport = {
    send: vi.fn().mockResolvedValue(undefined),
    saveShape: vi.fn().mockResolvedValue(undefined),
    ...transportOverrides,
  }
  const source = createModelRootSource(transport)
  const projection = projectModelRoot(buildModelDefinition())
  // `as never`: same cross-package type seam ResourcesTab.projection.test.tsx crosses.
  source.acceptSnapshot(projection as never)
  hookResult.current = { accessor: createLucidModelStateAccessor(source.deps), projection }
  render(<EntitiesTab />)
  return { transport, projection, source }
}

describe('EntitiesTab against a real model-root projection', () => {
  beforeEach(() => {
    cleanup()
    hookResult.current = { accessor: null, projection: null }
  })

  it('renders every entity with its description', () => {
    mountWithProjection()

    expect(screen.getByText(ModelDefaults.DEFAULT_ENTITY_NAME)).toBeInTheDocument()
    expect(screen.getByText('Customer')).toBeInTheDocument()
    expect(screen.getByText('A walk-in')).toBeInTheDocument()
  })

  it('deletes through the model root only -- the host owns the reference cascade', async () => {
    const { transport } = mountWithProjection()

    // Default Entity is locked (no Delete), so the only Delete is Customer's.
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete Entity' }))

    await waitFor(() => expect(transport.send).toHaveBeenCalledTimes(1))
    const patch = (transport.send as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      entities: Array<{ id: string }>
    }
    expect(Object.keys(patch)).toEqual(['entities'])
    expect(patch.entities.map((e) => e.id)).toEqual([ModelDefaults.DEFAULT_ENTITY_ID])
    expect(transport.saveShape).not.toHaveBeenCalled()
  })

  // Final fix wave I1. Sequence: (1) click Delete Entity -> confirmDelete
  // calls accessor.updateModel({ entities }) -> createModelRootSource's
  // saveModel does an OPTIMISTIC ECHO of the shorter list into the cached
  // projection *before* transport.send resolves, so the confirm box
  // disappears here even though nothing is confirmed yet -- deletingEntity
  // resolves undefined because Customer is already gone from the echoed
  // list, even though deletingId is still set. (2) transport.send rejects;
  // confirmDelete's catch sets deleteError but deletingId was never cleared.
  // (3) the host's real corrective push -- ModelManager's snapshot restoring
  // the never-actually-deleted entity -- is modeled here by re-accepting the
  // same projection. That restores Customer to the list, so deletingEntity
  // resolves again and the confirm box reappears -- this time WITH the
  // error explained, not silently.
  it('keeps the confirm box open with an explanation after the host rejects the delete', async () => {
    const send = vi.fn().mockRejectedValue(new Error('no current page'))
    const { source, projection } = mountWithProjection({ send })

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete Entity' }))

    await waitFor(() => expect(send).toHaveBeenCalledTimes(1))
    // The optimistic echo already hid the confirm box before the host replied.
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Delete Entity' })).toBeNull()
    )

    // Model the host's corrective MODEL_ROOT_SNAPSHOT landing after the
    // rejection.
    await act(async () => {
      source.acceptSnapshot(projection as never)
    })

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('no current page')
    expect(screen.getByRole('button', { name: 'Delete Entity' })).toBeInTheDocument()
  })

  it('shows a loading state and no editor before the first snapshot', () => {
    const transport: ModelRootTransport = { send: vi.fn().mockResolvedValue(undefined) }
    const source = createModelRootSource(transport)
    hookResult.current = { accessor: createLucidModelStateAccessor(source.deps), projection: null }
    render(<EntitiesTab />)

    expect(screen.getByText(/Loading/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add Entity' })).toBeNull()
  })

  it('projects entities with description for the panel', () => {
    const projection = projectModelRoot(buildModelDefinition())
    expect(projection.entities).toEqual(
      expect.arrayContaining([{ id: CUSTOMER_ID, name: 'Customer', description: 'A walk-in' }])
    )
  })
})
