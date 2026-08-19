// quodsi_lucidchart_package/editorextensions/quodsi_editor_extension/quodsim-react/src/adapters/bufferingAccessor.ts
//
// Wraps a ModelStateAccessor so edits render IMMEDIATELY and reach the host on a
// trailing debounce instead of once per keystroke.
//
// WHY THIS EXISTS AT ALL. quodsi_studio's GeneratorPatternTab drives fully
// controlled inputs off `state.modelDefinition` (`value={volume}`), and
// WeightStrip fires a write on every range-input event during a drag. In Studio
// and drawio the accessor writes to same-realm state, so both are free. In Lucid
// each write crosses postMessage into the extension host, which runs a full
// ModelDefinitionPageBuilder rebuild (validateModel) per write -- so the user
// waits on a round trip to see their own keystroke.
//
// WHY IT IS HERE AND NOT IN THE SHARED COMPONENT. Adding a local draft to
// GeneratorPatternTab would change behaviour for Studio and drawio, neither of
// which has the problem, and would put their suites in the blast radius. This
// wrapper is Lucid-only and leaves the shared contract untouched.
//
// REFERENCE STABILITY IS LOAD-BEARING. React calls getSnapshot on every render
// and throws "The result of getSnapshot should be cached" if two calls return
// different objects with no intervening change. The merged snapshot is therefore
// cached and rebuilt only when the base snapshot or the overlay actually changes.
//
// ------------------------------------------------------------------------
// THE OVERLAY, AND HOW IT RECONCILES WITH BASE SNAPSHOTS
// ------------------------------------------------------------------------
// Two overlays sit on top of the base snapshot, and the distinction between
// them is the whole of the reconciliation design:
//
//   `pending`  -- edits the user has made that have NOT been handed to the base
//                 accessor yet. The host cannot possibly know about these, so a
//                 base snapshot NEVER retires a pending entry. Pending leaves
//                 the overlay by exactly one route: being promoted to inFlight
//                 by a flush.
//
//   `inFlight` -- edits already handed to the base accessor but not yet echoed
//                 back in a base snapshot. These must stay visible or the value
//                 flickers back to its old state for a whole round trip -- the
//                 exact lag this module exists to remove.
//
// The merge order is inFlight then pending, so pending wins: it is newer.
//
// Telling "already committed" from "still pending" is done by VALUE, per key,
// against the base snapshot -- not by any kind of write receipt, because the
// host's MODEL_ROOT_SNAPSHOT carries no correlation id and snapshots can arrive
// unsolicited (a canvas edit, another panel's write) at any moment.
// On every base snapshot, each inFlight key whose value the base already shows
// is dropped; keys the base does not yet show are retained. That gives the two
// behaviours §5.2 of the design demands:
//
//   * A STALE snapshot landing mid-edit (host still reports the old volume)
//     matches no inFlight key, so nothing is dropped and the user's value holds.
//   * The ECHO of our own write matches, so the entry retires and the base
//     becomes the single source of truth again -- no resurrection of a value
//     the user has since changed, because a later edit lives in `pending`,
//     which this pass never touches, and which outranks inFlight in the merge.
//
// The one case worth stating explicitly: an edit typed WHILE a flush is in
// flight lands in `pending` (flush promotes synchronously at call time, so the
// batch is already captured). The older echo then retires the older inFlight
// entry and the newer pending value survives it. That is the mid-flight case
// the design flagged as the subtle one.
//
// Value-equality reconciliation has one benign quirk: if the user edits a field
// back to the value the base already holds, the inFlight entry retires on the
// next snapshot rather than on its own echo. Harmless -- the base already
// displays the value the user asked for.

import type {
  ModelStateAccessor,
  ModelStateSnapshot,
  DomainType,
} from 'quodsi_studio/platforms/shared'
import type { ModelDefinition } from '@quodsi/shared'

type ShapePatch = { shapeId: string; type: DomainType; patch: Record<string, unknown> }

export type BufferingAccessor = ModelStateAccessor & {
  /**
   * Write everything buffered right now, bypassing the debounce. Resolves when
   * the base accessor has accepted it (or rejects with the base's error).
   * Call this on modal close and on unmount: without it, a user who types and
   * immediately closes loses the edit.
   */
  flush(): Promise<void>
  /** Cancel the pending debounce timer and detach from the base accessor. */
  dispose(): void
}

/**
 * Which model-root list a shape-scoped patch merges into, per domain type.
 * Only `generators` is exercised today (Lucid's ModelRootProjection carries
 * generators/arrivalPatterns/model and nothing else); the rest are listed so a
 * later editor migrated onto this wrapper merges instead of silently no-opping.
 * A missing list, or a shape id not present in it, is a no-op -- this wrapper
 * displays edits to things the projection knows about, it does not invent rows.
 */
const DOMAIN_LIST_KEY: Record<DomainType, string> = {
  Activity: 'activities',
  Connector: 'connectors',
  Entity: 'entities',
  Generator: 'generators',
  Resource: 'resources',
}

function overlayKey(shapeId: string, type: DomainType): string {
  return `${type}:${shapeId}`
}

/**
 * Structural equality for JSON-shaped values. Needed because reconciliation
 * compares whole arrays (`arrivalPatterns`, the 168-slot `hourWeights`) against
 * what the host echoed back, and those never come back reference-equal: they
 * crossed postMessage and were rebuilt by the host's projection builder.
 */
function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a === 'number' && typeof b === 'number') {
    return Number.isNaN(a) && Number.isNaN(b)
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((item, i) => valuesEqual(item, b[i]))
  }
  if (a !== null && b !== null && typeof a === 'object' && typeof b === 'object') {
    const ao = a as Record<string, unknown>
    const bo = b as Record<string, unknown>
    const aKeys = Object.keys(ao)
    if (aKeys.length !== Object.keys(bo).length) return false
    return aKeys.every(
      (k) => Object.prototype.hasOwnProperty.call(bo, k) && valuesEqual(ao[k], bo[k]),
    )
  }
  return false
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** Find the entry a shape-scoped patch targets, or undefined. */
function findShapeEntry(
  def: Record<string, unknown> | null,
  entry: ShapePatch,
): Record<string, unknown> | undefined {
  if (def === null) return undefined
  const list = def[DOMAIN_LIST_KEY[entry.type]]
  if (!Array.isArray(list)) return undefined
  return list.find((item) => isRecord(item) && item.id === entry.shapeId) as
    | Record<string, unknown>
    | undefined
}

/**
 * Shallow-merge a shape patch onto the matching list entry, copying only what
 * changed. Returns `def` unchanged when there is no matching entry, so an
 * overlay for a shape the projection has not caught up to costs no rebuild.
 */
function applyShapePatch(
  def: Record<string, unknown>,
  entry: ShapePatch,
): Record<string, unknown> {
  const listKey = DOMAIN_LIST_KEY[entry.type]
  const list = def[listKey]
  if (!Array.isArray(list)) return def
  let matched = false
  const next = list.map((item) => {
    if (!isRecord(item) || item.id !== entry.shapeId) return item
    matched = true
    return { ...item, ...entry.patch }
  })
  if (!matched) return def
  return { ...def, [listKey]: next }
}

export function createBufferingAccessor(
  base: ModelStateAccessor,
  opts: { debounceMs: number },
): BufferingAccessor {
  // `pending` holds edits not yet sent. `inFlight` holds edits handed to the base
  // accessor but not yet echoed back in a base snapshot -- they must stay visible
  // or the value flickers back to its old state for a whole round trip.
  let pendingShape = new Map<string, ShapePatch>()
  let pendingModel: Record<string, unknown> = {}
  let inFlightShape = new Map<string, ShapePatch>()
  let inFlightModel: Record<string, unknown> = {}

  const listeners = new Set<() => void>()
  let timer: ReturnType<typeof setTimeout> | null = null

  // Bumped whenever the overlay's CONTENT could differ. Promotion
  // (pending -> inFlight) and rollback (inFlight -> pending) deliberately do
  // NOT bump it on their own account beyond the defensive bump in rollback:
  // both preserve the inFlight-then-pending union exactly, so the merged
  // snapshot is unchanged and React must not be told otherwise.
  let overlayVersion = 0

  let lastSeenBase: ModelStateSnapshot | undefined
  let cachedSnapshot: ModelStateSnapshot | undefined
  let cachedForBase: ModelStateSnapshot | undefined
  let cachedForOverlayVersion = -1

  function overlayIsEmpty(): boolean {
    return (
      pendingShape.size === 0 &&
      inFlightShape.size === 0 &&
      Object.keys(pendingModel).length === 0 &&
      Object.keys(inFlightModel).length === 0
    )
  }

  function notify(): void {
    listeners.forEach((listener) => listener())
  }

  // --- merge -------------------------------------------------------------

  function buildMergedDefinition(
    baseDef: Record<string, unknown> | null,
  ): Record<string, unknown> | null {
    // Returning `baseDef` itself when there is no overlay keeps the common
    // (not-editing) case identical to the unwrapped accessor, references and all.
    if (baseDef === null || overlayIsEmpty()) return baseDef
    let def = baseDef
    // inFlight first, then pending: pending is newer and must win.
    for (const entry of inFlightShape.values()) def = applyShapePatch(def, entry)
    for (const entry of pendingShape.values()) def = applyShapePatch(def, entry)
    const modelPatch = { ...inFlightModel, ...pendingModel }
    if (Object.keys(modelPatch).length > 0) {
      // Model-root keys replace wholesale -- that is how updateModel is already
      // used (GeneratorPatternTab.patchPattern rebuilds the entire
      // `arrivalPatterns` list from the current snapshot before writing it).
      def = { ...def, ...modelPatch }
    }
    return def
  }

  function buildSnapshot(baseSnap: ModelStateSnapshot): ModelStateSnapshot {
    const baseDef = baseSnap.modelDefinition as unknown as Record<string, unknown> | null
    const merged = buildMergedDefinition(baseDef)
    if (merged === baseDef) return baseSnap
    return { ...baseSnap, modelDefinition: merged as unknown as ModelDefinition | null }
  }

  // --- reconciliation ----------------------------------------------------

  /**
   * Retire the inFlight keys the base snapshot now reflects; keep the rest.
   * `pending` is deliberately untouched -- see the module header.
   */
  function reconcile(baseSnap: ModelStateSnapshot): void {
    const baseDef = baseSnap.modelDefinition as unknown as Record<string, unknown> | null
    if (baseDef === null) return
    let changed = false

    for (const [key, entry] of Array.from(inFlightShape.entries())) {
      const current = findShapeEntry(baseDef, entry)
      // No such row yet (e.g. a shape the projection has not caught up to):
      // the base cannot be said to reflect the write, so keep showing it.
      if (current === undefined) continue
      const remaining: Record<string, unknown> = {}
      for (const [field, value] of Object.entries(entry.patch)) {
        if (!valuesEqual(current[field], value)) remaining[field] = value
      }
      const remainingKeys = Object.keys(remaining).length
      if (remainingKeys === Object.keys(entry.patch).length) continue
      changed = true
      if (remainingKeys === 0) inFlightShape.delete(key)
      else inFlightShape.set(key, { shapeId: entry.shapeId, type: entry.type, patch: remaining })
    }

    const remainingModel: Record<string, unknown> = {}
    for (const [field, value] of Object.entries(inFlightModel)) {
      if (!valuesEqual(baseDef[field], value)) remainingModel[field] = value
    }
    if (Object.keys(remainingModel).length !== Object.keys(inFlightModel).length) {
      inFlightModel = remainingModel
      changed = true
    }

    if (changed) overlayVersion++
  }

  /**
   * Pull-based: notice a new base snapshot and reconcile against it. Called
   * from getSnapshot as well as from the base subscription so the overlay stays
   * correct even for a snapshot that arrives without a notification, and even
   * before anything has subscribed.
   */
  function syncBase(): ModelStateSnapshot {
    const baseSnap = base.getSnapshot()
    if (baseSnap !== lastSeenBase) {
      lastSeenBase = baseSnap
      reconcile(baseSnap)
    }
    return baseSnap
  }

  function getSnapshot(): ModelStateSnapshot {
    const baseSnap = syncBase()
    if (
      cachedSnapshot === undefined ||
      cachedForBase !== baseSnap ||
      cachedForOverlayVersion !== overlayVersion
    ) {
      cachedSnapshot = buildSnapshot(baseSnap)
      cachedForBase = baseSnap
      cachedForOverlayVersion = overlayVersion
    }
    return cachedSnapshot
  }

  // Subscribed eagerly rather than ref-counted (the idiom
  // createLucidModelStateAccessor uses) because reconciliation must keep
  // running whether or not React is currently subscribed: an overlay left
  // un-retired would keep masking the host's own later changes. dispose()
  // is the teardown.
  const unsubscribeBase = base.subscribe(() => {
    syncBase()
    // Notify unconditionally: base notifications also carry saveStatus /
    // saveError changes, which are part of the snapshot we hand out.
    notify()
  })

  function subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  // --- writes ------------------------------------------------------------

  function cancelTimer(): void {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  function scheduleFlush(): void {
    // Trailing debounce: each edit resets the clock, which is what collapses a
    // WeightStrip drag from dozens of host rebuilds into one.
    cancelTimer()
    timer = setTimeout(() => {
      timer = null
      void flush().catch(() => {
        // Swallowed deliberately: nobody awaits the timer-driven flush, and an
        // unhandled rejection here would be noise. The failure is already
        // visible -- the base accessor sets saveStatus 'failed' / saveError and
        // notifies, and rollback() keeps the edit in the overlay so it is
        // retried on the next flush rather than lost.
      })
    }, opts.debounceMs)
  }

  function updateShape(
    shapeId: string,
    type: DomainType,
    patch: Record<string, unknown>,
  ): Promise<void> {
    const key = overlayKey(shapeId, type)
    const existing = pendingShape.get(key)
    pendingShape.set(key, { shapeId, type, patch: { ...(existing?.patch ?? {}), ...patch } })
    overlayVersion++
    notify()
    scheduleFlush()
    // Resolves at once: the write has been ACCEPTED, not completed. Callers on
    // this branch use `void accessor.updateShape(...)`; a caller that awaited it
    // expecting durability would now be told "saved" up to debounceMs early.
    // That is the acknowledged cost of debounced autosave (design §7).
    return Promise.resolve()
  }

  function updateModel(patch: Record<string, unknown>): Promise<void> {
    pendingModel = { ...pendingModel, ...patch }
    overlayVersion++
    notify()
    scheduleFlush()
    return Promise.resolve()
  }

  // --- flush -------------------------------------------------------------

  type Batch = { shapes: ShapePatch[]; model: Record<string, unknown> }

  /**
   * Move everything pending into inFlight and return it as the batch to send.
   *
   * THE TIMING HERE IS THE DESIGN, NOT AN IMPLEMENTATION DETAIL -- do not move
   * this call inside the promise chain. It runs SYNCHRONOUSLY at flush() entry,
   * before any await, so the batch is frozen the instant flush() is called.
   * Everything the user types after that moment lands in `pending`, which is the
   * one overlay a base snapshot can never retire (the host cannot be reporting a
   * value it was never sent) and which outranks `inFlight` in the merge.
   *
   * That is what makes the during-a-flush case need no special handling at all:
   * the echo of the OLD write retires only the old inFlight entry, and the newer
   * pending edit -- untouched by reconcile, and merged after it -- is simply
   * still there. Promote later (e.g. inside `flushChain.then(...)`, the shape
   * this naturally wants to take) and the newer edit is swallowed into the same
   * batch instead, so the case silently stops being exercised and the real
   * mid-flight race stops being handled. See the module header.
   */
  function promotePending(): Batch | null {
    const shapes = Array.from(pendingShape.values())
    const model = pendingModel
    if (shapes.length === 0 && Object.keys(model).length === 0) return null

    for (const entry of shapes) {
      const key = overlayKey(entry.shapeId, entry.type)
      const already = inFlightShape.get(key)
      inFlightShape.set(key, {
        shapeId: entry.shapeId,
        type: entry.type,
        patch: { ...(already?.patch ?? {}), ...entry.patch },
      })
    }
    inFlightModel = { ...inFlightModel, ...model }
    pendingShape = new Map()
    pendingModel = {}
    // No overlayVersion bump: the union is byte-for-byte what it was.
    return { shapes, model }
  }

  /**
   * A write failed. Put the whole overlay back in `pending` so the edit stays
   * visible and gets another chance, with any newer pending edit still winning.
   * Retiring inFlight wholesale (rather than just the failed entry) is
   * deliberate: a re-send of an already-accepted patch is idempotent, whereas
   * leaving a never-echoed entry in inFlight risks it being retired by an
   * unrelated snapshot that happens to match.
   */
  function rollback(): void {
    for (const [key, entry] of inFlightShape) {
      const newer = pendingShape.get(key)
      pendingShape.set(key, {
        shapeId: entry.shapeId,
        type: entry.type,
        patch: { ...entry.patch, ...(newer?.patch ?? {}) },
      })
    }
    inFlightShape = new Map()
    pendingModel = { ...inFlightModel, ...pendingModel }
    inFlightModel = {}
    // The union is unchanged, so this bump only guarantees the cache is not
    // reasoning about maps that no longer exist. It costs at most one
    // content-identical rebuild, on a path that already failed.
    overlayVersion++
    // No automatic retry is scheduled here: against a host that keeps
    // rejecting, that would be an unbounded retry loop. The next keystroke, or
    // the flush on close, retries it.
  }

  async function sendBatch(batch: Batch): Promise<void> {
    try {
      // ORDERING INVARIANT: every shape write completes before any model write.
      // The host builds its model-root projection FROM shape storage, so a
      // model write landing first leaves the client's projection missing a link
      // it just created -- which orphans and duplicates arrival patterns.
      for (const entry of batch.shapes) {
        await base.updateShape(entry.shapeId, entry.type, entry.patch)
      }
      if (Object.keys(batch.model).length > 0) {
        await base.updateModel(batch.model)
      }
    } catch (err) {
      rollback()
      throw err
    }
    // Success: inFlight stays in the overlay until a base snapshot echoes it
    // (see reconcile). If an edit arrived while this batch was in flight and no
    // debounce is armed for it, arm one so it is not stranded.
    if (timer === null && (pendingShape.size > 0 || Object.keys(pendingModel).length > 0)) {
      scheduleFlush()
    }
  }

  // Serializes flushes: two batches must never be in flight at once, or the
  // shape-before-model ordering would only hold within each batch. Kept
  // never-rejected so one failure does not poison every later flush.
  let flushChain: Promise<void> = Promise.resolve()

  function flush(): Promise<void> {
    cancelTimer()
    const batch = promotePending()
    // Nothing new to send, but an earlier flush may still be in the air --
    // resolve only once the queue is empty, so "flush on close" means it.
    if (batch === null) return flushChain
    const run = flushChain.then(
      () => sendBatch(batch),
      () => sendBatch(batch),
    )
    flushChain = run.catch(() => undefined)
    return run
  }

  function dispose(): void {
    cancelTimer()
    unsubscribeBase()
    listeners.clear()
  }

  return {
    subscribe,
    getSnapshot,
    updateShape,
    updateModel,
    flush,
    dispose,
  }
}
