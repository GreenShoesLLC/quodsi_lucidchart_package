import { TransformationSet } from './TransformationTypes';

/**
 * Transformations for Entity objects
 */
export const EntityTransforms: TransformationSet = {
    objectType: 'Entity',
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
