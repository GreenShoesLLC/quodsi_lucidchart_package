import { SimulationObject } from './SimulationObject';
import { SimulationObjectType } from './SimulationObjectType';
/**
 * Abstract base class for simulation objects with location
 * Provides x and y coordinates while maintaining the core SimulationObject contract
 */
export declare abstract class PositionedSimulationObject implements SimulationObject {
    abstract id: string;
    abstract name: string;
    abstract type: SimulationObjectType;
    x: number;
    y: number;
    width?: number;
    height?: number;
    /**
     * Sets the location of the simulation object
     * @param x X-coordinate (default 0)
     * @param y Y-coordinate (default 0)
     */
    setLocation(x?: number, y?: number): void;
    /**
     * Retrieves the current location of the object
     * @returns Object containing x and y coordinates
     */
    getLocation(): {
        x: number;
        y: number;
    };
    /**
     * Checks if the object has a meaningful location
     * Considers a location "set" if either x or y is non-zero
     * @returns Boolean indicating if location is set
     */
    hasLocation(): boolean;
    /**
     * Creates a shallow copy of the object with location preserved
     * @returns A new instance of the object with the same location
     */
    clone(): this;
    /**
     * Resets the location to the default (0,0)
     */
    resetLocation(): void;
    /**
     * Serialization helper method
     * @returns Object representation including location and optional dimensions
     */
    toJSON(): object;
}
//# sourceMappingURL=PositionedSimulationObject.d.ts.map