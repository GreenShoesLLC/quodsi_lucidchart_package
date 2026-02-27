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
import { compareVersions } from '../../constants/version';

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
 * Helper to get all transformations between two versions.
 * Uses range-based matching: applies all transforms where the document
 * hasn't been upgraded past the transform's sourceVersion yet, and the
 * transform's targetVersion is within the current version.
 * Results are ordered by sourceVersion ascending for correct chaining.
 */
export function getTransformationsBetweenVersions(
    sourceVersion: string,
    targetVersion: string
): TransformationSet[] {
    return AllTransformations.map(transformSet => ({
        ...transformSet,
        transformations: transformSet.transformations
            .filter(t =>
                compareVersions(t.sourceVersion, sourceVersion) >= 0 &&
                compareVersions(t.targetVersion, targetVersion) <= 0
            )
            .sort((a, b) => compareVersions(a.sourceVersion, b.sourceVersion))
    })).filter(transformSet => transformSet.transformations.length > 0);
}
