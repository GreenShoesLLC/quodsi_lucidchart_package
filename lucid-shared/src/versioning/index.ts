// PreflightResult value types + the pure upgrade engine now sourced from core (versioning SP3)
export { UpgradeIssueSeverity, upgradeElements } from '@quodsi/shared';
export type { PreflightResult, UpgradeIssue, RawElement, UpgradeElementsResult } from '@quodsi/shared';
// Element envelope (versioning element-envelope) — sourced from core.
// Note: isEnvelope is intentionally excluded here to avoid collision with the
// quodsi-messaging isEnvelope (which guards message envelopes, a different concept).
export { flattenEnvelope, makeEnvelope, flatToDomain, flatToPlatform, PLATFORM_KEYS } from '@quodsi/shared';
export type { RawEnvelope } from '@quodsi/shared';
// Version-upgrade framework now sourced from core (versioning Phase 1)
export { BaseVersionUpgrader, VersionManager, VersionUpgraderFactory } from '@quodsi/shared';
export type { IVersionUpgrader, UpgradeOptions, VersionManagerOptions } from '@quodsi/shared';
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

