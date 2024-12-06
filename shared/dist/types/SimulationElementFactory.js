"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationElementFactory = void 0;
var Model_1 = require("./elements/Model");
var Activity_1 = require("./elements/Activity");
var Connector_1 = require("./elements/Connector");
var Resource_1 = require("./elements/Resource");
var Generator_1 = require("./elements/Generator");
var Entity_1 = require("./elements/Entity");
var SimulationObjectType_1 = require("./elements/SimulationObjectType");
var ConnectType_1 = require("./elements/ConnectType");
var Duration_1 = require("./elements/Duration");
var SimulationElementWrapper_1 = require("./SimulationElementWrapper");
exports.SimulationElementFactory = {
    createElement: function (metadata, data) {
        switch (metadata.type) {
            case SimulationObjectType_1.SimulationObjectType.Model:
                return new SimulationElementWrapper_1.SimulationElementWrapper(this.createModel(data));
            case SimulationObjectType_1.SimulationObjectType.Activity:
                return new SimulationElementWrapper_1.SimulationElementWrapper(this.createActivity(data));
            case SimulationObjectType_1.SimulationObjectType.Connector:
                return new SimulationElementWrapper_1.SimulationElementWrapper(this.createConnector(data));
            case SimulationObjectType_1.SimulationObjectType.Resource:
                return new SimulationElementWrapper_1.SimulationElementWrapper(this.createResource(data));
            case SimulationObjectType_1.SimulationObjectType.Generator:
                return new SimulationElementWrapper_1.SimulationElementWrapper(this.createGenerator(data));
            case SimulationObjectType_1.SimulationObjectType.Entity:
                return new SimulationElementWrapper_1.SimulationElementWrapper(this.createEntity(data));
            default:
                throw new Error("Unknown element type: ".concat(metadata.type));
        }
    },
    createModel: function (data) {
        return new Model_1.Model(data.id, // Use provided ID instead of generating new one
        data.name || 'New Model', data.reps || 1, data.forecastDays || 30, data.seed, data.oneClockUnit, data.simulationTimeType, data.warmupClockPeriod, data.warmupClockPeriodUnit, data.runClockPeriod, data.runClockPeriodUnit, data.warmupDateTime ? new Date(data.warmupDateTime) : null, data.startDateTime ? new Date(data.startDateTime) : null, data.finishDateTime ? new Date(data.finishDateTime) : null);
    },
    createActivity: function (data) {
        var _a, _b;
        return new Activity_1.Activity(data.id, // Use provided ID instead of generating new one
        data.name || 'New Activity', data.capacity || 1, (_a = data.inputBufferCapacity) !== null && _a !== void 0 ? _a : Infinity, (_b = data.outputBufferCapacity) !== null && _b !== void 0 ? _b : Infinity, data.operationSteps || []);
    },
    createConnector: function (data) {
        return new Connector_1.Connector(data.id, data.name || 'New Connector', data.sourceId, data.targetId, data.probability || 1.0, data.connectType || ConnectType_1.ConnectType.Probability, data.operationSteps || []);
    },
    createResource: function (data) {
        return new Resource_1.Resource(data.id, // Use provided ID instead of generating new one
        data.name || 'New Resource', data.capacity || 1);
    },
    createGenerator: function (data) {
        var _a, _b;
        return new Generator_1.Generator(data.id, // Use provided ID instead of generating new one
        data.name || 'New Generator', data.activityKeyId || '', data.entityType || 'All', (_a = data.periodicOccurrences) !== null && _a !== void 0 ? _a : Infinity, data.periodIntervalDuration || new Duration_1.Duration(), data.entitiesPerCreation || 1, data.periodicStartDuration || new Duration_1.Duration(), (_b = data.maxEntities) !== null && _b !== void 0 ? _b : Infinity);
    },
    createEntity: function (data) {
        return new Entity_1.Entity(data.id, // Use provided ID instead of generating new one
        data.name || 'New Entity');
    }
};
