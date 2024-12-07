import { 
    SimulationObjectType,
    Generator,
    Activity,
    Connector,
    Resource,
    Entity,
    SimulationObject
} from "src";

export namespace SimulationObjectTypeFactory {
    export function createActivity(lucidId: string): Activity {
        return Activity.createDefault(lucidId);
    }

    export function createConnector(lucidId: string): Connector {
        return Connector.createDefault(lucidId);
    }

    export function createGenerator(lucidId: string): Generator {
        return Generator.createDefault(lucidId);
    }

    export function createResource(lucidId: string): Resource {
        return Resource.createDefault(lucidId);
    }

    export function createEntity(lucidId: string): Entity {
        return Entity.createDefault(lucidId);
    }

    export function createElement(type: SimulationObjectType, lucidId: string): SimulationObject {
        switch (type) {
            case SimulationObjectType.Activity:
                return createActivity(lucidId);

            case SimulationObjectType.Connector:
                return createConnector(lucidId);

            case SimulationObjectType.Generator:
                return createGenerator(lucidId);

            case SimulationObjectType.Resource:
                return createResource(lucidId);

            case SimulationObjectType.Entity:
                return createEntity(lucidId);

            default:
                return {
                    id: lucidId,
                    name: 'New Element',
                    type: type
                };
        }
    }
}