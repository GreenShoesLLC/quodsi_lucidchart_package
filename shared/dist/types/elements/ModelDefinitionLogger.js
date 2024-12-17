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
        logger.setLogging(true);
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
        this.log("    Input Buffer Capacity: ".concat(activity.inputBufferCapacity));
        this.log("    Output Buffer Capacity: ".concat(activity.outputBufferCapacity));
        this.log("    Number of Operation Steps: ".concat(((_a = activity.operationSteps) === null || _a === void 0 ? void 0 : _a.length) || 0));
        (_b = activity.operationSteps) === null || _b === void 0 ? void 0 : _b.forEach(function (step, index) {
            var _a, _b;
            _this.log("      Operation Step ".concat(index + 1, ":"));
            _this.log("        Duration: ".concat(((_a = step.duration) === null || _a === void 0 ? void 0 : _a.durationLength) || "Not defined"));
            if ((_b = step.resourceSetRequest) === null || _b === void 0 ? void 0 : _b.requests) {
                _this.log("        Resource Requests:");
                step.resourceSetRequest.requests.forEach(function (request) {
                    if ('resource' in request && request.resource) {
                        _this.log("          Resource ID: ".concat(request.resource.id, ", Quantity: ").concat(request.quantity || "Not defined"));
                    }
                });
            }
        });
    };
    ModelDefinitionLogger.prototype.logConnector = function (connector) {
        var _this = this;
        this.log("  Connector ID: ".concat(connector.id));
        this.log("    Name: ".concat(connector.name || "Unnamed"));
        this.log("    Source ID: ".concat(connector.sourceId || "Not defined"));
        this.log("    Target ID: ".concat(connector.targetId || "Not defined"));
        this.log("    Probability: ".concat(connector.probability !== undefined ? connector.probability : "Not defined"));
        this.log("    Connection Type: ".concat(connector.connectType || "Not defined"));
        var operationSteps = connector.operationSteps;
        this.log("    Number of Operation Steps: ".concat((operationSteps === null || operationSteps === void 0 ? void 0 : operationSteps.length) || 0));
        operationSteps === null || operationSteps === void 0 ? void 0 : operationSteps.forEach(function (step, index) {
            var _a, _b;
            _this.log("      Operation Step ".concat(index + 1, ":"));
            _this.log("        Duration: ".concat(((_a = step.duration) === null || _a === void 0 ? void 0 : _a.durationLength) || "Not defined"));
            if ((_b = step.resourceSetRequest) === null || _b === void 0 ? void 0 : _b.requests) {
                _this.log("        Resource Requests:");
                step.resourceSetRequest.requests.forEach(function (request) {
                    if ('resource' in request && request.resource) {
                        _this.log("          Resource ID: ".concat(request.resource.id, ", Quantity: ").concat(request.quantity || "Not defined"));
                    }
                });
            }
        });
    };
    ModelDefinitionLogger.prototype.logResource = function (resource) {
        this.log("  Resource ID: ".concat(resource.id));
        this.log("    Name: ".concat(resource.name));
        this.log("    Capacity: ".concat(resource.capacity));
    };
    ModelDefinitionLogger.prototype.logGenerator = function (generator) {
        var _a, _b;
        this.log("  Generator ID: ".concat(generator.id));
        this.log("    Name: ".concat(generator.name || "Unnamed"));
        this.log("    Activity Key ID: ".concat(generator.activityKeyId || "Not defined"));
        this.log("    Entity ID: ".concat(generator.entityId || "Not defined"));
        this.log("    Periodic Occurrences: ".concat(generator.periodicOccurrences || "Not defined"));
        var periodIntervalDuration = (_a = generator.periodIntervalDuration) === null || _a === void 0 ? void 0 : _a.durationLength;
        this.log("    Period Interval Duration: ".concat(periodIntervalDuration !== undefined ? periodIntervalDuration : "Not defined"));
        this.log("    Entities Per Creation: ".concat(generator.entitiesPerCreation || "Not defined"));
        var periodicStartDuration = (_b = generator.periodicStartDuration) === null || _b === void 0 ? void 0 : _b.durationLength;
        this.log("    Periodic Start Duration: ".concat(periodicStartDuration !== undefined ? periodicStartDuration : "Not defined"));
        this.log("    Max Entities: ".concat(generator.maxEntities || "Not defined"));
    };
    ModelDefinitionLogger.prototype.logEntity = function (entity) {
        this.log("  Entity ID: ".concat(entity.id));
        this.log("    Name: ".concat(entity.name));
    };
    return ModelDefinitionLogger;
}(QuodsiLogger_1.QuodsiLogger));
exports.ModelDefinitionLogger = ModelDefinitionLogger;
