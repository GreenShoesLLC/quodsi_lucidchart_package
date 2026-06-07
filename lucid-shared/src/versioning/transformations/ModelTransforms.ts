import { TransformationSet } from './TransformationTypes';

/**
 * Transformations for Model objects
 */
export const ModelTransforms: TransformationSet = {
    objectType: 'Model',
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
