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
}

export const SimComponentTypes: SimComponentTypeInfo[] = [
    {
        type: SimComponentType.ACTIVITY,
        displayName: 'Activity',
        description: 'Process or task node'
    },
    {
        type: SimComponentType.GENERATOR,
        displayName: 'Generator',
        description: 'Creates entities in simulation'
    },
    {
        type: SimComponentType.CONNECTOR,
        displayName: 'Connector',
        description: 'Connects activities'
    },
    {
        type: SimComponentType.MODEL,
        displayName: 'Model',
        description: 'Simulation model container'
    },
    {
        type: SimComponentType.ENTITY,
        displayName: 'Entity',
        description: 'Object flowing through system'
    },
    {
        type: SimComponentType.RESOURCE,
        displayName: 'Resource',
        description: 'Required for activities'
    }
];