import { TransformationSet } from './TransformationTypes';

/**
 * Transformations for Model (ModelDefinition) objects
 */
export const ModelTransforms: TransformationSet = {
    objectType: 'Model',
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
