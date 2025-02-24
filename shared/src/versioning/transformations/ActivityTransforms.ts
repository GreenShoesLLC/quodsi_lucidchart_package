import { TransformationSet, VersionTransformation } from './TransformationTypes';

/**
 * Supported routing types for activities
 */
export enum ActivityRouteType {
    FIFO = 'FIFO',
    LIFO = 'LIFO'
}

/**
 * Transformations for Activity objects
 */
export const ActivityTransforms: TransformationSet = {
    objectType: 'Activity',
    transformations: [
        {
            sourceVersion: '1.0.0',
            targetVersion: '1.1.0',
            transform: (data: any) => ({
                ...data,
                routeType: ActivityRouteType.FIFO // Add new property with default FIFO
            })
        }
        // Additional transformations can be added here as versions evolve
    ]
};
