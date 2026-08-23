// SwimLaneEditor: what a swimlane LANE renders now that a lane is a POINTER
// at a model-level resource rather than the record's only home (Plan 2b).
//
// Same posture as ResourceBlockEditor.test.tsx next door: the REAL shared
// Studio panels (ResourceLinkPicker / ResourceEditor) are rendered, not
// stubbed -- the component under test does little more than choose between
// them and feed them an accessor and a resource id, and a stub would let a
// wrong accessor or a wrong id pass unnoticed.
//
// Two seams are faked, both at postMessage:
//   - the model-root round trip, by answering MODEL_ROOT_REQUEST with a
//     MODEL_ROOT_SNAPSHOT, so the real useModelRootSource /
//     createLucidModelStateAccessor pair stays in the loop;
//   - useMessaging, whose sendMessage is the REAL useSendMessage hook (the
//     envelope builder that every panel message goes through), so the
//     SWIMLANE_UPDATE assertions below are on the actual wire envelope the
//     extension's SwimLaneHandler would receive.

import React from 'react'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'

vi.mock('../../../messaging/MessageProvider', () => ({
  useMessaging: () => ({ app: { panelType: 'model' } }),
}))

vi.mock('../../../messaging/MessageContext', async () => {
  const { useSendMessage } = await vi.importActual<
    typeof import('../../../messaging/hooks/useSendMessage')
  >('../../../messaging/hooks/useSendMessage')
  return {
    useMessaging: () => ({
      app: { panelType: 'model' },
      sendMessage: useSendMessage({ app: { panelType: 'model' } }, () => {}),
    }),
  }
})

import SwimLaneEditor from '../SwimLaneEditor'

type ResourceRow = {
  id: string
  name: string
  capacity?: number
  shapeId?: string
}

/** Stands the fake host up on window.parent.postMessage; returns every envelope sent. */
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
                resourceRequirements: [],
                resources,
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

const LANES = [
  { index: 0, title: 'Intake', size: 100, boundingBox: { x: 0, y: 0, w: 10, h: 10 } },
  { index: 1, title: 'Triage', size: 100, boundingBox: { x: 0, y: 10, w: 10, h: 10 } },
]

function elementData(lanes: any[]) {
  return {
    blockId: 'sw-1',
    className: 'AdvancedSwimLaneBlock',
    isVertical: false,
    isMagnetized: true,
    boundingBox: { x: 0, y: 0, w: 10, h: 20 },
    lanes: LANES,
    swimlaneData: { lanes, lastSyncedAt: '2026-01-01T00:00:00.000Z' },
  }
}

const swimlaneUpdates = (sent: any[]) =>
  sent.filter((e) => e.type === EnvelopeMessageType.SWIMLANE_UPDATE)

describe('SwimLaneEditor', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('an unlinked lane shows the picker offering only unclaimed resources; linking posts SWIMLANE_UPDATE with resourceId and no inline record', async () => {
    const sent = installHost([
      { id: 'nurse-id', name: 'Nurse', capacity: 2, shapeId: 'blk-9' },
      { id: 'doctor-id', name: 'Doctor', capacity: 1 },
    ])

    render(
      <SwimLaneEditor elementData={elementData([null, null])} onSave={() => {}} />,
    )

    // Nurse is already claimed by a shape, so it must not be on offer -- a
    // second claimant would be silently rejected on the next reload.
    const doctor = await screen.findByRole('button', { name: /Doctor/ })
    expect(screen.queryByRole('button', { name: /Nurse/ })).toBeNull()

    fireEvent.click(doctor)

    await waitFor(() => expect(swimlaneUpdates(sent).length).toBe(1))

    const update = swimlaneUpdates(sent)[0]
    expect(update.data.swimlaneBlockId).toBe('sw-1')
    expect(update.data.swimlaneData.lanes[0]).toEqual({
      laneId: expect.any(String),
      titleSnapshot: 'Intake',
      assignmentMode: 'runtime-derive',
      resourceId: 'doctor-id',
    })
    // Storage format 1's inline copy is never written by this editor again.
    expect(update.data.swimlaneData.lanes[0].resource).toBeUndefined()
    expect(update.data.swimlaneData.lanes[1]).toBeNull()
  })

  it('a linked lane renders the shared ResourceEditor for its resource', async () => {
    installHost([{ id: 'doctor-id', name: 'Doctor', capacity: 1 }])

    render(
      <SwimLaneEditor
        elementData={elementData([
          {
            laneId: 'l0',
            titleSnapshot: 'Doctor',
            assignmentMode: 'runtime-derive',
            resourceId: 'doctor-id',
          },
          null,
        ])}
        onSave={() => {}}
      />,
    )

    // The Basic tab's name input -- proof the SHARED editor mounted against
    // the model-level resource the lane points at.
    expect(await screen.findByDisplayValue('Doctor')).toBeInTheDocument()
  })

  it('a lane pointing at a DELETED resource offers the picker, and relinking keeps the laneId', async () => {
    // Deleting a resource from the Resources tab does not rewrite q_swimlane
    // (the builder reports the leftover pointer as `resource_link_dangling`),
    // so a lane can carry an id nothing resolves. Handing that id to the
    // shared ResourceEditor renders its "Resource ... not found ...
    // Re-bootstrap" dead end, which no gesture in this panel can clear.
    const sent = installHost([{ id: 'doctor-id', name: 'Doctor', capacity: 1 }])

    render(
      <SwimLaneEditor
        elementData={elementData([
          {
            laneId: 'l0',
            titleSnapshot: 'Intake',
            assignmentMode: 'explicit',
            resourceId: 'gone',
          },
          null,
        ])}
        onSave={() => {}}
      />,
    )

    expect(
      await screen.findByText(/points at a Resource that no longer exists/i),
    ).toBeInTheDocument()
    // The shared editor's dead end must NOT be what renders.
    expect(screen.queryByText(/Re-bootstrap/i)).toBeNull()

    fireEvent.click(await screen.findByRole('button', { name: /Doctor/ }))

    await waitFor(() => expect(swimlaneUpdates(sent).length).toBe(1))
    expect(swimlaneUpdates(sent)[0].data.swimlaneData.lanes[0]).toEqual({
      // The lane's own identity and mode survive a re-link -- only the
      // pointer moves.
      laneId: 'l0',
      titleSnapshot: 'Intake',
      assignmentMode: 'explicit',
      resourceId: 'doctor-id',
    })
  })

  it('Unlink sets the lane to null and the copy says the resource stays', async () => {
    const sent = installHost([{ id: 'doctor-id', name: 'Doctor', capacity: 1 }])

    render(
      <SwimLaneEditor
        elementData={elementData([
          {
            laneId: 'l0',
            titleSnapshot: 'Doctor',
            assignmentMode: 'runtime-derive',
            resourceId: 'doctor-id',
          },
          null,
        ])}
        onSave={() => {}}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: /Unlink lane/i }))
    expect(screen.getByText(/stays in the model/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Confirm unlink/i }))

    await waitFor(() => expect(swimlaneUpdates(sent).length).toBe(1))
    expect(swimlaneUpdates(sent)[0].data.swimlaneData.lanes[0]).toBeNull()
  })
})
