/**
 * Component type enumeration for the state management system.
 *
 * This module defines the ComponentType enum that specifies which
 * simulation components can own states.
 */
/**
 * Enumeration of simulation components that can own states.
 *
 * Each state is scoped to a specific component type, which determines:
 * - How many instances of the state exist
 * - Which components can access the state
 * - How the state is initialized and managed
 */
export declare enum ComponentType {
    /**
     * Model-level global states (1:1 ratio).
     *
     * - One State → One StateInstance per model
     * - Global counters, settings, and system-wide metrics
     * - Accessible by all components in the simulation
     * - Examples: TotalThroughput, SystemStatus, GlobalSettings
     */
    MODEL = "MODEL",
    /**
     * Entity instance states (1:M ratio).
     *
     * - One State → M StateInstances (per entity created by generators)
     * - Entity-specific properties and status
     * - Potentially millions of instances in large simulations
     * - Examples: PatientPriority, ProductQuality, CustomerSatisfaction
     */
    ENTITY = "ENTITY",
    /**
     * Resource instance states (1:N ratio).
     *
     * - One State → N StateInstances (per defined resource)
     * - Resource-specific status, utilization, and performance metrics
     * - Independent values per resource instance
     * - Examples: PhysicianWorkload, MachineEfficiency, BedOccupancy
     */
    RESOURCE = "RESOURCE",
    /**
     * Activity instance states (1:N ratio).
     *
     * - One State → N StateInstances (per defined activity)
     * - Activity-specific metrics, queue status, and processing parameters
     * - Independent values per activity instance
     * - Examples: QueueLength, ProcessingRate, ServiceLevel
     */
    ACTIVITY = "ACTIVITY"
}
/**
 * Get the scaling pattern description for a component type.
 */
export declare function getScalingPattern(componentType: ComponentType): string;
/**
 * Get typical use cases for states of this component type.
 */
export declare function getTypicalUseCases(componentType: ComponentType): string[];
//# sourceMappingURL=ComponentType.d.ts.map