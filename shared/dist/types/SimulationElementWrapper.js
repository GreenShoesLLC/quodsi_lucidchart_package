"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationElementWrapper = void 0;
var SimulationObjectType_1 = require("./elements/SimulationObjectType");
var SimulationElementWrapper = /** @class */ (function () {
    function SimulationElementWrapper(data, version) {
        if (version === void 0) { version = '1.0.0'; }
        this.id = data.id;
        this.type = data.type;
        this.name = data.name;
        this.version = version;
        this.data = data;
    }
    SimulationElementWrapper.prototype.validate = function () {
        var messages = [];
        switch (this.type) {
            case SimulationObjectType_1.SimulationObjectType.Model:
                this.validateModel(this.data, messages);
                break;
            case SimulationObjectType_1.SimulationObjectType.Activity:
                this.validateActivity(this.data, messages);
                break;
            case SimulationObjectType_1.SimulationObjectType.Connector:
                this.validateConnector(this.data, messages);
                break;
            case SimulationObjectType_1.SimulationObjectType.Resource:
                this.validateResource(this.data, messages);
                break;
            case SimulationObjectType_1.SimulationObjectType.Generator:
                this.validateGenerator(this.data, messages);
                break;
            case SimulationObjectType_1.SimulationObjectType.Entity:
                this.validateEntity(this.data, messages);
                break;
        }
        var errorCount = messages.filter(function (m) { return m.type === 'error'; }).length;
        var warningCount = messages.filter(function (m) { return m.type === 'warning'; }).length;
        return {
            isValid: errorCount === 0,
            errorCount: errorCount,
            warningCount: warningCount,
            messages: messages
        };
    };
    SimulationElementWrapper.prototype.toStorage = function () {
        return __assign(__assign({}, this.data), { version: this.version });
    };
    SimulationElementWrapper.prototype.fromStorage = function (data) {
        return new SimulationElementWrapper(data, data.version);
    };
    SimulationElementWrapper.prototype.validateModel = function (model, messages) {
        if (model.reps < 1) {
            messages.push({ type: 'error', message: 'Model must have at least 1 replication', elementId: model.id });
        }
        if (model.forecastDays < 1) {
            messages.push({ type: 'error', message: 'Forecast days must be at least 1', elementId: model.id });
        }
    };
    SimulationElementWrapper.prototype.validateActivity = function (activity, messages) {
        if (activity.capacity < 1) {
            messages.push({ type: 'error', message: 'Activity capacity must be at least 1', elementId: activity.id });
        }
        if (!activity.operationSteps || activity.operationSteps.length === 0) {
            messages.push({ type: 'warning', message: 'Activity has no operation steps', elementId: activity.id });
        }
    };
    SimulationElementWrapper.prototype.validateConnector = function (connector, messages) {
        if (connector.probability < 0 || connector.probability > 1) {
            messages.push({ type: 'error', message: 'Connector probability must be between 0 and 1', elementId: connector.id });
        }
    };
    SimulationElementWrapper.prototype.validateResource = function (resource, messages) {
        if (resource.capacity < 1) {
            messages.push({ type: 'error', message: 'Resource capacity must be at least 1', elementId: resource.id });
        }
    };
    SimulationElementWrapper.prototype.validateGenerator = function (generator, messages) {
        if (generator.entitiesPerCreation < 1) {
            messages.push({ type: 'error', message: 'Generator must create at least 1 entity per creation', elementId: generator.id });
        }
        if (!generator.periodIntervalDuration) {
            messages.push({ type: 'error', message: 'Generator must have a period interval duration', elementId: generator.id });
        }
    };
    SimulationElementWrapper.prototype.validateEntity = function (entity, messages) {
        if (!entity.name || entity.name.trim().length === 0) {
            messages.push({ type: 'warning', message: 'Entity has no name', elementId: entity.id });
        }
    };
    return SimulationElementWrapper;
}());
exports.SimulationElementWrapper = SimulationElementWrapper;
