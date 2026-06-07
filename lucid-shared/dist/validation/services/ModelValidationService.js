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
exports.ModelValidationService = void 0;
var QuodsiLogger_1 = require("../../core/logging/QuodsiLogger");
var types_1 = require("../../quodsi-messaging/validation/types");
var ValidationMessages_1 = require("../common/ValidationMessages");
var ActivityValidation_1 = require("../rules/ActivityValidation");
var ConnectorValidation_1 = require("../rules/ConnectorValidation");
var ElementCountsValidation_1 = require("../rules/ElementCountsValidation");
var GeneratorValidation_1 = require("../rules/GeneratorValidation");
var GeneratorPathValidation_1 = require("../rules/GeneratorPathValidation");
var ResourceValidation_1 = require("../rules/ResourceValidation");
var EntityValidation_1 = require("../rules/EntityValidation");
var ActionType_1 = require("../../types/elements/actions/ActionType");
/**
 * Service for validating ModelDefinition objects against business rules.
 *
 * Coordinates multiple validation rules and aggregates results into a single
 * ValidationResult. Implements caching to avoid re-validating unchanged models.
 *
 * @example
 * ```typescript
 * const validator = new ModelValidationService();
 * validator.setLogging(true);
 * const result = validator.validate(modelDefinition);
 *
 * if (!result.isValid) {
 *   console.error('Validation failed:', result.messages);
 * }
 * ```
 */
var ModelValidationService = /** @class */ (function (_super) {
    __extends(ModelValidationService, _super);
    function ModelValidationService() {
        var _this = _super.call(this) || this;
        _this.LOG_PREFIX = "[ModelValidation]";
        _this.cachedState = null;
        _this.lastModelDefinitionHash = null;
        _this.rules = [
            new ElementCountsValidation_1.ElementCountsValidation(),
            new ActivityValidation_1.ActivityValidation(),
            new ConnectorValidation_1.ConnectorValidation(),
            new GeneratorValidation_1.GeneratorValidation(),
            new GeneratorPathValidation_1.GeneratorPathValidation(),
            new ResourceValidation_1.ResourceValidation(),
            new EntityValidation_1.EntityValidation()
        ];
        _this.setLogging(false);
        return _this;
    }
    /**
     * Validates a ModelDefinition and returns structured validation results.
     *
     * Uses caching based on model hash. If the model hasn't changed since the
     * last validation, returns cached results. Otherwise, runs all validation
     * rules and caches the new results.
     *
     * @param modelDefinition - The model to validate
     * @returns ValidationResult containing validation status, summary counts, and issues
     */
    ModelValidationService.prototype.validate = function (modelDefinition) {
        var issues = [];
        try {
            // Generate a hash of the model definition for cache comparison
            var currentHash = this.generateModelHash(modelDefinition);
            // Create or retrieve cached ModelState
            var state = this.getModelState(modelDefinition, currentHash);
            // Batch validate all rules
            this.batchValidate(state, issues);
            // Add success message if no issues found
            if (issues.length === 0) {
                issues.push(ValidationMessages_1.ValidationMessages.validationSuccess());
            }
            // Calculate validation metrics
            var result = this.calculateValidationMetrics(issues);
            // Log validation results
            this.logValidationResults(result);
            return result;
        }
        catch (error) {
            // Always log critical validation errors, regardless of logging settings
            console.error("".concat(this.LOG_PREFIX, " Critical validation error:"), error);
            return {
                isValid: false,
                issues: [ValidationMessages_1.ValidationMessages.validationError(error)],
                summary: {
                    errorCount: 1,
                    warningCount: 0,
                    infoCount: 0
                }
            };
        }
    };
    /**
     * Enables or disables logging for a specific validation rule.
     *
     * @param ruleName - Name of the validation rule class (use ValidationRuleName enum for type safety)
     * @param enabled - Whether to enable logging for this rule
     */
    ModelValidationService.prototype.setRuleLogging = function (ruleName, enabled) {
        var rule = this.rules.find(function (r) { return r.constructor.name === ruleName; });
        if (rule) {
            rule.setLogging(enabled);
            this.log("Logging for ".concat(ruleName, " set to ").concat(enabled));
        }
        else {
            this.logWarning("Validation rule ".concat(ruleName, " not found."));
        }
    };
    /**
     * Generates a hash of the model to detect changes.
     *
     * Hash includes both element counts and content hash of key properties.
     * Used for cache invalidation.
     *
     * @param modelDefinition - The model to hash
     * @returns Hash string representing current model state
     */
    ModelValidationService.prototype.generateModelHash = function (modelDefinition) {
        // Include element counts and content hash
        var counts = [
            modelDefinition.activities.size(),
            modelDefinition.connectors.size(),
            modelDefinition.resources.size(),
            modelDefinition.generators.size(),
            modelDefinition.entities.size()
        ].join('-');
        var contentHash = this.hashModelContent(modelDefinition);
        return "".concat(counts, ":").concat(contentHash);
    };
    ModelValidationService.prototype.hashModelContent = function (modelDefinition) {
        // Hash key properties of elements
        var activities = modelDefinition.activities.getAll()
            .map(function (a) { return "".concat(a.id, ":").concat(a.name, ":").concat(a.capacity); })
            .sort()
            .join('|');
        var connectors = modelDefinition.connectors.getAll()
            .map(function (c) { return "".concat(c.id, ":").concat(c.sourceId, ":").concat(c.targetId, ":").concat(c.weight); })
            .sort()
            .join('|');
        var resources = modelDefinition.resources.getAll()
            .map(function (r) { return "".concat(r.id, ":").concat(r.name, ":").concat(r.capacity); })
            .sort()
            .join('|');
        var combined = "".concat(activities, "||").concat(connectors, "||").concat(resources);
        return this.simpleStringHash(combined);
    };
    ModelValidationService.prototype.simpleStringHash = function (str) {
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            var char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    };
    ModelValidationService.prototype.getModelState = function (modelDefinition, currentHash) {
        // Reuse cached state if model hasn't changed
        if (this.cachedState && this.lastModelDefinitionHash === currentHash) {
            this.log("Model Definition hasn't changed, reusing cached validation");
            return this.cachedState;
        }
        this.log("Model Definition has changed");
        // Create new state
        var state = {
            modelDefinition: modelDefinition,
            connections: new Map(modelDefinition.connectors.getAll().map(function (c) { return [c.id, c]; })),
            activityRelationships: this.buildActivityRelationships(modelDefinition)
        };
        // Cache the new state
        this.cachedState = state;
        this.lastModelDefinitionHash = currentHash;
        return state;
    };
    ModelValidationService.prototype.batchValidate = function (state, issues) {
        this.log("[ModelValidation] Starting batch validation.");
        // Synchronous validation - rules are all synchronous
        this.rules.forEach(function (rule) {
            rule.validate(state, issues);
        });
        this.log("[ModelValidation] Batch validation completed.");
    };
    ModelValidationService.prototype.calculateValidationMetrics = function (issues) {
        var errorCount = issues.filter(function (i) { return i.severity === types_1.ValidationSeverity.ERROR; }).length;
        var warningCount = issues.filter(function (i) { return i.severity === types_1.ValidationSeverity.WARNING; }).length;
        var infoCount = issues.filter(function (i) { return i.severity === types_1.ValidationSeverity.INFO; }).length;
        return {
            isValid: errorCount === 0,
            issues: issues,
            summary: {
                errorCount: errorCount,
                warningCount: warningCount,
                infoCount: infoCount
            }
        };
    };
    ModelValidationService.prototype.logValidationResults = function (result) {
        this.log('[ModelValidation] Validation results:', {
            isValid: result.isValid,
            errorCount: result.summary.errorCount,
            warningCount: result.summary.warningCount,
            infoCount: result.summary.infoCount,
            issueCount: result.issues.length,
            issues: result.issues
        });
    };
    /**
     * Builds a map of activity relationships for validation rules.
     *
     * Creates a comprehensive view of how activities are connected and
     * which resources they use. Used by validation rules to check
     * connectivity and resource usage.
     *
     * @param modelDefinition - The model to analyze
     * @returns Map of activity IDs to their relationship data
     */
    ModelValidationService.prototype.buildActivityRelationships = function (modelDefinition) {
        var _a;
        var relationships = new Map();
        var activities = modelDefinition.activities.getAll();
        var connectors = modelDefinition.connectors.getAll();
        var resourceRequirements = ((_a = modelDefinition.resourceRequirements) === null || _a === void 0 ? void 0 : _a.getAll()) || [];
        // Build requirement map once
        var requirementMap = new Map(resourceRequirements.map(function (req) { return [req.id, req]; }));
        // Single pass: initialize relationships and populate resource assignments
        activities.forEach(function (activity) {
            var _a;
            var assignedResources = new Set();
            // Process resource assignments from actions
            (_a = activity.actions) === null || _a === void 0 ? void 0 : _a.forEach(function (action) {
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
                        requirement.rootClauses.forEach(function (clause) {
                            clause.requests.forEach(function (request) {
                                assignedResources.add(request.resourceId);
                            });
                        });
                    }
                }
            });
            relationships.set(activity.id, {
                incomingConnectors: new Set(),
                outgoingConnectors: new Set(),
                assignedResources: assignedResources
            });
        });
        // Single pass for connectors
        connectors.forEach(function (connector) {
            var source = relationships.get(connector.sourceId);
            var target = relationships.get(connector.targetId);
            if (source) {
                source.outgoingConnectors.add(connector.id);
            }
            if (target) {
                target.incomingConnectors.add(connector.id);
            }
        });
        return relationships;
    };
    return ModelValidationService;
}(QuodsiLogger_1.QuodsiLogger));
exports.ModelValidationService = ModelValidationService;
