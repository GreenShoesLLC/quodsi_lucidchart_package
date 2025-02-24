import { IVersionUpgrader, UpgradeOptions } from './IVersionUpgrader';
import { PlatformType } from '../platform/PlatformType';
import { 
    QUODSI_VERSION, 
    isValidVersion, 
    compareVersions,
    VersionInfo, 
    parseVersion 
} from '../constants/version';

/**
 * Factory for creating platform-specific version upgraders
 */
export class VersionUpgraderFactory {
    private static upgraders = new Map<PlatformType, new (version: string, options?: UpgradeOptions) => IVersionUpgrader>();

    /**
     * Registers an upgrader implementation for a specific platform
     */
    static registerUpgrader(
        platform: PlatformType,
        upgraderClass: new (version: string, options?: UpgradeOptions) => IVersionUpgrader
    ): void {
        this.upgraders.set(platform, upgraderClass);
    }

    /**
     * Creates an upgrader instance for the specified platform
     * @throws Error if no upgrader is registered for the platform
     * @throws Error if current version is invalid
     */
    static createUpgrader(platform: PlatformType, options?: UpgradeOptions): IVersionUpgrader {
        // Validate current version
        if (!isValidVersion(QUODSI_VERSION)) {
            throw new Error(`Invalid Quodsi version: ${QUODSI_VERSION}`);
        }

        const upgraderClass = this.upgraders.get(platform);
        if (!upgraderClass) {
            throw new Error(`No upgrader registered for platform: ${platform}`);
        }

        return new upgraderClass(QUODSI_VERSION, options);
    }

    /**
     * Gets the current version number
     */
    static getCurrentVersion(): string {
        return QUODSI_VERSION;
    }

    /**
     * Gets the current version info broken down into components
     */
    static getCurrentVersionInfo(): VersionInfo {
        return parseVersion(QUODSI_VERSION);
    }

    /**
     * Checks if an upgrade is needed from the source version
     * @param sourceVersion The version to check
     * @returns true if sourceVersion is older than current version
     * @throws Error if either version is invalid
     */
    static needsUpgrade(sourceVersion: string): boolean {
        if (!isValidVersion(sourceVersion)) {
            throw new Error(`Invalid source version: ${sourceVersion}`);
        }
        if (!isValidVersion(QUODSI_VERSION)) {
            throw new Error(`Invalid Quodsi version: ${QUODSI_VERSION}`);
        }

        return compareVersions(QUODSI_VERSION, sourceVersion) > 0;
    }

    /**
     * Gets supported platforms
     */
    static getSupportedPlatforms(): PlatformType[] {
        return Array.from(this.upgraders.keys());
    }

    /**
     * Checks if a platform is supported
     */
    static isPlatformSupported(platform: PlatformType): boolean {
        return this.upgraders.has(platform);
    }
}
