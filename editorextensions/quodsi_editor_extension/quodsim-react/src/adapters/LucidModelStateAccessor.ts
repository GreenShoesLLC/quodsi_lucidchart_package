// quodsi_lucidchart_package/editorextensions/quodsi_editor_extension/quodsim-react/src/adapters/LucidModelStateAccessor.ts
//
// Bridges Lucid's extension-owned model state to the `ModelStateAccessor`
// contract consumed by quodsi_studio's shared cross-platform panels (the
// generator Pattern editor being the first). This is the FIRST Lucid editor
// migrated onto shared components, so this adapter is the template every
// later Lucid editor is expected to follow -- keep it a thin, honest bridge
// rather than a place that re-implements host logic.
//
// TYPES: this package now depends on quodsi_studio via a file: reference, so
// the ModelStateAccessor contract is IMPORTED rather than mirrored by hand.
// The hand-written mirror this file carried until 2026-08-18 was verified to
// match the real contract before deletion.
//
// ARCHITECTURE: `createLucidModelStateAccessor(deps)` takes a small
// dependency-injection surface (`getModelDefinition`, `onModelChanged`,
// `save`, plus optional `saveModel` / classification hooks) rather than
// reaching into Redux or the message router directly. The caller (Task 21)
// is responsible for supplying `deps` backed by whatever currently holds the
// authoritative model definition -- see the "What Lucid-side state this
// wraps" note in the task report for the investigation behind that choice.
// Keeping the seam as plain functions (not a Redux/message-router coupling)
// is what makes this file unit-testable with a fake `deps` and reusable by
// every future Lucid editor without dragging its consumers into Redux.
//
// THE TWO BUGS THIS SHAPE IS DESIGNED NOT TO REPEAT (Task 18 fixed both in
// the other two ModelStateAccessor hosts):
//   1. LucidEmbedModelAccessor.updateModel used to branch ONLY on
//      `patch.scenarios`, so an `{ arrivalPatterns }` patch was silently
//      dropped -- no error, no warning, just gone.
//   2. Visio's ModelManager and drawio's DrawioModelManager used to mirror
//      every model-level patch key into a nested `def.model` sub-object,
//      leaving a stray, never-read copy that still got persisted.
// This adapter avoids both BY CONSTRUCTION: `updateModel` forwards the WHOLE
// patch to `deps.saveModel` verbatim -- no per-field branching (fixes #1) --
// and it does not own or reconstruct the model definition at all, so there
// is no nested mirror to leave stale (fixes #2). The real "does it reach
// storage" guarantee still depends on Task 21 wiring `deps.saveModel` to the
// extension's actual persistence path; see updateModel's own comment.

import type {
  ShapeInfoLike,
  DomainType,
  ModelStateSnapshot,
  ModelStateAccessor,
} from 'quodsi_studio/platforms/shared'
import { createModelUnavailable } from 'quodsi_studio/platforms/shared'
import {
  createShapeUnavailable,
  deleteShapeUnavailable,
  moveShapeUnavailable,
} from 'quodsi_studio/platforms/shared'
import type { ModelDefinition } from '@quodsi/shared'
import type { ReferenceCleanupOptions } from '@quodsi/lucid-shared'

export type { ShapeInfoLike, DomainType, ModelStateSnapshot, ModelStateAccessor }

/**
 * A batching model-root source's own save status (spec 2026-09-12
 * lucid-model-root-batching §1): `saving` while anything is pending or in
 * flight, then `saved`, or `failed` with the host's message.
 */
export type ModelWriteStatus = {
  status: 'idle' | 'saving' | 'saved' | 'failed'
  error: string | null
}

/**
 * Dependencies this adapter needs from whatever Lucid-side host wires it up.
 * Deliberately small and duck-typed -- no Redux, no message-router types --
 * so this module stays testable with a plain fake and so the same factory
 * can be reused verbatim by a future host with a different wiring strategy.
 */
export interface LucidModelStateAccessorDeps {
  /**
   * Read the CURRENT model definition. Called by getSnapshot on every
   * invocation (React's useSyncExternalStore calls getSnapshot on every
   * render), so this must be cheap and must return the SAME reference
   * between real changes -- getSnapshot's own cache relies on that to avoid
   * rebuilding (and returning a fresh object) when nothing changed.
   */
  getModelDefinition(): Record<string, unknown> | null

  /**
   * Subscribe to "the model definition may have changed" notifications from
   * the underlying host. Returns an unsubscribe function.
   */
  onModelChanged(listener: () => void): () => void

  /** Persist a shape-scoped patch: (shapeId, domain type, partial fields). */
  save(shapeId: string, type: DomainType, patch: Record<string, unknown>): Promise<void>

  /**
   * Persist a model-ROOT patch (e.g. `{ arrivalPatterns }`, `{ levers }`).
   * Optional only because a host wiring this up mid-migration may not have
   * a model-level write path yet -- see updateModel's own comment for what
   * happens when it's absent. Once wired, the FULL patch must be forwarded
   * to storage verbatim; do not branch on individual keys here or in the
   * dep's own implementation (that is exactly bug #1 above).
   */
  // options is a delete dialog's Seize/Release choice; forward it only when present.
  saveModel?(patch: Record<string, unknown>, options?: ReferenceCleanupOptions): Promise<void>

  /**
   * Send every pending or in-flight model-root batch now and wait for the
   * host. Present when saveModel batches (it then resolves once the edit is
   * accepted). Exposed on the accessor as flushModelImmediate.
   */
  flushModel?(): Promise<void>

  /**
   * The batching source's save status. When supplied it replaces the
   * per-call status updateModel would otherwise set; changes are notified
   * through onModelChanged.
   */
  getModelWriteStatus?(): ModelWriteStatus

  /** Look up cached shape info by id (e.g. for an unclassified-shape picker). */
  getShapeInfo?(shapeId: string): ShapeInfoLike | null

  /** Classify a previously-unclassified shape as a domain type. */
  classifyShape?(shape: ShapeInfoLike, type: DomainType): Promise<void>

  /** Remove an existing classification. */
  removeClassification?(shape: ShapeInfoLike): Promise<void>
}

/**
 * Build a `ModelStateAccessor` backed by `deps`.
 *
 * getSnapshot caching: React's useSyncExternalStore calls getSnapshot on
 * EVERY render and throws ("The result of getSnapshot should be cached") if
 * two calls with no intervening change return different references. This
 * accessor caches the built snapshot and only rebuilds it when either the
 * raw model definition reference OR the save status/error actually changed
 * since the last getSnapshot() call -- a pull-based check performed inside
 * getSnapshot itself, not a push rebuild on notify. That means the cache
 * stays correct even if getSnapshot is called before any subscribe(), and
 * even when the change originates from this accessor's own updateShape/
 * updateModel (saveStatus flipping to 'saving'/'saved'/'failed') rather than
 * from deps.onModelChanged.
 */
export function createLucidModelStateAccessor(deps: LucidModelStateAccessorDeps): ModelStateAccessor {
  const listeners = new Set<() => void>()
  let depsUnsubscribe: (() => void) | null = null

  // This accessor's OWN writes: every updateShape, and updateModel when the
  // deps have no batching source (no getModelWriteStatus).
  let ownStatus: ModelStateSnapshot['saveStatus'] = 'idle'
  let ownError: string | null = null
  let ownBusy = 0

  // With a batching source, the snapshot shows whichever outcome settled
  // last. Ticks order the two: own settles are stamped when they happen,
  // source settles when getSnapshot first sees them.
  let tick = 0
  let ownSettledTick = 0
  let modelSettledTick = 0
  let lastModelWrite: ModelWriteStatus | undefined

  let lastRawModelDefinition: Record<string, unknown> | null | undefined
  let lastSaveStatus: ModelStateSnapshot['saveStatus'] | undefined
  let lastSaveError: string | null | undefined
  let cachedSnapshot: ModelStateSnapshot | undefined

  function errorMessage(err: unknown): string {
    return err instanceof Error ? err.message : String(err)
  }

  function currentSaveState(): { saveStatus: ModelStateSnapshot['saveStatus']; saveError: string | null } {
    const model = deps.getModelWriteStatus?.()
    if (!model) return { saveStatus: ownStatus, saveError: ownError }
    if (model !== lastModelWrite) {
      const firstLook = lastModelWrite === undefined
      lastModelWrite = model
      if (!firstLook && model.status !== 'saving') modelSettledTick = ++tick
    }
    if (ownBusy > 0 || model.status === 'saving') return { saveStatus: 'saving', saveError: null }
    if (ownSettledTick > modelSettledTick) return { saveStatus: ownStatus, saveError: ownError }
    return { saveStatus: model.status, saveError: model.error }
  }

  function getSnapshot(): ModelStateSnapshot {
    const raw = deps.getModelDefinition()
    const { saveStatus, saveError } = currentSaveState()
    if (
      cachedSnapshot === undefined ||
      raw !== lastRawModelDefinition ||
      saveStatus !== lastSaveStatus ||
      saveError !== lastSaveError
    ) {
      lastRawModelDefinition = raw
      lastSaveStatus = saveStatus
      lastSaveError = saveError
      // The contract types modelDefinition as `ModelDefinition | null`; every
      // deps implementation hands JSON-shaped data from another realm, so the
      // cast happens at this one site (as in every other host).
      cachedSnapshot = { modelDefinition: raw as unknown as ModelDefinition, saveStatus, saveError }
    }
    return cachedSnapshot
  }

  function notifyListeners(): void {
    listeners.forEach((listener) => listener())
  }

  // Ref-counted subscription to the underlying host: only listens while at
  // least one consumer is subscribed.
  function subscribe(listener: () => void): () => void {
    listeners.add(listener)
    if (listeners.size === 1) {
      depsUnsubscribe = deps.onModelChanged(notifyListeners)
    }
    return () => {
      listeners.delete(listener)
      if (listeners.size === 0 && depsUnsubscribe) {
        depsUnsubscribe()
        depsUnsubscribe = null
      }
    }
  }

  function startOwnWrite(): void {
    ownBusy++
    ownStatus = 'saving'
    ownError = null
    notifyListeners()
  }

  function recordOwnOutcome(err?: unknown): void {
    ownStatus = err === undefined ? 'saved' : 'failed'
    ownError = err === undefined ? null : errorMessage(err)
    ownSettledTick = ++tick
    notifyListeners()
  }

  function finishOwnWrite(err?: unknown): void {
    ownBusy = Math.max(0, ownBusy - 1)
    recordOwnOutcome(err)
  }

  async function updateShape(
    shapeId: string,
    type: DomainType,
    patch: Record<string, unknown>,
  ): Promise<void> {
    startOwnWrite()
    try {
      await deps.save(shapeId, type, patch)
    } catch (err) {
      finishOwnWrite(err)
      throw err
    }
    finishOwnWrite()
  }

  async function updateModel(patch: Record<string, unknown>, options?: ReferenceCleanupOptions): Promise<void> {
    if (!deps.saveModel) {
      // Loud, not silent: a model-level write with no persistence path
      // surfaces as 'failed' and a rejection rather than doing nothing.
      const message =
        'LucidModelStateAccessor.updateModel: no saveModel dependency configured -- ' +
        'this model-level patch was NOT persisted'
      recordOwnOutcome(new Error(message))
      throw new Error(message)
    }
    const saveModel = deps.saveModel
    // Forwarded verbatim -- see the module doc comment ("bug #1"). Options
    // travel only when the caller passed them.
    const write = () => (options ? saveModel(patch, options) : saveModel(patch))

    if (deps.getModelWriteStatus) {
      // The batching source reports this write's progress itself (it resolves
      // once the edit is accepted). Only a refusal it throws straight back --
      // the model not loaded yet, or an options write the host refused -- is
      // recorded here.
      try {
        await write()
      } catch (err) {
        recordOwnOutcome(err)
        throw err
      }
      return
    }

    startOwnWrite()
    try {
      await write()
    } catch (err) {
      finishOwnWrite(err)
      throw err
    }
    finishOwnWrite()
  }

  const accessor: ModelStateAccessor = {
    subscribe,
    getSnapshot,
    updateShape,
    updateModel,
    // The Advisor's generate-model arm needs a drawing half (a new page the
    // host renders a document onto). Lucid has none yet: the shared
    // rejection tells the card so, instead of a silent no-op.
    createModel: createModelUnavailable,
    // Shape ops (arm 1b) need a drawing half too. Lucid has none yet, so
    // reject the same shared way.
    createShape: createShapeUnavailable,
    deleteShape: deleteShapeUnavailable,
    moveShape: moveShapeUnavailable,
  }

  // Durability on demand for a batching source (spec 2026-09-12
  // lucid-model-root-batching): absent otherwise, so callers' `?.()` treat it
  // as "nothing to wait for".
  if (deps.flushModel) {
    const flushModel = deps.flushModel
    accessor.flushModelImmediate = () => flushModel()
  }

  // Optional members: only attached when the host actually supports the
  // capability -- omitting the property lets `accessor.classifyShape?.(...)`
  // correctly treat the capability as absent.
  if (deps.getShapeInfo) {
    const getShapeInfo = deps.getShapeInfo
    accessor.getShapeInfo = (shapeId: string) => getShapeInfo(shapeId)
  }
  if (deps.classifyShape) {
    const classifyShape = deps.classifyShape
    accessor.classifyShape = (shape: ShapeInfoLike, type: DomainType) => classifyShape(shape, type)
  }
  if (deps.removeClassification) {
    const removeClassification = deps.removeClassification
    accessor.removeClassification = (shape: ShapeInfoLike) => removeClassification(shape)
  }

  // runScenario / cancelScenarioRun / loadScenarios / refreshScenarios are
  // deliberately NOT implemented here. In today's Lucid extension, running a
  // scenario and polling its status are handled entirely outside the
  // ModelStateAccessor contract (useSimulationSender /
  // useModelOpsSender.requestSimulation, wired directly in useModelPanel),
  // not through this accessor. This mirrors Visio's ModelManager, which
  // omits the same four members for the same reason: those methods exist on
  // the interface for the Lucid EMBED host (the iframe-in-Studio surface,
  // which has its own DB-backed scenario list to sync), not for every host.
  // If a later task moves Lucid's own run/poll flow onto this accessor,
  // implement them here for real rather than stubbing -- do not add empty
  // bodies just to satisfy the interface shape.

  return accessor
}
