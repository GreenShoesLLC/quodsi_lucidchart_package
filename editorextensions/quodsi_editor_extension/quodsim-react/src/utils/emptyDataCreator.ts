import { SimulationObjectType } from "@quodsi/shared";

export const createEmptyData = (type: SimulationObjectType, currentLucidId: string) => {
    switch (type) {
        case SimulationObjectType.Activity:
            return {
                id: currentLucidId,
                name: 'New Activity',
                type: SimulationObjectType.Activity,
                capacity: 1,
                inputBufferCapacity: Infinity,
                outputBufferCapacity: Infinity,
                operationSteps: []
            };

        case SimulationObjectType.Connector:
            return {
                id: currentLucidId,
                name: 'New Connector',
                type: SimulationObjectType.Connector,
                probability: 1.0,
                connectType: 'Probability',
                operationSteps: []
            };

        case SimulationObjectType.Generator:
            return {
                id: currentLucidId,
                name: 'New Generator',
                type: SimulationObjectType.Generator,
                activityKeyId: '',
                entityType: 'All',
                periodicOccurrences: Infinity,
                entitiesPerCreation: 1,
                maxEntities: Infinity
            };

        case SimulationObjectType.Resource:
            return {
                id: currentLucidId,
                name: 'New Resource',
                type: SimulationObjectType.Resource,
                capacity: 1
            };

        case SimulationObjectType.Entity:
            return {
                id: currentLucidId,
                name: 'New Entity',
                type: SimulationObjectType.Entity
            };

        default:
            return {
                id: currentLucidId,
                name: 'New Element',
                type: type
            };
    }
};