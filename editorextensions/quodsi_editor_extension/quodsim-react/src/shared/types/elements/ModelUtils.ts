import { SimulationTimeType } from "./SimulationTimeType";
import { SimulationObjectType } from "./SimulationObjectType";
import { Model } from "./Model";
import { ModelDefaults } from "./ModelDefaults";

declare global {
    interface Window {
        crypto: Crypto;
    }
}

export class ModelUtils {
    /**
     * Generates a UUID for the model
     */
    private static generateUUID(): string {
        try {
            // Check if we're in a browser environment and have crypto support
            if (typeof window !== 'undefined' && window?.crypto?.randomUUID) {
                return window.crypto.randomUUID();
            }
        } catch (e) {
            // Silently fall through to fallback
        }

        // Fallback implementation
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Creates a new default model instance with a UUID
     */
    static createNew(name: string = 'New Model'): Model {
        return ModelUtils.createWithDefaults({
            name: name
            // Remove id generation - it will be set by the caller
        });
    }

    /**
     * Creates a complete Model object with default values for all optional fields
     */
    static createWithDefaults(partialModel: Partial<Model>): Model {
        const defaults: Model = {
            id: partialModel.id!, // ID must be provided
            name: partialModel.name || 'New Model',
            type: SimulationObjectType.Model,
            reps: ModelDefaults.DEFAULT_REPS,
            forecastDays: ModelDefaults.DEFAULT_FORECAST_DAYS,
            seed: ModelDefaults.DEFAULT_SEED,
            oneClockUnit: ModelDefaults.DEFAULT_CLOCK_UNIT,
            simulationTimeType: ModelDefaults.DEFAULT_SIMULATION_TIME_TYPE,
            warmupClockPeriod: ModelDefaults.DEFAULT_WARMUP_PERIOD,
            warmupClockPeriodUnit: ModelDefaults.DEFAULT_CLOCK_UNIT,
            runClockPeriod: ModelDefaults.DEFAULT_RUN_PERIOD,
            runClockPeriodUnit: ModelDefaults.DEFAULT_CLOCK_UNIT,
            warmupDateTime: null,
            startDateTime: null,
            finishDateTime: null
        };

        return { ...defaults, ...partialModel };
    }

    static validate(model: Model): Model {
        const validated = { ...model };

        // Ensure model has a valid UUID
        if (!validated.id) {
            validated.id = ModelUtils.generateUUID();
        }

        validated.reps = Math.max(1, model.reps);
        validated.forecastDays = Math.max(1, model.forecastDays);

        if (validated.warmupClockPeriod !== undefined) {
            validated.warmupClockPeriod = Math.max(0, validated.warmupClockPeriod);
        }

        if (validated.runClockPeriod !== undefined) {
            validated.runClockPeriod = Math.max(0, validated.runClockPeriod);
        }

        if (validated.simulationTimeType === SimulationTimeType.Clock) {
            validated.warmupDateTime = null;
            validated.startDateTime = null;
            validated.finishDateTime = null;
        } else if (validated.simulationTimeType === SimulationTimeType.CalendarDate) {
            validated.warmupClockPeriod = undefined;
            validated.runClockPeriod = undefined;
            validated.warmupClockPeriodUnit = undefined;
            validated.runClockPeriodUnit = undefined;
        }

        return validated;
    }

    static isComplete(model: Partial<Model>): model is Model {
        return (
            typeof model.id === 'string' &&
            model.id.length > 0 &&
            typeof model.name === 'string' &&
            typeof model.reps === 'number' &&
            typeof model.forecastDays === 'number' &&
            model.type === SimulationObjectType.Model
        );
    }
}