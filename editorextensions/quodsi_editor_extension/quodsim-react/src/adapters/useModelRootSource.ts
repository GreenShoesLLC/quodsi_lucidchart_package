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
  MODEL_FIELD_KEYS,
} from '@quodsi/lucid-shared'
import type { ReferenceCleanupOptions } from '@quodsi/lucid-shared'
import { useMessaging } from '../messaging/MessageProvider'
import {
  createLucidModelStateAccessor,
  type LucidModelStateAccessorDeps,
  type ModelStateAccessor,
  type ModelWriteStatus,
} from './LucidModelStateAccessor'
import { MODEL_NOT_LOADED_MESSAGE } from './pageGuardMessages'

/** Quiet time before a batch of plain model-root edits is sent (spec 2026-09-12 lucid-model-root-batching). */
export const MODEL_ROOT_DEBOUNCE_MS = 400

/**
 * How long a settled batch waits for the snapshot the host tags with its id
 * before asking for one: the host only logs a failed snapshot build.
 */
export const TAGGED_SNAPSHOT_GRACE_MS = 2_000

// Ids of released batches, kept so a late snapshot for one of them is
// recognised as older than what is already shown. Only the last few batches
// can still have a snapshot in the air.
const RELEASED_IDS_KEPT = 50

/**
 * A model-root write that can never get a reply (the timeout, or no parent
 * window). No corrective snapshot will follow, so the source drops the batch
 * at once and asks for a fresh snapshot.
 */
export class ModelRootNoReplyError extends Error {
  readonly noReply = true
  constructor(message: string) {
    super(message)
    this.name = 'ModelRootNoReplyError'
  }
}

function isNoReplyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { noReply?: unknown }).noReply === true
}

export type ModelRootTransport = {
  /**
   * Send one model-root batch. `basedOnPageId` is the page id of the snapshot
   * the batch's first edit was based on (page guard, spec 2026-09-11);
   * `options` is a delete dialog's Seize/Release choice, present only on a
   * write that carries one; `id` is the envelope id -- the host tags its
   * post-write AND corrective snapshots with it. Resolves when the host
   * confirms; rejects with the host's message, or with ModelRootNoReplyError
   * when no reply can come.
   */
  send(
    patch: Record<string, unknown>,
    basedOnPageId: string | undefined,
    options: ReferenceCleanupOptions | undefined,
    id: string,
  ): Promise<void>
  /**
   * Ask the host for a fresh snapshot; returns the request's envelope id,
   * which tags the reply. Optional -- absent in unit tests.
   */
  request?(): string | void
  /**
   * Persist a shape-scoped patch (e.g. the arrival-pattern editor modal's
   * GeneratorPatternTab volume slider, or its fork-on-edit linking, both via
   * accessor.updateShape). Optional -- absent in unit tests that only
   * exercise the model-root half; when absent, deps.save throws rather than
   * silently no-opping (see createModelRootSource's own comment).
   */
  saveShape?(shapeId: string, type: string, patch: Record<string, unknown>): Promise<void>
}

export type ModelRootSourceOptions = {
  /** Quiet time before a batch of plain edits is sent. Default MODEL_ROOT_DEBOUNCE_MS. */
  debounceMs?: number
  /** How long a settled batch waits for its tagged snapshot. Default TAGGED_SNAPSHOT_GRACE_MS. */
  taggedSnapshotGraceMs?: number
}

// Markers the HOST stamps onto each projected resource row at build time
// (which shape claims it, that shape's label, which lane). They describe the
// canvas, not the record, so no patch a panel sends ever carries them.
const TRANSIENT_RESOURCE_KEYS = ['shapeId', 'shapeLabel', 'laneRef'] as const

// The model's own settings (MODEL_FIELD_KEYS minus the host-owned `id`). The
// snapshot carries each of them twice -- flat, where Lucid's Model editor
// drafts from, and under `model`, where the shared modals' calendar math reads
// -- so the echo writes both copies (spec 2026-09-12 §4).
const MODEL_SETTINGS_KEYS = new Set<string>(MODEL_FIELD_KEYS.filter((key) => key !== 'id'))

/**
 * Lay a model-root patch over a projection, returning a NEW object (the
 * accessor's getSnapshot cache compares by identity).
 *
 * `resources` merges PER ROW BY ID rather than replacing rows, so the
 * transient link markers -- which exist only on the host's projection and
 * never on a patch -- survive; otherwise the Resources tab's link column
 * flickers to "no shape". Every other key is replaced wholesale. Model
 * settings keys land flat AND in a rebuilt nested `model` block, the two
 * places the snapshot carries them.
 */
function applyPatch(current: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = { ...current }

  for (const [key, value] of Object.entries(patch)) {
    if (key === 'resources' && Array.isArray(value)) {
      const cachedById = new Map<string, Record<string, unknown>>()
      for (const row of (current.resources as Array<Record<string, unknown>> | undefined) ?? []) {
        if (row) cachedById.set(String(row.id), row)
      }
      next.resources = value.map((row: Record<string, unknown>) => {
        const prev = row ? cachedById.get(String(row.id)) : undefined
        if (!prev) return row
        const merged: Record<string, unknown> = { ...prev, ...row }
        for (const k of TRANSIENT_RESOURCE_KEYS) {
          // An explicit `shapeId: undefined` on the patch row still means
          // "the patch did not carry it" -- only the host can clear a marker.
          if (merged[k] === undefined && prev[k] !== undefined) merged[k] = prev[k]
        }
        return merged
      })
    } else {
      next[key] = value
      if (MODEL_SETTINGS_KEYS.has(key)) {
        next.model = { ...((next.model as Record<string, unknown> | undefined) ?? {}), [key]: value }
      }
    }
  }

  return next
}

/** A group of model-root edits sent as one MODEL_ROOT_UPDATE. */
type Batch = {
  id: string
  order: number
  patch: Record<string, unknown>
  basedOnPageId: string | undefined
  options: ReferenceCleanupOptions | undefined
  /** Envelope ids whose snapshot releases this batch: its own, plus a safety-net request's. */
  releaseIds: Set<string>
  run: Promise<void> | null
  graceTimer: ReturnType<typeof setTimeout> | null
  requested: boolean
}

const IDLE: ModelWriteStatus = { status: 'idle', error: null }
const SAVING: ModelWriteStatus = { status: 'saving', error: null }
const SAVED: ModelWriteStatus = { status: 'saved', error: null }

export function createModelRootSource(transport: ModelRootTransport, sourceOptions: ModelRootSourceOptions = {}) {
  const debounceMs = sourceOptions.debounceMs ?? MODEL_ROOT_DEBOUNCE_MS
  const graceMs = sourceOptions.taggedSnapshotGraceMs ?? TAGGED_SNAPSHOT_GRACE_MS
  const listeners = new Set<() => void>()

  // BATCHING (spec 2026-09-12 lucid-model-root-batching). Every write costs
  // the extension a storage write, a validate, two snapshots and a selection
  // re-process, so plain edits merge into a pending batch and go out as one
  // MODEL_ROOT_UPDATE after a quiet period. updateModel resolves once an edit
  // is accepted, like drawio and Visio; flush() waits for the host.
  //
  // SHIELDING. `base` is the last snapshot the host sent; `projection` is it
  // with every unreleased batch and then the pending edits laid over it, so a
  // stale snapshot never overwrites typed text. A batch is released by the
  // snapshot the host tags with its envelope id -- the stored result of that
  // write, whether it was saved or refused.
  let base: ModelRootProjection | null = null
  let projection: ModelRootProjection | null = null
  // Stamped onto every accepted snapshot (never onto an echo) so an editor can
  // tell a snapshot that arrived after its write settled from one already in
  // flight -- see ModelEditor's draft resync.
  let seq = 0

  let pending: Record<string, unknown> = {}
  let pendingPageId: string | undefined
  let hasPending = false
  let timer: ReturnType<typeof setTimeout> | null = null

  let batchOrder = 0
  let unreleased: Batch[] = []
  const outstanding = new Set<Batch>()
  // Serial: one batch in flight at a time, in the order batches were made.
  // Kept never-rejecting; each batch's own run carries its outcome.
  let queue: Promise<void> = Promise.resolve()

  const releasedOrders = new Map<string, number>()
  let highestReleasedOrder = 0

  let lastOutcome: ModelWriteStatus = IDLE
  let writeStatus: ModelWriteStatus = IDLE

  function notify(): void {
    listeners.forEach((l) => l())
  }

  function recompute(): void {
    if (!base) {
      projection = null
      return
    }
    if (unreleased.length === 0 && !hasPending) {
      projection = base
      return
    }
    let next = base as unknown as Record<string, unknown>
    for (const batch of unreleased) next = applyPatch(next, batch.patch)
    if (hasPending) next = applyPatch(next, pending)
    projection = next as unknown as ModelRootProjection
  }

  // Callers notify once after all their changes.
  function syncStatus(): void {
    writeStatus = hasPending || outstanding.size > 0 ? SAVING : lastOutcome
  }

  function clearTimer(): void {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  function makeBatch(
    patch: Record<string, unknown>,
    basedOnPageId: string | undefined,
    options: ReferenceCleanupOptions | undefined,
  ): Batch {
    const id = uuid()
    return {
      id,
      order: ++batchOrder,
      patch,
      basedOnPageId,
      options,
      releaseIds: new Set([id]),
      run: null,
      graceTimer: null,
      requested: false,
    }
  }

  // Pending edits become a batch the moment they are due (timer, flush, or a
  // cleanup-option write); later edits form the next batch. The projection is
  // unchanged: the same patch moves from the pending overlay to the end of the
  // batch overlays.
  function promotePending(): Batch | null {
    clearTimer()
    if (!hasPending) return null
    const batch = makeBatch(pending, pendingPageId, undefined)
    pending = {}
    pendingPageId = undefined
    hasPending = false
    unreleased.push(batch)
    return batch
  }

  function enqueue(batch: Batch): Promise<void> {
    outstanding.add(batch)
    syncStatus()
    const run = queue.then(() => send(batch))
    batch.run = run
    queue = run.catch(() => {})
    return run
  }

  function send(batch: Batch): Promise<void> {
    return new Promise<void>((resolve) => {
      resolve(transport.send(batch.patch, batch.basedOnPageId, batch.options, batch.id))
    }).then(
      () => {
        settle(batch, SAVED)
      },
      (err: unknown) => {
        settle(batch, { status: 'failed', error: err instanceof Error ? err.message : String(err) })
        if (isNoReplyError(err)) {
          releaseThrough(batch.order)
          recompute()
          notify()
          transport.request?.()
        }
        throw err
      },
    )
  }

  function settle(batch: Batch, outcome: ModelWriteStatus): void {
    outstanding.delete(batch)
    lastOutcome = outcome
    if (unreleased.includes(batch)) armGrace(batch)
    syncStatus()
    notify()
  }

  // Safety net: the host sends a tagged snapshot after every write, but only
  // logs a failed build. Ask once, then release outright.
  function armGrace(batch: Batch): void {
    batch.graceTimer = setTimeout(() => {
      batch.graceTimer = null
      if (!unreleased.includes(batch)) return
      if (!batch.requested) {
        const requestId = transport.request?.()
        if (typeof requestId === 'string') {
          batch.requested = true
          batch.releaseIds.add(requestId)
          armGrace(batch)
          return
        }
      }
      releaseThrough(batch.order)
      recompute()
      notify()
    }, graceMs)
  }

  // Release this batch and every batch sent before it: the host applied those
  // first, so a snapshot that reflects this write reflects them too.
  function releaseThrough(order: number): void {
    const keep: Batch[] = []
    for (const batch of unreleased) {
      if (batch.order > order) {
        keep.push(batch)
        continue
      }
      if (batch.graceTimer !== null) {
        clearTimeout(batch.graceTimer)
        batch.graceTimer = null
      }
      for (const id of batch.releaseIds) releasedOrders.set(id, batch.order)
      if (batch.order > highestReleasedOrder) highestReleasedOrder = batch.order
    }
    unreleased = keep
    while (releasedOrders.size > RELEASED_IDS_KEPT) {
      const oldest = releasedOrders.keys().next().value as string
      releasedOrders.delete(oldest)
    }
  }

  function acceptSnapshot(next: ModelRootProjection, envelopeId?: string): void {
    if (envelopeId !== undefined) {
      const releasedOrder = releasedOrders.get(envelopeId)
      // The answer to a write older than one whose stored result is already
      // shown: it was built before that result, so applying it would step back.
      if (releasedOrder !== undefined && releasedOrder < highestReleasedOrder) return
    }
    // Replace the base wholesale. Never mutate in place: the accessor's cache
    // compares by identity, so an in-place edit would be invisible.
    base = { ...next, snapshotSeq: ++seq }
    if (envelopeId !== undefined) {
      const hit = unreleased.find((batch) => batch.releaseIds.has(envelopeId))
      if (hit) releaseThrough(hit.order)
    }
    recompute()
    notify()
  }

  /** Send every pending edit now; resolve when everything pending or in flight has landed. */
  function flush(): Promise<void> {
    const promoted = promotePending()
    if (promoted) void enqueue(promoted).catch(() => {})
    const runs = Array.from(outstanding, (batch) => batch.run as Promise<void>)
    return Promise.all(runs).then(() => undefined)
  }

  function hasPendingWrites(): boolean {
    return hasPending || outstanding.size > 0
  }

  const deps: LucidModelStateAccessorDeps = {
    getModelDefinition: () => projection as unknown as Record<string, unknown> | null,

    onModelChanged: (listener: () => void) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },

    // Forwards to transport.saveShape, which the React hook below wires to
    // the SAME ELEMENT_UPDATE route (same envelope type, same host handler
    // ElementOpsHandler.handleElementUpdate, same StorageAdapter merge)
    // GeneratorEditor's own field edits already use -- see that hook's own
    // comment. Until Task 10 review round 2 this threw unconditionally
    // ("wire deps.save to the existing element-update route instead");
    // GeneratorPatternTab's volume input and fork-linking both call
    // accessor.updateShape, and both were silently rejecting. Round 3
    // upgraded the wiring again: saveShape now AWAITS the real
    // ELEMENT_UPDATE_RESULT confirmation (round 2's version resolved the
    // instant the message was sent), because a caller that needs to
    // sequence a shape write before a model-root write -- GeneratorEditor's
    // PATTERN mode-switch does, see its own comment -- needs deps.save to
    // mean "durably persisted", not "message dispatched". A transport with
    // no saveShape wired (e.g. a bare unit test) still fails loudly,
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

    // Synchronous shape lookup, served ENTIRELY from the cached projection.
    // Lucid's shapes live in the extension realm, so there is no way to ask
    // the host "what is blk-1 called?" and answer inside a synchronous
    // `ShapeInfoLike | null` return -- but there is no need to: every
    // resources[] row already carries the shapeId it is claimed by and that
    // shape's label, stamped at projection-build time (Plan 2b Tasks 3/7).
    //
    // SCOPE IS DELIBERATELY RESOURCE-ONLY. The single consumer today is
    // ResourcesEditor's link-status column
    // (`accessor.getShapeInfo?.(shapeId)?.name ?? shapeId`), and the
    // projection carries link markers for nothing else. A shape id that no
    // resource row claims therefore returns null rather than a fabricated
    // descriptor -- the caller's own `?? shapeId` fallback then shows the raw
    // id, which is honest, where an invented name would not be.
    //
    // masterName / quodsiData are null and is1D is false because the
    // projection does not carry them; they exist on ShapeInfoLike for
    // Visio's classification flow (classifyShape / removeClassification),
    // neither of which this host wires up.
    getShapeInfo: (shapeId: string) => {
      const row = projection?.resources?.find((r) => r.shapeId === shapeId)
      if (!row) return null
      const label = row.shapeLabel ?? shapeId
      return {
        shapeId,
        name: label,
        text: label,
        masterName: null,
        is1D: false,
        quodsiType: 'Resource',
        quodsiData: null,
      }
    },

    // Page guard (spec 2026-09-11): with no snapshot yet, an editor is looking
    // at an empty list, and a whole-list write from it would overwrite the
    // stored list -- refuse before any echo or message.
    //
    // A plain write joins the pending batch and resolves at once; its page id
    // is the one the batch started with. A write carrying cleanup options is
    // never merged: pending edits go first, then it is sent alone and the
    // call settles with the host's answer.
    saveModel: (patch: Record<string, unknown>, options?: ReferenceCleanupOptions) => {
      if (!base) {
        return Promise.reject(new Error(MODEL_NOT_LOADED_MESSAGE))
      }
      if (options) {
        const promoted = promotePending()
        if (promoted) void enqueue(promoted).catch(() => {})
        const batch = makeBatch(patch, base.pageId, options)
        unreleased.push(batch)
        recompute()
        const result = enqueue(batch)
        notify()
        return result
      }
      if (!hasPending) pendingPageId = base.pageId
      pending = { ...pending, ...patch }
      hasPending = true
      clearTimer()
      timer = setTimeout(() => {
        timer = null
        const batch = promotePending()
        if (batch) void enqueue(batch).catch(() => {})
      }, debounceMs)
      syncStatus()
      recompute()
      notify()
      return Promise.resolve()
    },

    flushModel: flush,

    getModelWriteStatus: () => writeStatus,
  }

  return {
    deps,
    acceptSnapshot,
    request: () => transport.request?.(),
    flush,
    hasPendingWrites,
  }
}

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

// Panel type (the `?view=` the iframe was opened with) -> the `source` this
// realm stamps on outgoing envelopes.
//
// `pattern` and `schedule` were missing here, so both modal realms fell
// through to 'model-iframe'. That is invisible today ONLY because
// RoutingModal.messageFromFrame re-stamps `envelope.source` from the channel
// role before routing, which is the actual guarantee and must stay -- do not
// "simplify" it away on the strength of this map. But a compile-time union
// disagreeing with a runtime list is exactly the shape of the bug documented
// at the top of lucid-shared's envelope.ts (MESSAGE_SOURCES): the union
// accepted 'pattern-iframe' while the validator did not, and every message
// from the pattern modal was silently dropped. Keep the two in agreement.
const SOURCE_BY_PANEL: Record<string, MessageSource> = {
  auth: 'auth-iframe',
  model: 'model-iframe',
  results: 'results-iframe',
  pattern: 'pattern-iframe',
  schedule: 'schedule-iframe',
  'work-schedule': 'work-schedule-iframe',
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
 *   const { accessor, projection, request } = useModelRootSource()
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
  /** Ask the host for a fresh snapshot (ModelEditorForPage re-requests on selection changes). */
  request: () => void
} {
  const { app } = useMessaging()
  const source: MessageSource = SOURCE_BY_PANEL[app.panelType || 'model'] ?? 'model-iframe'

  // Lazy-init once per component instance. createModelRootSource has no side
  // effects (it doesn't send anything), so re-running this check on every
  // render -- including React 18 StrictMode's double-invoked first render --
  // is safe: the second check just finds sourceRef.current already set.
  const sourceRef = useRef<ReturnType<typeof createModelRootSource> | null>(null)
  if (!sourceRef.current) {
    const transport: ModelRootTransport = {
      send(patch, basedOnPageId, options, id) {
        return new Promise<void>((resolve, reject) => {
          if (!window.parent) {
            reject(new ModelRootNoReplyError('No parent window to send model-root update to'))
            return
          }

          // The source's batch id is the envelope id: the host tags its
          // post-write and corrective snapshots with it.
          const correlationId = id
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
            reject(new ModelRootNoReplyError('Model-root update timed out'))
          }, MODEL_ROOT_UPDATE_TIMEOUT_MS)

          const envelope: EnvelopeBase = {
            id: correlationId,
            type: EnvelopeMessageType.MODEL_ROOT_UPDATE,
            source,
            target: 'host',
            version: '1.0',
            data: { patch, basedOnPageId, ...(options?.seizeRelease ? { seizeRelease: options.seizeRelease } : {}) },
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
        // The reply is tagged with this id (the source's safety net uses it).
        return envelope.id
      },

      // Real confirmed round trip -- mirrors send()'s MODEL_ROOT_UPDATE
      // handling immediately above (and usePortalSender's one-shot RPC
      // idiom): mint a correlation id, await the matching
      // ELEMENT_UPDATE_RESULT, resolve/reject on success/failure. This is
      // NOT the same JS call updateElementData makes (which never surfaces
      // its envelope id, so it can't be awaited this way) -- but it IS the
      // same wire-level route: identical ELEMENT_UPDATE envelope shape,
      // handled by the identical host handler
      // (ElementOpsHandler.handleElementUpdate -> ModelManager.saveElementData
      // -> StorageAdapter.updateElementData, which merges rather than
      // clobbers -- verified in Task 10 review round 2).
      //
      // On confirmed success, request() a fresh snapshot. This is the fix
      // for the "split-brain projection" finding (Task 10 review round 3):
      // ELEMENT_UPDATE never triggers a MODEL_ROOT_SNAPSHOT push on its own
      // (only MODEL_ROOT_REQUEST and the post-write push after
      // MODEL_ROOT_UPDATE do), and that post-write push is built by
      // buildModelRootProjection CONCURRENTLY with an in-flight shape write
      // -- so a caller that fires both writes in parallel can have the
      // model-root snapshot land BEFORE the shape write's arrivalPatternId
      // reaches storage, permanently missing the link. Re-requesting here
      // only fires once THIS shape write is confirmed durable, so a caller
      // that awaits saveShape before issuing its own model-root write (see
      // GeneratorEditor's PATTERN mode-switch handler) is guaranteed a
      // projection that reflects both halves before making its next
      // lifecycle decision.
      saveShape(shapeId, type, patch) {
        return new Promise<void>((resolve, reject) => {
          if (!window.parent) {
            reject(new Error('No parent window to send element update to'))
            return
          }

          const correlationId = uuid()
          let timeoutId: ReturnType<typeof setTimeout> | undefined

          const handler = (event: MessageEvent) => {
            const msg = event.data
            if (
              msg?.id === correlationId &&
              msg?.type === EnvelopeMessageType.ELEMENT_UPDATE_RESULT
            ) {
              window.removeEventListener('message', handler)
              if (timeoutId !== undefined) clearTimeout(timeoutId)
              const data = (msg.data || {}) as { success?: boolean; errorMessage?: string }
              if (data.success) {
                resolve()
                // Fire-and-forget from THIS function's point of view -- the
                // caller's own await is already satisfied; the fresh
                // snapshot arrives via the persistent listener below like
                // any other push.
                transport.request?.()
              } else {
                reject(new Error(data.errorMessage || 'Element update failed'))
              }
            }
          }

          window.addEventListener('message', handler)
          timeoutId = setTimeout(() => {
            window.removeEventListener('message', handler)
            reject(new Error('Element update timed out'))
          }, MODEL_ROOT_UPDATE_TIMEOUT_MS)

          const envelope: EnvelopeBase = {
            id: correlationId,
            type: EnvelopeMessageType.ELEMENT_UPDATE,
            source,
            target: 'host',
            version: '1.0',
            data: { elementId: shapeId, type, data: { ...patch, id: shapeId } },
          }
          window.parent.postMessage(envelope, '*')
        })
      },
    }

    sourceRef.current = createModelRootSource(transport)
  }
  const modelRootSource = sourceRef.current

  // Persistent listener for MODEL_ROOT_SNAPSHOT: every snapshot the host sends
  // is accepted for the life of the component. Its envelope id is handed to
  // the source -- a post-write or corrective push carries the WRITE's id
  // (modelRootHandler.ts reuses msg.id), which releases that batch's overlay.
  useEffect(() => {
    function handleSnapshot(event: MessageEvent) {
      const msg = event.data
      if (msg?.type === EnvelopeMessageType.MODEL_ROOT_SNAPSHOT) {
        const data = (msg.data || {}) as { projection?: ModelRootProjection }
        if (data.projection) {
          modelRootSource.acceptSnapshot(data.projection, typeof msg.id === 'string' ? msg.id : undefined)
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

  return { accessor, projection, request: modelRootSource.request }
}
