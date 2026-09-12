// End-to-end contract test for Lucid's Entities tab (spec 2026-09-11; accessor
// passed in since 2026-09-12).
//
// DELIBERATELY DOES NOT STUB THE PANEL -- same reasoning as
// ResourcesTab.projection.test.tsx. It renders the REAL shared EntitiesEditor
// against a projection built by the REAL production mapping (projectModelRoot)
// fed through the REAL createModelRootSource / createLucidModelStateAccessor
// pair, from a REAL ModelDefinition.
//
// Pins two things:
//  1. description survives projection -> source -> accessor -> panel.
//  2. EntitiesTab mounts the editor with referenceCleanup="host": a delete of
//     an entity a generator USES sends { entities } over the model-root
//     transport and never a shape write.
// The loading gate lives in ModelEditorForPage now (ModelEditorForPage.test.tsx).

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react'
import { Entity, Generator, Model, ModelDefinition, ModelDefaults } from '@quodsi/lucid-shared'
import { projectModelRoot } from '../../../../../src/core/modelRootProjection'
import { createModelRootSource, type ModelRootTransport } from '../../../adapters/useModelRootSource'
import { createLucidModelStateAccessor } from '../../../adapters/LucidModelStateAccessor'
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
  source.acceptSnapshot({ ...projection, pageId: 'page-1' })
  render(<EntitiesTab accessor={createLucidModelStateAccessor(source.deps)} />)
  return { transport, projection, source }
}

describe('EntitiesTab against a real model-root projection', () => {
  beforeEach(() => {
    cleanup()
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

  // The optimistic echo hides the confirm box before the host replies; the
  // host's corrective snapshot after the rejection brings the entity -- and
  // the confirm box, now with the error -- back.
  it('keeps the confirm box open with an explanation after the host rejects the delete', async () => {
    const send = vi.fn().mockRejectedValue(new Error('no current page'))
    const { source, projection } = mountWithProjection({ send })

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete Entity' }))

    await waitFor(() => expect(send).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Delete Entity' })).toBeNull()
    )

    await act(async () => {
      source.acceptSnapshot({ ...projection, pageId: 'page-1' })
    })

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('no current page')
    expect(screen.getByRole('button', { name: 'Delete Entity' })).toBeInTheDocument()
  })

  it('projects entities with description for the panel', () => {
    const projection = projectModelRoot(buildModelDefinition())
    expect(projection.entities).toEqual(
      expect.arrayContaining([{ id: CUSTOMER_ID, name: 'Customer', description: 'A walk-in' }])
    )
  })
})
