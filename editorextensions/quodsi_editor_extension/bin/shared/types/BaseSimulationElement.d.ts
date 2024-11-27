import { SimulationElement } from "./SimulationElement";
import { SimulationElementType } from "./SimulationElementType";
import { ValidationMessage, ValidationMessageType, ValidationResult } from "./ValidationTypes";
/**
 * Base class for simulation elements
 */
export declare abstract class BaseSimulationElement implements SimulationElement {
    id: string;
    type: SimulationElementType;
    version: string;
    constructor(id: string, type: SimulationElementType, version?: string);
    abstract validate(): ValidationResult;
    abstract toStorage(): object;
    abstract fromStorage(data: object): SimulationElement;
    /**
     * Helper method to create properly typed validation messages
     */
    protected createValidationMessage(type: ValidationMessageType, message: string, elementId?: string): ValidationMessage;
}
