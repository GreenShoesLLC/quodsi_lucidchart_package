import { ValidationResult, ValidationMessage, ValidationMessageType } from './ValidationTypes';
/**
 * Base interface for all simulation elements
 */
export interface SimulationElement {
    id: string;
    type: SimulationElementType;
    version: string;
    validate(): ValidationResult;
    toStorage(): object;
    fromStorage(data: object): SimulationElement;
}
export declare enum SimulationElementType {
    Activity = "activity",
    Connector = "connector",
    Entity = "entity",
    Generator = "generator",
    Resource = "resource",
    Model = "model"
}
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
/**
 * Connector specific interfaces and implementation
 */
export interface ConnectorData {
    id: string;
    name: string;
    sourceId: string;
    targetId: string;
    probability: number;
    routing: {
        type: string;
        conditions: any[];
    };
}
export declare class Connector extends BaseSimulationElement {
    name: string;
    sourceId: string;
    targetId: string;
    probability: number;
    routing: {
        type: string;
        conditions: any[];
    };
    constructor(data: ConnectorData);
    validate(): ValidationResult;
    toStorage(): object;
    fromStorage(data: any): Connector;
}
