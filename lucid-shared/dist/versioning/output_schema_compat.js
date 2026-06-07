"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOutputSchemaCompatible = void 0;
var version_1 = require("../constants/version");
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
var isOutputSchemaCompatible = function (runVersion) {
    if (!runVersion)
        return false;
    // Reject malformed input: must look like "N.N" at minimum.
    if (!/^\d+\.\d+$/.test(runVersion))
        return false;
    var run = (0, version_1.parseVersion)(runVersion);
    var expected = (0, version_1.parseVersion)(version_1.EXPECTED_OUTPUT_SCHEMA_VERSION);
    return run.major === expected.major;
};
exports.isOutputSchemaCompatible = isOutputSchemaCompatible;
