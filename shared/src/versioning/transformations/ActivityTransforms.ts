import { TransformationSet } from './TransformationTypes';

/**
 * Transformations for Activity objects
 */
export const ActivityTransforms: TransformationSet = {
    objectType: 'Activity',
    transformations: [
        {
            sourceVersion: '2026.02.03',
            targetVersion: '2026.02.07',
            transform: (data: any) => ({
                ...data,
                description: data.description ?? ''
            })
        }
    ]
};
