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
 * Wire-cleanup Phase B2 Task 9: `Model`'s constructor collapsed the old
 * (reps, seed, oneClockUnit, simulationTimeType, warmupClockPeriod,
 * warmupClockPeriodUnit, runClockPeriod, runClockPeriodUnit) 8-field run
 * config into (replications, seed, timeUnit, timeMode, warmupTime: Duration,
 * runTime: Duration) — the `xClockPeriod`/`xClockPeriodUnit` pairs are now a
 * single flat `Duration` each. Storage keeps the OLD flat field names (this
 * is Lucid's own shape-data schema, orthogonal to the clean wire) — this
 * class is the translation boundary between that storage shape and the new
 * `Model` constructor/field names.
 */
interface StoredModelData {
    id: string;
    name?: string;
    description?: string;
    reps?: number;
    seed?: number;
    oneClockUnit?: PeriodUnit;
    simulationTimeType?: SimulationTimeType;
    warmupClockPeriod?: number;
    warmupClockPeriodUnit?: PeriodUnit;
    runClockPeriod?: number;
    runClockPeriodUnit?: PeriodUnit;
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

        const reps = storedData?.reps ?? ModelDefaults.DEFAULT_REPS;
        const seed = storedData?.seed ?? ModelDefaults.DEFAULT_SEED;
        const timeUnit = storedData?.oneClockUnit ?? ModelDefaults.DEFAULT_CLOCK_UNIT;
        const timeMode = storedData?.simulationTimeType ?? SimulationTimeType.Clock;
        const warmupTime = Duration.constant(
            storedData?.warmupClockPeriod ?? 0,
            storedData?.warmupClockPeriodUnit ?? PeriodUnit.HOURS
        );
        const runTime = Duration.constant(
            storedData?.runClockPeriod ?? 24,
            storedData?.runClockPeriodUnit ?? PeriodUnit.HOURS
        );

        const model = new Model(
            this.platformElementId,
            storedData?.name || '',
            reps,
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

        // Store custom data properties. Storage keeps the OLD flat field
        // names (warmupClockPeriod/warmupClockPeriodUnit,
        // runClockPeriod/runClockPeriodUnit) — this write-back splits the
        // new `Model.warmupTime`/`runTime` Durations back into that shape.
        const dataToStore: StoredModelData = {
            id: this.platformElementId,
            name: this.simObject.name,
            description: this.simObject.description,
            reps: this.simObject.replications,
            seed: this.simObject.seed,
            oneClockUnit: this.simObject.timeUnit,
            simulationTimeType: this.simObject.timeMode,
            warmupClockPeriod: this.simObject.warmupTime?.value ?? 0,
            warmupClockPeriodUnit: this.simObject.warmupTime?.unit ?? PeriodUnit.HOURS,
            runClockPeriod: this.simObject.runTime?.value ?? 24,
            runClockPeriodUnit: this.simObject.runTime?.unit ?? PeriodUnit.HOURS,
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
