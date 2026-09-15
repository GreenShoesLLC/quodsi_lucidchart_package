// LucidDiagramMappingAccessor.test.ts
//
// The inline Diagram Mapping modal's DiagramMappingAccessor (spec
// 2026-09-15, "opens inline"): posts ANALYZE_PAGE/APPLY_SHAPE_CHANGES
// envelopes straight to window.parent (source 'diagram-mapping-iframe',
// target 'host') and resolves/rejects on the matching PAGE_ANALYSIS_RESULT /
// APPLY_SHAPE_CHANGES_RESULT envelope, correlated by a monotonic requestId.
// Modeled on quodsi_studio's LucidEmbedDiagramMappingAccessor.test.ts, but
// over full envelopes rather than the raw QUODSI_* relay protocol.
import { describe, it, expect } from 'vitest'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'
import { LucidDiagramMappingAccessor } from '../LucidDiagramMappingAccessor'

function makePorts() {
  const posted: any[] = []
  const listeners: Array<(e: MessageEvent) => void> = []
  return {
    posted,
    ports: {
      postMessage: (m: unknown) => posted.push(m),
      addListener: (cb: (e: MessageEvent) => void) => {
        listeners.push(cb)
        return () => {
          const i = listeners.indexOf(cb)
          if (i >= 0) listeners.splice(i, 1)
        }
      },
    },
    dispatch: (data: unknown) => listeners.forEach((cb) => cb({ data } as MessageEvent)),
    listenerCount: () => listeners.length,
  }
}

describe('LucidDiagramMappingAccessor', () => {
  it('posts ANALYZE_PAGE with source diagram-mapping-iframe/target host and resolves on the matching requestId', async () => {
    const { posted, ports, dispatch } = makePorts()
    const accessor = new LucidDiagramMappingAccessor(ports)
    accessor.connect()

    const promise = accessor.analyzePage()
    expect(posted).toHaveLength(1)
    expect(posted[0]).toMatchObject({
      type: EnvelopeMessageType.ANALYZE_PAGE,
      source: 'diagram-mapping-iframe',
      target: 'host',
      version: '1.0',
    })
    const requestId = posted[0].data.requestId

    dispatch({
      type: EnvelopeMessageType.PAGE_ANALYSIS_RESULT,
      data: { requestId, data: { pageId: 'p1', mappings: [] } },
    })

    await expect(promise).resolves.toEqual({ pageId: 'p1', mappings: [] })
  })

  it('ignores a reply for a different requestId, and resolves on the one that matches', async () => {
    const { posted, ports, dispatch } = makePorts()
    const accessor = new LucidDiagramMappingAccessor(ports)
    accessor.connect()

    const promise = accessor.analyzePage()
    const requestId = posted[0].data.requestId

    dispatch({
      type: EnvelopeMessageType.PAGE_ANALYSIS_RESULT,
      data: { requestId: requestId + 999, data: { pageId: 'wrong', mappings: [] } },
    })
    dispatch({
      type: EnvelopeMessageType.PAGE_ANALYSIS_RESULT,
      data: { requestId, data: { pageId: 'right', mappings: [] } },
    })

    await expect(promise).resolves.toEqual({ pageId: 'right', mappings: [] })
  })

  it('rejects analyzePage when the result carries an error', async () => {
    const { posted, ports, dispatch } = makePorts()
    const accessor = new LucidDiagramMappingAccessor(ports)
    accessor.connect()

    const promise = accessor.analyzePage()
    const requestId = posted[0].data.requestId
    dispatch({ type: EnvelopeMessageType.PAGE_ANALYSIS_RESULT, data: { requestId, error: 'boom' } })

    await expect(promise).rejects.toThrow('boom')
  })

  it('posts APPLY_SHAPE_CHANGES with the changes and resolves on success', async () => {
    const { posted, ports, dispatch } = makePorts()
    const accessor = new LucidDiagramMappingAccessor(ports)
    accessor.connect()

    const changes = [{ elementId: 'b1', targetType: null }] as any
    const promise = accessor.applyChanges(changes)
    expect(posted[0]).toMatchObject({
      type: EnvelopeMessageType.APPLY_SHAPE_CHANGES,
      source: 'diagram-mapping-iframe',
      target: 'host',
      data: { changes },
    })
    const requestId = posted[0].data.requestId
    dispatch({ type: EnvelopeMessageType.APPLY_SHAPE_CHANGES_RESULT, data: { requestId, success: true } })

    await expect(promise).resolves.toBeUndefined()
  })

  it('rejects applyChanges on failure, with a default error message when none is given', async () => {
    const { posted, ports, dispatch } = makePorts()
    const accessor = new LucidDiagramMappingAccessor(ports)
    accessor.connect()

    const promise = accessor.applyChanges([])
    const requestId = posted[0].data.requestId
    dispatch({ type: EnvelopeMessageType.APPLY_SHAPE_CHANGES_RESULT, data: { requestId, success: false } })

    await expect(promise).rejects.toThrow('apply failed')
  })

  it('disconnect then connect keeps a pending request resolvable', async () => {
    const { posted, ports, dispatch } = makePorts()
    const accessor = new LucidDiagramMappingAccessor(ports)
    accessor.connect()

    const promise = accessor.analyzePage()
    const requestId = posted[0].data.requestId

    accessor.disconnect()
    accessor.connect()

    dispatch({
      type: EnvelopeMessageType.PAGE_ANALYSIS_RESULT,
      data: { requestId, data: { pageId: 'p2', mappings: [] } },
    })
    await expect(promise).resolves.toEqual({ pageId: 'p2', mappings: [] })
  })

  it('connect()/disconnect() are idempotent (StrictMode-safe: no orphan listeners)', () => {
    const { ports, listenerCount } = makePorts()
    const accessor = new LucidDiagramMappingAccessor(ports)

    accessor.connect()
    accessor.connect()
    expect(listenerCount()).toBe(1)

    accessor.disconnect()
    accessor.disconnect()
    expect(listenerCount()).toBe(0)
  })
})
