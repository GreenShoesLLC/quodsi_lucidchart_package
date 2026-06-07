/**
 * Serialized representation of a State definition
 */
export interface ISerializedState {
    id: string;
    name: string;
    componentType: string;
    dataType: string;
    initialValue: number | string | boolean;
    categoryValues?: string[];
    description?: string;
    collectStatistics: boolean;
}
//# sourceMappingURL=ISerializedState.d.ts.map