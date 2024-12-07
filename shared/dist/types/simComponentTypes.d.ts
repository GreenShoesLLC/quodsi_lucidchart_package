import { SimComponentType } from "./simComponentType";
export interface SimComponentTypeInfo {
    type: SimComponentType;
    displayName: string;
    description: string;
    createEmpty: (id: string) => any;
}
export declare class SimComponentFactory {
    private static createEmptyDuration;
    private static readonly creators;
    static createEmpty<T>(type: SimComponentType, id: string): T;
}
export declare const SimComponentTypes: SimComponentTypeInfo[];
//# sourceMappingURL=simComponentTypes.d.ts.map