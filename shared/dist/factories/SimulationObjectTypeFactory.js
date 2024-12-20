"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationObjectTypeFactory = void 0;
var __1 = require("..");
var SimulationObjectTypeFactory;
(function (SimulationObjectTypeFactory) {
    function createActivity(lucidId) {
        return __1.Activity.createDefault(lucidId);
    }
    SimulationObjectTypeFactory.createActivity = createActivity;
    function createConnector(lucidId) {
        return __1.Connector.createDefault(lucidId);
    }
    SimulationObjectTypeFactory.createConnector = createConnector;
    function createGenerator(lucidId) {
        return __1.Generator.createDefault(lucidId);
    }
    SimulationObjectTypeFactory.createGenerator = createGenerator;
    function createResource(lucidId) {
        return __1.Resource.createDefault(lucidId);
    }
    SimulationObjectTypeFactory.createResource = createResource;
    function createEntity(lucidId) {
        return __1.Entity.createDefault(lucidId);
    }
    SimulationObjectTypeFactory.createEntity = createEntity;
    function createElement(type, lucidId) {
        switch (type) {
            case __1.SimulationObjectType.Activity:
                return createActivity(lucidId);
            case __1.SimulationObjectType.Connector:
                return createConnector(lucidId);
            case __1.SimulationObjectType.Generator:
                return createGenerator(lucidId);
            case __1.SimulationObjectType.Resource:
                return createResource(lucidId);
            case __1.SimulationObjectType.Entity:
                return createEntity(lucidId);
            default:
                return {
                    id: lucidId,
                    name: "New ".concat(type),
                    type: type
                };
        }
    }
    SimulationObjectTypeFactory.createElement = createElement;
})(SimulationObjectTypeFactory = exports.SimulationObjectTypeFactory || (exports.SimulationObjectTypeFactory = {}));
