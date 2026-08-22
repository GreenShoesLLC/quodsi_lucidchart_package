import {
  Model,
  Duration,
  PeriodUnit,
  SimulationTimeType,
} from "@quodsi/lucid-shared";

/**
 * Input type for model data - accepts various formats
 */
export type ModelInput = Model | { data: Partial<Model> } | Partial<Model>;

/**
 * Extracts and normalizes model data from props into a clean Model instance.
 *
 * Wire-cleanup Phase B2 Task 4/10: the 8-field run-config
 * (`reps`/`simulationTimeType`/`oneClockUnit`/`warmupClockPeriod(+Unit)`/
 * `runClockPeriod(+Unit)`) collapsed to `replications`/`timeUnit`/
 * `timeMode`/`warmupTime: Duration`/`runTime: Duration` on the `Model`
 * class. `mod` here is always an already-hydrated `Model` domain object
 * (built by `ModelLucid.createSimObject()`, which reads the live/upgraded
 * storage shape) or its JSON round-trip through Redux/messaging — both
 * already carry the flat clean field names, so no old-name fallback is
 * needed at this layer.
 *
 * This handles multiple data formats:
 * - Full Model instances
 * - Raw data objects with nested .data property
 * - Missing/null values (creates default model with safe defaults)
 *
 * @param mod - Model data in various formats
 * @returns Normalized Model instance with all properties initialized
 */
export const extractModelData = (mod: ModelInput): Model => {
  const data = (mod as any).data || mod;

  const model = new Model(
    data.id || "",
    data.name || "New Model",
    data.replications || 1,
    data.seed || 0,
    data.timeUnit || PeriodUnit.HOURS,
    data.timeMode || SimulationTimeType.Clock,
    data.warmupTime ?? Duration.constant(0, PeriodUnit.HOURS),
    data.runTime ?? Duration.constant(0, PeriodUnit.HOURS),
    data.warmupDateTime || null,
    data.startDateTime || null,
    data.finishDateTime || null
  );

  model.description = data.description || "";
  model.levers = data.levers ?? [];
  model.scenarios = data.scenarios;

  return model;
};

/**
 * Creates a new Model instance with updated values while preserving immutability.
 *
 * This helper ensures that Model updates trigger React re-renders by creating
 * new object references. It handles partial updates, filling in missing values
 * from the base Model. Rebuilds via the constructor (not a `{...base, ...updates}`
 * spread) so the returned value is a real `Model` instance — `toJSON` lives on
 * the class prototype, so a plain-object spread would silently drop it.
 *
 * @param base - The base Model to update
 * @param updates - Partial object containing fields to update
 * @returns New Model instance with updated values
 *
 * @example
 * const updated = updateModelImmutably(model, { name: "New Model Name", replications: 10 });
 */
export const updateModelImmutably = (
  base: Model,
  updates: Partial<Model>
): Model => {
  const updated = new Model(
    updates.id ?? base.id,
    updates.name ?? base.name,
    updates.replications ?? base.replications,
    updates.seed ?? base.seed,
    updates.timeUnit ?? base.timeUnit,
    updates.timeMode ?? base.timeMode,
    updates.warmupTime ?? base.warmupTime,
    updates.runTime ?? base.runTime,
    "warmupDateTime" in updates ? updates.warmupDateTime ?? null : base.warmupDateTime,
    "startDateTime" in updates ? updates.startDateTime ?? null : base.startDateTime,
    "finishDateTime" in updates ? updates.finishDateTime ?? null : base.finishDateTime
  );

  updated.description = updates.description ?? base.description;
  updated.levers = updates.levers ?? base.levers;
  updated.scenarios = updates.scenarios ?? base.scenarios;

  return updated;
};
