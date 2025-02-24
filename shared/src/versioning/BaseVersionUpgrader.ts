import { IVersionUpgrader, UpgradeOptions } from './IVersionUpgrader';
import { PreflightResult, UpgradeIssue, UpgradeIssueSeverity } from './PreflightResult';

/**
 * Base implementation of version upgrader
 * Provides common functionality for platform-specific upgraders
 */
export abstract class BaseVersionUpgrader implements IVersionUpgrader {
    constructor(
        public readonly currentVersion: string,
        protected readonly options: UpgradeOptions = {}
    ) {}

    /**
     * Checks if source version can be upgraded to current version
     */
    canUpgrade(sourceVersion: string): boolean {
        // Simple version comparison for now
        return sourceVersion !== this.currentVersion;
    }

    /**
     * Performs validation check before attempting upgrade
     */
    async preflight(page: any): Promise<PreflightResult> {
        const sourceVersion = await this.getSourceVersion(page);
        const issues: UpgradeIssue[] = [];

        // Validate basic requirements
        const baseIssues = await this.validateBaseRequirements(page);
        issues.push(...baseIssues);

        // Platform-specific validation
        const platformIssues = await this.validatePlatformRequirements(page);
        issues.push(...platformIssues);

        // Determine if upgrade can proceed
        const hasErrors = issues.some(issue => issue.severity === UpgradeIssueSeverity.Error);

        return {
            canUpgrade: !hasErrors,
            sourceVersion,
            targetVersion: this.currentVersion,
            issues
        };
    }

    /**
     * Performs the upgrade on all elements
     */
    async upgrade(page: any): Promise<void> {
        if (!this.options.skipPreflight) {
            const preflightResult = await this.preflight(page);
            if (!preflightResult.canUpgrade) {
                throw new Error('Preflight check failed. Cannot proceed with upgrade.');
            }
        }

        try {
            await this.beginUpgrade(page);
            await this.performUpgrade(page);
            await this.finalizeUpgrade(page);
        } catch (error) {
            await this.rollbackUpgrade(page);
            throw error;
        }
    }

    /**
     * Gets the source version from the page/document
     */
    protected abstract getSourceVersion(page: any): Promise<string>;

    /**
     * Validates basic requirements common to all platforms
     */
    protected async validateBaseRequirements(page: any): Promise<UpgradeIssue[]> {
        const issues: UpgradeIssue[] = [];
        
        // Example base validation
        if (!page) {
            issues.push({
                message: 'No page/document provided',
                severity: UpgradeIssueSeverity.Error
            });
        }

        return issues;
    }

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
