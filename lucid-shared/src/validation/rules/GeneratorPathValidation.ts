import { ValidationRule } from "../common/ValidationRule";
import { ModelDefinitionState } from "../models/ModelDefinitionState";
import { ValidationMessages } from "../common/ValidationMessages";
import { ValidationIssue, ValidationSeverity } from "../../quodsi-messaging/validation/types";
import { Generator } from "../../types/elements/Generator";
import { Activity } from "../../types/elements/Activity";

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
export class GeneratorPathValidation extends ValidationRule {
    validate(state: ModelDefinitionState, issues: ValidationIssue[]): void {
        const generators = state.modelDefinition.generators.getAll();

        this.log("Starting Generator path validation");

        generators.forEach(generator => {
            this.validateGeneratorPaths(generator, state, issues);
        });

        this.log("Completed Generator path validation");
    }

    /**
     * Validates all paths from a single Generator reach terminal Activities
     */
    private validateGeneratorPaths(
        generator: Generator,
        state: ModelDefinitionState,
        issues: ValidationIssue[]
    ): void {
        this.log(`Validating paths for Generator: ${generator.id}`);

        // Find all connectors starting from this generator
        const outgoingConnectors = Array.from(state.connections.values())
            .filter(connector => connector.sourceId === generator.id);

        if (outgoingConnectors.length === 0) {
            // Generator has no outgoing connectors - entities can't flow anywhere
            this.log(`Generator ${generator.id} has no outgoing connectors`);
            issues.push(ValidationMessages.createIssue(
                ValidationSeverity.ERROR,
                'generator_no_outgoing',
                `Generator ${this.getDisplayName(generator)} has no outgoing connectors. Entities cannot flow into the system.`,
                generator.id
            ));
            return;
        }

        // Explore all reachable activities from this generator
        const reachabilityResult = this.analyzeReachability(generator, state);

        if (reachabilityResult.unreachableTerminals) {
            // Generator cannot reach any terminal activity
            this.log(`Generator ${generator.id} cannot reach any terminal Activity`);
            issues.push(ValidationMessages.createIssue(
                ValidationSeverity.ERROR,
                'generator_no_terminal_path',
                `Generator ${this.getDisplayName(generator)} has no path to a terminal Activity. All paths lead to dead-ends or loops without exits.`,
                generator.id
            ));
            return;
        }

        if (reachabilityResult.deadEndActivities.length > 0) {
            // Some paths lead to activities that aren't terminals but have no exit
            this.log(`Generator ${generator.id} has paths leading to dead-end Activities: ${reachabilityResult.deadEndActivities.join(', ')}`);

            const deadEndNames = reachabilityResult.deadEndActivities
                .map(activityId => {
                    const activity = state.modelDefinition.activities.get(activityId);
                    return activity ? this.getDisplayName(activity) : activityId;
                })
                .join(', ');

            issues.push(ValidationMessages.createIssue(
                ValidationSeverity.ERROR,
                'generator_dead_end_path',
                `Generator ${this.getDisplayName(generator)} has paths that lead to non-terminal Activities with no exit: ${deadEndNames}. Entities may get stuck.`,
                generator.id
            ));
        }
    }

    /**
     * Analyzes reachability from a Generator to determine if all paths reach terminals
     *
     * @returns Object with reachability analysis results
     */
    private analyzeReachability(
        generator: Generator,
        state: ModelDefinitionState
    ): {
        unreachableTerminals: boolean;  // True if no terminal is reachable
        deadEndActivities: string[];     // Activities that are dead-ends (not terminals, no outgoing)
    } {
        // BFS to explore all reachable activities
        const queue: string[] = [];
        const visited = new Set<string>();
        const reachableActivities = new Set<string>();

        // Start with all activities directly connected to the generator
        const outgoingConnectors = Array.from(state.connections.values())
            .filter(connector => connector.sourceId === generator.id);

        outgoingConnectors.forEach(connector => {
            if (connector.targetId) {
                queue.push(connector.targetId);
            }
        });

        // BFS traversal
        while (queue.length > 0) {
            const activityId = queue.shift()!;

            if (visited.has(activityId)) {
                continue;  // Already explored this activity
            }

            visited.add(activityId);
            reachableActivities.add(activityId);

            // Get outgoing connectors from this activity
            const relationships = state.activityRelationships.get(activityId);
            if (relationships && relationships.outgoingConnectors.size > 0) {
                // Add all target activities to the queue
                relationships.outgoingConnectors.forEach(connectorId => {
                    const connector = state.connections.get(connectorId);
                    if (connector && connector.targetId) {
                        queue.push(connector.targetId);
                    }
                });
            }
        }

        // Now analyze the reachable activities
        let hasTerminal = false;
        const deadEndActivities: string[] = [];

        reachableActivities.forEach(activityId => {
            const relationships = state.activityRelationships.get(activityId);
            const activity = state.modelDefinition.activities.get(activityId);

            if (!relationships || relationships.outgoingConnectors.size === 0) {
                // This activity has no outgoing connectors - it's a terminal
                hasTerminal = true;
                this.log(`Found terminal Activity: ${activityId}`);
            }
        });

        // Check for dead-end paths: activities reachable but not terminals and have no valid exit
        // This catches activities that might have outgoing connectors that don't lead anywhere
        reachableActivities.forEach(activityId => {
            const relationships = state.activityRelationships.get(activityId);

            if (relationships && relationships.outgoingConnectors.size > 0) {
                // Activity has outgoing connectors - check if any lead to reachable activities
                let hasValidExit = false;

                relationships.outgoingConnectors.forEach(connectorId => {
                    const connector = state.connections.get(connectorId);
                    if (connector && connector.targetId && reachableActivities.has(connector.targetId)) {
                        hasValidExit = true;
                    }
                });

                if (!hasValidExit) {
                    // Activity has outgoing connectors but none lead to reachable activities
                    deadEndActivities.push(activityId);
                }
            }
        });

        return {
            unreachableTerminals: !hasTerminal,
            deadEndActivities
        };
    }

    /**
     * Gets a display name for a simulation object (name in quotes or ID)
     */
    private getDisplayName(obj: { id: string; name?: string }): string {
        if (obj.name && obj.name.trim() !== '') {
            return `'${obj.name}'`;
        }
        return obj.id;
    }
}
