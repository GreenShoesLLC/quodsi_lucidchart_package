// quodsim-react/src/adapters/LucidDiagramMappingAccessor.ts
//
// DiagramMappingAccessor for the INLINE Diagram Mapping modal (spec
// 2026-09-15, "opens inline"). It talks straight to the extension: it posts
// ANALYZE_PAGE / APPLY_SHAPE_CHANGES envelopes to window.parent with
// source: 'diagram-mapping-iframe', target: 'host', and listens for the
// matching PAGE_ANALYSIS_RESULT / APPLY_SHAPE_CHANGES_RESULT envelope from
// DiagramMappingRelayHandler (see its handleAnalyze/handleApply for the
// exact reply shapes), correlated by the envelope id (a uuid) it posts with
// each request.
//
// Side-effect-free constructor, connect()/disconnect() driven by a host
// useEffect (StrictMode-safe -- only the live, connected instance listens,
// so no orphan listeners, and disconnect() preserves pending requests so a
// StrictMode disconnect->reconnect does not drop a result), and injectable
// ports for tests.
import { v4 as uuid } from 'uuid'
import { EnvelopeMessageType, type EnvelopeBase } from '@quodsi/lucid-shared'
import type { ConversionPreviewData, MappingChange } from '@quodsi/shared'
import type { DiagramMappingAccessor } from 'quodsi_studio/platforms/shared'

/** How long analyzePage/applyChanges wait for a reply before rejecting. Matches the blank-slate card's AUTO_CONVERT_TIMEOUT_MS. */
export const DIAGRAM_MAPPING_TIMEOUT_MS = 60_000

type Pending = {
  resolve: (v: unknown) => void
  reject: (e: Error) => void
  kind: 'analyze' | 'apply'
  timeoutId: ReturnType<typeof setTimeout>
}

export interface DiagramMappingPorts {
  postMessage?: (msg: unknown) => void
  addListener?: (cb: (e: MessageEvent) => void) => () => void
}

export class LucidDiagramMappingAccessor implements DiagramMappingAccessor {
  private nextId = 1
  /** Keyed by the envelope `id` (a uuid) posted with each request -- not by
   *  the `requestId` in `data`, which restarts at 1 for every modal instance
   *  and so cannot tell a reply queued for a prior, already-closed modal from
   *  one meant for this one. */
  private readonly pending = new Map<string, Pending>()
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
    const id = envelope.id
    if (id === undefined) return
    const p = this.pending.get(id)
    if (!p) return
    const data = envelope.data as
      | { requestId?: number; data?: unknown; error?: string; success?: boolean }
      | undefined

    if (p.kind === 'analyze' && envelope.type === EnvelopeMessageType.PAGE_ANALYSIS_RESULT) {
      this.pending.delete(id)
      clearTimeout(p.timeoutId)
      if (data?.error) p.reject(new Error(data.error))
      else p.resolve(data?.data)
      return
    }
    if (p.kind === 'apply' && envelope.type === EnvelopeMessageType.APPLY_SHAPE_CHANGES_RESULT) {
      this.pending.delete(id)
      clearTimeout(p.timeoutId)
      if (!data?.success) p.reject(new Error(data?.error ?? 'apply failed'))
      else p.resolve(undefined)
    }
  }

  analyzePage(): Promise<ConversionPreviewData> {
    // requestId still rides along in `data` -- DiagramMappingRelayHandler
    // reads it for logging and echoes it back -- but correlation on this end
    // is keyed on the envelope id below, not on this modal-local counter.
    const requestId = this.nextId++
    const id = uuid()
    return new Promise<ConversionPreviewData>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error('Analyzing the diagram timed out'))
      }, DIAGRAM_MAPPING_TIMEOUT_MS)
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, kind: 'analyze', timeoutId })
      this.post({
        id,
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
    const id = uuid()
    return new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error('Applying the mapping timed out'))
      }, DIAGRAM_MAPPING_TIMEOUT_MS)
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, kind: 'apply', timeoutId })
      this.post({
        id,
        type: EnvelopeMessageType.APPLY_SHAPE_CHANGES,
        source: 'diagram-mapping-iframe',
        target: 'host',
        version: '1.0',
        data: { requestId, changes },
      })
    })
  }
}
