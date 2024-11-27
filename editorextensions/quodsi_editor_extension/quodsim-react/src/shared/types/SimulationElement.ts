

import { SimulationObjectType } from "./elements/enums/simulationObjectType";
import { ValidationResult } from "./ValidationTypes";

/**
 * Base interface for all simulation elements
 */
export interface SimulationElement {
    id: string;
    type: SimulationObjectType;
    version: string;
    validate(): ValidationResult;
    toStorage(): object;
    fromStorage(data: object): SimulationElement;
}