import { Activity } from "../shared/types/elements/Activity";
import { Duration } from "../shared/types/elements/Duration";
import { Generator } from "../shared/types/elements/Generator";
import { Connector } from "../shared/types/elements/Connector";
import { Entity } from "../shared/types/elements/Entity";
import { Resource } from "../shared/types/elements/Resource";
import { PeriodUnit } from "../shared/types/elements/PeriodUnit";
import { DurationType } from "../shared/types/elements/DurationType";
import { SimulationObjectType } from "../shared/types/elements/SimulationObjectType";
import { ConnectType } from "../shared/types/elements/ConnectType";



export enum SimComponentType {
    ACTIVITY = 'activity',
    GENERATOR = 'generator',
    CONNECTOR = 'connector',
    MODEL = 'model',
    ENTITY = 'entity',
    RESOURCE = 'resource'
}

export interface SimComponentTypeInfo {
    type: SimComponentType;
    displayName: string;
    description: string;
    createEmpty: (id: string) => any;
}

type ComponentCreator<T> = (id: string) => T;

interface ComponentCreators {
    [SimComponentType.ACTIVITY]: ComponentCreator<Activity>;
    [SimComponentType.GENERATOR]: ComponentCreator<Generator>;
    [SimComponentType.CONNECTOR]: ComponentCreator<Connector>;
    [SimComponentType.ENTITY]: ComponentCreator<Entity>;
    [SimComponentType.RESOURCE]: ComponentCreator<Resource>;
    [SimComponentType.MODEL]: ComponentCreator<{}>;
}

export class SimComponentFactory {
    private static createEmptyDuration(): Duration {
        return {
            durationLength: 0,
            durationPeriodUnit: PeriodUnit.MINUTES,
            durationType: DurationType.CONSTANT,
            distribution: null
        };
    }

    private static readonly creators: ComponentCreators = {
        [SimComponentType.ACTIVITY]: (id: string): Activity => ({
            id,
            name: 'New Activity',
            type: SimulationObjectType.Activity,
            capacity: 1,
            inputBufferCapacity: 999,
            outputBufferCapacity: 999,
            operationSteps: [],
            connectors: []
        }),

        [SimComponentType.GENERATOR]: (id: string): Generator => ({
            id,
            name: "New Generator",
            type: SimulationObjectType.Generator,
            activityKeyId: "",
            entityType: "All",
            periodicOccurrences: Infinity,
            periodIntervalDuration: SimComponentFactory.createEmptyDuration(),
            entitiesPerCreation: 1,
            periodicStartDuration: SimComponentFactory.createEmptyDuration(),
            maxEntities: Infinity
        }),

        [SimComponentType.CONNECTOR]: (id: string): Connector => ({
            id,
            name: "New Connector",
            type: SimulationObjectType.Connector,
            sourceId: "",
            targetId: "",
            probability: 1.0,
            connectType: ConnectType.Probability,
            operationSteps: []
        }),

        [SimComponentType.ENTITY]: (id: string): Entity => ({
            id,
            name: "New Entity",
            type: SimulationObjectType.Entity
        }),

        [SimComponentType.RESOURCE]: (id: string): Resource => ({
            id,
            name: "New Resource",
            type: SimulationObjectType.Resource,
            capacity: 1
        }),

        [SimComponentType.MODEL]: (id: string): {} => ({})
    };

    static createEmpty<T>(type: SimComponentType, id: string): T {
        const creator = this.creators[type];
        if (!creator) {
            console.warn('[SimComponentFactory] Unknown component type:', type);
            return {} as T;
        }

        console.log('[SimComponentFactory] Creating empty component:', {
            type,
            id,
            timestamp: new Date().toISOString()
        });

        return creator(id) as T;
    }
}

export const SimComponentTypes: SimComponentTypeInfo[] = [
    {
        type: SimComponentType.ACTIVITY,
        displayName: 'Activity',
        description: 'Process or task node',
        createEmpty: (id: string) => SimComponentFactory.createEmpty<Activity>(SimComponentType.ACTIVITY, id)
    },
    {
        type: SimComponentType.GENERATOR,
        displayName: 'Generator',
        description: 'Creates entities in simulation',
        createEmpty: (id: string) => SimComponentFactory.createEmpty<Generator>(SimComponentType.GENERATOR, id)
    },
    {
        type: SimComponentType.CONNECTOR,
        displayName: 'Connector',
        description: 'Connects activities',
        createEmpty: (id: string) => SimComponentFactory.createEmpty<Connector>(SimComponentType.CONNECTOR, id)
    },
    {
        type: SimComponentType.MODEL,
        displayName: 'Model',
        description: 'Simulation model container',
        createEmpty: (id: string) => SimComponentFactory.createEmpty<{}>(SimComponentType.MODEL, id)
    },
    {
        type: SimComponentType.ENTITY,
        displayName: 'Entity',
        description: 'Object flowing through system',
        createEmpty: (id: string) => SimComponentFactory.createEmpty<Entity>(SimComponentType.ENTITY, id)
    },
    {
        type: SimComponentType.RESOURCE,
        displayName: 'Resource',
        description: 'Required for activities',
        createEmpty: (id: string) => SimComponentFactory.createEmpty<Resource>(SimComponentType.RESOURCE, id)
    }
];