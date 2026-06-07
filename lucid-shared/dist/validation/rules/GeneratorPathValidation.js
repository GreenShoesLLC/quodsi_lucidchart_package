"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeneratorPathValidation = void 0;
var ValidationRule_1 = require("../common/ValidationRule");
var ValidationMessages_1 = require("../common/ValidationMessages");
var types_1 = require("../../quodsi-messaging/validation/types");
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
var GeneratorPathValidation = /** @class */ (function (_super) {
    __extends(GeneratorPathValidation, _super);
    function GeneratorPathValidation() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    GeneratorPathValidation.prototype.validate = function (state, issues) {
        var _this = this;
        var generators = state.modelDefinition.generators.getAll();
        this.log("Starting Generator path validation");
        generators.forEach(function (generator) {
            _this.validateGeneratorPaths(generator, state, issues);
        });
        this.log("Completed Generator path validation");
    };
    /**
     * Validates all paths from a single Generator reach terminal Activities
     */
    GeneratorPathValidation.prototype.validateGeneratorPaths = function (generator, state, issues) {
        var _this = this;
        this.log("Validating paths for Generator: ".concat(generator.id));
        // Find all connectors starting from this generator
        var outgoingConnectors = Array.from(state.connections.values())
            .filter(function (connector) { return connector.sourceId === generator.id; });
        if (outgoingConnectors.length === 0) {
            // Generator has no outgoing connectors - entities can't flow anywhere
            this.log("Generator ".concat(generator.id, " has no outgoing connectors"));
            issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.ERROR, 'generator_no_outgoing', "Generator ".concat(this.getDisplayName(generator), " has no outgoing connectors. Entities cannot flow into the system."), generator.id));
            return;
        }
        // Explore all reachable activities from this generator
        var reachabilityResult = this.analyzeReachability(generator, state);
        if (reachabilityResult.unreachableTerminals) {
            // Generator cannot reach any terminal activity
            this.log("Generator ".concat(generator.id, " cannot reach any terminal Activity"));
            issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.ERROR, 'generator_no_terminal_path', "Generator ".concat(this.getDisplayName(generator), " has no path to a terminal Activity. All paths lead to dead-ends or loops without exits."), generator.id));
            return;
        }
        if (reachabilityResult.deadEndActivities.length > 0) {
            // Some paths lead to activities that aren't terminals but have no exit
            this.log("Generator ".concat(generator.id, " has paths leading to dead-end Activities: ").concat(reachabilityResult.deadEndActivities.join(', ')));
            var deadEndNames = reachabilityResult.deadEndActivities
                .map(function (activityId) {
                var activity = state.modelDefinition.activities.get(activityId);
                return activity ? _this.getDisplayName(activity) : activityId;
            })
                .join(', ');
            issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.ERROR, 'generator_dead_end_path', "Generator ".concat(this.getDisplayName(generator), " has paths that lead to non-terminal Activities with no exit: ").concat(deadEndNames, ". Entities may get stuck."), generator.id));
        }
    };
    /**
     * Analyzes reachability from a Generator to determine if all paths reach terminals
     *
     * @returns Object with reachability analysis results
     */
    GeneratorPathValidation.prototype.analyzeReachability = function (generator, state) {
        var _this = this;
        // BFS to explore all reachable activities
        var queue = [];
        var visited = new Set();
        var reachableActivities = new Set();
        // Start with all activities directly connected to the generator
        var outgoingConnectors = Array.from(state.connections.values())
            .filter(function (connector) { return connector.sourceId === generator.id; });
        outgoingConnectors.forEach(function (connector) {
            if (connector.targetId) {
                queue.push(connector.targetId);
            }
        });
        // BFS traversal
        while (queue.length > 0) {
            var activityId = queue.shift();
            if (visited.has(activityId)) {
                continue; // Already explored this activity
            }
            visited.add(activityId);
            reachableActivities.add(activityId);
            // Get outgoing connectors from this activity
            var relationships = state.activityRelationships.get(activityId);
            if (relationships && relationships.outgoingConnectors.size > 0) {
                // Add all target activities to the queue
                relationships.outgoingConnectors.forEach(function (connectorId) {
                    var connector = state.connections.get(connectorId);
                    if (connector && connector.targetId) {
                        queue.push(connector.targetId);
                    }
                });
            }
        }
        // Now analyze the reachable activities
        var hasTerminal = false;
        var deadEndActivities = [];
        reachableActivities.forEach(function (activityId) {
            var relationships = state.activityRelationships.get(activityId);
            var activity = state.modelDefinition.activities.get(activityId);
            if (!relationships || relationships.outgoingConnectors.size === 0) {
                // This activity has no outgoing connectors - it's a terminal
                hasTerminal = true;
                _this.log("Found terminal Activity: ".concat(activityId));
            }
        });
        // Check for dead-end paths: activities reachable but not terminals and have no valid exit
        // This catches activities that might have outgoing connectors that don't lead anywhere
        reachableActivities.forEach(function (activityId) {
            var relationships = state.activityRelationships.get(activityId);
            if (relationships && relationships.outgoingConnectors.size > 0) {
                // Activity has outgoing connectors - check if any lead to reachable activities
                var hasValidExit_1 = false;
                relationships.outgoingConnectors.forEach(function (connectorId) {
                    var connector = state.connections.get(connectorId);
                    if (connector && connector.targetId && reachableActivities.has(connector.targetId)) {
                        hasValidExit_1 = true;
                    }
                });
                if (!hasValidExit_1) {
                    // Activity has outgoing connectors but none lead to reachable activities
                    deadEndActivities.push(activityId);
                }
            }
        });
        return {
            unreachableTerminals: !hasTerminal,
            deadEndActivities: deadEndActivities
        };
    };
    /**
     * Gets a display name for a simulation object (name in quotes or ID)
     */
    GeneratorPathValidation.prototype.getDisplayName = function (obj) {
        if (obj.name && obj.name.trim() !== '') {
            return "'".concat(obj.name, "'");
        }
        return obj.id;
    };
    return GeneratorPathValidation;
}(ValidationRule_1.ValidationRule));
exports.GeneratorPathValidation = GeneratorPathValidation;
