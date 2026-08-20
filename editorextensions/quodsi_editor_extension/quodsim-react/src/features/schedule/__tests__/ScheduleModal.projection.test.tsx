// End-to-end contract test for the MODEL_ROOT_SNAPSHOT projection that feeds
// quodsi_studio's ScheduleModal in Lucid.
//
// WHY THIS TEST EXISTS. Every other test that touches the schedule editor
// STUBS ScheduleModal (see ScheduleEditorView.test.tsx's vi.mock of
// 'quodsi_studio/platforms/shared'), because those suites are about the view's
// own wiring. The consequence: the projection could -- and did -- omit three
// fields ScheduleModal reads, with a fully green suite. Every read in the
// modal is defensive (`?? []`, `?.`), so a missing field renders empty rather
// than throwing:
//   * `generator.arrivalScheduleId`  (ScheduleModal.tsx:119) -- absent, so the
//     linked schedule was never found: empty table, and the first edit took
//     updateSchedule's create-branch, minting a DUPLICATE schedule and
//     orphaning the real one beyond both cleanup paths (each keys off the
//     generator's CURRENT arrivalScheduleId).
//   * `modelDefinition.entities`     (ScheduleModal.tsx:111) -- absent, so the
//     per-row Entity dropdown had no options and no scheduled arrival could be
//     given the entityId the engine requires.
//   * `modelDefinition.states`       (ScheduleModal.tsx:113) -- absent, so the
//     per-state columns vanished.
//
// SO THIS TEST DELIBERATELY DOES NOT STUB THE MODAL. It renders the REAL
// ScheduleModal (and therefore the real ScheduleTable) against a projection
// built by the REAL production mapping -- `projectModelRoot`, the extension's
// own src/core/modelRootProjection.ts, which is precisely what
// ModelManager.buildModelRootProjection returns -- fed through the REAL
// createModelRootSource / createLucidModelStateAccessor pair the Lucid panel
// uses in production. Drop any one of the three fields from the projection and
// assertions below fail.
//
// Nothing about the projection input is stubbed either: `projectModelRoot` is
// handed a REAL ModelDefinition, with real EntityListManager /
// StateListManager / GeneratorListManager / ArrivalScheduleListManager
// instances holding real Entity / State / Generator / ArrivalSchedule objects,
// populated the way a converted Lucid page populates them.
//
// The only production code NOT exercised here is ModelManager's
// page-resolution half (setCurrentPage + getModelDefinition, both PageProxy-
// bound and meaningless under jsdom). The extension's own
// tests/core/modelManager.buildModelRootProjection.test.ts covers that half
// AND the delegation to `projectModelRoot`, so the two suites meet.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import {
  ArrivalSchedule,
  ComponentType,
  Entity,
  Generator,
  GeneratorType,
  Model,
  ModelDefinition,
  State,
  StateType,
} from '@quodsi/lucid-shared'
import { ScheduleModal } from 'quodsi_studio/platforms/shared'
// The extension's own production mapping. Importable from here only because it
// was split out of ModelManager (see modelRootProjection.ts's header); the
// class itself drags in lucid-extension-sdk and the messaging barrel, neither
// of which typechecks under quodsim-react's tsconfig.
import { projectModelRoot } from '../../../../../src/core/modelRootProjection'
import {
  createModelRootSource,
  type ModelRootTransport,
} from '../../../adapters/useModelRootSource'
import { createLucidModelStateAccessor } from '../../../adapters/LucidModelStateAccessor'

const GENERATOR_ID = 'gen-1'
const SCHEDULE_ID = 'sched-1'
const VIP_ENTITY_ID = 'entity-vip'

/** A real ModelDefinition, populated the way a converted Lucid page is. */
function buildModelDefinition(): ModelDefinition {
  const def = new ModelDefinition(Model.createDefault('model-1'))

  def.entities.add(new Entity(VIP_ENTITY_ID, 'VIP Patient'))
  def.states.add(
    new State(
      'state-priority',
      'Priority',
      ComponentType.ENTITY,
      StateType.NUMBER,
      0,
    ),
  )

  const generator = Generator.createDefault(GENERATOR_ID)
  generator.name = 'Front Door'
  generator.mode = GeneratorType.SCHEDULED
  generator.arrivalScheduleId = SCHEDULE_ID
  def.generators.add(generator)

  const schedule = new ArrivalSchedule(SCHEDULE_ID, 'Morning rush')
  schedule.arrivals = [
    { time: 30, entityId: VIP_ENTITY_ID, quantity: 2 },
    { time: 90 },
  ]
  def.arrivalSchedules.add(schedule)

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

function renderRealScheduleModal() {
  const projection = projectModelRoot(buildModelDefinition())
  const { accessor, transport } = accessorFor(projection)
  render(
    <ScheduleModal
      open
      onClose={() => {}}
      shapeId={GENERATOR_ID}
      accessor={accessor}
    />,
  )
  return { projection, transport }
}

describe('ScheduleModal against a real model-root projection', () => {
  beforeEach(() => {
    cleanup()
  })

  // Guards `arrivalScheduleId` on the projected generator. Without it,
  // ScheduleModal.tsx:120 finds no schedule, `arrivals` falls back to [], and
  // the table renders "0 rows" with no rows at all.
  it('finds the generator linked schedule and renders its arrivals', () => {
    renderRealScheduleModal()

    expect(screen.getByText('2 rows')).toBeInTheDocument()
    expect(screen.getAllByTestId('schedule-row')).toHaveLength(2)
    expect(screen.getByLabelText('Time (row 1)')).toHaveValue(30)
    expect(screen.getByLabelText('Time (row 2)')).toHaveValue(90)
  })

  // Same field, second symptom: the Name box shows the LINKED schedule's name,
  // not the "<generator> schedule" placeholder ScheduleModal.tsx:158 falls back
  // to when no schedule is found -- the same fallback whose first edit mints a
  // duplicate schedule and orphans the real one.
  it('shows the linked schedule name, not the create-on-first-edit placeholder', () => {
    renderRealScheduleModal()

    expect(screen.getByLabelText('Schedule name')).toHaveValue('Morning rush')
    expect(screen.getByLabelText('Schedule name')).not.toHaveValue('Front Door schedule')
  })

  // Guards `entities` on the projection root. Without it the row's Entity
  // <select> carries only the "(generator's entity)" no-override option, so no
  // arrival can be given the entityId the engine requires.
  it('offers the model entities in each row Entity dropdown', () => {
    renderRealScheduleModal()

    const entitySelect = screen.getByLabelText('Entity (row 1)') as HTMLSelectElement
    const optionLabels = Array.from(entitySelect.options).map((o) => o.textContent)
    expect(optionLabels).toContain('VIP Patient')
    // The selected value round-trips only because the option exists at all.
    expect(entitySelect.value).toBe(VIP_ENTITY_ID)
  })

  // Guards `states` on the projection root: one column header plus one input
  // per row, both named after the state.
  it('renders a column per model state', () => {
    renderRealScheduleModal()

    expect(screen.getByTestId('schedule-header-row')).toHaveTextContent('Priority')
    expect(screen.getByLabelText('Priority (row 1)')).toBeInTheDocument()
    expect(screen.getByLabelText('Priority (row 2)')).toBeInTheDocument()
  })

  // Belt-and-braces on the seam itself, so a regression points at the
  // projection rather than at the modal's rendering. Mirrors the exact key set
  // read by quodsi_studio/src/platforms/shared/panels/ScheduleModal.tsx lines
  // 109-119.
  it('projects every key ScheduleModal reads', () => {
    const projection = projectModelRoot(buildModelDefinition())

    expect(Object.keys(projection)).toEqual(
      expect.arrayContaining(['generators', 'arrivalSchedules', 'entities', 'states', 'model']),
    )
    expect(projection.generators[0]).toHaveProperty('arrivalScheduleId', SCHEDULE_ID)
    // id + name ONLY -- ScheduleTable.tsx:42-43 types both props as
    // `{ id: string; name: string }[]`; projecting whole domain objects would
    // widen the wire payload for no consumer.
    expect(projection.entities).toContainEqual({ id: VIP_ENTITY_ID, name: 'VIP Patient' })
    expect(projection.states).toEqual([{ id: 'state-priority', name: 'Priority' }])
  })
})
