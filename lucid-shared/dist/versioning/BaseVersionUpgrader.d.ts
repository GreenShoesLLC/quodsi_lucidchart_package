import { IVersionUpgrader, UpgradeOptions } from './IVersionUpgrader';
import { PreflightResult, UpgradeIssue } from './PreflightResult';
/**
 * Base implementation of version upgrader
 * Provides common functionality for platform-specific upgraders
 */
export declare abstract class BaseVersionUpgrader implements IVersionUpgrader {
    readonly currentVersion: string;
    protected readonly options: UpgradeOptions;
    constructor(currentVersion: string, options?: UpgradeOptions);
    /**
     * Checks if source version can be upgraded to current version
     */
    canUpgrade(sourceVersion: string): boolean;
    /**
     * Performs validation check before attempting upgrade
     */
    preflight(page: any): Promise<PreflightResult>;
    /**
     * Performs the upgrade on all elements
     */
    upgrade(page: any): Promise<void>;
    /**
     * Gets the source version from the page/document
     */
    protected abstract getSourceVersion(page: any): Promise<string>;
    /**
     * Validates basic requirements common to all platforms
     */
    protected validateBaseRequirements(page: any): Promise<UpgradeIssue[]>;
    /**
     * Platform-specific validation requirements
     */
    protected abstract validatePlatformRequirements(page: any): Promise<UpgradeIssue[]>;
    /**
     * Called before upgrade begins - can be used for backup/preparation
     */
    protected abstract beginUpgrade(page: any): Promise<void>;
    /**
     * Performs the actual upgrade operations
     */
    protected abstract performUpgrade(page: any): Promise<void>;
    /**
     * Called after successful upgrade - can be used for cleanup/verification
     */
    protected abstract finalizeUpgrade(page: any): Promise<void>;
    /**
     * Called if upgrade fails - should restore previous state
     */
    protected abstract rollbackUpgrade(page: any): Promise<void>;
}
//# sourceMappingURL=BaseVersionUpgrader.d.ts.map