// quodsim-react/src/features/studies/__tests__/lucidModalHost.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EnvelopeMessageType, type EnvelopeBase } from '@quodsi/lucid-shared'
import { createLucidModalHost, type ModalHostPorts } from '../lucidModalHost'

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

  it('reports model sync from STUDIO_EMBED_PATH and times out', async () => {
    const { ports, reply } = harness()
    const host = createLucidModalHost(ports)
    host.connect()
    const p = host.requestModelSync()
    expect(ports.sent.at(-1)).toEqual([EnvelopeMessageType.REQUEST_STUDIO_EMBED_PATH, undefined])
    reply(EnvelopeMessageType.STUDIO_EMBED_PATH, { modelId: 'm1', synced: true })
    await expect(p).resolves.toEqual({ modelId: 'm1', synced: true, error: undefined })

    const q = host.requestModelSync()
    await vi.advanceTimersByTimeAsync(30_000)
    await expect(q).resolves.toEqual({ synced: false, error: 'The extension did not answer.' })
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
})
