export * from './TransformationTypes';
export * from './ActivityTransforms';
export * from './ConnectorTransforms';
export * from './EntityTransforms';
export * from './GeneratorTransforms';
export * from './ResourceTransforms';
export * from './ModelTransforms';
import { TransformationSet } from './TransformationTypes';
/**
 * Collection of all available transformations
 */
export declare const AllTransformations: TransformationSet[];
/**
 * Helper to get transformations for a specific object type
 */
export declare function getTransformations(objectType: string): TransformationSet | undefined;
/**
 * Helper to get all transformations between two versions.
 * Uses range-based matching: applies all transforms where the document
 * hasn't been upgraded past the transform's sourceVersion yet, and the
 * transform's targetVersion is within the current version.
 * Results are ordered by sourceVersion ascending for correct chaining.
 */
export declare function getTransformationsBetweenVersions(sourceVersion: string, targetVersion: string): TransformationSet[];
//# sourceMappingURL=index.d.ts.map