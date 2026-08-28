// Every Lucid mount of the SHARED ResourceEditor hands work-schedule editing
// to the Lucid modal, not to the in-panel one (spec 2026-08-27 §6, case E6).
//
// WHY THIS FILE EXISTS. D3 gave CapacitySourcePicker an `onEdit` seam and
// ActivityEditor used it (ActivityEditor.workSchedule.test.tsx, case 4), but
// the RESOURCE path had no way to reach it: the picker is mounted three
// levels down (ResourcesEditor -> ResourceEditor -> ResourceBasicTab) and
// none of those forwarded anything, so "Edit schedule" on a resource opened
// the shared in-panel WorkScheduleModal -- a dialog trapped inside the 300px
// right-dock panel iframe. The monorepo half of this fix round threaded an
// optional `onEditWorkSchedule` down those three hops; this file pins that
// Lucid supplies it at ALL THREE of its mounts, since a resource is reachable
// from the Resources tab, from a Resource block, and from a swimlane lane,
// and missing one leaves a trapped modal on that route only.
//
// The seam contract is verbatim SchedulesTab's (see its header): supplying a
// handler means "I will present the editor", and the shared control then
// presents nothing -- otherwise one click opens two modals.
//
// Host is faked at postMessage exactly as ResourceBlockEditor.test.tsx /
// SwimLaneEditor.test.tsx do, so the real useModelRootSource /
// createLucidModelStateAccessor pair stays in the loop and the panels under
// test are the REAL shared Studio ones, never stubs.

import React from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'

const { mockSendMessage } = vi.hoisted(() => ({ mockSendMessage: vi.fn() }))

// Both module paths are mocked: ResourcesTab / ResourceBlockEditor take
// useMessaging from MessageProvider (as ActivityEditor and SchedulesTab do),
// SwimLaneEditor from MessageContext.
vi.mock('../../../messaging/MessageProvider', () => ({
  useMessaging: () => ({ app: { panelType: 'model' }, sendMessage: mockSendMessage }),
}))
vi.mock('../../../messaging/MessageContext', () => ({
  useMessaging: () => ({ app: { panelType: 'model' }, sendMessage: mockSendMessage }),
}))

import ResourcesTab from '../ResourcesTab'
import { ResourceBlockEditor } from '../ResourceBlockEditor'
import SwimLaneEditor from '../SwimLaneEditor'

/** Staffs 3, so the picker's nominal-seeding branch is live rather than inert. */
const NT = {
  id: 'ws-nt',
  name: 'Nursing Team',
  offShiftCapacity: 0,
  pattern: [
    { days: ['mon', 'tue', 'wed', 'thu', 'fri'], start: '07:00', end: '15:00', capacity: 3 },
  ],
  exceptions: [],
}

type ResourceRow = {
  id: string
  name: string
  capacity?: number
  workScheduleId?: string
  shapeId?: string
  laneRef?: { blockId: string; laneId: string }
}

function installHost(resources: ResourceRow[]) {
  const sent: any[] = []
  vi.spyOn(window.parent, 'postMessage').mockImplementation((envelope: any) => {
    sent.push(envelope)
    if (envelope.type === EnvelopeMessageType.MODEL_ROOT_REQUEST) {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            id: envelope.id,
            type: EnvelopeMessageType.MODEL_ROOT_SNAPSHOT,
            source: 'host',
            target: 'model-iframe',
            version: '1.0',
            data: {
              projection: {
                generators: [],
                arrivalPatterns: [],
                arrivalSchedules: [],
                activities: [],
                entities: [],
                states: [],
                resourceRequirements: [],
                resources,
                workSchedules: [NT],
                model: {},
              },
            },
          },
        }),
      )
    }
  })
  return sent
}

/** The one assertion every mount shares: the click left the panel over the
 *  D2 channel, and the shared in-panel dialog was NOT also opened. */
function expectRoutedToLucidModal() {
  expect(mockSendMessage).toHaveBeenCalledWith(
    EnvelopeMessageType.OPEN_WORK_SCHEDULE_MODAL,
    { scheduleId: 'ws-nt' },
  )
  expect(screen.queryByRole('dialog', { name: 'Work Schedule' })).not.toBeInTheDocument()
}

const SCHEDULED_NURSE: ResourceRow = {
  id: 'nurse-id',
  name: 'Nurse',
  capacity: 3,
  workScheduleId: 'ws-nt',
}

describe('Lucid resource mounts route "Edit schedule" to the Lucid modal', () => {
  beforeEach(() => {
    mockSendMessage.mockClear()
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('the Resources tab (ResourcesEditor -> ResourceEditor)', async () => {
    installHost([SCHEDULED_NURSE])

    render(<ResourcesTab />)

    fireEvent.click(await screen.findByRole('button', { name: /^edit$/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit schedule' }))

    expectRoutedToLucidModal()
  })

  it('a Resource block whose pointer resolves', async () => {
    installHost([{ ...SCHEDULED_NURSE, shapeId: 'blk-1' }])

    render(<ResourceBlockEditor blockId="blk-1" resourceId="nurse-id" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Edit schedule' }))

    expectRoutedToLucidModal()
  })

  it('a swimlane lane whose pointer resolves', async () => {
    installHost([SCHEDULED_NURSE])

    render(
      <SwimLaneEditor
        elementData={{
          blockId: 'sw-1',
          className: 'AdvancedSwimLaneBlock',
          isVertical: false,
          isMagnetized: true,
          boundingBox: { x: 0, y: 0, w: 10, h: 20 },
          lanes: [
            { index: 0, title: 'Nurse', size: 100, boundingBox: { x: 0, y: 0, w: 10, h: 10 } },
          ],
          swimlaneData: {
            lanes: [
              {
                laneId: 'l0',
                titleSnapshot: 'Nurse',
                assignmentMode: 'runtime-derive',
                resourceId: 'nurse-id',
              },
            ],
            lastSyncedAt: '2026-01-01T00:00:00.000Z',
          },
        }}
        onSave={() => {}}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Edit schedule' }))

    expectRoutedToLucidModal()
  })
})
