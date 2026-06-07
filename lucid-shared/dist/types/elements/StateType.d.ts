/**
 * State type enumeration for the state management system.
 *
 * This module defines the StateType enum that specifies the data types
 * supported by the state management system.
 */
/**
 * Enumeration of supported state data types.
 *
 * Each state must have a specific data type that determines:
 * - What operations can be performed on the state
 * - How the state value is validated
 * - What statistics can be collected (Phase 2+)
 */
export declare enum StateType {
    /**
     * Integer or float values with arithmetic operations.
     *
     * Supported operations: =, +=, -=, *=, /=
     * Use cases: Counters, scores, measurements, calculations
     * Examples: PatientScore, ThroughputCount, WorkloadLevel
     */
    NUMBER = "NUMBER",
    /**
     * Text values of any length.
     *
     * Supported operations: = (assignment only)
     * Use cases: Labels, descriptions, identifiers, free-form text
     * Examples: ProcessingStatus, PatientName, Notes
     */
    STRING = "STRING",
    /**
     * True/false values for binary conditions.
     *
     * Supported operations: = (assignment only)
     * Use cases: Flags, conditions, binary status indicators
     * Examples: IsUrgent, HasInsurance, MaintenanceRequired
     */
    BOOLEAN = "BOOLEAN",
    /**
     * Enumerated values from a predefined list.
     *
     * Supported operations: = (assignment only)
     * Requires: categoryValues list in State
     * Use cases: Classifications, statuses, types, levels
     * Examples: EdVisitType (low/main/trauma), QualityLevel (good/fair/poor)
     */
    CATEGORY = "CATEGORY"
}
/**
 * Check if a state type supports arithmetic operations (+=, -=, *=, /=).
 */
export declare function isArithmeticSupported(stateType: StateType): boolean;
/**
 * Get list of supported operations for a state type.
 *
 * @returns Array of operation symbols supported by this type
 */
export declare function getSupportedOperations(stateType: StateType): string[];
/**
 * Validate that a value matches the expected type for a StateType.
 */
export declare function validateValueType(stateType: StateType, value: any): boolean;
//# sourceMappingURL=StateType.d.ts.map