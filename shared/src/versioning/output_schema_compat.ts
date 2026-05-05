import { parseVersion, EXPECTED_OUTPUT_SCHEMA_VERSION } from "../constants/version";

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
export const isOutputSchemaCompatible = (
  runVersion: string | null | undefined,
): boolean => {
  if (!runVersion) return false;
  // Reject malformed input: must look like "N.N" at minimum.
  if (!/^\d+\.\d+$/.test(runVersion)) return false;
  const run = parseVersion(runVersion);
  const expected = parseVersion(EXPECTED_OUTPUT_SCHEMA_VERSION);
  return run.major === expected.major;
};
