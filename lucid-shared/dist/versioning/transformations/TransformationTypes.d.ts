/**
 * Represents a transformation between versions
 */
export interface VersionTransformation {
    /** Source version to transform from */
    sourceVersion: string;
    /** Target version to transform to */
    targetVersion: string;
    /** Transform the data */
    transform: (data: any) => any;
}
/**
 * Collection of transformations for a specific object type
 */
export interface TransformationSet {
    /** Type of object these transformations apply to (e.g., "Activity", "Connector") */
    objectType: string;
    /** List of transformations in order they should be applied */
    transformations: VersionTransformation[];
}
/**
 * Error thrown when transformation fails
 */
export declare class TransformationError extends Error {
    readonly objectType: string;
    readonly sourceVersion: string;
    readonly targetVersion: string;
    readonly originalError?: Error | undefined;
    constructor(message: string, objectType: string, sourceVersion: string, targetVersion: string, originalError?: Error | undefined);
}
//# sourceMappingURL=TransformationTypes.d.ts.map