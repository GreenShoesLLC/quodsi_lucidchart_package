import { ElementProxy, PageProxy } from 'lucid-extension-sdk';
import {
    Model,
    Duration,
    SimulationObjectType,
    PeriodUnit,
    SimulationTimeType,
    PlatformMetadata,
    PlatformType,
    ModelDefaults,
    ScenarioLever
} from '@quodsi/lucid-shared';
import { StorageAdapter } from '../core/StorageAdapter';
import { SimObjectLucid } from './SimObjectLucid';

/**
 * Wire-cleanup Phase B2 Task 9 fix round (review F1, BLOCKER): `Model`'s
 * constructor collapsed the old (reps, seed, oneClockUnit,
 * simulationTimeType, warmupClockPeriod, warmupClockPeriodUnit,
 * runClockPeriod, runClockPeriodUnit) 8-field run config into
 * (replications, seed, timeUnit, timeMode, warmupTime: Duration, runTime:
 * Duration). Unlike Generator's storage (flattened outright, because
 * `GeneratorLucid` is the only writer of that shape), Model's stored page
 * `q_data` is ALSO produced by `LucidVersionUpgrader.ts`, which feeds the
 * page blob through the shared `upgradeElements()` core engine — and the
 * now-live clean-era `ModelTransforms` hop (`sourceVersion: '2026.10.11'`)
 * `dropKeys`s every old name and writes `replications`/`timeUnit`/
 * `timeMode`/`runTime`/`warmupTime` directly. So a page that has already
 * been through the upgrader carries CLEAN names; a page that hasn't yet
 * (or was hand-authored/seeded with the old shape) carries OLD names. Both
 * must be read correctly: `storedData?.replications ?? storedData?.reps`
 * style fallbacks, clean name first. `updateFromPlatform` — the write path
 * this class owns outright — persists ONLY the clean names from here on,
 * so re-saving an old-shape document (opened once) migrates it in place.
 */
interface StoredModelData {
    id: string;
    name?: string;
    description?: string;
    // Clean names (what LucidVersionUpgrader's clean-era hop writes, and what
    // this class writes back).
    replications?: number;
    seed?: number;
    timeUnit?: PeriodUnit;
    timeMode?: SimulationTimeType;
    runTime?: Duration;
    warmupTime?: Duration;
    // Old names (fallback read only — a page that hasn't been through the
    // clean-era upgrade hop yet still carries these; dropped by that hop
    // with no replacement once it runs).
    reps?: number;
    oneClockUnit?: PeriodUnit;
    simulationTimeType?: SimulationTimeType;
    warmupClockPeriod?: number;
    warmupClockPeriodUnit?: PeriodUnit;
    runClockPeriod?: number;
    runClockPeriodUnit?: PeriodUnit;
    // Host-projection-only dates: no clean-wire equivalent at all (dropped
    // outright by the clean-era hop, not renamed) but still meaningful
    // in-memory (`Model.warmupDateTime`/`startDateTime`/`finishDateTime` —
    // see that class's own doc comment) and relayed to the Studio embed
    // catalog (buildStudioCatalog). This class keeps writing them; the
    // clean-era hop simply never re-materializes them once dropped.
    warmupDateTime?: Date | null;
    startDateTime?: Date | null;
    finishDateTime?: Date | null;
    levers?: ScenarioLever[];
}

export class ModelLucid extends SimObjectLucid<Model> {
    constructor(pageProxy: PageProxy, storageAdapter: StorageAdapter) {
        super(pageProxy, storageAdapter);
    }

    get type(): SimulationObjectType {
        return SimulationObjectType.Model;
    }

    protected createSimObject(): Model {
        const page = this.element as PageProxy;

        // Get stored custom data
        const storedData = this.storageAdapter.getElementData(page) as StoredModelData;

        // Clean name first, old name fallback, then the host-seed default —
        // matching every host's own `{...modelFieldDefaults(), ...raw}`
        // bootstrap (see ModelTransforms.ts's clean-era hop, which
        // materializes the SAME defaults for a document missing them).
        const replications = storedData?.replications ?? storedData?.reps ?? ModelDefaults.DEFAULT_REPS;
        const seed = storedData?.seed ?? ModelDefaults.DEFAULT_SEED;
        const timeUnit = storedData?.timeUnit ?? storedData?.oneClockUnit ?? ModelDefaults.DEFAULT_CLOCK_UNIT;
        const timeMode = storedData?.timeMode ?? storedData?.simulationTimeType ?? SimulationTimeType.Clock;
        const warmupTime = storedData?.warmupTime
            ?? (storedData?.warmupClockPeriod !== undefined
                ? Duration.constant(storedData.warmupClockPeriod, storedData.warmupClockPeriodUnit ?? PeriodUnit.HOURS)
                : Duration.constant(0, PeriodUnit.HOURS));
        const runTime = storedData?.runTime
            ?? (storedData?.runClockPeriod !== undefined
                ? Duration.constant(storedData.runClockPeriod, storedData.runClockPeriodUnit ?? PeriodUnit.HOURS)
                : Duration.constant(24, PeriodUnit.HOURS));

        const model = new Model(
            this.platformElementId,
            storedData?.name || '',
            replications,
            seed,
            timeUnit,
            timeMode,
            warmupTime,
            runTime,
            storedData?.warmupDateTime ?? null,
            storedData?.startDateTime ?? null,
            storedData?.finishDateTime ?? null
        );

        if (storedData) {
            model.description = storedData.description ?? '';
            model.levers = storedData.levers ?? [];
            if (!storedData.name) {
                model.name = this.getElementName();
            }
        } else {
            model.name = this.getElementName();
        }

        return model;
    }

    public updateFromPlatform(): void {
        const page = this.element as PageProxy;
        // Update name only if not already set
        if (!this.simObject.name) {
            this.simObject.name = this.getElementName();
        }

        // Store custom data properties using the CLEAN names only — this is
        // the migration path for an old-shape document opened once: after
        // this write, the page no longer carries `reps`/`oneClockUnit`/
        // `simulationTimeType`/`warmupClockPeriod(+Unit)`/
        // `runClockPeriod(+Unit)` at all.
        const dataToStore: StoredModelData = {
            id: this.platformElementId,
            name: this.simObject.name,
            description: this.simObject.description,
            replications: this.simObject.replications,
            seed: this.simObject.seed,
            timeUnit: this.simObject.timeUnit,
            timeMode: this.simObject.timeMode,
            warmupTime: this.simObject.warmupTime,
            runTime: this.simObject.runTime,
            warmupDateTime: this.simObject.warmupDateTime,
            startDateTime: this.simObject.startDateTime,
            finishDateTime: this.simObject.finishDateTime,
            levers: this.simObject.levers
        };

        this.storageAdapter.updateElementData(page, dataToStore);
    }

    protected getElementName(): string {
        const page = this.element as PageProxy;
        return page.getTitle() || 'Unnamed Model';
    }

    public validate(): boolean {
        return !!this.simObject.name &&
            this.simObject.replications > 0;
    }
}
