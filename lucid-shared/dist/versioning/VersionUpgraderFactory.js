"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersionUpgraderFactory = void 0;
var version_1 = require("../constants/version");
/**
 * Factory for creating platform-specific version upgraders
 */
var VersionUpgraderFactory = /** @class */ (function () {
    function VersionUpgraderFactory() {
    }
    /**
     * Registers an upgrader implementation for a specific platform
     */
    VersionUpgraderFactory.registerUpgrader = function (platform, upgraderClass) {
        this.upgraders.set(platform, upgraderClass);
    };
    /**
     * Creates an upgrader instance for the specified platform
     * @throws Error if no upgrader is registered for the platform
     * @throws Error if current version is invalid
     */
    VersionUpgraderFactory.createUpgrader = function (platform, options) {
        // Validate current version
        if (!(0, version_1.isValidVersion)(version_1.QUODSI_VERSION)) {
            throw new Error("Invalid Quodsi version: ".concat(version_1.QUODSI_VERSION));
        }
        var upgraderClass = this.upgraders.get(platform);
        if (!upgraderClass) {
            throw new Error("No upgrader registered for platform: ".concat(platform));
        }
        return new upgraderClass(version_1.QUODSI_VERSION, options);
    };
    /**
     * Gets the current version number
     */
    VersionUpgraderFactory.getCurrentVersion = function () {
        return version_1.QUODSI_VERSION;
    };
    /**
     * Gets the current version info broken down into components
     */
    VersionUpgraderFactory.getCurrentVersionInfo = function () {
        return (0, version_1.parseVersion)(version_1.QUODSI_VERSION);
    };
    /**
     * Checks if an upgrade is needed from the source version
     * @param sourceVersion The version to check
     * @returns true if sourceVersion is older than current version
     * @throws Error if either version is invalid
     */
    VersionUpgraderFactory.needsUpgrade = function (sourceVersion) {
        if (!(0, version_1.isValidVersion)(sourceVersion)) {
            throw new Error("Invalid source version: ".concat(sourceVersion));
        }
        if (!(0, version_1.isValidVersion)(version_1.QUODSI_VERSION)) {
            throw new Error("Invalid Quodsi version: ".concat(version_1.QUODSI_VERSION));
        }
        return (0, version_1.compareVersions)(version_1.QUODSI_VERSION, sourceVersion) > 0;
    };
    /**
     * Gets supported platforms
     */
    VersionUpgraderFactory.getSupportedPlatforms = function () {
        return Array.from(this.upgraders.keys());
    };
    /**
     * Checks if a platform is supported
     */
    VersionUpgraderFactory.isPlatformSupported = function (platform) {
        return this.upgraders.has(platform);
    };
    VersionUpgraderFactory.upgraders = new Map();
    return VersionUpgraderFactory;
}());
exports.VersionUpgraderFactory = VersionUpgraderFactory;
