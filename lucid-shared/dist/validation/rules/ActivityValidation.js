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
exports.ActivityValidation = void 0;
var ValidationRule_1 = require("../common/ValidationRule");
var ValidationMessages_1 = require("../common/ValidationMessages");
var ActionType_1 = require("../../types/elements/actions/ActionType");
var ActivityValidation = /** @class */ (function (_super) {
    __extends(ActivityValidation, _super);
    function ActivityValidation() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ActivityValidation.prototype.validate = function (state, issues) {
        var _this = this;
        var activities = state.modelDefinition.activities.getAll();
        activities.forEach(function (activity) {
            _this.validateActivityConnectivity(activity, state, issues);
            _this.validateActivityData(activity, issues);
        });
        this.validateActivityInteractions(state, issues);
    };
    ActivityValidation.prototype.validateActivityConnectivity = function (activity, state, issues) {
        /**
         * Validates that an activity is properly connected.
         * Ensures it has at least one incoming or outgoing connection.
         */
        this.log("Validating connectivity for Activity ID: ".concat(activity.id));
        var relationships = state.activityRelationships.get(activity.id);
        if (!relationships) {
            this.log("Activity ID ".concat(activity.id, " is isolated."));
            issues.push(ValidationMessages_1.ValidationMessages.isolatedElement("Activity", activity.id, activity.name));
            return;
        }
        if (relationships.incomingConnectors.size === 0 && relationships.outgoingConnectors.size === 0) {
            this.log("Activity ID ".concat(activity.id, " has no incoming or outgoing connections."));
            issues.push(ValidationMessages_1.ValidationMessages.isolatedElement("Activity", activity.id, activity.name));
        }
        if (relationships.incomingConnectors.size === 0) {
            this.log("Activity ID ".concat(activity.id, " has no incoming connections."));
            issues.push(ValidationMessages_1.ValidationMessages.noConnections("Activity", activity.id, "incoming", activity.name));
        }
    };
    ActivityValidation.prototype.validateActivityData = function (activity, issues) {
        /**
         * Validates the core data of an activity, including its name, capacity, and buffer sizes.
         */
        var _a;
        this.log("Validating data for Activity ID: ".concat(activity.id));
        if (!((_a = activity.name) === null || _a === void 0 ? void 0 : _a.trim())) {
            this.log("Activity ID ".concat(activity.id, " has a missing name."));
            issues.push(ValidationMessages_1.ValidationMessages.missingName("Activity", activity.id, activity.name));
        }
        if (typeof activity.capacity !== "number" || activity.capacity < 1) {
            this.log("Activity ID ".concat(activity.id, " has an invalid capacity: ").concat(activity.capacity));
            issues.push(ValidationMessages_1.ValidationMessages.invalidCapacity("Activity", activity.id, 1, activity.name));
        }
        this.validateQueueCapacities(activity, issues);
        this.validateActions(activity, issues);
    };
    ActivityValidation.prototype.validateQueueCapacities = function (activity, issues) {
        /**
         * Validates the inbound and outbound queue capacities of an activity.
         */
        this.log("Validating queue capacities for Activity ID: ".concat(activity.id));
        if (typeof activity.inboundQueueCapacity !== "number" || activity.inboundQueueCapacity < 0) {
            this.log("Activity ID ".concat(activity.id, " has an invalid inbound queue capacity: ").concat(activity.inboundQueueCapacity));
            issues.push(ValidationMessages_1.ValidationMessages.invalidQueueCapacity("Activity", activity.id, "inbound", activity.name));
        }
        else if (activity.inboundQueueCapacity > ActivityValidation.MAX_QUEUE_SIZE) {
            this.log("Activity ID ".concat(activity.id, " has a large inbound queue capacity: ").concat(activity.inboundQueueCapacity));
            issues.push(ValidationMessages_1.ValidationMessages.largeQueueCapacity("Activity", activity.id, "inbound", activity.name));
        }
        if (typeof activity.outboundQueueCapacity !== "number" || activity.outboundQueueCapacity < 0) {
            this.log("Activity ID ".concat(activity.id, " has an invalid outbound queue capacity: ").concat(activity.outboundQueueCapacity));
            issues.push(ValidationMessages_1.ValidationMessages.invalidQueueCapacity("Activity", activity.id, "outbound", activity.name));
        }
        else if (activity.outboundQueueCapacity > ActivityValidation.MAX_QUEUE_SIZE) {
            this.log("Activity ID ".concat(activity.id, " has a large outbound queue capacity: ").concat(activity.outboundQueueCapacity));
            issues.push(ValidationMessages_1.ValidationMessages.largeQueueCapacity("Activity", activity.id, "outbound", activity.name));
        }
    };
    ActivityValidation.prototype.validateActions = function (activity, issues) {
        /**
         * Validates the actions defined for an activity.
         */
        var _this = this;
        this.log("Validating actions for Activity ID: ".concat(activity.id));
        if (!Array.isArray(activity.actions)) {
            this.log("Activity ID ".concat(activity.id, " has no actions defined."));
            issues.push(ValidationMessages_1.ValidationMessages.missingActions(activity.id, activity.name));
            return;
        }
        if (activity.actions.length === 0) {
            this.log("Activity ID ".concat(activity.id, " has an empty actions list."));
            issues.push(ValidationMessages_1.ValidationMessages.noActions(activity.id, activity.name));
            return;
        }
        activity.actions.forEach(function (action, index) {
            _this.validateAction(activity.id, action, index, issues);
        });
    };
    ActivityValidation.prototype.validateAction = function (activityId, action, index, issues) {
        this.log("Validating action ".concat(index + 1, " (").concat(action.actionType, ") for Activity ID: ").concat(activityId));
        // Basic validation - ensure action has a valid type
        if (!action.actionType) {
            this.log("Action ".concat(index + 1, " for Activity ID ").concat(activityId, " has no action type."));
            return;
        }
        // Type-specific validation can be added here in the future
        // For now, just log that we validated the action
        switch (action.actionType) {
            case ActionType_1.ActionType.DELAY:
            case ActionType_1.ActionType.DELAY_WITH_RESOURCE:
                // Could validate duration exists
                break;
            case ActionType_1.ActionType.SEIZE:
            case ActionType_1.ActionType.RELEASE:
                // Could validate resourceRequirementId exists
                break;
            case ActionType_1.ActionType.ASSIGN:
                // Could validate stateModifications exist
                break;
        }
    };
    ActivityValidation.prototype.validateActivityInteractions = function (state, issues) {
        /**
         * Validates interactions among activities to detect deadlocks or circular dependencies.
         */
        var _this = this;
        this.log("Validating activity interactions for potential deadlocks.");
        var activities = state.modelDefinition.activities.getAll();
        var visited = new Set();
        var stack = new Set();
        activities.forEach(function (activity) {
            if (!visited.has(activity.id)) {
                _this.detectCycles(activity.id, state, visited, stack, issues);
            }
        });
    };
    ActivityValidation.prototype.detectCycles = function (activityId, state, visited, stack, issues) {
        /**
         * Detects cycles within the activity graph.
         */
        var _this = this;
        visited.add(activityId);
        stack.add(activityId);
        var relationships = state.activityRelationships.get(activityId);
        if (relationships) {
            relationships.outgoingConnectors.forEach(function (connectorId) {
                var connector = state.connections.get(connectorId);
                if (connector) {
                    var targetId = connector.targetId;
                    if (!visited.has(targetId)) {
                        _this.detectCycles(targetId, state, visited, stack, issues);
                    }
                    else if (stack.has(targetId)) {
                        _this.log("Circular dependency detected involving Activity ID ".concat(activityId));
                        var activity = state.modelDefinition.activities.get(activityId);
                        issues.push(ValidationMessages_1.ValidationMessages.circularDependency(activityId, activity === null || activity === void 0 ? void 0 : activity.name));
                    }
                }
            });
        }
        stack.delete(activityId);
    };
    ActivityValidation.MAX_QUEUE_SIZE = 999999;
    ActivityValidation.MIN_CYCLE_TIME = 0.001;
    ActivityValidation.MAX_CYCLE_TIME = 86400; // 24 hours in seconds
    return ActivityValidation;
}(ValidationRule_1.ValidationRule));
exports.ActivityValidation = ActivityValidation;
