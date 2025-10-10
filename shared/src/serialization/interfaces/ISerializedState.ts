/**
 * Serialized representation of a State definition
 */
export interface ISerializedState {
    id: string;
    name: string;
    componentType: string;  // "MODEL" | "ENTITY" | "ACTIVITY" | "RESOURCE"
    dataType: string;       // "NUMBER" | "STRING" | "BOOLEAN" | "CATEGORY"
    initialValue: number | string | boolean;
    categoryValues?: string[];
    description?: string;
    collectStatistics: boolean;
}
