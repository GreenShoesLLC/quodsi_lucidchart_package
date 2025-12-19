/**
 * Discriminator enum for Action types.
 *
 * Actions are the building blocks of entity processing in the simulation.
 * Each action type represents a specific operation that can be performed:
 *
 * Core Primitives:
 * - ASSIGN: Modify state values
 * - SEIZE: Capture resource capacity
 * - RELEASE: Release resource capacity
 * - DELAY: Wait for a duration (no resources)
 *
 * Composite:
 * - DELAY_WITH_RESOURCE: Classic operation step pattern (seize → delay → release)
 *
 * Entity Operations:
 * - SPLIT: Replace entity with multiple new entities
 *
 * This corresponds to the Python Action system in the simulation engine.
 */
export enum ActionType {
    /**
     * Modify state values (StateModification list)
     */
    ASSIGN = 'ASSIGN',

    /**
     * Capture resource capacity
     */
    SEIZE = 'SEIZE',

    /**
     * Release previously seized resource capacity
     */
    RELEASE = 'RELEASE',

    /**
     * Wait for a duration without resource requirements
     */
    DELAY = 'DELAY',

    /**
     * Classic operation step: seize resources → delay → release resources
     * This is a composite action that replaces the legacy OperationStep
     */
    DELAY_WITH_RESOURCE = 'DELAY_WITH_RESOURCE',

    /**
     * Replace the current entity with multiple new entities.
     * Used for batch splitting, order splitting, etc.
     */
    SPLIT = 'SPLIT'
}
