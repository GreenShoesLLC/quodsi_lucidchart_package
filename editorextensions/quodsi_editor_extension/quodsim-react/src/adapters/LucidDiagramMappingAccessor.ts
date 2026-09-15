// quodsim-react/src/adapters/LucidDiagramMappingAccessor.ts
//
// DiagramMappingAccessor for the INLINE Diagram Mapping modal (spec
// 2026-09-15, "opens inline"). Unlike quodsi_studio's
// LucidEmbedDiagramMappingAccessor -- which speaks the raw QUODSI_* relay
// protocol that EmbeddedStudioFrame translates to/from real envelopes -- this
// accessor talks straight to the extension: it posts ANALYZE_PAGE /
// APPLY_SHAPE_CHANGES envelopes to window.parent with
// source: 'diagram-mapping-iframe', target: 'host', and listens for the
// matching PAGE_ANALYSIS_RESULT / APPLY_SHAPE_CHANGES_RESULT envelope from
// DiagramMappingRelayHandler (see its handleAnalyze/handleApply for the
// exact reply shapes), correlated by a monotonic requestId of its own.
//
// Modeled on quodsi_studio's LucidEmbedDiagramMappingAccessor: side-effect-
// free constructor, connect()/disconnect() driven by a host useEffect
// (StrictMode-safe -- only the live, connected instance listens, so no
// orphan listeners, and disconnect() preserves pending requests so a
// StrictMode disconnect->reconnect does not drop a result), and injectable
// ports for tests.
import { v4 as uuid } from 'uuid'
import { EnvelopeMessageType, type EnvelopeBase } from '@quodsi/lucid-shared'
import type { ConversionPreviewData, MappingChange } from '@quodsi/shared'
import type { DiagramMappingAccessor } from 'quodsi_studio/platforms/shared'

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void; kind: 'analyze' | 'apply' }

export interface DiagramMappingPorts {
  postMessage?: (msg: unknown) => void
  addListener?: (cb: (e: MessageEvent) => void) => () => void
}

export class LucidDiagramMappingAccessor implements DiagramMappingAccessor {
  private nextId = 1
  private readonly pending = new Map<number, Pending>()
  private readonly post: (msg: unknown) => void
  private readonly add: (cb: (e: MessageEvent) => void) => () => void
  private unlisten: (() => void) | null = null

  constructor(ports: DiagramMappingPorts = {}) {
    this.post = ports.postMessage ?? ((m) => window.parent.postMessage(m, '*'))
    this.add =
      ports.addListener ??
      ((cb) => {
        window.addEventListener('message', cb)
        return () => window.removeEventListener('message', cb)
      })
  }

  /** Start listening for relay results. Idempotent. Call from a host useEffect. */
  connect(): void {
    if (this.unlisten) return
    this.unlisten = this.add(this.onMessage)
  }

  /** Stop listening. Does NOT clear pending requests, so a StrictMode
   *  disconnect->reconnect keeps in-flight analyze/apply calls resolvable. */
  disconnect(): void {
    if (this.unlisten) {
      this.unlisten()
      this.unlisten = null
    }
  }

  private onMessage = (e: MessageEvent): void => {
    const envelope = e.data as Partial<EnvelopeBase> | undefined
    if (!envelope || typeof envelope !== 'object') return
    const data = envelope.data as
      | { requestId?: number; data?: unknown; error?: string; success?: boolean }
      | undefined
    const requestId = data?.requestId
    if (requestId === undefined) return
    const p = this.pending.get(requestId)
    if (!p) return

    if (p.kind === 'analyze' && envelope.type === EnvelopeMessageType.PAGE_ANALYSIS_RESULT) {
      this.pending.delete(requestId)
      if (data?.error) p.reject(new Error(data.error))
      else p.resolve(data?.data)
      return
    }
    if (p.kind === 'apply' && envelope.type === EnvelopeMessageType.APPLY_SHAPE_CHANGES_RESULT) {
      this.pending.delete(requestId)
      if (!data?.success) p.reject(new Error(data?.error ?? 'apply failed'))
      else p.resolve(undefined)
    }
  }

  analyzePage(): Promise<ConversionPreviewData> {
    const requestId = this.nextId++
    return new Promise<ConversionPreviewData>((resolve, reject) => {
      this.pending.set(requestId, { resolve: resolve as (v: unknown) => void, reject, kind: 'analyze' })
      this.post({
        id: uuid(),
        type: EnvelopeMessageType.ANALYZE_PAGE,
        source: 'diagram-mapping-iframe',
        target: 'host',
        version: '1.0',
        data: { requestId },
      })
    })
  }

  applyChanges(changes: MappingChange[]): Promise<void> {
    const requestId = this.nextId++
    return new Promise<void>((resolve, reject) => {
      this.pending.set(requestId, { resolve: resolve as (v: unknown) => void, reject, kind: 'apply' })
      this.post({
        id: uuid(),
        type: EnvelopeMessageType.APPLY_SHAPE_CHANGES,
        source: 'diagram-mapping-iframe',
        target: 'host',
        version: '1.0',
        data: { requestId, changes },
      })
    })
  }
}
