import { SimulationObject } from './SimulationObject';
import { SimulationObjectType } from './SimulationObjectType';

/**
 * Abstract base class for simulation objects with location
 * Provides x and y coordinates while maintaining the core SimulationObject contract
 */
export abstract class PositionedSimulationObject implements SimulationObject {
    // Core SimulationObject required properties (to be implemented by subclasses)
    abstract id: string;
    abstract name: string;
    abstract type: SimulationObjectType;

    // Location properties with default initialization
    x: number = 0;
    y: number = 0;

    /**
     * Sets the location of the simulation object
     * @param x X-coordinate (default 0)
     * @param y Y-coordinate (default 0)
     */
    setLocation(x: number = 0, y: number = 0): void {
        this.x = x;
        this.y = y;
    }

    /**
     * Retrieves the current location of the object
     * @returns Object containing x and y coordinates
     */
    getLocation(): { x: number; y: number } {
        return { x: this.x, y: this.y };
    }

    /**
     * Checks if the object has a meaningful location
     * Considers a location "set" if either x or y is non-zero
     * @returns Boolean indicating if location is set
     */
    hasLocation(): boolean {
        return this.x !== 0 || this.y !== 0;
    }

    /**
     * Creates a shallow copy of the object with location preserved
     * @returns A new instance of the object with the same location
     */
    clone(): this {
        const clonedObject = Object.create(Object.getPrototypeOf(this));
        Object.assign(clonedObject, this);
        return clonedObject;
    }

    /**
     * Resets the location to the default (0,0)
     */
    resetLocation(): void {
        this.x = 0;
        this.y = 0;
    }

    /**
     * Serialization helper method
     * @returns Object representation including location
     */
    toJSON(): object {
        return {
            ...this,
            x: this.x,
            y: this.y
        };
    }
}
