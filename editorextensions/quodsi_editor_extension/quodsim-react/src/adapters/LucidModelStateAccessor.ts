// quodsi_lucidchart_package/editorextensions/quodsi_editor_extension/quodsim-react/src/adapters/LucidModelStateAccessor.ts
//
// Bridges Lucid's extension-owned model state to the `ModelStateAccessor`
// contract consumed by quodsi_studio's shared cross-platform panels (the
// generator Pattern editor being the first). This is the FIRST Lucid editor
// migrated onto shared components, so this adapter is the template every
// later Lucid editor is expected to follow -- keep it a thin, honest bridge
// rather than a place that re-implements host logic.
//
// TYPES: quodsi_lucidchart_package is a separate git repo from quodsi_studio
// (no npm workspace / build dependency between them today), so the
// `ModelStateAccessor` contract below is a STRUCTURAL MIRROR of
// `quodsi_studio/src/platforms/shared/types.ts`, not an import of it. If that
// file's contract changes, this one must be updated to match by hand. `unknown`
// stands in for `@quodsi/shared`'s `ModelDefinition` for the same reason --
// this repo has no dependency on that package. Task 21 (wiring the shared
// GeneratorPatternTab into ElementEditor.tsx) is what proves these shapes line
// up at the real call site.
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

/** Cross-platform shape descriptor. Mirrors ShapeInfoLike in quodsi_studio. */
export type ShapeInfoLike = {
  shapeId: string
  name: string
  masterName: string | null
  text: string | null
  is1D: boolean
  quodsiType: string | null
  quodsiData: string | null
}

export type DomainType = 'Activity' | 'Resource' | 'Generator' | 'Entity' | 'Connector'

export type ModelStateSnapshot = {
  // `unknown` stands in for `@quodsi/shared`'s `ModelDefinition` -- see the
  // module doc comment. Consumers that need the concrete shape cast at the
  // call site (Task 21), same as every other ModelStateAccessor host does
  // internally via `as unknown as ModelDefinition`.
  modelDefinition: Record<string, unknown> | null
  saveStatus: 'idle' | 'saving' | 'saved' | 'failed'
  saveError: string | null
  scenariosLoading?: boolean
  scenariosRefreshing?: boolean
}

/** Structural mirror of quodsi_studio/src/platforms/shared/types.ts's ModelStateAccessor. */
export interface ModelStateAccessor {
  subscribe(listener: () => void): () => void
  getSnapshot(): ModelStateSnapshot
  updateShape(shapeId: string, type: DomainType, patch: Record<string, unknown>): Promise<void>
  updateModel(patch: Record<string, unknown>): Promise<void>
  classifyShape?(shape: ShapeInfoLike, type: DomainType): Promise<void>
  getShapeInfo?(shapeId: string): ShapeInfoLike | null
  removeClassification?(shape: ShapeInfoLike): Promise<void>
  runScenario?(scenarioId: string, enableAnimation: boolean, updateModel?: boolean): void
  cancelScenarioRun?(runId: string): Promise<void>
  loadScenarios?(): Promise<void>
  refreshScenarios?(): Promise<void>
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
  saveModel?(patch: Record<string, unknown>): Promise<void>

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

  let saveStatus: ModelStateSnapshot['saveStatus'] = 'idle'
  let saveError: string | null = null

  let lastRawModelDefinition: Record<string, unknown> | null | undefined
  let lastSaveStatus: ModelStateSnapshot['saveStatus'] | undefined
  let lastSaveError: string | null | undefined
  let cachedSnapshot: ModelStateSnapshot | undefined

  function buildSnapshot(raw: Record<string, unknown> | null): ModelStateSnapshot {
    lastRawModelDefinition = raw
    lastSaveStatus = saveStatus
    lastSaveError = saveError
    return { modelDefinition: raw, saveStatus, saveError }
  }

  function getSnapshot(): ModelStateSnapshot {
    const raw = deps.getModelDefinition()
    if (
      cachedSnapshot === undefined ||
      raw !== lastRawModelDefinition ||
      saveStatus !== lastSaveStatus ||
      saveError !== lastSaveError
    ) {
      cachedSnapshot = buildSnapshot(raw)
    }
    return cachedSnapshot
  }

  function notifyListeners(): void {
    listeners.forEach((listener) => listener())
  }

  // Ref-counted subscription to the underlying host: only actually listens
  // to deps.onModelChanged while at least one consumer (React, via
  // useSyncExternalStore) is subscribed, and tears the link down again once
  // the last one unsubscribes -- so a host-level listener never outlives
  // every consumer of this accessor.
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

  async function updateShape(
    shapeId: string,
    type: DomainType,
    patch: Record<string, unknown>,
  ): Promise<void> {
    saveStatus = 'saving'
    saveError = null
    notifyListeners()
    try {
      await deps.save(shapeId, type, patch)
    } catch (err) {
      saveStatus = 'failed'
      saveError = err instanceof Error ? err.message : String(err)
      notifyListeners()
      throw err
    }
    saveStatus = 'saved'
    saveError = null
    notifyListeners()
  }

  async function updateModel(patch: Record<string, unknown>): Promise<void> {
    if (!deps.saveModel) {
      // Loud, not silent: this is the failure mode Task 18 fixed elsewhere
      // (a patch that vanishes with no error and no warning). Until the
      // host wires deps.saveModel, a model-level write (e.g. the Pattern
      // editor's `{ arrivalPatterns }`) surfaces as a visible 'failed'
      // saveStatus and a rejected promise rather than doing nothing.
      saveStatus = 'failed'
      saveError =
        'LucidModelStateAccessor.updateModel: no saveModel dependency configured -- ' +
        'this model-level patch was NOT persisted'
      notifyListeners()
      throw new Error(saveError)
    }
    saveStatus = 'saving'
    saveError = null
    notifyListeners()
    try {
      // Forwarded verbatim -- see the module doc comment ("bug #1") for why
      // this must never branch on individual patch keys.
      await deps.saveModel(patch)
    } catch (err) {
      saveStatus = 'failed'
      saveError = err instanceof Error ? err.message : String(err)
      notifyListeners()
      throw err
    }
    saveStatus = 'saved'
    saveError = null
    notifyListeners()
  }

  const accessor: ModelStateAccessor = {
    subscribe,
    getSnapshot,
    updateShape,
    updateModel,
  }

  // Optional members: only attached when the host actually supports the
  // capability, matching the posture every existing ModelStateAccessor host
  // already takes for its own optional members (e.g. Visio's ModelManager
  // omits runScenario/cancelScenarioRun/loadScenarios/refreshScenarios
  // entirely rather than defining them as no-ops). Attaching a fake here
  // that quietly does nothing would be exactly the silent-no-op failure
  // mode this task is guarding against -- omitting the property lets
  // `accessor.classifyShape?.(...)` at call sites correctly treat the
  // capability as absent.
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
