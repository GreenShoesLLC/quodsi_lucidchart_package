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
exports.ResourceValidation = void 0;
var ValidationRule_1 = require("../common/ValidationRule");
var ValidationMessages_1 = require("../common/ValidationMessages");
var types_1 = require("../../quodsi-messaging/validation/types");
var RequirementMode_1 = require("../../types/elements/RequirementMode");
var ActionType_1 = require("../../types/elements/actions/ActionType");
var ResourceValidation = /** @class */ (function (_super) {
    __extends(ResourceValidation, _super);
    function ResourceValidation() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ResourceValidation.prototype.validate = function (state, issues) {
        var _this = this;
        var resources = state.modelDefinition.resources.getAll();
        this.log("Starting validation of resources.");
        // First validate each resource's data
        resources.forEach(function (resource) {
            _this.validateResourceData(resource, issues);
        });
        // Then check resource usage across activities
        this.validateResourceUsage(state, issues);
        this.log("Completed validation of resources.");
    };
    ResourceValidation.prototype.validateResourceData = function (resource, issues) {
        /**
         * Validates the basic properties of a resource, such as name and capacity.
         */
        this.log("Validating data for Resource ID: ".concat(resource.id));
        if (!resource.name || resource.name.trim().length === 0) {
            this.log("Resource ID ".concat(resource.id, " has no name."));
            issues.push(ValidationMessages_1.ValidationMessages.missingName('Resource', resource.id, resource.name));
        }
        if (typeof resource.capacity !== 'number' || resource.capacity < 1) {
            this.log("Resource ID ".concat(resource.id, " has invalid capacity: ").concat(resource.capacity));
            issues.push(ValidationMessages_1.ValidationMessages.invalidCapacity('Resource', resource.id, 1, resource.name));
        }
        if (Math.floor(resource.capacity) !== resource.capacity) {
            this.log("Resource ID ".concat(resource.id, " has non-integer capacity: ").concat(resource.capacity));
            issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.ERROR, 'resource_non_integer_capacity', "Resource ".concat(resource.id, " capacity must be a whole number"), resource.id));
        }
        if (resource.capacity > 1000000) {
            this.log("Resource ID ".concat(resource.id, " has unusually high capacity: ").concat(resource.capacity));
            issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.WARNING, 'resource_high_capacity', "Resource ".concat(resource.id, " has unusually high capacity (").concat(resource.capacity, ")"), resource.id));
        }
    };
    ResourceValidation.prototype.validateResourceUsage = function (state, issues) {
        var _this = this;
        var _a;
        this.log("Validating resource usage across activities.");
        var resources = state.modelDefinition.resources.getAll();
        var activities = state.modelDefinition.activities.getAll();
        var resourceRequirements = ((_a = state.modelDefinition.resourceRequirements) === null || _a === void 0 ? void 0 : _a.getAll()) || [];
        var requirementMap = new Map(resourceRequirements.map(function (req) { return [req.id, req]; }));
        // Resource ID -> Set of Activity IDs
        var resourceUsage = new Map();
        // Initialize resource usage map
        resources.forEach(function (resource) {
            resourceUsage.set(resource.id, new Set());
        });
        // Process activities and their resource requirements from actions
        activities.forEach(function (activity) {
            if (activity.actions) {
                activity.actions.forEach(function (action) {
                    var requirementId = null;
                    // Extract requirementId based on action type
                    switch (action.actionType) {
                        case ActionType_1.ActionType.SEIZE:
                            requirementId = action.resourceRequirementId || null;
                            break;
                        case ActionType_1.ActionType.RELEASE:
                            requirementId = action.resourceRequirementId || null;
                            break;
                        case ActionType_1.ActionType.DELAY_WITH_RESOURCE:
                            requirementId = action.resourceRequirementId;
                            break;
                    }
                    if (requirementId) {
                        var requirement = requirementMap.get(requirementId);
                        if (requirement) {
                            _this.processResourceRequirement(requirement, activity, resourceUsage, issues);
                        }
                        else {
                            issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.ERROR, 'invalid_requirement_reference', "Invalid resource requirement reference: ".concat(requirementId), activity.id));
                        }
                    }
                });
            }
        });
        // Check for unused resources
        resourceUsage.forEach(function (usedByActivities, resourceId) {
            if (usedByActivities.size === 0) {
                _this.log("Resource ID ".concat(resourceId, " is not used by any activity."));
                // Look up resource to get name
                var resource = resources.find(function (r) { return r.id === resourceId; });
                var displayName = (resource === null || resource === void 0 ? void 0 : resource.name) && resource.name.trim() !== ''
                    ? "'".concat(resource.name, "'")
                    : resourceId;
                issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.WARNING, 'resource_not_used', "Resource ".concat(displayName, " is not used by any activity"), resourceId));
            }
        });
        this.checkResourceConflicts(state, resourceUsage, issues);
    };
    ResourceValidation.prototype.processResourceRequirement = function (requirement, activity, resourceUsage, issues) {
        var _this = this;
        requirement.rootClauses.forEach(function (clause) {
            // Process based on requirement mode
            if (clause.mode === RequirementMode_1.RequirementMode.REQUIRE_ALL) {
                // All resources must be available
                clause.requests.forEach(function (request) {
                    _this.addResourceUsage(request.resourceId, activity, resourceUsage);
                });
            }
            else if (clause.mode === RequirementMode_1.RequirementMode.REQUIRE_ANY) {
                // At least one resource must be available
                // Just mark all as potentially used, detailed conflict resolution 
                // will be handled in checkResourceConflicts
                clause.requests.forEach(function (request) {
                    _this.addResourceUsage(request.resourceId, activity, resourceUsage);
                });
            }
        });
    };
    ResourceValidation.prototype.addResourceUsage = function (resourceId, activity, resourceUsage) {
        var usageSet = resourceUsage.get(resourceId);
        if (usageSet) {
            usageSet.add(activity.id);
        }
        else {
            this.log("Warning: Reference to non-existent resource ID: ".concat(resourceId));
        }
    };
    ResourceValidation.prototype.processResourceRequests = function (requests, activity, resourceUsage, issues) {
        /**
         * Processes resource requests within an activity's operation steps.
         */
        var _this = this;
        requests.forEach(function (request) {
            if (request.requests) {
                _this.processResourceRequests(request.requests, activity, resourceUsage, issues);
                return;
            }
            if (request.resource) {
                var resourceId = request.resource.id;
                var usageSet = resourceUsage.get(resourceId);
                if (usageSet) {
                    usageSet.add(activity.id);
                    if (typeof request.quantity !== 'number' || request.quantity < 1) {
                        _this.log("Activity ID ".concat(activity.id, " has invalid resource quantity for Resource ID ").concat(resourceId));
                        issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.ERROR, 'invalid_resource_quantity', "Invalid resource quantity in activity ".concat(activity.id, " for resource ").concat(resourceId), activity.id));
                    }
                }
                else {
                    _this.log("Activity ID ".concat(activity.id, " references non-existent Resource ID ").concat(resourceId));
                    issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.ERROR, 'nonexistent_resource_reference', "Activity ".concat(activity.id, " references non-existent resource ").concat(resourceId), activity.id));
                }
            }
        });
    };
    ResourceValidation.prototype.checkResourceConflicts = function (state, resourceUsage, issues) {
        /**
         * Checks for conflicts in resource usage, such as overutilization.
         */
        var _this = this;
        this.log("Checking for resource usage conflicts.");
        var resources = state.modelDefinition.resources.getAll();
        resources.forEach(function (resource) {
            var usedByActivities = resourceUsage.get(resource.id);
            if (usedByActivities && usedByActivities.size > 1) {
                _this.validateConcurrentResourceUsage(state, resource, Array.from(usedByActivities), issues);
            }
        });
    };
    ResourceValidation.prototype.validateConcurrentResourceUsage = function (state, resource, activityIds, issues) {
        /**
         * Validates concurrent usage of a resource across multiple activities.
         */
        var _this = this;
        this.log("Validating concurrent usage for Resource ID: ".concat(resource.id));
        var activities = activityIds
            .map(function (id) { return state.modelDefinition.activities.get(id); })
            .filter(function (activity) { return activity !== undefined; });
        var totalMaxPossibleDemand = 0;
        activities.forEach(function (activity) {
            var maxDemand = _this.calculateMaxResourceDemand(activity, resource.id);
            totalMaxPossibleDemand += maxDemand;
        });
        if (totalMaxPossibleDemand > resource.capacity) {
            this.log("Resource ID ".concat(resource.id, " might be overutilized. Capacity: ").concat(resource.capacity, ", Demand: ").concat(totalMaxPossibleDemand));
            issues.push(ValidationMessages_1.ValidationMessages.createIssue(types_1.ValidationSeverity.WARNING, 'resource_overutilized', "Potential resource conflict: Resource ".concat(resource.id, " (capacity: ").concat(resource.capacity, ") might be overutilized. Maximum possible demand: ").concat(totalMaxPossibleDemand), resource.id));
        }
    };
    ResourceValidation.prototype.calculateMaxResourceDemand = function (activity, resourceId) {
        /**
         * Calculates the maximum possible demand for a resource by a single activity.
         * Note: This is a simplified calculation - actual demand depends on requirement structure.
         */
        // For now, return 1 as a basic default since the detailed resource demand
        // calculation would require resolving requirement clauses to actual resources
        return 1;
    };
    return ResourceValidation;
}(ValidationRule_1.ValidationRule));
exports.ResourceValidation = ResourceValidation;
