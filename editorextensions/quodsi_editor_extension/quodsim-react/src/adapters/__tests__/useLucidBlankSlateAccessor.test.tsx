import { renderHook, act } from '@testing-library/react'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'
import { useLucidBlankSlateAccessor, AUTO_CONVERT_TIMEOUT_MS } from '../useLucidBlankSlateAccessor'

const openDiagramMappingModal = vi.fn()
vi.mock('../../messaging/senders/simulationRunSender', () => ({
  useSimulationRunSender: () => ({ openDiagramMappingModal }),
}))

type Posted = { id: string; type: string; data: any; source: string; target: string }

const base = { enabled: true, documentId: 'doc-1', pageId: 'pg-1', selectionVersion: 1 }

describe('useLucidBlankSlateAccessor', () => {
  let posted: Posted[]
  const original = window.parent.postMessage

  beforeEach(() => {
    posted = []
    openDiagramMappingModal.mockClear()
    window.parent.postMessage = ((msg: Posted) => { posted.push(msg) }) as never
  })
  afterEach(() => {
    window.parent.postMessage = original
    vi.useRealTimers()
  })

  const hostReplies = (data: object) =>
    act(() => { window.dispatchEvent(new MessageEvent('message', { data })) })

  it('sends nothing while disabled', () => {
    renderHook(() => useLucidBlankSlateAccessor({ ...base, enabled: false }))
    expect(posted).toEqual([])
  })

  it('asks for the page counts on mount and after each selection change, and exposes the reply', () => {
    const { result, rerender } = renderHook((props: typeof base) => useLucidBlankSlateAccessor(props), {
      initialProps: base,
    })
    expect(posted.map((m) => m.type)).toEqual([EnvelopeMessageType.PAGE_COUNTS_REQUEST])
    expect(posted[0]).toMatchObject({ source: 'model-iframe', target: 'host' })

    hostReplies({ id: 'r', type: EnvelopeMessageType.PAGE_COUNTS, data: { pageId: 'pg-1', shapeCount: 12, lineCount: 9 } })
    expect(result.current.shapeCount).toBe(12)
    expect(result.current.lineCount).toBe(9)

    rerender({ ...base, selectionVersion: 2 })
    expect(posted.map((m) => m.type)).toEqual([
      EnvelopeMessageType.PAGE_COUNTS_REQUEST,
      EnvelopeMessageType.PAGE_COUNTS_REQUEST,
    ])
  })

  it('convertDiagram sends AUTO_CONVERT_PAGE and resolves with the result carrying the same id', async () => {
    const { result } = renderHook(() => useLucidBlankSlateAccessor(base))
    const counts = { activities: 3, generators: 1, resources: 0, entities: 0, connectors: 4, skipped: 1 }
    let promise!: Promise<unknown>
    act(() => { promise = result.current.convertDiagram() })
    const request = posted.find((m) => m.type === EnvelopeMessageType.AUTO_CONVERT_PAGE)!
    expect(request.data).toEqual({ documentId: 'doc-1', pageId: 'pg-1' })

    hostReplies({ id: 'someone-else', type: EnvelopeMessageType.AUTO_CONVERT_PAGE_RESULT, data: { success: false, error: 'not mine' } })
    hostReplies({ id: request.id, type: EnvelopeMessageType.AUTO_CONVERT_PAGE_RESULT, data: { success: true, result: counts } })
    await expect(promise).resolves.toEqual(counts)
  })

  it("convertDiagram rejects with the host's error", async () => {
    const { result } = renderHook(() => useLucidBlankSlateAccessor(base))
    let promise!: Promise<unknown>
    act(() => { promise = result.current.convertDiagram() })
    const request = posted.find((m) => m.type === EnvelopeMessageType.AUTO_CONVERT_PAGE)!
    hostReplies({ id: request.id, type: EnvelopeMessageType.AUTO_CONVERT_PAGE_RESULT, data: { success: false, error: 'page locked' } })
    await expect(promise).rejects.toThrow('page locked')
  })

  it('convertDiagram rejects after the timeout', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useLucidBlankSlateAccessor(base))
    let promise!: Promise<unknown>
    act(() => { promise = result.current.convertDiagram() })
    vi.advanceTimersByTime(AUTO_CONVERT_TIMEOUT_MS + 1)
    await expect(promise).rejects.toThrow('Conversion timed out')
  })

  it('reviewDiagram opens Diagram Mapping for this document and page', () => {
    const { result } = renderHook(() => useLucidBlankSlateAccessor(base))
    result.current.reviewDiagram?.()
    expect(openDiagramMappingModal).toHaveBeenCalledWith('doc-1', 'pg-1')
  })
})
