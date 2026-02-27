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
        },
        {
            sourceVersion: '2026.02.15',
            targetVersion: '2026.02.22',
            transform: (data: any) => ({
                ...data
                // failureProperties is optional — absence means "disabled"
                // No default injection needed; identity transform for version hop
            })
        },
        {
            sourceVersion: '2026.02.22',
            targetVersion: '2026.02.23',
            transform: (data: any) => ({
                ...data
                // Identity transform — establishes version boundary for scenario adoption.
                // Scenarios are additive (stored in q_scenarios, not per-element).
            })
        }
    ]
};
