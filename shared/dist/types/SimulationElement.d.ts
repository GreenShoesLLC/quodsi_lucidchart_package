import { SimulationObject } from './elements/SimulationObject';
import { ValidationResult } from './ValidationTypes';
/**
 * Base interface for all simulation elements
 */
export interface SimulationElement extends SimulationObject {
    /**
     * Version string for tracking element schema changes
     */
    version: string;
    /**
     * Validates the element's current state
     * @returns ValidationResult containing validation status and any messages
     */
    validate(): ValidationResult;
    /**
     * Converts the element to a storage-friendly format
     * @returns Plain object ready for storage
     */
    toStorage(): object;
    /**
     * Creates a new element instance from stored data
     * @param data The stored data to recreate from
     * @returns A new SimulationElement instance
     */
    fromStorage(data: object): SimulationElement;
}
//# sourceMappingURL=SimulationElement.d.ts.map