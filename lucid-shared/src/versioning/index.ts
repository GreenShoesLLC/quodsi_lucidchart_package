// PreflightResult value types + the pure upgrade engine now sourced from core (versioning SP3)
export { UpgradeIssueSeverity, upgradeElements } from '@quodsi/shared';
export type { PreflightResult, UpgradeIssue, RawElement, UpgradeElementsResult } from '@quodsi/shared';
export * from './IVersionUpgrader';
export * from './BaseVersionUpgrader';
export * from './VersionManager';
export * from './VersionUpgraderFactory';
// Transforms now sourced from the monorepo core (versioning SP2)
export type {
    VersionTransformation,
    TransformationSet,
} from '@quodsi/shared';
export {
    TransformationError,
    ActivityTransforms,
    ConnectorTransforms,
    EntityTransforms,
    GeneratorTransforms,
    ResourceTransforms,
    ModelTransforms,
    AllTransformations,
    getTransformations,
    getTransformationsBetweenVersions,
} from '@quodsi/shared';
export * from './output_schema_compat';
// Re-export common types
export type { VersionManagerOptions } from './VersionManager';
export type { UpgradeOptions } from './IVersionUpgrader';

