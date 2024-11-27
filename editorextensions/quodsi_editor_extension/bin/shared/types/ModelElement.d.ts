import { SimulationElement } from "./SimulationElement";
import { SimulationElementType } from "./SimulationElementType";
import { ValidationResult } from "./ValidationTypes";
export declare class ModelElement implements SimulationElement {
    id: string;
    type: SimulationElementType.Model;
    version: string;
    data: any;
    constructor(id: string, type: SimulationElementType.Model, version?: string, data?: any);
    validate(): ValidationResult;
    toStorage(): object;
    fromStorage(data: object): SimulationElement;
}
