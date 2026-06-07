import { ValidationRule } from "../common/ValidationRule";
import { ModelDefinitionState } from "../models/ModelDefinitionState";
import { ValidationIssue } from "../../quodsi-messaging/validation/types";
/**
 * Validates that all paths from each Generator eventually lead to a terminal Activity.
 *
 * A terminal Activity is one with no outgoing connectors.
 * This ensures entities don't get stuck in dead-end paths or orphaned connector chains.
 *
 * Requirements:
 * - ALL paths from a Generator must eventually reach a terminal Activity
 * - Loops/cycles are allowed as long as there's an exit path
 * - Generates ERROR severity issues (blocks simulation)
 */
export declare class GeneratorPathValidation extends ValidationRule {
    validate(state: ModelDefinitionState, issues: ValidationIssue[]): void;
    /**
     * Validates all paths from a single Generator reach terminal Activities
     */
    private validateGeneratorPaths;
    /**
     * Analyzes reachability from a Generator to determine if all paths reach terminals
     *
     * @returns Object with reachability analysis results
     */
    private analyzeReachability;
    /**
     * Gets a display name for a simulation object (name in quotes or ID)
     */
    private getDisplayName;
}
//# sourceMappingURL=GeneratorPathValidation.d.ts.map