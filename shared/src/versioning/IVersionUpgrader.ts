import { PreflightResult } from './PreflightResult';

/**
 * Defines core functionality for version upgraders
 */
export interface IVersionUpgrader {
    /**
     * Checks if the current version can be upgraded to the target version
     * @param currentVersion Version string found in model
     * @returns true if upgrade is possible
     */
    canUpgrade(currentVersion: string): boolean;

    /**
     * Performs validation check before attempting upgrade
     * @param page Page or document to check
     * @returns PreflightResult containing validation status and any issues
     */
    preflight(page: any): Promise<PreflightResult>;

    /**
     * Performs the upgrade on all elements
     * @param page Page or document to upgrade
     * @throws Error if upgrade fails
     */
    upgrade(page: any): Promise<void>;

    /**
     * Gets current version number of the upgrader
     * Used to determine if upgrade is needed
     */
    readonly currentVersion: string;
}

/**
 * Additional options that can be passed to upgrader
 */
export interface UpgradeOptions {
    /** Whether to notify users of upgrade status */
    notifyUser?: boolean;
    /** Whether to skip preflight checks (not recommended) */
    skipPreflight?: boolean;
}
