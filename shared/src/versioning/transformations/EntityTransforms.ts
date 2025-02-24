import { TransformationSet } from './TransformationTypes';

/**
 * Transformations for Entity objects
 */
export const EntityTransforms: TransformationSet = {
    objectType: 'Entity',
    transformations: [
        {
            sourceVersion: '1.0.0',
            targetVersion: '1.1.0',
            transform: (data: any) => ({
                ...data
                // No changes in this version, but structure is ready for future updates
            })
        }
    ]
};
