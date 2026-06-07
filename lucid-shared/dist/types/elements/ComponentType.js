"use strict";
/**
 * Component type enumeration for the state management system.
 *
 * This module defines the ComponentType enum that specifies which
 * simulation components can own states.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTypicalUseCases = exports.getScalingPattern = exports.ComponentType = void 0;
/**
 * Enumeration of simulation components that can own states.
 *
 * Each state is scoped to a specific component type, which determines:
 * - How many instances of the state exist
 * - Which components can access the state
 * - How the state is initialized and managed
 */
var ComponentType;
(function (ComponentType) {
    /**
     * Model-level global states (1:1 ratio).
     *
     * - One State → One StateInstance per model
     * - Global counters, settings, and system-wide metrics
     * - Accessible by all components in the simulation
     * - Examples: TotalThroughput, SystemStatus, GlobalSettings
     */
    ComponentType["MODEL"] = "MODEL";
    /**
     * Entity instance states (1:M ratio).
     *
     * - One State → M StateInstances (per entity created by generators)
     * - Entity-specific properties and status
     * - Potentially millions of instances in large simulations
     * - Examples: PatientPriority, ProductQuality, CustomerSatisfaction
     */
    ComponentType["ENTITY"] = "ENTITY";
    /**
     * Resource instance states (1:N ratio).
     *
     * - One State → N StateInstances (per defined resource)
     * - Resource-specific status, utilization, and performance metrics
     * - Independent values per resource instance
     * - Examples: PhysicianWorkload, MachineEfficiency, BedOccupancy
     */
    ComponentType["RESOURCE"] = "RESOURCE";
    /**
     * Activity instance states (1:N ratio).
     *
     * - One State → N StateInstances (per defined activity)
     * - Activity-specific metrics, queue status, and processing parameters
     * - Independent values per activity instance
     * - Examples: QueueLength, ProcessingRate, ServiceLevel
     */
    ComponentType["ACTIVITY"] = "ACTIVITY";
})(ComponentType = exports.ComponentType || (exports.ComponentType = {}));
/**
 * Get the scaling pattern description for a component type.
 */
function getScalingPattern(componentType) {
    var _a;
    var patterns = (_a = {},
        _a[ComponentType.MODEL] = "1:1 (One instance per model)",
        _a[ComponentType.ENTITY] = "1:M (One instance per entity created)",
        _a[ComponentType.RESOURCE] = "1:N (One instance per defined resource)",
        _a[ComponentType.ACTIVITY] = "1:N (One instance per defined activity)",
        _a);
    return patterns[componentType] || "Unknown scaling pattern";
}
exports.getScalingPattern = getScalingPattern;
/**
 * Get typical use cases for states of this component type.
 */
function getTypicalUseCases(componentType) {
    var _a;
    var useCases = (_a = {},
        _a[ComponentType.MODEL] = [
            "Global counters and metrics",
            "System-wide settings and parameters",
            "Total throughput and performance indicators",
            "Simulation control flags"
        ],
        _a[ComponentType.ENTITY] = [
            "Entity priority and classification",
            "Processing status and progress",
            "Quality levels and scores",
            "Customer satisfaction and preferences"
        ],
        _a[ComponentType.RESOURCE] = [
            "Workload and utilization levels",
            "Efficiency and performance metrics",
            "Maintenance status and schedules",
            "Capacity and availability states"
        ],
        _a[ComponentType.ACTIVITY] = [
            "Queue lengths and waiting times",
            "Processing rates and throughput",
            "Service levels and quality metrics",
            "Activity-specific parameters"
        ],
        _a);
    return useCases[componentType] || [];
}
exports.getTypicalUseCases = getTypicalUseCases;
