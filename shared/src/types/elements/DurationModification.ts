import { ScenarioPropertyName } from "./ScenarioPropertyName";

export type DurationModificationMode = "scaleRate" | "setDistribution";

export interface SerializedDuration {
    durationPeriodUnit: string;
    distribution: {
        distributionType: string;
        parameters: Record<string, number>;
        description?: string;
    };
}

export class DurationModification {
    propertyName: ScenarioPropertyName;
    mode: DurationModificationMode;
    factor?: number;
    duration?: SerializedDuration;

    constructor(options: {
        propertyName: ScenarioPropertyName;
        mode: DurationModificationMode;
        factor?: number;
        duration?: SerializedDuration;
    }) {
        this.propertyName = options.propertyName;
        this.mode = options.mode;
        this.factor = options.factor;
        this.duration = options.duration;
    }

    toJSON(): any {
        return {
            type: "duration",
            propertyName: this.propertyName,
            mode: this.mode,
            ...(this.mode === "scaleRate" ? { factor: this.factor } : {}),
            ...(this.mode === "setDistribution" ? { duration: this.duration } : {}),
        };
    }

    static fromJSON(data: any): DurationModification {
        return new DurationModification({
            propertyName: data.propertyName as ScenarioPropertyName,
            mode: data.mode as DurationModificationMode,
            factor: data.factor,
            duration: data.duration,
        });
    }
}
