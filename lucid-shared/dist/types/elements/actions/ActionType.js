"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionType = void 0;
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
 * - CREATE: Spawn a new entity while original continues
 * - DISPOSE: Terminate entity early
 * - JOIN: Wait for entities with matching state to combine
 *
 * Control Flow:
 * - LOOP: Repeat actions N times
 * - BRANCH: Conditional if/else execution
 *
 * This corresponds to the Python Action system in the simulation engine.
 */
var ActionType;
(function (ActionType) {
    /**
     * Modify state values (StateModification list)
     */
    ActionType["ASSIGN"] = "ASSIGN";
    /**
     * Capture resource capacity
     */
    ActionType["SEIZE"] = "SEIZE";
    /**
     * Release previously seized resource capacity
     */
    ActionType["RELEASE"] = "RELEASE";
    /**
     * Wait for a duration without resource requirements
     */
    ActionType["DELAY"] = "DELAY";
    /**
     * Classic operation step: seize resources → delay → release resources
     * This is a composite action that replaces the legacy OperationStep
     */
    ActionType["DELAY_WITH_RESOURCE"] = "DELAY_WITH_RESOURCE";
    /**
     * Replace the current entity with multiple new entities.
     * Used for batch splitting, order splitting, etc.
     */
    ActionType["SPLIT"] = "SPLIT";
    /**
     * Create a new entity while the original continues processing.
     * Used for spawning side-effect entities (shipping labels, inspection records, etc.)
     */
    ActionType["CREATE"] = "CREATE";
    /**
     * Terminate entity early, before it reaches the natural exit point.
     * Used for quality control, conditional termination, etc.
     */
    ActionType["DISPOSE"] = "DISPOSE";
    /**
     * Wait for N entities with matching state value to combine.
     * Used for rejoining split entities, assembly operations, batch completion.
     */
    ActionType["JOIN"] = "JOIN";
    /**
     * Repeat a set of actions a specified number of times.
     * Loop index is available via context during execution.
     */
    ActionType["LOOP"] = "LOOP";
    /**
     * Conditionally execute actions based on a state condition.
     * Evaluates condition and executes either if_true or if_false actions.
     */
    ActionType["BRANCH"] = "BRANCH";
})(ActionType = exports.ActionType || (exports.ActionType = {}));
