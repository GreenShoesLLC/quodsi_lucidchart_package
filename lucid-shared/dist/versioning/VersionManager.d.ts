import { UpgradeOptions } from './IVersionUpgrader';
import { PreflightResult } from './PreflightResult';
import { PlatformType } from '../platform/PlatformType';
export interface VersionManagerOptions extends UpgradeOptions {
    /** Callback when upgrade starts */
    onUpgradeStart?: () => void;
    /** Callback when upgrade completes successfully */
    onUpgradeComplete?: () => void;
    /** Callback when upgrade fails */
    onUpgradeFailed?: (error: Error) => void;
    /** Callback for user notifications */
    onNotify?: (message: string) => void;
}
/**
 * Manages version checking and upgrading across platforms
 */
export declare class VersionManager {
    private readonly options;
    private upgrader;
    constructor(platform: PlatformType, options?: VersionManagerOptions);
    /**
     * Checks if the provided version needs an upgrade
     */
    needsUpgrade(version: string): boolean;
    /**
     * Performs preflight check for upgrade
     */
    checkUpgrade(page: any): Promise<PreflightResult>;
    /**
     * Performs the upgrade process
     */
    performUpgrade(page: any): Promise<void>;
    /**
     * Gets the current version number
     */
    getCurrentVersion(): string;
}
//# sourceMappingURL=VersionManager.d.ts.map