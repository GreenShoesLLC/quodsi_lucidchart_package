import { SimulationObjectType, Generator, Activity, Connector, Resource, Entity, SimulationObject } from "src";
export declare namespace SimulationObjectTypeFactory {
    function createActivity(lucidId: string): Activity;
    function createConnector(lucidId: string): Connector;
    function createGenerator(lucidId: string): Generator;
    function createResource(lucidId: string): Resource;
    function createEntity(lucidId: string): Entity;
    function createElement(type: SimulationObjectType, lucidId: string): SimulationObject;
}
//# sourceMappingURL=SimulationObjectTypeFactory.d.ts.map