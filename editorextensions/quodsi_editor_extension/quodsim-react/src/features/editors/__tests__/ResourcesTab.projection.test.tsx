// End-to-end contract test for the MODEL_ROOT_SNAPSHOT projection that feeds
// quodsi_studio's ResourcesEditor in Lucid.
//
// WHY THIS TEST EXISTS. Mirrors
// src/features/schedule/__tests__/ScheduleModal.projection.test.tsx -- see
// that file's own header for the full rationale. Every other suite that
// touches the Resources tab stubs quodsi_studio's shared panels, so the
// projection could silently omit `resources` / `resourceRequirements` (both
// added in Plan 2b, Task 7) with a fully green suite: ResourcesEditor reads
// `state.modelDefinition.resources ?? []` (ResourcesEditor.tsx:89), so an
// absent field renders "No resources defined yet" rather than throwing.
//
// SO THIS TEST DELIBERATELY DOES NOT STUB THE PANEL. It renders the REAL
// ResourcesEditor against a projection built by the REAL production mapping
// -- `projectModelRoot`, the extension's own src/core/modelRootProjection.ts
// -- fed through the REAL createModelRootSource / createLucidModelStateAccessor
// pair the Lucid panel uses in production, built from a REAL ModelDefinition
// with real ResourceListManager / ResourceRequirementListManager instances.
//
// getShapeInfo IS wired into useModelRootSource's deps as of Task 8: it
// serves ShapeInfoLike straight from this same projection's resources[] rows
// (shapeId + shapeLabel), so createLucidModelStateAccessor now attaches
// `accessor.getShapeInfo` and ResourcesEditor's
// `accessor.getShapeInfo?.(shapeId)?.name ?? shapeId`
// (ResourcesEditor.tsx:324) resolves to the shape LABEL instead of falling
// through to the raw id. The first test below asserts that -- it is the only
// end-to-end check that the label actually survives projection -> source ->
// accessor -> panel, since the dep unit test
// (adapters/__tests__/useModelRootSource.getShapeInfo.test.ts) stops at the
// deps boundary.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import {
  Model,
  ModelDefinition,
  RequirementClause,
  RequirementMode,
  Resource,
  ResourceRequest,
  ResourceRequirement,
} from '@quodsi/lucid-shared'
import { ResourcesEditor } from 'quodsi_studio/platforms/shared'
// The extension's own production mapping -- see the header comment above and
// ScheduleModal.projection.test.tsx's own header for why this import path
// (rather than @quodsi/lucid-shared) is how the seam is exercised for real.
import { projectModelRoot } from '../../../../../src/core/modelRootProjection'
import {
  createModelRootSource,
  type ModelRootTransport,
} from '../../../adapters/useModelRootSource'
import { createLucidModelStateAccessor } from '../../../adapters/LucidModelStateAccessor'

const NURSE_ID = 'res-nurse'
const DOCTOR_ID = 'res-doctor'
const TECH_ID = 'res-tech'
const NURSE_SHAPE_ID = 'blk-1'
const NURSE_SHAPE_LABEL = 'Nurse Station'

/**
 * A real ModelDefinition with a shape-linked resource, a lane-linked
 * resource, and an unclaimed resource. shapeId/shapeLabel/laneRef are
 * stamped directly onto the Resource instances the way
 * ModelDefinitionPageBuilder stamps them at build time (Task 3): they are
 * transient, declared on neither the Resource class nor its constructor, so
 * this reaches them the same way projectModelRoot does -- an intersection
 * cast, not a constructor argument.
 */
function buildModelDefinition(): ModelDefinition {
  const def = new ModelDefinition(Model.createDefault('model-1'))

  const nurse = new Resource(NURSE_ID, 'Nurse', 2)
  ;(nurse as Resource & { shapeId?: string; shapeLabel?: string }).shapeId = NURSE_SHAPE_ID
  ;(nurse as Resource & { shapeId?: string; shapeLabel?: string }).shapeLabel = NURSE_SHAPE_LABEL
  def.resources.add(nurse)

  const doctor = new Resource(DOCTOR_ID, 'Doctor', 1)
  ;(doctor as Resource & { laneRef?: { blockId: string; laneId: string } }).laneRef = {
    blockId: 'blk-2',
    laneId: 'lane-1',
  }
  def.resources.add(doctor)

  const tech = new Resource(TECH_ID, 'Tech', 1)
  def.resources.add(tech)

  return def
}

/**
 * A real ModelDefinition carrying a single resource and one CUSTOM
 * ResourceRequirement that requests it -- deliberately no auto-derived
 * requirement (id === resource id) alongside it, so the delete-impact count
 * below is unambiguously "1".
 */
function buildModelDefinitionWithCustomRequirement(): ModelDefinition {
  const def = new ModelDefinition(Model.createDefault('model-1'))

  const nurse = new Resource(NURSE_ID, 'Nurse', 2)
  def.resources.add(nurse)

  const clause = new RequirementClause('clause-1', RequirementMode.REQUIRE_ALL, [
    ResourceRequest.create(NURSE_ID),
  ])
  def.resourceRequirements.add(new ResourceRequirement('req-custom', 'Needs a Nurse', clause))

  return def
}

/**
 * The production accessor pair, fed the projection exactly as an incoming
 * MODEL_ROOT_SNAPSHOT message would feed it.
 */
function accessorFor(projection: unknown) {
  const transport: ModelRootTransport = {
    send: vi.fn().mockResolvedValue(undefined),
    saveShape: vi.fn().mockResolvedValue(undefined),
  }
  const source = createModelRootSource(transport)
  source.acceptSnapshot(projection as never)
  return { accessor: createLucidModelStateAccessor(source.deps), transport }
}

describe('ResourcesEditor against a real model-root projection', () => {
  beforeEach(() => {
    cleanup()
  })

  // Guards `resources` on the projection root, and the three link-status
  // markers (shapeId/shapeLabel/laneRef) it carries per row. Without
  // `resources`, ResourcesEditor's `?? []` fallback renders "No resources
  // defined yet" instead of the three rows below.
  it('renders every resource with its link status from the real projection', () => {
    const projection = projectModelRoot(buildModelDefinition())
    const { accessor } = accessorFor(projection)
    render(<ResourcesEditor accessor={accessor} />)

    expect(screen.getByText('Nurse')).toBeInTheDocument()
    expect(screen.getByText('Doctor')).toBeInTheDocument()
    expect(screen.getByText('Tech')).toBeInTheDocument()

    // Task 8 wired getShapeInfo, so ResourcesEditor's
    // `accessor.getShapeInfo?.(shapeId)?.name ?? shapeId` resolves the
    // shape's display name ("Nurse Station") rather than falling through to
    // the raw block id.
    expect(screen.getByText(new RegExp(NURSE_SHAPE_LABEL))).toBeInTheDocument()
    expect(screen.queryByText(new RegExp(NURSE_SHAPE_ID))).not.toBeInTheDocument()

    // Doctor is claimed by a lane, not a shape: "lane" wording, no geometry.
    expect(screen.getByText(/lane/i)).toBeInTheDocument()

    // Tech is unclaimed: "no shape" wording.
    expect(screen.getByText(/no shape/i)).toBeInTheDocument()
  })

  // Guards `resourceRequirements` on the projection root. ResourcesEditor's
  // delete-confirmation dialog dry-runs the SAME removeResourceReferences
  // cascade the confirm button executes, reading its requirement count off
  // `def.resourceRequirements` (ResourcesEditor.tsx:135) -- so the dialog
  // copy can only be right if the projected requirements are right.
  it('delete confirmation counts requirements from the projected resourceRequirements', () => {
    const projection = projectModelRoot(buildModelDefinitionWithCustomRequirement())
    const { accessor } = accessorFor(projection)
    render(<ResourcesEditor accessor={accessor} />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(screen.getByText(/Delete Resource: "Nurse"\?/)).toBeInTheDocument()
    expect(screen.getByText(/will also delete 1 requirement/)).toBeInTheDocument()
  })

  // Belt-and-braces on the seam itself, so a regression points at the
  // projection rather than at the panel's rendering.
  it('projects resources and resourceRequirements the panel reads', () => {
    const projection = projectModelRoot(buildModelDefinition())

    expect(projection.resources).toEqual([
      expect.objectContaining({ id: NURSE_ID, name: 'Nurse', shapeId: NURSE_SHAPE_ID, shapeLabel: NURSE_SHAPE_LABEL }),
      expect.objectContaining({ id: DOCTOR_ID, name: 'Doctor', laneRef: { blockId: 'blk-2', laneId: 'lane-1' } }),
      expect.objectContaining({ id: TECH_ID, name: 'Tech' }),
    ])
    expect(projection.resources?.[1].shapeId).toBeUndefined()
    expect(projection.resources?.[2].shapeId).toBeUndefined()
    expect(projection.resources?.[2].laneRef).toBeUndefined()
  })
})
