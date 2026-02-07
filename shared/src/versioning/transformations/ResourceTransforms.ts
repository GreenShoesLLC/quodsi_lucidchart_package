import { TransformationSet } from './TransformationTypes';

/**
 * Transformations for Resource objects
 */
export const ResourceTransforms: TransformationSet = {
    objectType: 'Resource',
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
