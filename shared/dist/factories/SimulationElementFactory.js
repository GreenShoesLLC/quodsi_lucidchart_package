"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationElementFactory = void 0;
var src_1 = require("src");
var SimulationElementFactory;
(function (SimulationElementFactory) {
    function createActivity(lucidId) {
        return src_1.Activity.createDefault(lucidId);
    }
    SimulationElementFactory.createActivity = createActivity;
    function createConnector(lucidId) {
        return src_1.Connector.createDefault(lucidId);
    }
    SimulationElementFactory.createConnector = createConnector;
    function createGenerator(lucidId) {
        return src_1.Generator.createDefault(lucidId);
    }
    SimulationElementFactory.createGenerator = createGenerator;
    function createResource(lucidId) {
        return src_1.Resource.createDefault(lucidId);
    }
    SimulationElementFactory.createResource = createResource;
    function createEntity(lucidId) {
        return src_1.Entity.createDefault(lucidId);
    }
    SimulationElementFactory.createEntity = createEntity;
    function createElement(type, lucidId) {
        switch (type) {
            case src_1.SimulationObjectType.Activity:
                return createActivity(lucidId);
            case src_1.SimulationObjectType.Connector:
                return createConnector(lucidId);
            case src_1.SimulationObjectType.Generator:
                return createGenerator(lucidId);
            case src_1.SimulationObjectType.Resource:
                return createResource(lucidId);
            case src_1.SimulationObjectType.Entity:
                return createEntity(lucidId);
            default:
                return {
                    id: lucidId,
                    name: 'New Element',
                    type: type
                };
        }
    }
    SimulationElementFactory.createElement = createElement;
})(SimulationElementFactory = exports.SimulationElementFactory || (exports.SimulationElementFactory = {}));
