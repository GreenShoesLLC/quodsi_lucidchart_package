// quodsi_lucidchart_package/editorextensions/quodsi_editor_extension/quodsim-react/src/adapters/useModelRootSource.ts
//
// React-side cache for the model-root projection the shared panels read.
//
// The extension owns the authoritative model and lives in a DIFFERENT JS
// realm, reachable only by postMessage -- so `deps.getModelDefinition` cannot
// call ModelManager. It reads this cache, which the host refreshes by pushing
// MODEL_ROOT_SNAPSHOT (unsolicited after every successful write, and on
// request when a consumer first mounts).
//
// REFERENCE STABILITY IS LOAD-BEARING. createLucidModelStateAccessor's
// getSnapshot caches on this returning the SAME object between real changes,
// and React calls getSnapshot on every render -- returning a fresh object each
// time throws "The result of getSnapshot should be cached".
//
// TWO DELIVERABLES IN THIS FILE:
//   1. createModelRootSource(transport) -- a pure, testable factory. No
//      knowledge of window/postMessage/React; it just tracks a cached
//      projection and forwards writes through the injected `transport`.
//   2. useModelRootSource() -- the React hook that wires that factory to
//      THIS package's actual messaging idiom (mint-your-own-correlation-id,
//      one-shot window.postMessage RPC), the same pattern usePortalSender
//      and useUpgradeInterestSender use for host round-trips that need a
//      resolved/rejected Promise rather than a Redux-broadcast update.
//      MODEL_ROOT_SNAPSHOT is NOT one-shot -- it arrives unsolicited after
//      every write in addition to replying to MODEL_ROOT_REQUEST -- so unlike
//      those two senders, the snapshot listener here is never torn down
//      until the hook unmounts.

import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { v4 as uuid } from 'uuid'
import {
  EnvelopeBase,
  EnvelopeMessageType,
  MessageSource,
  ModelRootProjection,
} from '@quodsi/lucid-shared'
import { useMessaging } from '../messaging/MessageProvider'
import { useModelOpsSender } from '../messaging/senders/modelOpsSender'
import {
  createLucidModelStateAccessor,
  type LucidModelStateAccessorDeps,
  type ModelStateAccessor,
} from './LucidModelStateAccessor'

export type ModelRootTransport = {
  /** Send a model-root patch to the host. Resolves when the host confirms. */
  send(patch: Record<string, unknown>): Promise<void>
  /** Ask the host for a fresh snapshot. Optional -- absent in unit tests. */
  request?(): void
  /**
   * Persist a shape-scoped patch (e.g. PatternModal/GeneratorPatternTab's
   * volume slider, or its fork-on-edit linking, both via
   * accessor.updateShape). Optional -- absent in unit tests that only
   * exercise the model-root half; when absent, deps.save throws rather than
   * silently no-opping (see createModelRootSource's own comment).
   */
  saveShape?(shapeId: string, type: string, patch: Record<string, unknown>): Promise<void>
}

export function createModelRootSource(transport: ModelRootTransport) {
  const listeners = new Set<() => void>()
  let projection: ModelRootProjection | null = null

  function acceptSnapshot(next: ModelRootProjection): void {
    // Replace the reference wholesale. Never mutate in place: the accessor's
    // cache compares by identity, so an in-place edit would be invisible.
    projection = next
    listeners.forEach((l) => l())
  }

  const deps: LucidModelStateAccessorDeps = {
    getModelDefinition: () => projection as unknown as Record<string, unknown> | null,

    onModelChanged: (listener: () => void) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },

    // Forwards to transport.saveShape, which the React hook below wires to
    // the SAME element-update route (modelOpsSender.updateElementData ->
    // ELEMENT_UPDATE) GeneratorEditor's own field edits already use -- see
    // that hook's own comment. Until now this threw unconditionally ("wire
    // deps.save to the existing element-update route instead"); Task 10
    // review (Critical 2) found that gap was live, not hypothetical --
    // GeneratorPatternTab's volume input and fork-linking both call
    // accessor.updateShape, and both were silently rejecting. A transport
    // with no saveShape wired (e.g. a bare unit test) still fails loudly,
    // matching updateModel's own "no saveModel dependency configured"
    // posture -- never a silent no-op.
    save: async (shapeId, type, patch) => {
      if (!transport.saveShape) {
        throw new Error(
          'useModelRootSource: no saveShape transport configured -- this ' +
          'shape-scoped patch was NOT persisted'
        )
      }
      await transport.saveShape(shapeId, type, patch)
    },

    // Forwarded VERBATIM. Never branch on keys here -- see the module doc on
    // LucidModelStateAccessor for the bug this prevents.
    saveModel: (patch: Record<string, unknown>) => transport.send(patch),
  }

  return {
    deps,
    acceptSnapshot,
    request: () => transport.request?.(),
  }
}

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

const SOURCE_BY_PANEL: Record<string, MessageSource> = {
  auth: 'auth-iframe',
  model: 'model-iframe',
  results: 'results-iframe',
}

// Generous but bounded: a model-root write is a local ModelManager mutation
// plus a re-validate, not a network call, so this is a safety net against a
// dropped message rather than a tuning knob for a slow round-trip.
const MODEL_ROOT_UPDATE_TIMEOUT_MS = 30_000

/**
 * Wires createModelRootSource to this package's postMessage transport and
 * hands back a ready-to-use ModelStateAccessor plus the current projection.
 *
 * Consumption (Task 10, inside GeneratorEditor's Lucid host component):
 *   const { accessor, projection } = useModelRootSource()
 *   if (!projection) return <Loading />   // no snapshot has arrived yet
 *   return <GeneratorEditor shapeId={...} accessor={accessor} />
 *
 * `projection` is for gating/rendering the raw arrivalPatterns/generators
 * lists directly if a consumer needs them without going through the generic
 * ModelStateAccessor snapshot's `modelDefinition` cast. `accessor` is what
 * gets threaded into shared components, which read it via
 * useSyncExternalStore(accessor.subscribe, accessor.getSnapshot) themselves.
 */
export function useModelRootSource(): {
  accessor: ModelStateAccessor
  projection: ModelRootProjection | null
} {
  const { app } = useMessaging()
  const source: MessageSource = SOURCE_BY_PANEL[app.panelType || 'model'] ?? 'model-iframe'

  // Same sender GeneratorEditor's own onSave path uses (handleElementSave ->
  // onElementUpdate -> updateElementData -> ELEMENT_UPDATE). Reusing it here
  // means a shape-scoped write from a shared panel (accessor.updateShape,
  // e.g. PatternModal's volume slider) reaches the real persistence path
  // instead of a second, parallel one.
  const { updateElementData } = useModelOpsSender()

  // Lazy-init once per component instance. createModelRootSource has no side
  // effects (it doesn't send anything), so re-running this check on every
  // render -- including React 18 StrictMode's double-invoked first render --
  // is safe: the second check just finds sourceRef.current already set.
  const sourceRef = useRef<ReturnType<typeof createModelRootSource> | null>(null)
  if (!sourceRef.current) {
    const transport: ModelRootTransport = {
      send(patch) {
        return new Promise<void>((resolve, reject) => {
          if (!window.parent) {
            reject(new Error('No parent window to send model-root update to'))
            return
          }

          const correlationId = uuid()
          let timeoutId: ReturnType<typeof setTimeout> | undefined

          const handler = (event: MessageEvent) => {
            const msg = event.data
            if (
              msg?.id === correlationId &&
              msg?.type === EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT
            ) {
              window.removeEventListener('message', handler)
              if (timeoutId !== undefined) clearTimeout(timeoutId)
              const data = (msg.data || {}) as { success?: boolean; errorMessage?: string }
              if (data.success) {
                resolve()
              } else {
                reject(new Error(data.errorMessage || 'Model-root update failed'))
              }
            }
          }

          window.addEventListener('message', handler)
          timeoutId = setTimeout(() => {
            window.removeEventListener('message', handler)
            reject(new Error('Model-root update timed out'))
          }, MODEL_ROOT_UPDATE_TIMEOUT_MS)

          const envelope: EnvelopeBase = {
            id: correlationId,
            type: EnvelopeMessageType.MODEL_ROOT_UPDATE,
            source,
            target: 'host',
            version: '1.0',
            data: { patch },
          }
          window.parent.postMessage(envelope, '*')
        })
      },

      request() {
        if (!window.parent) return
        const envelope: EnvelopeBase = {
          id: uuid(),
          type: EnvelopeMessageType.MODEL_ROOT_REQUEST,
          source,
          target: 'host',
          version: '1.0',
          data: {},
        }
        window.parent.postMessage(envelope, '*')
      },

      // ELEMENT_UPDATE is fire-and-forget from the caller's point of view --
      // updateElementData dispatches ELEMENT_SAVE_START and posts the
      // message synchronously; there is no ELEMENT_UPDATE_RESULT reply to
      // await (unlike MODEL_ROOT_UPDATE's round trip above). Resolving
      // immediately after the real send matches how every other field on
      // this generator already "saves": optimistic, tracked via Redux
      // elementOpsState, not via a promise the caller blocks on.
      async saveShape(shapeId, type, patch) {
        updateElementData(shapeId, type, patch)
      },
    }

    sourceRef.current = createModelRootSource(transport)
  }
  const modelRootSource = sourceRef.current

  // Persistent listener for MODEL_ROOT_SNAPSHOT. NOT correlated by message
  // id: a post-write push carries the WRITE's envelope id, not any request
  // id (see modelRootHandler.ts's handleUpdate -- it reuses msg.id from the
  // MODEL_ROOT_UPDATE it's replying to). So this accepts every snapshot the
  // host sends for the life of the component, unlike the one-shot handlers
  // in usePortalSender / useUpgradeInterestSender.
  useEffect(() => {
    function handleSnapshot(event: MessageEvent) {
      const msg = event.data
      if (msg?.type === EnvelopeMessageType.MODEL_ROOT_SNAPSHOT) {
        const data = (msg.data || {}) as { projection?: ModelRootProjection }
        if (data.projection) {
          modelRootSource.acceptSnapshot(data.projection)
        }
      }
    }
    window.addEventListener('message', handleSnapshot)
    return () => window.removeEventListener('message', handleSnapshot)
  }, [modelRootSource])

  // Ask the host for the current projection once on mount. A StrictMode
  // double-invoke sends this twice, which just costs one extra snapshot
  // push -- acceptSnapshot is idempotent-safe against that (replaces the
  // reference with equivalent content), so no skip-once guard is needed.
  useEffect(() => {
    modelRootSource.request()
  }, [modelRootSource])

  const accessor = useMemo(
    () => createLucidModelStateAccessor(modelRootSource.deps),
    [modelRootSource],
  )

  // Mirrors the exact reference-stability contract createLucidModelStateAccessor
  // relies on: getModelDefinition returns the same object until acceptSnapshot
  // replaces it, and onModelChanged is the notify hook -- precisely what
  // useSyncExternalStore needs, and both are stable function identities for
  // the life of modelRootSource so this never over-subscribes.
  const projection = useSyncExternalStore(
    modelRootSource.deps.onModelChanged,
    modelRootSource.deps.getModelDefinition,
  ) as unknown as ModelRootProjection | null

  return { accessor, projection }
}
