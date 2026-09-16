// quodsim-react/src/features/studies/lucidModalHost.ts
//
// LucidHost for the compiled Studies/Advisor modals (StudiesModal /
// AdvisorConsultModal): requests are sent straight to the extension over
// this modal's messaging (channel role 'studio-embed').
import { v4 as uuid } from 'uuid'
import { EnvelopeMessageType, isEnvelope, type EnvelopeBase } from '@quodsi/lucid-shared'
import {
  createEmbedWriter,
  QUODSI_EMBED_WRITE_RESULT,
  type EmbedWriteKind,
  type EmbedWriteMessage,
  type LucidHost,
  type RelayedCatalog,
  type RunResult,
} from 'quodsi_studio/platforms/lucid-host'
import { buildWriteEnvelope, WRITE_RESULT_TYPES, writeTtlMs } from './embedWriteEnvelope'

export const HOST_REQUEST_TIMEOUT_MS = 30_000
const TOKEN_TIMEOUT_MS = 10_000
const TOKEN_RETRY_MS = 1_000

export interface ModalHostPorts {
  send(type: EnvelopeMessageType, data?: unknown): void
  postEnvelope(envelope: EnvelopeBase): void
  listen(cb: (envelope: EnvelopeBase) => void): () => void
}

export interface LucidModalHost extends LucidHost {
  requestToken(): Promise<string | undefined>
  requestModelSync(): Promise<{ modelId?: string; synced: boolean; error?: string }>
  connect(): void
  disconnect(): void
}

/** Default ports for a modal page: messaging hook + the Lucid parent frame. */
export function windowPorts(send: ModalHostPorts['send']): ModalHostPorts {
  return {
    send,
    postEnvelope: (env) => window.parent.postMessage(env, '*'),
    listen: (cb) => {
      const onMessage = (e: MessageEvent) => {
        if (e.source === window.parent && isEnvelope(e.data)) cb(e.data)
      }
      window.addEventListener('message', onMessage)
      return () => window.removeEventListener('message', onMessage)
    },
  }
}

export function createLucidModalHost(ports: ModalHostPorts, opts: { withWriter?: boolean } = {}): LucidModalHost {
  const subscribers = new Set<(e: EnvelopeBase) => void>()
  let unlisten: (() => void) | null = null
  const on = (cb: (e: EnvelopeBase) => void) => { subscribers.add(cb); return () => { subscribers.delete(cb) } }

  // Writer: Studio's relay client, with ports that speak extension envelopes.
  const writeIds = new Map<string, { requestId: number; timer: number }>()
  const writer = opts.withWriter
    ? createEmbedWriter({
        postMessage: (msg) => {
          const { requestId, kind, payload } = msg as EmbedWriteMessage
          const envelope = buildWriteEnvelope(kind as EmbedWriteKind, payload, uuid())
          if (!envelope) return
          const timer = window.setTimeout(() => writeIds.delete(envelope.id), writeTtlMs(kind as EmbedWriteKind))
          writeIds.set(envelope.id, { requestId, timer })
          ports.postEnvelope(envelope)
        },
        addListener: (cb) => on((env) => {
          const entry = writeIds.get(env.id)
          if (!entry || !WRITE_RESULT_TYPES.has(env.type)) return
          window.clearTimeout(entry.timer)
          writeIds.delete(env.id)
          const { success, errorMessage, ...rest } = (env.data ?? {}) as { success?: boolean; errorMessage?: string; [k: string]: unknown }
          cb(new MessageEvent('message', {
            data: { type: QUODSI_EMBED_WRITE_RESULT, requestId: entry.requestId, success: !!success, error: errorMessage, data: rest },
          }))
        }),
      })
    : undefined

  const host: LucidModalHost = {
    writer,
    connect() {
      if (unlisten) return
      unlisten = ports.listen((env) => subscribers.forEach((cb) => cb(env)))
    },
    disconnect() {
      unlisten?.()
      unlisten = null
    },
    requestCatalog: () => ports.send(EnvelopeMessageType.REQUEST_STUDIO_CATALOG),
    onCatalog: (cb) => on((env) => {
      if (env.type === EnvelopeMessageType.STUDIO_CATALOG) cb((env.data as { catalog: RelayedCatalog }).catalog)
    }),
    runScenario: ({ scenarioId, enableAnimation, updateModel }) =>
      ports.send(EnvelopeMessageType.RUN_SCENARIO, { scenarioId, enableAnimation, updateModel }),
    onRunResult: (cb) => on((env) => {
      if (env.type !== EnvelopeMessageType.RUN_SCENARIO_RESULT) return
      const d = (env.data ?? {}) as { scenarioId?: string; accepted?: boolean; error?: string }
      cb({ scenarioId: d.scenarioId, accepted: !!d.accepted, error: d.error } satisfies RunResult)
    }),
    locateElement: (elementId) => ports.send(EnvelopeMessageType.LOCATE_ELEMENT, { elementId }),
    closeModal: () => ports.send(EnvelopeMessageType.CLOSE_MODAL),
    requestToken: () => new Promise((resolve) => {
      let retry: number | null = null
      const finish = (token: string | undefined) => {
        off()
        window.clearTimeout(deadline)
        if (retry !== null) window.clearTimeout(retry)
        resolve(token)
      }
      const off = on((env) => {
        if (env.type !== EnvelopeMessageType.STUDIO_TOKEN) return
        const token = (env.data as { token?: string } | undefined)?.token
        if (token) { finish(token); return }
        if (retry === null) {
          retry = window.setTimeout(() => {
            retry = null
            ports.send(EnvelopeMessageType.REQUEST_STUDIO_TOKEN)
          }, TOKEN_RETRY_MS)
        }
      })
      const deadline = window.setTimeout(() => finish(undefined), TOKEN_TIMEOUT_MS)
      ports.send(EnvelopeMessageType.REQUEST_STUDIO_TOKEN)
    }),
    requestModelSync: () => new Promise((resolve) => {
      const off = on((env) => {
        if (env.type !== EnvelopeMessageType.STUDIO_EMBED_PATH) return
        const d = (env.data ?? {}) as { modelId?: string; synced?: boolean; error?: string }
        off()
        window.clearTimeout(timer)
        resolve({ modelId: d.modelId, synced: !!d.synced, error: d.error })
      })
      const timer = window.setTimeout(() => {
        off()
        resolve({ synced: false, error: 'The extension did not answer.' })
      }, HOST_REQUEST_TIMEOUT_MS)
      ports.send(EnvelopeMessageType.REQUEST_STUDIO_EMBED_PATH)
    }),
  }
  return host
}
