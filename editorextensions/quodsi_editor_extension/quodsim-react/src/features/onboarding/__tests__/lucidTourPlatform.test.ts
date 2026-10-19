import { EnvelopeMessageType } from '@quodsi/lucid-shared'
import { createLucidPanelPlatform, requestFromHost, HOST_REPLY_TIMEOUT_MS } from '../lucidTourPlatform'
import { clearExamplePageId, readExamplePageId, readTourOwner, writeExamplePage } from '../examplePageStore'

const USER = 'ann@example.com'

function deps() {
  const state = { converted: false, page: 'ex-1' as string | undefined }
  const d = {
    send: vi.fn(),
    request: vi.fn(),
    container: document.createElement('div'),
    getIsConverted: () => state.converted,
    getCurrentPageId: () => state.page,
    getDocumentId: () => 'doc-1' as string | undefined,
    userKey: USER,
  }
  return { d, state }
}

describe('createLucidPanelPlatform', () => {
  beforeEach(() => localStorage.clear())

  it('maps the load-example replies and stores the page id', async () => {
    const { d } = deps()
    const p = createLucidPanelPlatform(d)
    d.request.mockResolvedValueOnce({ outcome: 'loaded', pageId: 'ex-7' })
    await expect(p.loadExample({ replace: false })).resolves.toBe('loaded')
    expect(d.request).toHaveBeenCalledWith(
      EnvelopeMessageType.TOUR_LOAD_EXAMPLE, { replace: false }, EnvelopeMessageType.TOUR_LOAD_EXAMPLE_RESULT,
    )
    expect(readExamplePageId(USER)).toBe('ex-7')
    // The document the example loaded in owns the tour (ruling 7).
    expect(readTourOwner(USER)).toEqual({ documentId: 'doc-1', pageId: 'ex-7' })

    d.request.mockResolvedValueOnce({ outcome: 'occupied' })
    await expect(p.loadExample({ replace: false })).resolves.toBe('occupied')
    d.request.mockResolvedValueOnce({ outcome: 'failed', error: 'x' })
    await expect(p.loadExample({ replace: true })).resolves.toBe('failed')
    expect(readExamplePageId(USER)).toBeNull()
    expect(readTourOwner(USER)?.documentId).toBe('doc-1')
    d.request.mockRejectedValueOnce(new Error('timed out'))
    await expect(p.loadExample({ replace: false })).resolves.toBe('failed')
  })

  it('selectShape sends TOUR_SELECT_SHAPE; ownsStep is the panel partition', () => {
    const { d } = deps()
    const p = createLucidPanelPlatform(d)
    p.selectShape('Screening')
    p.selectShape(null)
    expect(d.send).toHaveBeenNthCalledWith(1, EnvelopeMessageType.TOUR_SELECT_SHAPE, { name: 'Screening' })
    expect(d.send).toHaveBeenNthCalledWith(2, EnvelopeMessageType.TOUR_SELECT_SHAPE, { name: null })
    expect(p.ownsStep!('convert')).toBe(true)
    expect(p.ownsStep!('run-baseline')).toBe(false)
  })

  it('observeDiagram emits model.converted only on a false→true flip on the example page', () => {
    writeExamplePage(USER, 'doc-1', 'ex-1')
    const { d, state } = deps()
    const p = createLucidPanelPlatform(d)
    const emit = vi.fn()
    const off = p.observeDiagram!(emit)

    state.page = 'other'; state.converted = true; p.sync()
    expect(emit).not.toHaveBeenCalled()
    state.converted = false; p.sync()
    state.page = 'ex-1'; p.sync()
    state.converted = true; p.sync()
    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit).toHaveBeenCalledWith('model.converted')
    p.sync()
    expect(emit).toHaveBeenCalledTimes(1)

    off()
    state.converted = false; p.sync(); state.converted = true; p.sync()
    expect(emit).toHaveBeenCalledTimes(1)
  })

  it('with no example page stored (example-unavailable), a flip on any page is the Convert', () => {
    writeExamplePage(USER, 'doc-1', 'ex-1')
    clearExamplePageId(USER)
    const { d, state } = deps()
    state.page = 'mine'
    const p = createLucidPanelPlatform(d)
    const emit = vi.fn()
    p.observeDiagram!(emit)
    state.converted = true; p.sync()
    expect(emit).toHaveBeenCalledWith('model.converted')
  })
})

describe('requestFromHost', () => {
  const original = window.parent.postMessage
  let posted: any[]
  beforeEach(() => {
    posted = []
    window.parent.postMessage = ((m: unknown) => { posted.push(m) }) as never
  })
  afterEach(() => {
    window.parent.postMessage = original
    vi.useRealTimers()
  })

  it('resolves with the reply carrying the same id and type', async () => {
    const pending = requestFromHost(EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE, {}, EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE_RESULT)
    const req = posted[0]
    expect(req).toMatchObject({ type: EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE, source: 'model-iframe', target: 'host' })
    window.dispatchEvent(new MessageEvent('message', { data: { id: 'other', type: EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE_RESULT, data: { outcome: 'missing' } } }))
    window.dispatchEvent(new MessageEvent('message', { data: { id: req.id, type: EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE_RESULT, data: { outcome: 'shown', pageId: 'p' } } }))
    await expect(pending).resolves.toEqual({ outcome: 'shown', pageId: 'p' })
  })

  it('rejects after 60 s without a reply', async () => {
    vi.useFakeTimers()
    expect(HOST_REPLY_TIMEOUT_MS).toBe(60_000)
    const pending = requestFromHost(EnvelopeMessageType.TOUR_LOAD_EXAMPLE, { replace: false }, EnvelopeMessageType.TOUR_LOAD_EXAMPLE_RESULT)
    const assertion = expect(pending).rejects.toThrow(/timed out/)
    vi.advanceTimersByTime(60_000)
    await assertion
  })
})
