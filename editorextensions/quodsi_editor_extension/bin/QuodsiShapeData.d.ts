import { ElementProxy } from "lucid-extension-sdk";
import { SimulationObjectType } from "./models/enums";
import { SimulationObject } from "./models/simulation_object";
export declare class QuodsiShapeData {
    private element;
    private static readonly OBJECT_TYPE_KEY;
    private static readonly DATA_KEY;
    constructor(element: ElementProxy);
    setObjectTypeAndData<T extends SimulationObject>(objectType: SimulationObjectType, data: T): void;
    deleteObjectTypeAndData(): boolean;
    getObjectType(): SimulationObjectType | null;
    getData<T extends SimulationObject>(): T | null;
    getTypedData(): SimulationObject | null;
    static isValidData(objectType: SimulationObjectType, data: any): boolean;
}
