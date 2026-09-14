// LucidGeneratorEditor's host wiring (spec 2026-09-14
// lucid-shared-generator-editor §3): the shared editor is stubbed to capture
// its props, so each hook is checked against the Lucid sender it must call.
import React from 'react'
import { render, screen, cleanup } from '@testing-library/react'

const h = vi.hoisted(() => ({
  editorProps: null as any,
  projection: null as unknown,
  accessor: { getSnapshot: () => ({}), subscribe: () => () => {} } as any,
  openPatternModal: vi.fn(),
  openScheduleModal: vi.fn(),
  openSettingsModal: vi.fn(),
  selectElement: vi.fn(),
}))

vi.mock('quodsi_studio/platforms/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('quodsi_studio/platforms/shared')>()),
  GeneratorEditor: (props: any) => {
    h.editorProps = props
    return <div data-testid="shared-generator-editor" />
  },
}))
vi.mock('../../../adapters/useElementEditorAccessor', () => ({
  useElementEditorAccessor: () => ({ accessor: h.accessor, projection: h.projection }),
}))
vi.mock('../../../messaging/senders/simulationRunSender', () => ({
  useSimulationRunSender: () => ({
    openPatternModal: h.openPatternModal,
    openScheduleModal: h.openScheduleModal,
    openSettingsModal: h.openSettingsModal,
  }),
}))
vi.mock('../../../messaging/senders/modelOpsSender', () => ({
  useModelOpsSender: () => ({ selectElement: h.selectElement }),
}))

import { LucidGeneratorEditor } from '../LucidGeneratorEditor'

beforeEach(() => {
  h.editorProps = null
  h.projection = null
  h.openPatternModal.mockClear()
  h.openScheduleModal.mockClear()
  h.openSettingsModal.mockClear()
  h.selectElement.mockClear()
})

afterEach(() => cleanup())

describe('LucidGeneratorEditor — host wiring', () => {
  it('shows "Loading model…" and no editor until the first snapshot', () => {
    render(<LucidGeneratorEditor shapeId="g1" referenceData={undefined} />)
    expect(screen.getByText('Loading model…')).toBeInTheDocument()
    expect(screen.queryByTestId('shared-generator-editor')).toBeNull()
  })

  it('passes the shape id and the composite accessor to the shared editor', () => {
    h.projection = { pageId: 'page-1' }
    render(<LucidGeneratorEditor shapeId="g1" referenceData={undefined} />)
    expect(screen.getByTestId('shared-generator-editor')).toBeInTheDocument()
    expect(h.editorProps.shapeId).toBe('g1')
    expect(h.editorProps.accessor).toBe(h.accessor)
  })

  it('wires the four host hooks to Lucid senders', () => {
    h.projection = { pageId: 'page-1' }
    render(<LucidGeneratorEditor shapeId="g1" referenceData={undefined} />)

    h.editorProps.onOpenPatternModal()
    h.editorProps.onOpenScheduleModal()
    h.editorProps.onOpenSettings()
    h.editorProps.onGoToStates()

    expect(h.openPatternModal).toHaveBeenCalledWith('g1')
    expect(h.openScheduleModal).toHaveBeenCalledWith('g1')
    expect(h.openSettingsModal).toHaveBeenCalledTimes(1)
    expect(h.selectElement).toHaveBeenCalledWith('model', { targetTab: 'States' })
  })
})
