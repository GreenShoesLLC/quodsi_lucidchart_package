import { ElementProxy } from "lucid-extension-sdk";
import { SimulationObjectType } from "../shared/types/elements/SimulationObjectType";
import { SimulationObject } from "../shared/types/elements/SimulationObject";
import { SimComponentType } from "../shared/types/simComponentTypes";
export declare class QuodsiShapeData {
    private element;
    private static readonly OBJECT_TYPE_KEY;
    private static readonly DATA_KEY;
    constructor(element: ElementProxy);
    setComponentType(type: SimComponentType): void;
    setComponentData(data: any): void;
    updateComponent(type: SimComponentType, data: any): void;
    getComponentType(): SimComponentType | undefined;
    getComponentData<T>(): T | null;
    hasComponentData(): boolean;
    isValidComponentType(): boolean;
    setObjectTypeAndData<T extends SimulationObject>(objectType: SimulationObjectType, data: T): void;
    deleteObjectTypeAndData(): boolean;
    getObjectType(): SimulationObjectType | null;
    getData<T extends SimulationObject>(): T | null;
    getTypedData(): SimulationObject | null;
    static isValidData(objectType: SimulationObjectType, data: any): boolean;
}
