export * from './TransformationTypes';
export * from './ActivityTransforms';
export * from './ConnectorTransforms';
export * from './EntityTransforms';
export * from './GeneratorTransforms';
export * from './ResourceTransforms';
export * from './ModelTransforms';

import { TransformationSet } from './TransformationTypes';
import { ActivityTransforms } from './ActivityTransforms';
import { ConnectorTransforms } from './ConnectorTransforms';
import { EntityTransforms } from './EntityTransforms';
import { GeneratorTransforms } from './GeneratorTransforms';
import { ResourceTransforms } from './ResourceTransforms';
import { ModelTransforms } from './ModelTransforms';

/**
 * Collection of all available transformations
 */
export const AllTransformations: TransformationSet[] = [
    ModelTransforms,      // Model should be first as it's the root object
    ActivityTransforms,
    ConnectorTransforms,
    EntityTransforms,
    GeneratorTransforms,
    ResourceTransforms
];

/**
 * Helper to get transformations for a specific object type
 */
export function getTransformations(objectType: string): TransformationSet | undefined {
    return AllTransformations.find(t => t.objectType === objectType);
}

/**
 * Helper to get all transformations between two versions
 */
export function getTransformationsBetweenVersions(
    sourceVersion: string,
    targetVersion: string
): TransformationSet[] {
    return AllTransformations.map(transformSet => ({
        ...transformSet,
        transformations: transformSet.transformations.filter(t => 
            t.sourceVersion === sourceVersion && t.targetVersion === targetVersion
        )
    })).filter(transformSet => transformSet.transformations.length > 0);
}
