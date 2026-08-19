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
// flight lands in `pending`, so the older echo retires the older inFlight entry
// and the newer pending value survives it. That is the mid-flight case the
// design flagged as the subtle one, and the split above is the whole of its
// handling -- see promotePending for what the flush timing does and does not
// contribute to it.
//
// Value-equality reconciliation has one benign quirk: if the user edits a field
// back to the value the base already holds, the inFlight entry retires on the
// next snapshot rather than on its own echo. Harmless -- the base already
// displays the value the user asked for.
//
// ------------------------------------------------------------------------
// WHY inFlight IS BOUNDED (and why the comparator is NOT loosened)
// ------------------------------------------------------------------------
// Exact structural equality is the right test -- anything looser starts
// guessing that a write committed when it did not. But on its own it assumes
// the host echoes back what it was sent, and THIS host does not always:
// `ModelDefinitionPageBuilder.loadArrivalPatterns` rebuilds every pattern
// through `new ArrivalPattern(...)`, forces `seasonMode = SeasonMode.WEEK`
// BEFORE applying the serialized value, rehydrates `withinHourOffset` via
// `UnitlessSample.fromJSON(...)`, and echoes `toJSON()`. Because `updateModel`
// writes `arrivalPatterns` WHOLESALE and `valuesEqual` compares key counts, a
// single default-filled key anywhere in that array breaks equality for the
// whole entry -- and a NEWLY CREATED pattern, the exact flow this modal exists
// for, is the likeliest to hit it.
//
// Unbounded, such an entry would mask the base for the life of the accessor:
// the panel would show its own `arrivalPatterns` forever and never see
// host-originated changes -- INCLUDING the orphaned-pattern cleanup in
// `ModelManager` -- which is the orphan/duplicate failure class this branch has
// already paid for twice, arriving from the other direction.
//
// So each entry is bounded: once a write has been ACKNOWLEDGED by the base
// accessor, the entry survives at most `maxSnapshotsAfterAck` further base
// snapshots and is then dropped, matched or not. After an ack the host is
// authoritative, and a client overlay that outlives it is strictly worse than
// a one-frame flicker.
//
// The clock starts at the ACK, never at promotion: a bound that started at
// promotion could discard an edit still legitimately in flight to a slow host.
// An unacked entry never expires, however many snapshots arrive.
//
// The bound counts HOST MODEL CHANGES rather than milliseconds on purpose. The
// harm being prevented is "the overlay masks host-originated changes", so
// counting those changes measures the harm directly. A time bound is a proxy
// that could let many changes be masked inside one window, or expire an entry
// during a quiet period when it was masking nothing at all.
//
// "Host model change" means specifically a base snapshot whose modelDefinition
// differs from the last one -- NOT merely a new base snapshot object. The base
// accessor also rebuilds its snapshot on saveStatus transitions, twice per
// write, so counting snapshot identities would let one unrelated write spend
// the whole allowance without the host's model moving at all. syncBase is where
// that gate lives.
//
// N = 2 (one change of grace) is deliberately small, and small is affordable
// precisely BECAUSE of that gate: each tick is now a real host model change, of
// which there are very few while a user types. The grace exists for one case --
// a genuine host change (another editor, a canvas edit) landing between our ack
// and our echo, which must not be allowed to drop the overlay and flicker the
// user's value back. N = 1 would sacrifice exactly that, which the stale-
// snapshot test pins, to save one masked change; N > 2 buys nothing but more
// masking on the divergent-echo path.

import type {
  ModelStateAccessor,
  ModelStateSnapshot,
  DomainType,
} from 'quodsi_studio/platforms/shared'
import type { ModelDefinition } from '@quodsi/shared'

type ShapePatch = { shapeId: string; type: DomainType; patch: Record<string, unknown> }

/**
 * An inFlight shape entry: the patch plus the base-snapshot sequence number at
 * which the base accessor acknowledged it. `null` means "not acked yet", which
 * is what makes the entry immune to the bound.
 */
type InFlightShapeEntry = ShapePatch & { ackedAtSeq: number | null }

export type BufferingAccessor = ModelStateAccessor & {
  /**
   * Write everything buffered right now, bypassing the debounce. Resolves when
   * the base accessor has accepted it (or rejects with the base's error).
   * Call this on modal close: without it, a user who types and immediately
   * closes loses the edit.
   */
  flush(): Promise<void>
  /**
   * Final fire-and-forget flush, then detach from the base accessor and stop
   * all timers. Safe to call on unmount without a preceding flush() -- see the
   * function's own comment for why it flushes rather than discarding.
   */
  dispose(): void
}

export type BufferingAccessorOptions = {
  /** Trailing debounce for host writes, in milliseconds. */
  debounceMs: number
  /**
   * How many base snapshots an ACKNOWLEDGED inFlight entry may survive before
   * it is dropped whether or not the host echoed it back. Default 2, which
   * gives exactly one snapshot of grace: an entry survives a stale snapshot
   * arriving between its ack and its echo, and is dropped on the next one.
   * See the "WHY inFlight IS BOUNDED" note above.
   */
  maxSnapshotsAfterAck?: number
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

const DEFAULT_MAX_SNAPSHOTS_AFTER_ACK = 2

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
  opts: BufferingAccessorOptions,
): BufferingAccessor {
  const maxSnapshotsAfterAck = opts.maxSnapshotsAfterAck ?? DEFAULT_MAX_SNAPSHOTS_AFTER_ACK

  // `pending` holds edits not yet sent. `inFlight` holds edits handed to the base
  // accessor but not yet echoed back in a base snapshot -- they must stay visible
  // or the value flickers back to its old state for a whole round trip.
  let pendingShape = new Map<string, ShapePatch>()
  let pendingModel: Record<string, unknown> = {}
  let inFlightShape = new Map<string, InFlightShapeEntry>()
  let inFlightModel: Record<string, unknown> = {}
  // The model overlay is a flat record, so one ack stamp covers all of it.
  let inFlightModelAckedAtSeq: number | null = null

  const listeners = new Set<() => void>()
  let timer: ReturnType<typeof setTimeout> | null = null
  let disposed = false

  // Counts base snapshots whose MODEL DEFINITION actually changed -- see
  // syncBase for why snapshot identity is the wrong event to count. The unit the
  // inFlight bound is denominated in.
  let baseSnapshotSeq = 0

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
   * Retire the inFlight keys the base snapshot now reflects, then drop whatever
   * has outlived the post-ack bound. `pending` is deliberately untouched by
   * both passes -- see the module header.
   */
  function reconcile(baseSnap: ModelStateSnapshot): void {
    const baseDef = baseSnap.modelDefinition as unknown as Record<string, unknown> | null
    if (baseDef === null) return
    let changed = false

    for (const [key, entry] of Array.from(inFlightShape.entries())) {
      // PASS 1: retire what the base demonstrably reflects.
      const current = findShapeEntry(baseDef, entry)
      // No such row yet (e.g. a shape the projection has not caught up to):
      // the base cannot be said to reflect the write, so keep showing it.
      if (current !== undefined) {
        const remaining: Record<string, unknown> = {}
        for (const [field, value] of Object.entries(entry.patch)) {
          if (!valuesEqual(current[field], value)) remaining[field] = value
        }
        const remainingKeys = Object.keys(remaining).length
        if (remainingKeys !== Object.keys(entry.patch).length) {
          changed = true
          if (remainingKeys === 0) {
            inFlightShape.delete(key)
            continue
          }
          // Keep the ack stamp across a partial retire: the bound is a property
          // of the WRITE, not of whichever keys have echoed back so far.
          inFlightShape.set(key, { ...entry, patch: remaining })
        }
      }
      // PASS 2: give up on what the host acked but never echoed back in a
      // recognisable form. Unacked entries (ackedAtSeq === null) are exempt.
      const survivor = inFlightShape.get(key)
      if (
        survivor !== undefined &&
        survivor.ackedAtSeq !== null &&
        baseSnapshotSeq - survivor.ackedAtSeq >= maxSnapshotsAfterAck
      ) {
        inFlightShape.delete(key)
        changed = true
      }
    }

    const remainingModel: Record<string, unknown> = {}
    for (const [field, value] of Object.entries(inFlightModel)) {
      if (!valuesEqual(baseDef[field], value)) remainingModel[field] = value
    }
    if (Object.keys(remainingModel).length !== Object.keys(inFlightModel).length) {
      inFlightModel = remainingModel
      changed = true
    }
    if (
      Object.keys(inFlightModel).length > 0 &&
      inFlightModelAckedAtSeq !== null &&
      baseSnapshotSeq - inFlightModelAckedAtSeq >= maxSnapshotsAfterAck
    ) {
      inFlightModel = {}
      changed = true
    }
    if (Object.keys(inFlightModel).length === 0) inFlightModelAckedAtSeq = null

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
    if (baseSnap === lastSeenBase) return baseSnap
    const previousDef = lastSeenBase?.modelDefinition
    lastSeenBase = baseSnap
    // GATED ON THE MODEL DEFINITION, NOT THE SNAPSHOT OBJECT. The base accessor
    // rebuilds its snapshot on every saveStatus/saveError transition as well as
    // on a model change (LucidModelStateAccessor getSnapshot's cache compares
    // all three), and each write notifies twice -- 'saving' then 'saved'. So a
    // single unrelated write changes the snapshot identity twice with the host's
    // model untouched, which on an identity-counted bound would burn the entire
    // default allowance and revert an acked-but-unechoed overlay for no reason.
    // Counting model changes is also what the "WHY inFlight IS BOUNDED" note
    // above actually claims this counter measures.
    if (baseSnap.modelDefinition === previousDef) return baseSnap
    baseSnapshotSeq++
    reconcile(baseSnap)
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

  // Observe the base's CURRENT snapshot at construction, so `baseSnapshotSeq`
  // starts at 1 and counts genuine arrivals from there. Without this the very
  // first getSnapshot() would spend one of the bound's allowance on a snapshot
  // that predates every write this accessor will ever make.
  syncBase()

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
    // Nothing may be armed after teardown: a timer that outlived dispose()
    // would write through the base accessor after the consumer has gone.
    if (disposed) return
    // Trailing debounce: each edit resets the clock, which is what collapses a
    // WeightStrip drag from dozens of host rebuilds into one.
    cancelTimer()
    timer = setTimeout(() => {
      timer = null
      void flush().catch(() => {
        // Swallowed deliberately: nobody awaits the timer-driven flush, and an
        // unhandled rejection here would be noise. The failure is already
        // visible -- the base accessor sets saveStatus 'failed' / saveError and
        // notifies, rollback() keeps the edit in the overlay so it is retried
        // on the next flush rather than lost, and flush() itself reports it to
        // the next caller (see `lastFlushError`).
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
   * Runs SYNCHRONOUSLY at flush() entry, before any await, so the batch is
   * frozen the instant flush() is called.
   *
   * WHAT THAT BUYS: the null-vs-batch decision is available AT CALL TIME, and
   * that decision is the sole input to flush()'s drain-and-report branch. Defer
   * the promote into the queued send and every flush() call looks like it has
   * work to do, queues an empty send, and resolves cheerfully -- so a close-path
   * caller can never be told that the last write failed. (Mutation-tested: a
   * deferred promote breaks the close-path failure test and nothing else.
   * Double-promotion is NOT the reason -- promotion under deferral would run
   * inside `flushQueue`, which is strictly serialized, so a second promote
   * necessarily finds `pending` empty. An earlier draft of this comment claimed
   * otherwise and was wrong.)
   *
   * WHAT IT DOES NOT BUY: it is not what makes the during-a-flush case work --
   * an even earlier draft claimed that, and it is also wrong. That case is
   * carried entirely by the pending/inFlight split: an edit typed after this
   * point lands in `pending`, the one overlay a base snapshot can never retire
   * (the host cannot be reporting a value it was never sent), and `pending`
   * outranks `inFlight` in the merge -- so the echo of the OLD write retires
   * only the old entry and the newer value is simply still there.
   *
   * KEEP IT SYNCHRONOUS ANYWAY, AND FOR THIS REASON TOO: under a deferred
   * promote the mid-flight TEST still passes while no longer exercising the
   * mid-flight SCENARIO at all. The later edit gets swallowed into the same
   * batch, so there is never an older write in flight underneath a newer
   * pending value -- the test goes green by a different route and silently
   * stops covering anything. A test that keeps passing while covering nothing
   * is worse than one that fails.
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
        // Un-acks the merged entry: it now carries keys the host has not seen,
        // so the bound must not expire it until THIS batch is acknowledged.
        ackedAtSeq: null,
      })
    }
    if (Object.keys(model).length > 0) {
      inFlightModel = { ...inFlightModel, ...model }
      inFlightModelAckedAtSeq = null
    }
    pendingShape = new Map()
    pendingModel = {}
    // No overlayVersion bump: the union is byte-for-byte what it was.
    return { shapes, model }
  }

  /**
   * The base accepted this batch. Stamp the entries it covered with the current
   * snapshot sequence, starting their bound. Entries acked by an EARLIER batch
   * keep their older stamp, so an unrelated later write cannot extend how long
   * a divergent entry gets to mask the base.
   */
  function markBatchAcked(batch: Batch): void {
    for (const entry of batch.shapes) {
      const key = overlayKey(entry.shapeId, entry.type)
      const current = inFlightShape.get(key)
      if (current !== undefined && current.ackedAtSeq === null) {
        inFlightShape.set(key, { ...current, ackedAtSeq: baseSnapshotSeq })
      }
    }
    if (Object.keys(batch.model).length > 0 && inFlightModelAckedAtSeq === null) {
      inFlightModelAckedAtSeq = baseSnapshotSeq
    }
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
    inFlightModelAckedAtSeq = null
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
      // model write landing before its shape write leaves the client's
      // projection missing a link it just created -- which orphans and
      // duplicates arrival patterns.
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
    // Success. The overlay stays until a base snapshot echoes it (see
    // reconcile) -- but the bound's clock starts HERE, now that the host has
    // definitively received it.
    markBatchAcked(batch)
    // If an edit arrived while this batch was in flight and no debounce is
    // armed for it, arm one so it is not stranded. No-op once disposed.
    if (timer === null && (pendingShape.size > 0 || Object.keys(pendingModel).length > 0)) {
      scheduleFlush()
    }
  }

  // Serializes flushes: two batches must never be in flight at once, or the
  // shape-before-model invariant would hold only WITHIN each batch and two
  // concurrent batches could interleave. `flushQueue` is kept never-rejected so
  // one failure does not poison every later flush; `lastFlushError` carries the
  // outcome instead, so a caller with nothing of its own to send can still be
  // told the truth.
  let flushQueue: Promise<void> = Promise.resolve()
  let lastFlushError: unknown = null

  function flush(): Promise<void> {
    cancelTimer()
    const batch = promotePending()
    if (batch === null) {
      // Nothing new to send, but an earlier flush may still be in the air.
      // Resolve only once the queue drains -- and then REPORT that flush's
      // failure rather than resolving cheerfully, so a close-path caller can
      // tell "everything is written" from "the last write failed".
      return flushQueue.then(() => {
        if (lastFlushError !== null) throw lastFlushError
      })
    }
    const run = flushQueue.then(
      () => sendBatch(batch),
      () => sendBatch(batch),
    )
    flushQueue = run.then(
      () => {
        // Clear only when the buffer is genuinely empty. A batch promoted BEFORE
        // an earlier batch failed still succeeds on its own terms, but the
        // failed batch's edit has been rolled back into `pending` and is unsent
        // -- so "a later write worked" is not "everything is written", and the
        // close path must not be told that it is.
        if (pendingShape.size === 0 && Object.keys(pendingModel).length === 0) {
          lastFlushError = null
        }
      },
      (err: unknown) => {
        lastFlushError = err
      },
    )
    return run
  }

  /**
   * Tear down -- but flush first.
   *
   * The alternative (detach and drop whatever is buffered) makes "clean up" mean
   * "silently discard the user's work", which is precisely the failure the
   * debounce introduces and the design called out: a user who types and
   * immediately closes must not lose the edit. A consumer that wires ONLY
   * dispose() on unmount is the likeliest wiring, so the safe behaviour belongs
   * in the default rather than in a convention every caller has to remember.
   *
   * The final flush is fire-and-forget: at unmount there is no longer anyone to
   * show an error to. A caller that needs to KNOW the write landed should
   * `await flush()` first and then dispose() -- that flush reports the outcome,
   * and dispose()'s own is then a cheap no-op that just drains the queue.
   */
  function dispose(): void {
    if (disposed) return
    cancelTimer()
    void flush().catch(() => {
      // Nobody left to tell; rollback has already kept the edit in the overlay,
      // which is itself about to be discarded along with this accessor.
    })
    disposed = true
    unsubscribeBase()
    listeners.clear()
  }

  return {
    // Spread FIRST so every optional member the base implements -- classifyShape,
    // getShapeInfo, removeClassification, runScenario, cancelScenarioRun,
    // loadScenarios, refreshScenarios -- passes through. They are all optional on
    // the contract, so omitting them typechecks cleanly and turns every caller's
    // `accessor.classifyShape?.(...)` into a silent no-op: a trap that costs
    // nothing today (GeneratorPatternTab touches only the four core methods) and
    // bites the moment this wrapper is used higher up.
    //
    // Spread rather than delegation because the base is
    // createLucidModelStateAccessor's object literal of closures, so the copied
    // references stay bound. A class-instance base with methods on its prototype
    // would need explicit delegation instead.
    ...base,
    subscribe,
    getSnapshot,
    updateShape,
    updateModel,
    flush,
    dispose,
  }
}
