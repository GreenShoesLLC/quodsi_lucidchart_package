// DiagramMappingView.test.tsx
//
// The inline Diagram Mapping modal's React view (?view=diagram-mapping,
// spec 2026-09-15 "opens inline"). Renders the REAL shared
// DiagramMappingPanel over a REAL LucidDiagramMappingAccessor -- unlike
// ScheduleEditorView/PatternEditorView.test.tsx, which stub the heavy shared
// component to isolate a model-root accessor's buffering, there is no
// buffering here to isolate FROM: the accessor just posts window messages
// and waits for the reply. Mirrors PatternEditorView.realSource.test.tsx's
// window.parent.postMessage spy + dispatched MessageEvent pattern.
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'
import { DiagramElementKind, SimulationObjectType } from '@quodsi/shared'
import { DiagramMappingView } from '../DiagramMappingView'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('DiagramMappingView', () => {
  it('shows "Analyzing diagram…" then renders the mapping table once the host replies', async () => {
    const posted: any[] = []
    vi.spyOn(window.parent, 'postMessage').mockImplementation((envelope: any) => {
      posted.push(envelope)
    })

    render(<DiagramMappingView />)

    expect(screen.getByText(/analyzing diagram/i)).toBeInTheDocument()

    await waitFor(() => expect(posted).toHaveLength(1))
    expect(posted[0]).toMatchObject({
      type: EnvelopeMessageType.ANALYZE_PAGE,
      source: 'diagram-mapping-iframe',
      target: 'host',
      version: '1.0',
    })

    const requestId = posted[0].data.requestId
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            id: posted[0].id,
            type: EnvelopeMessageType.PAGE_ANALYSIS_RESULT,
            source: 'host',
            target: 'diagram-mapping-iframe',
            version: '1.0',
            data: {
              requestId,
              data: {
                pageId: 'p1',
                isAlreadyConverted: true,
                mappings: [
                  {
                    elementId: 'b1',
                    elementName: 'Intake',
                    elementKind: DiagramElementKind.BLOCK,
                    currentType: SimulationObjectType.Activity,
                    proposedType: SimulationObjectType.Activity,
                    incomingCount: 1,
                    outgoingCount: 1,
                    isIsolated: false,
                  },
                ],
              },
            },
          },
        }),
      )
    })

    await waitFor(() => expect(screen.getByText('Intake')).toBeInTheDocument())
  })

  it('re-analyzes after a successful Apply', async () => {
    const posted: any[] = []
    vi.spyOn(window.parent, 'postMessage').mockImplementation((envelope: any) => {
      posted.push(envelope)
    })

    render(<DiagramMappingView />)

    await waitFor(() => expect(posted).toHaveLength(1))
    const analyzeRequestId = posted[0].data.requestId

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            id: posted[0].id,
            type: EnvelopeMessageType.PAGE_ANALYSIS_RESULT,
            source: 'host',
            target: 'diagram-mapping-iframe',
            version: '1.0',
            data: {
              requestId: analyzeRequestId,
              data: {
                pageId: 'p1',
                isAlreadyConverted: true,
                mappings: [
                  {
                    elementId: 'b1',
                    elementName: 'Intake',
                    elementKind: DiagramElementKind.BLOCK,
                    currentType: SimulationObjectType.Activity,
                    proposedType: SimulationObjectType.Activity,
                    incomingCount: 1,
                    outgoingCount: 1,
                    isIsolated: false,
                  },
                ],
              },
            },
          },
        }),
      )
    })

    await waitFor(() => expect(screen.getByText('Intake')).toBeInTheDocument())

    // Change the row's type and Apply.
    fireEvent.change(screen.getByTestId('type-select-b1'), {
      target: { value: SimulationObjectType.Resource },
    })
    fireEvent.click(screen.getByRole('button', { name: /apply/i }))

    await waitFor(() => expect(posted).toHaveLength(2))
    expect(posted[1]).toMatchObject({
      type: EnvelopeMessageType.APPLY_SHAPE_CHANGES,
      source: 'diagram-mapping-iframe',
      target: 'host',
    })

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            id: posted[1].id,
            type: EnvelopeMessageType.APPLY_SHAPE_CHANGES_RESULT,
            source: 'host',
            target: 'diagram-mapping-iframe',
            version: '1.0',
            data: { requestId: posted[1].data.requestId, success: true },
          },
        }),
      )
    })

    // A successful Apply re-analyzes: a second ANALYZE_PAGE is posted.
    await waitFor(() => expect(posted).toHaveLength(3))
    expect(posted[2]).toMatchObject({
      type: EnvelopeMessageType.ANALYZE_PAGE,
      source: 'diagram-mapping-iframe',
      target: 'host',
    })
  })
})
