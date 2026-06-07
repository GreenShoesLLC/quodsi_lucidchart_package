/**
 * Returns true when a run's output_schema_version is compatible with
 * what this build of the frontend can render.
 *
 * Compatibility rule: major must match. Minor is irrelevant (frontend
 * tolerates unknown columns and missing columns within the same major).
 *
 * Strict legacy: a missing/null/empty version is treated as incompatible.
 * This forces re-run for any scenario produced before output schema
 * versioning was introduced (2026-05-05).
 */
export declare const isOutputSchemaCompatible: (runVersion: string | null | undefined) => boolean;
//# sourceMappingURL=output_schema_compat.d.ts.map