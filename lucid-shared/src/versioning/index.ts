export * from './PreflightResult';
export * from './IVersionUpgrader';
export * from './BaseVersionUpgrader';
export * from './VersionManager';
export * from './VersionUpgraderFactory';
export * from './transformations';
export * from './output_schema_compat';
// Re-export common types
export type { VersionManagerOptions } from './VersionManager';
export type { UpgradeOptions } from './IVersionUpgrader';

