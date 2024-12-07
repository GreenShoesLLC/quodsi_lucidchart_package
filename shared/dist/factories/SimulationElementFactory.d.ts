import { Activity, SimulationObjectType, Generator, Connector, Resource, Entity, SimulationObject } from "src";
export declare namespace SimulationElementFactory {
    function createActivity(lucidId: string): Activity;
    function createConnector(lucidId: string): Connector;
    function createGenerator(lucidId: string): Generator;
    function createResource(lucidId: string): Resource;
    function createEntity(lucidId: string): Entity;
    function createElement(type: SimulationObjectType, lucidId: string): SimulationObject;
}
//# sourceMappingURL=SimulationElementFactory.d.ts.map