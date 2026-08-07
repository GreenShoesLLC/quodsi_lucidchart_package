export interface ISerializedScenarioChangeRequest {
    id: string;
    objectType: string;
    objectMatchCriteria: {
        name?: string;
        nameContains?: string;
        nameStartsWith?: string;
        nameEndsWith?: string;
    };
    modificationDetails: {
        type: "numeric" | "boolean" | "duration" | "reference";
        propertyName: string;
        setterType?: string;
        newValue?: number | boolean;
        mode?: "scaleRate" | "setDistribution";
        factor?: number;
        duration?: {
            durationPeriodUnit: string;
            distribution: {
                distributionType: string;
                parameters: Record<string, number>;
                description?: string;
            };
        };
        resourceRequirementId?: string;
    };
    /** Present only for ACTIVITY-scoped modifications targeting a specific action. */
    actionId?: string;
    description?: string;
}
