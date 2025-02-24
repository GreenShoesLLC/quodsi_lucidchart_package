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
export class TransformationError extends Error {
    constructor(
        message: string,
        public readonly objectType: string,
        public readonly sourceVersion: string,
        public readonly targetVersion: string,
        public readonly originalError?: Error
    ) {
        super(message);
        this.name = 'TransformationError';
    }
}
