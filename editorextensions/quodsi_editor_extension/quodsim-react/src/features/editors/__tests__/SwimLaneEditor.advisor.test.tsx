// SwimLaneEditor: Advisor sparkle in the lane header.
//
// Lanes never render PanelHeader (SwimLaneEditor draws its own header), so
// the sparkle's devtools gate has to be re-read here rather than inherited
// from a mounted PanelHeader. This file pins that gate plus the exact
// Resource focus the sparkle is handed for the lane that OWNS its claim.
//
// Harness copied from SwimLaneEditor.test.tsx next door: same postMessage
// fake host, same MessageProvider/MessageContext mocks so the real
// useModelRootSource / createLucidModelStateAccessor pair stays in the loop.

import React from 'react'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
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

vi.mock('../../modelPanel/AdvisorLaunchButton', async () => {
  const actual = await vi.importActual<typeof import('../../modelPanel/AdvisorLaunchButton')>(
    '../../modelPanel/AdvisorLaunchButton',
  )
  return {
    ...actual,
    AdvisorLaunchButton: ({ focus }: { focus: unknown }) => (
      <div data-testid="open-advisor-modal" data-focus={JSON.stringify(focus)} />
    ),
  }
})

import SwimLaneEditor from '../SwimLaneEditor'

type ResourceRow = {
  id: string
  name: string
  capacity?: number
  shapeId?: string
  laneRef?: { blockId: string; laneId: string }
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

// Lane 0's mapping points at 'r1', and the fake host's row for 'r1' carries
// laneRef { blockId: 'sw-1', laneId: 'lane-0' } -- matching this mapping's
// laneId and elementData's blockId, so ownsClaim is true and the lane gets
// the shared editor (and, when the flag is on, the sparkle).
const linkedLaneProps = {
  elementData: elementData([
    {
      laneId: 'lane-0',
      titleSnapshot: 'Intake',
      assignmentMode: 'runtime-derive',
      resourceId: 'r1',
    },
    null,
  ]),
  onSave: () => {},
}

const unlinkedLaneProps = {
  elementData: elementData([null, null]),
  onSave: () => {},
}

describe('SwimLaneEditor — Advisor sparkle', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => cleanup())

  it('shows no sparkle when the devtools flag is off, even for a linked lane', async () => {
    installHost([{ id: 'r1', name: 'Nurse', laneRef: { blockId: 'sw-1', laneId: 'lane-0' } }])
    render(<SwimLaneEditor {...linkedLaneProps} />)
    await waitFor(() => expect(screen.getByText('Swimlane')).toBeInTheDocument())
    expect(screen.queryByTestId('open-advisor-modal')).toBeNull()
  })

  it('shows the sparkle with a Resource focus for a linked lane when the flag is on', async () => {
    localStorage.setItem('quodsi_devtools', 'true')
    installHost([{ id: 'r1', name: 'Nurse', laneRef: { blockId: 'sw-1', laneId: 'lane-0' } }])
    render(<SwimLaneEditor {...linkedLaneProps} />)
    const sparkle = await screen.findByTestId('open-advisor-modal')
    expect(JSON.parse(sparkle.getAttribute('data-focus')!)).toEqual({
      focusId: 'r1',
      focusType: 'Resource',
      focusName: 'Nurse',
      mode: 'definition',
    })
  })

  it('shows no sparkle for an unlinked lane', async () => {
    localStorage.setItem('quodsi_devtools', 'true')
    installHost([])
    render(<SwimLaneEditor {...unlinkedLaneProps} />)
    await waitFor(() => expect(screen.getByText('Swimlane')).toBeInTheDocument())
    expect(screen.queryByTestId('open-advisor-modal')).toBeNull()
  })
})
