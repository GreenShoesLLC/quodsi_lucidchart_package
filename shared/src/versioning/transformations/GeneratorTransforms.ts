import { TransformationSet } from './TransformationTypes';

/**
 * Transformations for Generator objects
 */
export const GeneratorTransforms: TransformationSet = {
    objectType: 'Generator',
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
