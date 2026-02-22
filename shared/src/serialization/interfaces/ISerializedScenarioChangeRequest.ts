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
        type: "numeric" | "boolean";
        propertyName: string;
        setterType?: string;
        newValue: number | boolean;
    };
    description?: string;
}
