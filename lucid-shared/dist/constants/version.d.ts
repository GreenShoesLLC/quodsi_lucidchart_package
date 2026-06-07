/**
 * Current version of Quodsi
 * Should be updated to match package.json version when making releases
 */
export declare const QUODSI_VERSION = "2026.06.08";
/**
 * Current version of the Quodsim simulation engine
 * This tracks the Python simulation runner version used by Azure Batch
 */
export declare const QUODSIM_VERSION = "2026.06.02";
/**
 * Major version of the simulation output CSV schema this build can render.
 * Bumped only when the engine's OUTPUT_SCHEMA_VERSION major changes
 * (column rename / remove / reorder). Additive engine changes (new
 * columns at the end) don't require updating this — minor differences
 * are tolerated by isOutputSchemaCompatible.
 */
export declare const EXPECTED_OUTPUT_SCHEMA_VERSION = "1.0";
/**
 * Version information broken down into components
 */
export interface VersionInfo {
    major: number;
    minor: number;
    patch: number;
}
/**
 * Parses a version string into its components
 */
export declare const parseVersion: (version: string) => VersionInfo;
/**
 * Compares two version strings
 * @returns negative if v1 < v2, 0 if equal, positive if v1 > v2
 */
export declare const compareVersions: (v1: string, v2: string) => number;
/**
 * Checks if a version string is valid
 */
export declare const isValidVersion: (version: string) => boolean;
//# sourceMappingURL=version.d.ts.map