// quodsim-react/src/features/studies/__tests__/lucidModalHost.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EnvelopeMessageType, type EnvelopeBase } from '@quodsi/lucid-shared'
import { createLucidModalHost, windowPorts, type ModalHostPorts } from '../lucidModalHost'
import { writeTtlMs } from '../embedWriteEnvelope'

function harness() {
  const listeners = new Set<(e: EnvelopeBase) => void>()
  const ports: ModalHostPorts & { sent: Array<[string, unknown]>; posted: EnvelopeBase[] } = {
    sent: [],
    posted: [],
    send: (type, data) => { ports.sent.push([type, data]) },
    postEnvelope: (env) => { ports.posted.push(env) },
    listen: (cb) => { listeners.add(cb); return () => listeners.delete(cb) },
  }
  const reply = (type: EnvelopeMessageType, data: unknown, id = 'r1') =>
    listeners.forEach((cb) => cb({ id, type, source: 'host', target: 'studio-embed-iframe', version: '1.0', data } as EnvelopeBase))
  return { ports, reply }
}

describe('createLucidModalHost', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('maps LucidHost calls to the extension envelopes', () => {
    const { ports } = harness()
    const host = createLucidModalHost(ports)
    host.connect()
    host.requestCatalog()
    host.runScenario({ scenarioId: 's1', enableAnimation: true })
    host.locateElement('e1')
    host.closeModal()
    expect(ports.sent).toEqual([
      [EnvelopeMessageType.REQUEST_STUDIO_CATALOG, undefined],
      [EnvelopeMessageType.RUN_SCENARIO, { scenarioId: 's1', enableAnimation: true, updateModel: undefined }],
      [EnvelopeMessageType.LOCATE_ELEMENT, { elementId: 'e1' }],
      [EnvelopeMessageType.CLOSE_MODAL, undefined],
    ])
  })

  it('delivers STUDIO_CATALOG and RUN_SCENARIO_RESULT to subscribers', () => {
    const { ports, reply } = harness()
    const host = createLucidModalHost(ports)
    host.connect()
    const onCatalog = vi.fn(); const onRun = vi.fn()
    host.onCatalog(onCatalog); host.onRunResult(onRun)
    reply(EnvelopeMessageType.STUDIO_CATALOG, { catalog: { activities: [] } })
    reply(EnvelopeMessageType.RUN_SCENARIO_RESULT, { scenarioId: 's1', accepted: true })
    expect(onCatalog).toHaveBeenCalledWith({ activities: [] })
    expect(onRun).toHaveBeenCalledWith({ scenarioId: 's1', accepted: true, error: undefined })
  })

  it('resolves a token, retrying empty replies, and gives up after 10 s', async () => {
    const { ports, reply } = harness()
    const host = createLucidModalHost(ports)
    host.connect()
    const first = host.requestToken()
    reply(EnvelopeMessageType.STUDIO_TOKEN, { token: '' })
    await vi.advanceTimersByTimeAsync(1000)
    expect(ports.sent.filter(([t]) => t === EnvelopeMessageType.REQUEST_STUDIO_TOKEN)).toHaveLength(2)
    reply(EnvelopeMessageType.STUDIO_TOKEN, { token: 'tok' })
    await expect(first).resolves.toBe('tok')

    const second = host.requestToken()
    await vi.advanceTimersByTimeAsync(10_000)
    await expect(second).resolves.toBeUndefined()
  })

  it('reports model sync from STUDIO_EMBED_PATH, then stops listening', () => {
    const { ports, reply } = harness()
    const host = createLucidModalHost(ports)
    host.connect()
    const onResult = vi.fn()
    host.requestModelSync(onResult)
    expect(ports.sent.at(-1)).toEqual([EnvelopeMessageType.REQUEST_STUDIO_EMBED_PATH, undefined])
    reply(EnvelopeMessageType.STUDIO_EMBED_PATH, { modelId: 'm1', synced: true })
    expect(onResult).toHaveBeenCalledTimes(1)
    expect(onResult).toHaveBeenCalledWith({ modelId: 'm1', synced: true, error: undefined })
    reply(EnvelopeMessageType.STUDIO_EMBED_PATH, { modelId: 'm9', synced: true })
    expect(onResult).toHaveBeenCalledTimes(1)
  })

  it('reports a timeout after 120 s (not before), then still delivers a late reply', async () => {
    const { ports, reply } = harness()
    const host = createLucidModalHost(ports)
    host.connect()
    const onResult = vi.fn()
    host.requestModelSync(onResult)
    await vi.advanceTimersByTimeAsync(119_999)
    expect(onResult).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(onResult).toHaveBeenCalledTimes(1)
    expect(onResult).toHaveBeenLastCalledWith({ synced: false, error: 'The extension did not answer.' })

    reply(EnvelopeMessageType.STUDIO_EMBED_PATH, { modelId: 'm1', synced: true })
    expect(onResult).toHaveBeenCalledTimes(2)
    expect(onResult).toHaveBeenLastCalledWith({ modelId: 'm1', synced: true, error: undefined })
  })

  it('unsubscribing stops both the timeout and a late reply', async () => {
    const { ports, reply } = harness()
    const host = createLucidModalHost(ports)
    host.connect()
    const onResult = vi.fn()
    const off = host.requestModelSync(onResult)
    off()
    await vi.advanceTimersByTimeAsync(120_000)
    reply(EnvelopeMessageType.STUDIO_EMBED_PATH, { modelId: 'm1', synced: true })
    expect(onResult).not.toHaveBeenCalled()
  })

  it('writes through extension envelopes and maps the *_RESULT back', async () => {
    const { ports, reply } = harness()
    const host = createLucidModalHost(ports, { withWriter: true })
    host.connect()
    host.writer!.connect()
    const done = host.writer!.write('states', { states: [] })
    const env = ports.posted[0]
    expect(env.type).toBe(EnvelopeMessageType.STATES_UPDATE)
    expect(env.source).toBe('studio-embed-iframe')
    reply(EnvelopeMessageType.STATES_UPDATE_RESULT, { success: true }, env.id)
    await expect(done).resolves.toEqual({})
  })

  it('an unknown write kind fails fast with no send, instead of waiting out the writer\'s own timeout', async () => {
    const { ports } = harness()
    const host = createLucidModalHost(ports, { withWriter: true })
    host.connect()
    host.writer!.connect()
    await expect(host.writer!.write('bogus' as any, {} as any)).rejects.toThrow('unknown write kind')
    expect(ports.posted).toHaveLength(0)
  })

  it('evicts an unanswered write after writeTtlMs and drops a late RESULT; the write itself already settled via its own timeout', async () => {
    const { ports, reply } = harness()
    const host = createLucidModalHost(ports, { withWriter: true })
    host.connect()
    host.writer!.connect()
    const done = host.writer!.write('states', { states: [] })
    const env = ports.posted[0]
    const settleSpy = vi.fn()
    done.catch(settleSpy)
    // Past both the writer's own 30s timeout and the host's own (longer) eviction window.
    await vi.advanceTimersByTimeAsync(writeTtlMs('states'))
    expect(settleSpy).toHaveBeenCalledTimes(1)
    reply(EnvelopeMessageType.STATES_UPDATE_RESULT, { success: true }, env.id)
    expect(settleSpy).toHaveBeenCalledTimes(1)
  })

  it('a matched result clears its eviction timer; advancing past the TTL afterward causes no further callback', async () => {
    const { ports, reply } = harness()
    const host = createLucidModalHost(ports, { withWriter: true })
    host.connect()
    host.writer!.connect()
    const done = host.writer!.write('entities', { entities: [] })
    const env = ports.posted[0]
    reply(EnvelopeMessageType.ENTITIES_UPDATE_RESULT, { success: true }, env.id)
    await expect(done).resolves.toEqual({})
    expect(() => { vi.advanceTimersByTime(writeTtlMs('entities')) }).not.toThrow()
  })
})

describe('windowPorts', () => {
  const envelope = { id: 'e1', type: EnvelopeMessageType.STUDIO_TOKEN, source: 'host', target: 'studio-embed-iframe', version: '1.0', data: {} }
  // jsdom ignores a MessageEvent's constructor `source`; define it explicitly.
  // In jsdom window.parent === window, so `window` stands in for the Lucid frame.
  function dispatch(data: unknown, source: unknown) {
    const ev = new MessageEvent('message', { data })
    Object.defineProperty(ev, 'source', { value: source, configurable: true })
    window.dispatchEvent(ev)
  }

  it('delivers only envelopes from the parent frame, until unlistened', () => {
    const ports = windowPorts(vi.fn())
    const cb = vi.fn()
    const off = ports.listen(cb)
    dispatch(envelope, null)
    dispatch(envelope, {})
    dispatch({ hello: 'not an envelope' }, window.parent)
    expect(cb).not.toHaveBeenCalled()
    dispatch(envelope, window.parent)
    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledWith(envelope)
    off()
    dispatch(envelope, window.parent)
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('posts envelopes to the parent frame and sends through the given sender', () => {
    const send = vi.fn()
    const post = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {})
    const ports = windowPorts(send)
    ports.postEnvelope(envelope as EnvelopeBase)
    expect(post).toHaveBeenCalledWith(envelope, '*')
    ports.send(EnvelopeMessageType.CLOSE_MODAL)
    expect(send).toHaveBeenCalledWith(EnvelopeMessageType.CLOSE_MODAL)
    post.mockRestore()
  })
})
