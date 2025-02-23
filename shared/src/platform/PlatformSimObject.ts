import { SimulationObject } from 'src/types/elements/SimulationObject';
import { SimulationObjectType } from '../types/elements/SimulationObjectType';

/**
 * Interface that defines the contract for platform-specific simulation objects.
 * Each platform (Lucid, Miro, etc.) will implement this interface for their
 * specific simulation object types.
 */
export interface PlatformSimObject<T extends SimulationObject> {
    /**
     * The unique identifier of the platform-specific element
     */
    readonly platformElementId: string;

    /**
     * The type of simulation object
     */
    readonly type: SimulationObjectType;
    
    /**
     * Gets the platform-agnostic simulation object
     */
    getSimulationObject(): T;

    /**
     * Updates the simulation object based on changes in the platform element
     */
    updateFromPlatform(): void;
    
    /**
     * Validates the platform element and its mapping to the simulation object
     */
    validate(): boolean;

    /**
     * Gets platform-specific metadata about the element
     */
    getMetadata(): Record<string, unknown>;
}