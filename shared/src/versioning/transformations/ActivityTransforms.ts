import { TransformationSet } from './TransformationTypes';
import { generateUUID } from '../../utils/uuidUtils';

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
        },
        {
            sourceVersion: '2026.03.01',
            targetVersion: '2026.03.08',
            transform: (data: any) => ({
                ...data
                // stateCondition added to all action types as optional field.
                // Absence means no guard — identity transform for version hop.
            })
        },
        {
            sourceVersion: '2026.05.26',
            targetVersion: '2026.05.31',
            // Backfill stable ids onto actions that predate action identity.
            // Identity for activities without actions.
            // Note: only top-level data.actions are backfilled; nested actions inside
            // LOOP/BRANCH action data are intentionally out of scope for this hop.
            transform: (data: any) => {
                if (!Array.isArray(data.actions)) return data;
                return {
                    ...data,
                    actions: data.actions.map((a: any) =>
                        a && !a.id ? { ...a, id: generateUUID() } : a
                    ),
                };
            }
        }
    ]
};
