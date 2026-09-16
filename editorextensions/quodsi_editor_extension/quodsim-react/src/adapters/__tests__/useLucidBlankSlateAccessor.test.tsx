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

  it('two convertDiagram calls post only one AUTO_CONVERT_PAGE, and one success result resolves both', async () => {
    const { result } = renderHook(() => useLucidBlankSlateAccessor(base))
    const counts = { activities: 2, generators: 0, resources: 0, entities: 0, connectors: 1, skipped: 0 }
    let p1!: Promise<unknown>
    let p2!: Promise<unknown>
    act(() => { p1 = result.current.convertDiagram() })
    act(() => { p2 = result.current.convertDiagram() })

    const requests = posted.filter((m) => m.type === EnvelopeMessageType.AUTO_CONVERT_PAGE)
    expect(requests).toHaveLength(1)

    hostReplies({ id: requests[0].id, type: EnvelopeMessageType.AUTO_CONVERT_PAGE_RESULT, data: { success: true, result: counts } })
    await expect(p1).resolves.toEqual(counts)
    await expect(p2).resolves.toEqual(counts)
  })

  it('after a timeout, calling convertDiagram again posts no second message, and a late result resolves it', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useLucidBlankSlateAccessor(base))
    const counts = { activities: 1, generators: 0, resources: 0, entities: 0, connectors: 0, skipped: 0 }

    let p1!: Promise<unknown>
    act(() => { p1 = result.current.convertDiagram() })
    const request = posted.find((m) => m.type === EnvelopeMessageType.AUTO_CONVERT_PAGE)!

    act(() => { vi.advanceTimersByTime(AUTO_CONVERT_TIMEOUT_MS + 1) })
    await expect(p1).rejects.toThrow('Conversion timed out')

    let p2!: Promise<unknown>
    act(() => { p2 = result.current.convertDiagram() })
    const requests = posted.filter((m) => m.type === EnvelopeMessageType.AUTO_CONVERT_PAGE)
    expect(requests).toHaveLength(1)

    hostReplies({ id: request.id, type: EnvelopeMessageType.AUTO_CONVERT_PAGE_RESULT, data: { success: true, result: counts } })
    await expect(p2).resolves.toEqual(counts)
  })

  it('unmounting mid-conversion tears down the in-flight state: a late result does not settle it, the pending timeout does not fire, and no second AUTO_CONVERT_PAGE is posted', async () => {
    vi.useFakeTimers()
    const { result, unmount } = renderHook(() => useLucidBlankSlateAccessor(base))

    let settled: 'pending' | 'resolved' | 'rejected' = 'pending'
    act(() => {
      result.current.convertDiagram().then(
        () => { settled = 'resolved' },
        () => { settled = 'rejected' },
      )
    })
    const request = posted.find((m) => m.type === EnvelopeMessageType.AUTO_CONVERT_PAGE)!
    expect(posted.filter((m) => m.type === EnvelopeMessageType.AUTO_CONVERT_PAGE)).toHaveLength(1)

    unmount()

    // A late result for the now-torn-down in-flight id must not settle the promise.
    hostReplies({ id: request.id, type: EnvelopeMessageType.AUTO_CONVERT_PAGE_RESULT, data: { success: true, result: {} } })
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(settled).toBe('pending')

    // The waiter's own 60s timeout must have been cancelled by teardown too --
    // advancing past it must not fire a delayed rejection either.
    await act(async () => { await vi.advanceTimersByTimeAsync(AUTO_CONVERT_TIMEOUT_MS + 1) })
    expect(settled).toBe('pending')

    expect(posted.filter((m) => m.type === EnvelopeMessageType.AUTO_CONVERT_PAGE)).toHaveLength(1)
  })

  it('a failure reply clears the in-flight entry, so a later convertDiagram call starts a genuinely new conversion', async () => {
    const { result } = renderHook(() => useLucidBlankSlateAccessor(base))

    let p1!: Promise<unknown>
    act(() => { p1 = result.current.convertDiagram() })
    const first = posted.find((m) => m.type === EnvelopeMessageType.AUTO_CONVERT_PAGE)!
    expect(posted.filter((m) => m.type === EnvelopeMessageType.AUTO_CONVERT_PAGE)).toHaveLength(1)

    hostReplies({ id: first.id, type: EnvelopeMessageType.AUTO_CONVERT_PAGE_RESULT, data: { success: false, error: 'page locked' } })
    await expect(p1).rejects.toThrow('page locked')

    // Unlike the timeout case, a settled (failed) conversion is no longer in
    // flight, so the next call must post a brand new AUTO_CONVERT_PAGE.
    let p2!: Promise<unknown>
    act(() => { p2 = result.current.convertDiagram() })
    const requests = posted.filter((m) => m.type === EnvelopeMessageType.AUTO_CONVERT_PAGE)
    expect(requests).toHaveLength(2)
    expect(requests[1].id).not.toBe(first.id)

    const counts = { activities: 1, generators: 0, resources: 0, entities: 0, connectors: 0, skipped: 0 }
    hostReplies({ id: requests[1].id, type: EnvelopeMessageType.AUTO_CONVERT_PAGE_RESULT, data: { success: true, result: counts } })
    await expect(p2).resolves.toEqual(counts)
  })
})
