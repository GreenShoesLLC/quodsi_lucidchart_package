import { IVersionUpgrader, UpgradeOptions } from './IVersionUpgrader';
import { PlatformType } from '../platform/PlatformType';
import { VersionInfo } from '../constants/version';
/**
 * Factory for creating platform-specific version upgraders
 */
export declare class VersionUpgraderFactory {
    private static upgraders;
    /**
     * Registers an upgrader implementation for a specific platform
     */
    static registerUpgrader(platform: PlatformType, upgraderClass: new (version: string, options?: UpgradeOptions) => IVersionUpgrader): void;
    /**
     * Creates an upgrader instance for the specified platform
     * @throws Error if no upgrader is registered for the platform
     * @throws Error if current version is invalid
     */
    static createUpgrader(platform: PlatformType, options?: UpgradeOptions): IVersionUpgrader;
    /**
     * Gets the current version number
     */
    static getCurrentVersion(): string;
    /**
     * Gets the current version info broken down into components
     */
    static getCurrentVersionInfo(): VersionInfo;
    /**
     * Checks if an upgrade is needed from the source version
     * @param sourceVersion The version to check
     * @returns true if sourceVersion is older than current version
     * @throws Error if either version is invalid
     */
    static needsUpgrade(sourceVersion: string): boolean;
    /**
     * Gets supported platforms
     */
    static getSupportedPlatforms(): PlatformType[];
    /**
     * Checks if a platform is supported
     */
    static isPlatformSupported(platform: PlatformType): boolean;
}
//# sourceMappingURL=VersionUpgraderFactory.d.ts.map