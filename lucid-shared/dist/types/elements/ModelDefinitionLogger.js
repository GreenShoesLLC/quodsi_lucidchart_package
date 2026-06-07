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
exports.ModelDefinitionLogger = void 0;
var QuodsiLogger_1 = require("../../core/logging/QuodsiLogger");
var ModelDefinitionLogger = /** @class */ (function (_super) {
    __extends(ModelDefinitionLogger, _super);
    function ModelDefinitionLogger() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.LOG_PREFIX = '[ModelDefinitionLogger]';
        return _this;
    }
    ModelDefinitionLogger.logModelDefinition = function (modelDefinition) {
        var logger = new ModelDefinitionLogger();
        logger.setLogging(false);
        logger.logDefinition(modelDefinition);
    };
    ModelDefinitionLogger.prototype.logDefinition = function (modelDefinition) {
        this.log("\nLogging Model Definition:");
        try {
            // Log basic model details
            this.log("Model ID: ".concat(modelDefinition.id));
            this.log("Model Name: ".concat(modelDefinition.name));
            this.logActivities(modelDefinition);
            this.logConnectors(modelDefinition);
            this.logResources(modelDefinition);
            this.logGenerators(modelDefinition);
            this.logEntities(modelDefinition);
        }
        catch (error) {
            this.logError("An error occurred while logging the model definition:", error);
        }
    };
    ModelDefinitionLogger.prototype.logActivities = function (modelDefinition) {
        var _this = this;
        this.log("\nActivities:");
        var activities = modelDefinition.activities.getAll();
        activities.forEach(function (activity) { return _this.safeExecute(function () { return _this.logActivity(activity); }, "Activity ID: ".concat(activity === null || activity === void 0 ? void 0 : activity.id)); });
    };
    ModelDefinitionLogger.prototype.logConnectors = function (modelDefinition) {
        var _this = this;
        this.log("\nConnectors:");
        var connectors = modelDefinition.connectors.getAll();
        connectors.forEach(function (connector) { return _this.safeExecute(function () { return _this.logConnector(connector); }, "Connector ID: ".concat(connector === null || connector === void 0 ? void 0 : connector.id)); });
    };
    ModelDefinitionLogger.prototype.logResources = function (modelDefinition) {
        var _this = this;
        this.log("\nResources:");
        var resources = modelDefinition.resources.getAll();
        resources.forEach(function (resource) { return _this.safeExecute(function () { return _this.logResource(resource); }, "Resource ID: ".concat(resource === null || resource === void 0 ? void 0 : resource.id)); });
    };
    ModelDefinitionLogger.prototype.logResourceRequirements = function (modelDefinition) {
        var _this = this;
        this.log("\ResourceRequirement:");
        var requirements = modelDefinition.resourceRequirements.getAll();
        requirements.forEach(function (requirement) { return _this.safeExecute(function () { return _this.logResourceRequirement(requirement); }, "Resource ID: ".concat(requirement === null || requirement === void 0 ? void 0 : requirement.id)); });
    };
    ModelDefinitionLogger.prototype.logGenerators = function (modelDefinition) {
        var _this = this;
        this.log("\nGenerators:");
        var generators = modelDefinition.generators.getAll();
        generators.forEach(function (generator) { return _this.safeExecute(function () { return _this.logGenerator(generator); }, "Generator ID: ".concat(generator === null || generator === void 0 ? void 0 : generator.id)); });
    };
    ModelDefinitionLogger.prototype.logEntities = function (modelDefinition) {
        var _this = this;
        this.log("\nEntities:");
        var entities = modelDefinition.entities.getAll();
        entities.forEach(function (entity) { return _this.safeExecute(function () { return _this.logEntity(entity); }, "Entity ID: ".concat(entity === null || entity === void 0 ? void 0 : entity.id)); });
    };
    ModelDefinitionLogger.prototype.safeExecute = function (action, context) {
        try {
            action();
        }
        catch (error) {
            this.logError("Failed to log ".concat(context, ":"), error);
        }
    };
    ModelDefinitionLogger.prototype.logActivity = function (activity) {
        var _this = this;
        var _a, _b;
        this.log("  Activity ID: ".concat(activity.id));
        this.log("    Name: ".concat(activity.name));
        this.log("    Capacity: ".concat(activity.capacity));
        this.log("    Inbound Queue Capacity: ".concat(activity.inboundQueueCapacity));
        this.log("    Outbound Queue Capacity: ".concat(activity.outboundQueueCapacity));
        this.log("    Number of Actions: ".concat(((_a = activity.actions) === null || _a === void 0 ? void 0 : _a.length) || 0));
        (_b = activity.actions) === null || _b === void 0 ? void 0 : _b.forEach(function (action, index) {
            _this.log("      Action ".concat(index + 1, ":"));
            _this.log("        Type: ".concat(action.actionType));
        });
    };
    ModelDefinitionLogger.prototype.logConnector = function (connector) {
        var _this = this;
        var _a, _b;
        this.log("  Connector ID: ".concat(connector.id));
        this.log("    Name: ".concat(connector.name || "Unnamed"));
        this.log("    Source ID: ".concat(connector.sourceId || "Not defined"));
        this.log("    Target ID: ".concat(connector.targetId || "Not defined"));
        this.log("    Weight: ".concat(connector.weight !== undefined ? connector.weight : "Not defined"));
        this.log("    Number of Actions: ".concat(((_a = connector.actions) === null || _a === void 0 ? void 0 : _a.length) || 0));
        (_b = connector.actions) === null || _b === void 0 ? void 0 : _b.forEach(function (action, index) {
            _this.log("      Action ".concat(index + 1, ":"));
            _this.log("        Type: ".concat(action.actionType));
        });
    };
    ModelDefinitionLogger.prototype.logResource = function (resource) {
        this.log("  Resource ID: ".concat(resource.id));
        this.log("    Name: ".concat(resource.name));
        this.log("    Capacity: ".concat(resource.capacity));
    };
    ModelDefinitionLogger.prototype.logResourceRequirement = function (resourceRequirement) {
        this.log("  Resource ID: ".concat(resourceRequirement.id));
        this.log("    Name: ".concat(resourceRequirement.name));
        // this.log(`    Mode: ${resourceRequirement.mode}`);
    };
    ModelDefinitionLogger.prototype.logGenerator = function (generator) {
        var _a, _b, _c, _d;
        this.log("  Generator ID: ".concat(generator.id));
        this.log("    Name: ".concat(generator.name || "Unnamed"));
        this.log("    Exit Connector: ".concat(generator.exitConnector || "Not defined"));
        this.log("    Entity ID: ".concat(((_a = generator.generationConfig) === null || _a === void 0 ? void 0 : _a.entityId) || "Not defined"));
        this.log("    Periodic Occurrences: ".concat(((_b = generator.generationConfig) === null || _b === void 0 ? void 0 : _b.periodicOccurrences) || "Not defined"));
        // const periodIntervalDuration = generator.generationConfig?.periodIntervalDuration?.durationLength;
        // this.log(`    Period Interval Duration: ${periodIntervalDuration !== undefined ? periodIntervalDuration : "Not defined"}`);
        this.log("    Entities Per Creation: ".concat(((_c = generator.generationConfig) === null || _c === void 0 ? void 0 : _c.entitiesPerCreation) || "Not defined"));
        // const periodicStartDuration = generator.generationConfig?.periodicStartDuration?.durationLength;
        // this.log(`    Periodic Start Duration: ${periodicStartDuration !== undefined ? periodicStartDuration : "Not defined"}`);
        this.log("    Max Entities: ".concat(((_d = generator.generationConfig) === null || _d === void 0 ? void 0 : _d.maxEntities) || "Not defined"));
    };
    ModelDefinitionLogger.prototype.logEntity = function (entity) {
        this.log("  Entity ID: ".concat(entity.id));
        this.log("    Name: ".concat(entity.name));
    };
    return ModelDefinitionLogger;
}(QuodsiLogger_1.QuodsiLogger));
exports.ModelDefinitionLogger = ModelDefinitionLogger;
