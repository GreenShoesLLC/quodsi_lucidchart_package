// LucidActivityEditor's host wiring and swimlane banner (spec 2026-09-14
// lucid-shared-activity-editor §3): the shared editor is stubbed to capture
// its props, so each hook is checked against the Lucid sender it must call.
import React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'

const h = vi.hoisted(() => ({
  editorProps: null as any,
  projection: null as unknown,
  accessor: { getSnapshot: () => ({}), subscribe: () => () => {} } as any,
  sendMessage: vi.fn(),
  openSettingsModal: vi.fn(),
  selectElement: vi.fn(),
}))

vi.mock('quodsi_studio/platforms/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('quodsi_studio/platforms/shared')>()),
  ActivityEditor: (props: any) => {
    h.editorProps = props
    return <div data-testid="shared-activity-editor" />
  },
}))
vi.mock('../../../adapters/useElementEditorAccessor', () => ({
  useElementEditorAccessor: () => ({ accessor: h.accessor, projection: h.projection }),
}))
vi.mock('../../../messaging/MessageProvider', () => ({
  useMessaging: () => ({ app: { panelType: 'model' }, sendMessage: h.sendMessage }),
}))
vi.mock('../../../messaging/senders/simulationRunSender', () => ({
  useSimulationRunSender: () => ({ openSettingsModal: h.openSettingsModal }),
}))
vi.mock('../../../messaging/senders/modelOpsSender', () => ({
  useModelOpsSender: () => ({ selectElement: h.selectElement }),
}))

import { LucidActivityEditor } from '../LucidActivityEditor'

function laneReferenceData(assignmentMode: 'runtime-derive' | 'explicit') {
  return {
    pageId: 'page-1',
    swimLaneContainment: {
      swimlaneBlockId: 'lane-block',
      laneIndex: 0,
      laneName: 'Nursing',
      resourceName: 'Nurse',
      assignmentMode,
    },
  } as any
}

beforeEach(() => {
  h.editorProps = null
  h.projection = null
  h.sendMessage.mockClear()
  h.openSettingsModal.mockClear()
  h.selectElement.mockClear()
})

afterEach(() => cleanup())

describe('LucidActivityEditor — host wiring', () => {
  it('shows "Loading model…" and no editor until the first snapshot', () => {
    render(<LucidActivityEditor shapeId="a1" referenceData={undefined} />)
    expect(screen.getByText('Loading model…')).toBeInTheDocument()
    expect(screen.queryByTestId('shared-activity-editor')).toBeNull()
  })

  it('passes the shape id, the composite accessor and network=false to the shared editor', () => {
    h.projection = { pageId: 'page-1' }
    render(<LucidActivityEditor shapeId="a1" referenceData={undefined} />)
    expect(screen.getByTestId('shared-activity-editor')).toBeInTheDocument()
    expect(h.editorProps.shapeId).toBe('a1')
    expect(h.editorProps.accessor).toBe(h.accessor)
    expect(h.editorProps.network).toBe(false)
  })

  it('wires the three host hooks to Lucid senders', () => {
    h.projection = { pageId: 'page-1' }
    render(<LucidActivityEditor shapeId="a1" referenceData={undefined} />)

    h.editorProps.onEditWorkSchedule('ws1')
    h.editorProps.onGoToStates()
    h.editorProps.onOpenSettings()

    expect(h.sendMessage).toHaveBeenCalledWith(EnvelopeMessageType.OPEN_WORK_SCHEDULE_MODAL, { scheduleId: 'ws1' })
    expect(h.selectElement).toHaveBeenCalledWith('model', { targetTab: 'States' })
    expect(h.openSettingsModal).toHaveBeenCalledTimes(1)
  })

  // ActivityEditor memoises its EditorHostContext on onGoToStates.
  it('keeps the host hooks stable across a rerender with the same shape', () => {
    h.projection = { pageId: 'page-1' }
    const { rerender } = render(<LucidActivityEditor shapeId="a1" referenceData={undefined} />)
    const first = h.editorProps

    rerender(<LucidActivityEditor shapeId="a1" referenceData={undefined} />)

    expect(h.editorProps).not.toBe(first)
    expect(h.editorProps.onGoToStates).toBe(first.onGoToStates)
    expect(h.editorProps.onEditWorkSchedule).toBe(first.onEditWorkSchedule)
    expect(h.editorProps.onOpenSettings).toBe(first.onOpenSettings)
  })
})

describe('LucidActivityEditor — swimlane banner', () => {
  it('names the lane resource and says actions are auto-injected, even while loading', () => {
    render(<LucidActivityEditor shapeId="a1" referenceData={laneReferenceData('runtime-derive')} />)
    const banner = screen.getByTestId('swimlane-resource-banner')
    expect(banner).toHaveTextContent('Swimlane Resource: Nurse')
    expect(banner).toHaveTextContent('Seize/Release actions auto-injected at simulation time')
    expect(screen.getByText('Loading model…')).toBeInTheDocument()
  })

  it('says actions are managed manually in explicit mode', () => {
    h.projection = { pageId: 'page-1' }
    render(<LucidActivityEditor shapeId="a1" referenceData={laneReferenceData('explicit')} />)
    expect(screen.getByTestId('swimlane-resource-banner')).toHaveTextContent(
      'Explicit assignment mode — manage resource actions manually',
    )
    expect(screen.getByTestId('shared-activity-editor')).toBeInTheDocument()
  })

  it('shows no banner for an activity outside a swimlane', () => {
    h.projection = { pageId: 'page-1' }
    render(<LucidActivityEditor shapeId="a1" referenceData={{ pageId: 'page-1' } as any} />)
    expect(screen.queryByTestId('swimlane-resource-banner')).toBeNull()
  })
})
