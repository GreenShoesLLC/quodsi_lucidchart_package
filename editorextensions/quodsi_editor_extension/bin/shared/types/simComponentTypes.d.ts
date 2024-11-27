export declare enum SimComponentType {
    ACTIVITY = "activity",
    GENERATOR = "generator",
    CONNECTOR = "connector",
    MODEL = "model",
    ENTITY = "entity",
    RESOURCE = "resource"
}
export interface SimComponentTypeInfo {
    type: SimComponentType;
    displayName: string;
    description: string;
}
export declare const SimComponentTypes: SimComponentTypeInfo[];
