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
export declare class DurationModification {
    propertyName: ScenarioPropertyName;
    mode: DurationModificationMode;
    factor?: number;
    duration?: SerializedDuration;
    constructor(options: {
        propertyName: ScenarioPropertyName;
        mode: DurationModificationMode;
        factor?: number;
        duration?: SerializedDuration;
    });
    toJSON(): any;
    static fromJSON(data: any): DurationModification;
}
//# sourceMappingURL=DurationModification.d.ts.map