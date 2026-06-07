"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidVersion = exports.compareVersions = exports.parseVersion = exports.EXPECTED_OUTPUT_SCHEMA_VERSION = exports.QUODSIM_VERSION = exports.QUODSI_VERSION = void 0;
/**
 * Current version of Quodsi
 * Should be updated to match package.json version when making releases
 */
exports.QUODSI_VERSION = "2026.06.08";
/**
 * Current version of the Quodsim simulation engine
 * This tracks the Python simulation runner version used by Azure Batch
 */
exports.QUODSIM_VERSION = "2026.06.02";
/**
 * Major version of the simulation output CSV schema this build can render.
 * Bumped only when the engine's OUTPUT_SCHEMA_VERSION major changes
 * (column rename / remove / reorder). Additive engine changes (new
 * columns at the end) don't require updating this — minor differences
 * are tolerated by isOutputSchemaCompatible.
 */
exports.EXPECTED_OUTPUT_SCHEMA_VERSION = "1.0";
/**
 * Parses a version string into its components
 */
var parseVersion = function (version) {
    var _a = version.split('.').map(Number), _b = _a[0], major = _b === void 0 ? 0 : _b, _c = _a[1], minor = _c === void 0 ? 0 : _c, _d = _a[2], patch = _d === void 0 ? 0 : _d;
    return { major: major, minor: minor, patch: patch };
};
exports.parseVersion = parseVersion;
/**
 * Compares two version strings
 * @returns negative if v1 < v2, 0 if equal, positive if v1 > v2
 */
var compareVersions = function (v1, v2) {
    var ver1 = (0, exports.parseVersion)(v1);
    var ver2 = (0, exports.parseVersion)(v2);
    if (ver1.major !== ver2.major)
        return ver1.major - ver2.major;
    if (ver1.minor !== ver2.minor)
        return ver1.minor - ver2.minor;
    return ver1.patch - ver2.patch;
};
exports.compareVersions = compareVersions;
/**
 * Checks if a version string is valid
 */
var isValidVersion = function (version) {
    return /^\d+\.\d+\.\d+$/.test(version);
};
exports.isValidVersion = isValidVersion;
