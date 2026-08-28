// End-to-end contract test for the MODEL_ROOT_SNAPSHOT projection that feeds
// quodsi_studio's WORK-schedule panels in Lucid (spec 2026-08-27 §6).
//
// ScheduleModal.projection.test.tsx's direct sibling, and it exists for the
// identical reason: every read on the consuming side is defensive
// (`?? []`, `?.`), so a projection that omits a field renders EMPTY rather
// than throwing, and every suite stays green while the feature is silently
// broken in the one host that matters. Three fields are at stake here:
//
//   * `workSchedules`  -- WorkSchedulesEditor / WorkScheduleModal /
//     CapacitySourcePicker all read `modelDefinition.workSchedules`. Absent,
//     the Schedules tab lists nothing and the editor says "not found".
//   * `resources[].workScheduleId` -- CapacitySourcePicker derives its
//     Fixed/Follow state from this alone, and workScheduleUsage counts it.
//   * `activities[].workScheduleId` -- the OTHER half of that usage count.
//     Absent, a schedule an activity still follows reports "unused" and
//     WorkSchedulesEditor offers Delete on it; deleting leaves that activity
//     holding a dangling id -- an ERROR-severity `work_schedule_reference`
//     that blocks simulate.
//
// So this test does NOT stub the shared panels. It renders the REAL
// WorkSchedulesEditor and the REAL WorkScheduleModal against a projection
// built by the REAL production mapping (`projectModelRoot`, the extension's
// own src/core/modelRootProjection.ts) from a REAL ModelDefinition, fed
// through the REAL createModelRootSource / createLucidModelStateAccessor pair
// the Lucid panel uses in production.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import {
  Activity,
  Model,
  ModelDefinition,
  Resource,
  WorkSchedule,
} from '@quodsi/lucid-shared'
import { WorkSchedulesEditor, WorkScheduleModal } from 'quodsi_studio/platforms/shared'
import { projectModelRoot } from '../../../../src/core/modelRootProjection'
import {
  createModelRootSource,
  type ModelRootTransport,
} from '../useModelRootSource'
import { createLucidModelStateAccessor } from '../LucidModelStateAccessor'

const SCHEDULE_ID = 'ws-1'
const RESOURCE_ID = 'res-nurse'
const ACTIVITY_ID = 'act-triage'

/** A real ModelDefinition, populated the way a converted Lucid page is. */
function buildModelDefinition(): ModelDefinition {
  const def = new ModelDefinition(Model.createDefault('model-1'))

  const schedule = new WorkSchedule(SCHEDULE_ID, 'Nursing team')
  schedule.pattern = [
    { days: ['mon', 'tue', 'wed', 'thu', 'fri'], start: '07:00', end: '15:00', capacity: 3 },
  ]
  def.workSchedules.add(schedule)

  const nurse = new Resource(RESOURCE_ID, 'Nurse', 3)
  nurse.workScheduleId = SCHEDULE_ID
  def.resources.add(nurse)

  const triage = Activity.createDefault(ACTIVITY_ID)
  triage.name = 'Triage'
  triage.workScheduleId = SCHEDULE_ID
  def.activities.add(triage)

  return def
}

function accessorFor(projection: unknown) {
  const transport: ModelRootTransport = {
    send: vi.fn().mockResolvedValue(undefined),
    saveShape: vi.fn().mockResolvedValue(undefined),
  }
  const source = createModelRootSource(transport)
  source.acceptSnapshot(projection as never)
  return { accessor: createLucidModelStateAccessor(source.deps), transport }
}

describe('work-schedule panels against a real model-root projection', () => {
  beforeEach(() => {
    cleanup()
  })

  // Guards `workSchedules` AND both `workScheduleId` halves at once: the usage
  // line is the one place that reads all three.
  it('lists the schedule with its full usage -- resources AND activities', () => {
    const projection = projectModelRoot(buildModelDefinition())
    const { accessor } = accessorFor(projection)

    render(<WorkSchedulesEditor accessor={accessor} onEdit={() => {}} />)

    expect(screen.getByText('Nursing team')).toBeInTheDocument()
    // "1 resource, 1 activity" -- the activity half is only reachable because
    // the projection carries an `activities` array at all.
    expect(screen.getByText(/1 resource/)).toBeInTheDocument()
    expect(screen.getByText(/1 activity/)).toBeInTheDocument()
  })

  // Guards `workSchedules` for the EDITOR: WorkScheduleModal looks the record
  // up by id and renders a "not found" card when it cannot.
  it('finds the schedule by id and renders its rows', () => {
    const projection = projectModelRoot(buildModelDefinition())
    const { accessor } = accessorFor(projection)

    render(
      <WorkScheduleModal
        open
        embedded
        hideHeader
        onClose={() => {}}
        scheduleId={SCHEDULE_ID}
        accessor={accessor}
      />,
    )

    expect(screen.queryByText(`Work schedule ${SCHEDULE_ID} not found in model.`)).toBeNull()
    expect(screen.getByDisplayValue('Nursing team')).toBeInTheDocument()
    expect(screen.getByDisplayValue('07:00')).toBeInTheDocument()
  })

  // Belt-and-braces on the seam itself, so a regression points at the
  // projection rather than at the panels' rendering.
  it('projects every key the work-schedule panels read', () => {
    const projection = projectModelRoot(buildModelDefinition())

    expect(Object.keys(projection)).toEqual(
      expect.arrayContaining(['workSchedules', 'activities', 'resources', 'model']),
    )
    // toJSON() shape, not the live class: no `type` tag, which the engine's
    // extra="forbid" parser has no slot for.
    expect(projection.workSchedules).toEqual([
      {
        id: SCHEDULE_ID,
        name: 'Nursing team',
        pattern: [
          { days: ['mon', 'tue', 'wed', 'thu', 'fri'], start: '07:00', end: '15:00', capacity: 3 },
        ],
      },
    ])
    expect(projection.resources).toContainEqual(
      expect.objectContaining({ id: RESOURCE_ID, workScheduleId: SCHEDULE_ID }),
    )
    // id + name + the link ONLY -- projecting whole Activity objects would put
    // every action onto the MODEL_ROOT_SNAPSHOT wire for no consumer.
    expect(projection.activities).toEqual([
      { id: ACTIVITY_ID, name: 'Triage', workScheduleId: SCHEDULE_ID },
    ])
  })
})
