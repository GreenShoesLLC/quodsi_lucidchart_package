import { TransformationSet } from './TransformationTypes';

/**
 * Transformations for Connector objects
 */
export const ConnectorTransforms: TransformationSet = {
    objectType: 'Connector',
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
