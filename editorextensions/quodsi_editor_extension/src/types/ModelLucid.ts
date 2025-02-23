import { ElementProxy, PageProxy } from 'lucid-extension-sdk';
import { 
    Model, 
    SimulationObjectType, 
    PeriodUnit, 
    SimulationTimeType,
    PlatformMetadata,
    PlatformType,
    ModelDefaults
} from '@quodsi/shared';
import { StorageAdapter } from '../core/StorageAdapter';
import { SimObjectLucid } from './SimObjectLucid';

interface StoredModelData {
    id: string;
    name?: string;
    reps?: number;
    forecastDays?: number;
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
        // Create model with element-specific properties
        const model = new Model(
            this.platformElementId,
            '',  // name will be set below
            ModelDefaults.DEFAULT_REPS,
            ModelDefaults.DEFAULT_FORECAST_DAYS,
            ModelDefaults.DEFAULT_SEED,
            ModelDefaults.DEFAULT_CLOCK_UNIT,
            SimulationTimeType.Clock,
            0,
            PeriodUnit.HOURS,
            24,
            PeriodUnit.HOURS,
            null,
            null,
            null
        );

        // Get stored custom data
        const storedData = this.storageAdapter.getElementData(page) as StoredModelData;

        if (storedData) {
            // Copy properties from stored data
            model.name = storedData.name || this.getElementName();
            model.reps = storedData.reps ?? ModelDefaults.DEFAULT_REPS;
            model.forecastDays = storedData.forecastDays ?? ModelDefaults.DEFAULT_FORECAST_DAYS;
            model.seed = storedData.seed ?? ModelDefaults.DEFAULT_SEED;
            model.oneClockUnit = storedData.oneClockUnit ?? ModelDefaults.DEFAULT_CLOCK_UNIT;
            model.simulationTimeType = storedData.simulationTimeType ?? SimulationTimeType.Clock;
            model.warmupClockPeriod = storedData.warmupClockPeriod ?? 0;
            model.warmupClockPeriodUnit = storedData.warmupClockPeriodUnit ?? PeriodUnit.HOURS;
            model.runClockPeriod = storedData.runClockPeriod ?? 24;
            model.runClockPeriodUnit = storedData.runClockPeriodUnit ?? PeriodUnit.HOURS;
            model.warmupDateTime = storedData.warmupDateTime ?? null;
            model.startDateTime = storedData.startDateTime ?? null;
            model.finishDateTime = storedData.finishDateTime ?? null;
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

        // Store custom data properties
        const dataToStore = {
            id: this.platformElementId,
            name: this.simObject.name,
            reps: this.simObject.reps,
            forecastDays: this.simObject.forecastDays,
            seed: this.simObject.seed,
            oneClockUnit: this.simObject.oneClockUnit,
            simulationTimeType: this.simObject.simulationTimeType,
            warmupClockPeriod: this.simObject.warmupClockPeriod,
            warmupClockPeriodUnit: this.simObject.warmupClockPeriodUnit,
            runClockPeriod: this.simObject.runClockPeriod,
            runClockPeriodUnit: this.simObject.runClockPeriodUnit,
            warmupDateTime: this.simObject.warmupDateTime,
            startDateTime: this.simObject.startDateTime,
            finishDateTime: this.simObject.finishDateTime
        };

        this.storageAdapter.updateElementData(page, dataToStore);
    }

    protected getElementName(): string {
        const page = this.element as PageProxy;
        return page.getTitle() || 'Unnamed Model';
    }

    public validate(): boolean {
        return !!this.simObject.name &&
            this.simObject.reps > 0 &&
            this.simObject.forecastDays > 0;
    }
}