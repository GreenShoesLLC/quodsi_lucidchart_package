import { TransformationSet, VersionTransformation } from './TransformationTypes';

/**
 * Transformations for Connector objects
 */
export const ConnectorTransforms: TransformationSet = {
    objectType: 'Connector',
    transformations: [
        {
            sourceVersion: '1.0.0',
            targetVersion: '1.1.0',
            transform: (data: any) => ({
                ...data,
                logic: null // Add new property for Python script, initially null
            })
        }
        // Additional transformations can be added here as versions evolve
    ]
};
