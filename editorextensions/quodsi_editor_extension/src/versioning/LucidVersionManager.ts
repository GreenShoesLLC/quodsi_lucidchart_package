import { VersionManager, VersionManagerOptions } from '@quodsi/lucid-shared';
import { PlatformType } from '@quodsi/lucid-shared';
import { VersionUpgraderFactory } from '@quodsi/lucid-shared';
import { LucidVersionUpgrader } from './LucidVersionUpgrader';
import { PageProxy } from 'lucid-extension-sdk';
import { NotificationService } from '../services/NotificationService';

/**
 * Result returned from handlePageLoad indicating what happened during version check.
 */
export interface UpgradeResult {
    /** Whether a version upgrade was performed */
    upgraded: boolean;
    /** The version the document was on before upgrade (empty string if no upgrade) */
    sourceVersion: string;
    /** The version the document was upgraded to (empty string if no upgrade) */
    targetVersion: string;
}

/**
 * Manages version upgrades in the LucidChart environment
 */
export class LucidVersionManager {
    private versionManager: VersionManager;
    private notificationService: NotificationService;

    constructor() {
        // Get notification service instance
        this.notificationService = NotificationService.getInstance();

        // Register the Lucid upgrader with the factory
        VersionUpgraderFactory.registerUpgrader(PlatformType.Lucid, LucidVersionUpgrader);

        // Create version manager with Lucid-specific options
        this.versionManager = new VersionManager(PlatformType.Lucid, {
            notifyUser: true,
            onNotify: (message) => this.notificationService.showMessage(message),
            onUpgradeStart: () => this.handleUpgradeStart(),
            onUpgradeComplete: () => this.handleUpgradeComplete(),
            onUpgradeFailed: (error) => this.handleUpgradeFailed(error)
        });
    }

    /**
     * Checks if a page needs upgrading and performs upgrade if necessary.
     * Returns metadata about what happened so the caller can trigger
     * post-upgrade migrations (e.g., scenario adoption).
     */
    async handlePageLoad(page: PageProxy): Promise<UpgradeResult> {
        const noUpgrade: UpgradeResult = { upgraded: false, sourceVersion: '', targetVersion: '' };

        try {
            // Get current version from page
            const preflightResult = await this.versionManager.checkUpgrade(page);

            if (!preflightResult.canUpgrade) {
                return noUpgrade;
            }

            // Show upgrade needed notification
            this.notificationService.showMessage(
                `Model upgrade required from ${preflightResult.sourceVersion} to ${preflightResult.targetVersion}`
            );

            // Check for issues
            if (preflightResult.issues.length > 0) {
                const issueMessages = preflightResult.issues
                    .map(issue => `- ${issue.message}`)
                    .join('\n');
                this.notificationService.showWarning(
                    `Upgrade issues found:\n${issueMessages}`
                );
                return noUpgrade;
            }

            // Perform upgrade
            await this.versionManager.performUpgrade(page);

            return {
                upgraded: true,
                sourceVersion: preflightResult.sourceVersion,
                targetVersion: preflightResult.targetVersion,
            };

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.notificationService.showError(`Error during version check: ${message}`);
            return noUpgrade;
        }
    }

    private handleUpgradeStart(): void {
        // Could add loading indicator or lock UI
    }

    private handleUpgradeComplete(): void {
        // Could refresh UI or model tree
    }

    private handleUpgradeFailed(error: Error): void {
        this.notificationService.showError(
            `Upgrade failed and was rolled back: ${error.message}`
        );
    }
}
