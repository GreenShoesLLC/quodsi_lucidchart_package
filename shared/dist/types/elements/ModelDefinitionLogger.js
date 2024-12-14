"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelDefinitionLogger = void 0;
var ModelDefinitionLogger = /** @class */ (function () {
    function ModelDefinitionLogger() {
    }
    ModelDefinitionLogger.log = function (modelDefinition) {
        console.log("\n[ModelDefinitionLogger] Logging Model Definition:");
        try {
            // Log basic model details
            console.log("Model ID: ".concat(modelDefinition.id));
            console.log("Model Name: ".concat(modelDefinition.name));
            this.logActivities(modelDefinition);
            this.logConnectors(modelDefinition);
            this.logResources(modelDefinition);
            this.logGenerators(modelDefinition);
            this.logEntities(modelDefinition);
        }
        catch (error) {
            console.error("[ModelDefinitionLogger] An error occurred while logging the model definition:", error);
        }
    };
    ModelDefinitionLogger.logActivities = function (modelDefinition) {
        var _this = this;
        console.log("\nActivities:");
        var activities = modelDefinition.activities.getAll();
        activities.forEach(function (activity) { return _this.safeExecute(function () { return _this.logActivity(activity); }, "Activity ID: ".concat(activity === null || activity === void 0 ? void 0 : activity.id)); });
    };
    ModelDefinitionLogger.logConnectors = function (modelDefinition) {
        var _this = this;
        console.log("\nConnectors:");
        var connectors = modelDefinition.connectors.getAll();
        connectors.forEach(function (connector) { return _this.safeExecute(function () { return _this.logConnector(connector); }, "Connector ID: ".concat(connector === null || connector === void 0 ? void 0 : connector.id)); });
    };
    ModelDefinitionLogger.logResources = function (modelDefinition) {
        var _this = this;
        console.log("\nResources:");
        var resources = modelDefinition.resources.getAll();
        resources.forEach(function (resource) { return _this.safeExecute(function () { return _this.logResource(resource); }, "Resource ID: ".concat(resource === null || resource === void 0 ? void 0 : resource.id)); });
    };
    ModelDefinitionLogger.logGenerators = function (modelDefinition) {
        var _this = this;
        console.log("\nGenerators:");
        var generators = modelDefinition.generators.getAll();
        generators.forEach(function (generator) { return _this.safeExecute(function () { return _this.logGenerator(generator); }, "Generator ID: ".concat(generator === null || generator === void 0 ? void 0 : generator.id)); });
    };
    ModelDefinitionLogger.logEntities = function (modelDefinition) {
        var _this = this;
        console.log("\nEntities:");
        var entities = modelDefinition.entities.getAll();
        entities.forEach(function (entity) { return _this.safeExecute(function () { return _this.logEntity(entity); }, "Entity ID: ".concat(entity === null || entity === void 0 ? void 0 : entity.id)); });
    };
    ModelDefinitionLogger.safeExecute = function (action, context) {
        try {
            action();
        }
        catch (error) {
            console.error("[ModelDefinitionLogger] Failed to log ".concat(context, ":"), error);
        }
    };
    ModelDefinitionLogger.logActivity = function (activity) {
        var _a, _b;
        console.log("  Activity ID: ".concat(activity.id));
        console.log("    Name: ".concat(activity.name));
        console.log("    Capacity: ".concat(activity.capacity));
        console.log("    Input Buffer Capacity: ".concat(activity.inputBufferCapacity));
        console.log("    Output Buffer Capacity: ".concat(activity.outputBufferCapacity));
        console.log("    Number of Operation Steps: ".concat(((_a = activity.operationSteps) === null || _a === void 0 ? void 0 : _a.length) || 0));
        (_b = activity.operationSteps) === null || _b === void 0 ? void 0 : _b.forEach(function (step, index) {
            var _a, _b;
            console.log("      Operation Step ".concat(index + 1, ":"));
            console.log("        Duration: ".concat(((_a = step.duration) === null || _a === void 0 ? void 0 : _a.durationLength) || "Not defined"));
            if ((_b = step.resourceSetRequest) === null || _b === void 0 ? void 0 : _b.requests) {
                console.log("        Resource Requests:");
                step.resourceSetRequest.requests.forEach(function (request) {
                    if ('resource' in request && request.resource) {
                        console.log("          Resource ID: ".concat(request.resource.id, ", Quantity: ").concat(request.quantity || "Not defined"));
                    }
                });
            }
        });
    };
    ModelDefinitionLogger.logConnector = function (connector) {
        console.log("  Connector ID: ".concat(connector.id));
        console.log("    Name: ".concat(connector.name || "Unnamed"));
        console.log("    Source ID: ".concat(connector.sourceId || "Not defined"));
        console.log("    Target ID: ".concat(connector.targetId || "Not defined"));
        console.log("    Probability: ".concat(connector.probability !== undefined ? connector.probability : "Not defined"));
        console.log("    Connection Type: ".concat(connector.connectType || "Not defined"));
        var operationSteps = connector.operationSteps;
        console.log("    Number of Operation Steps: ".concat((operationSteps === null || operationSteps === void 0 ? void 0 : operationSteps.length) || 0));
        operationSteps === null || operationSteps === void 0 ? void 0 : operationSteps.forEach(function (step, index) {
            var _a, _b;
            console.log("      Operation Step ".concat(index + 1, ":"));
            console.log("        Duration: ".concat(((_a = step.duration) === null || _a === void 0 ? void 0 : _a.durationLength) || "Not defined"));
            if ((_b = step.resourceSetRequest) === null || _b === void 0 ? void 0 : _b.requests) {
                console.log("        Resource Requests:");
                step.resourceSetRequest.requests.forEach(function (request) {
                    if ('resource' in request && request.resource) {
                        console.log("          Resource ID: ".concat(request.resource.id, ", Quantity: ").concat(request.quantity || "Not defined"));
                    }
                });
            }
        });
    };
    ModelDefinitionLogger.logResource = function (resource) {
        console.log("  Resource ID: ".concat(resource.id));
        console.log("    Name: ".concat(resource.name));
        console.log("    Capacity: ".concat(resource.capacity));
    };
    ModelDefinitionLogger.logGenerator = function (generator) {
        var _a, _b;
        console.log("  Generator ID: ".concat(generator.id));
        console.log("    Name: ".concat(generator.name || "Unnamed"));
        console.log("    Activity Key ID: ".concat(generator.activityKeyId || "Not defined"));
        console.log("    Entity ID: ".concat(generator.entityId || "Not defined"));
        console.log("    Periodic Occurrences: ".concat(generator.periodicOccurrences || "Not defined"));
        var periodIntervalDuration = (_a = generator.periodIntervalDuration) === null || _a === void 0 ? void 0 : _a.durationLength;
        console.log("    Period Interval Duration: ".concat(periodIntervalDuration !== undefined ? periodIntervalDuration : "Not defined"));
        console.log("    Entities Per Creation: ".concat(generator.entitiesPerCreation || "Not defined"));
        var periodicStartDuration = (_b = generator.periodicStartDuration) === null || _b === void 0 ? void 0 : _b.durationLength;
        console.log("    Periodic Start Duration: ".concat(periodicStartDuration !== undefined ? periodicStartDuration : "Not defined"));
        console.log("    Max Entities: ".concat(generator.maxEntities || "Not defined"));
    };
    ModelDefinitionLogger.logEntity = function (entity) {
        console.log("  Entity ID: ".concat(entity.id));
        console.log("    Name: ".concat(entity.name));
    };
    return ModelDefinitionLogger;
}());
exports.ModelDefinitionLogger = ModelDefinitionLogger;
