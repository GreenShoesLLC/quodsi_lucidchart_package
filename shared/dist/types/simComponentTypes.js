"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimComponentTypes = exports.SimComponentFactory = void 0;
var PeriodUnit_1 = require("./elements/PeriodUnit");
var DurationType_1 = require("./elements/DurationType");
var SimulationObjectType_1 = require("./elements/SimulationObjectType");
var ConnectType_1 = require("./elements/ConnectType");
var simComponentType_1 = require("./simComponentType");
var ModelDefaults_1 = require("./elements/ModelDefaults");
var SimComponentFactory = /** @class */ (function () {
    function SimComponentFactory() {
    }
    SimComponentFactory.createEmptyDuration = function () {
        return {
            durationLength: 0,
            durationPeriodUnit: PeriodUnit_1.PeriodUnit.MINUTES,
            durationType: DurationType_1.DurationType.CONSTANT,
            distribution: null
        };
    };
    SimComponentFactory.createEmpty = function (type, id) {
        var creator = this.creators[type];
        if (!creator) {
            console.warn('[SimComponentFactory] Unknown component type:', type);
            return {};
        }
        console.log('[SimComponentFactory] Creating empty component:', {
            type: type,
            id: id,
            timestamp: new Date().toISOString()
        });
        return creator(id);
    };
    SimComponentFactory.creators = (_a = {},
        _a[simComponentType_1.SimComponentType.ACTIVITY] = function (id) { return ({
            id: id,
            name: 'New Activity',
            type: SimulationObjectType_1.SimulationObjectType.Activity,
            capacity: 1,
            inputBufferCapacity: 999,
            outputBufferCapacity: 999,
            operationSteps: [],
            connectors: []
        }); },
        _a[simComponentType_1.SimComponentType.GENERATOR] = function (id) { return ({
            id: id,
            name: "New Generator",
            type: SimulationObjectType_1.SimulationObjectType.Generator,
            activityKeyId: "",
            entityId: ModelDefaults_1.ModelDefaults.DEFAULT_ENTITY_ID,
            periodicOccurrences: Infinity,
            periodIntervalDuration: SimComponentFactory.createEmptyDuration(),
            entitiesPerCreation: 1,
            periodicStartDuration: SimComponentFactory.createEmptyDuration(),
            maxEntities: Infinity
        }); },
        _a[simComponentType_1.SimComponentType.CONNECTOR] = function (id) { return ({
            id: id,
            name: "New Connector",
            type: SimulationObjectType_1.SimulationObjectType.Connector,
            sourceId: "",
            targetId: "",
            probability: 1.0,
            connectType: ConnectType_1.ConnectType.Probability,
            operationSteps: []
        }); },
        _a[simComponentType_1.SimComponentType.ENTITY] = function (id) { return ({
            id: id,
            name: "New Entity",
            type: SimulationObjectType_1.SimulationObjectType.Entity
        }); },
        _a[simComponentType_1.SimComponentType.RESOURCE] = function (id) { return ({
            id: id,
            name: "New Resource",
            type: SimulationObjectType_1.SimulationObjectType.Resource,
            capacity: 1
        }); },
        _a[simComponentType_1.SimComponentType.MODEL] = function (id) { return ({}); },
        _a[simComponentType_1.SimComponentType.NONE] = function (id) { return ({}); },
        _a);
    return SimComponentFactory;
}());
exports.SimComponentFactory = SimComponentFactory;
exports.SimComponentTypes = [
    {
        type: simComponentType_1.SimComponentType.ACTIVITY,
        displayName: 'Activity',
        description: 'Process or task node',
        createEmpty: function (id) { return SimComponentFactory.createEmpty(simComponentType_1.SimComponentType.ACTIVITY, id); }
    },
    {
        type: simComponentType_1.SimComponentType.GENERATOR,
        displayName: 'Generator',
        description: 'Creates entities in simulation',
        createEmpty: function (id) { return SimComponentFactory.createEmpty(simComponentType_1.SimComponentType.GENERATOR, id); }
    },
    {
        type: simComponentType_1.SimComponentType.CONNECTOR,
        displayName: 'Connector',
        description: 'Connects activities',
        createEmpty: function (id) { return SimComponentFactory.createEmpty(simComponentType_1.SimComponentType.CONNECTOR, id); }
    },
    {
        type: simComponentType_1.SimComponentType.MODEL,
        displayName: 'Model',
        description: 'Simulation model container',
        createEmpty: function (id) { return SimComponentFactory.createEmpty(simComponentType_1.SimComponentType.MODEL, id); }
    },
    {
        type: simComponentType_1.SimComponentType.ENTITY,
        displayName: 'Entity',
        description: 'Object flowing through system',
        createEmpty: function (id) { return SimComponentFactory.createEmpty(simComponentType_1.SimComponentType.ENTITY, id); }
    },
    {
        type: simComponentType_1.SimComponentType.RESOURCE,
        displayName: 'Resource',
        description: 'Required for activities',
        createEmpty: function (id) { return SimComponentFactory.createEmpty(simComponentType_1.SimComponentType.RESOURCE, id); }
    },
    {
        type: simComponentType_1.SimComponentType.NONE,
        displayName: 'None',
        description: 'Remove all simulation components',
        createEmpty: function (id) { return SimComponentFactory.createEmpty(simComponentType_1.SimComponentType.NONE, id); }
    }
];
