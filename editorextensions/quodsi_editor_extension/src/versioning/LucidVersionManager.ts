import { VersionManager, VersionManagerOptions } from '@quodsi/shared/src/versioning/VersionManager';
import { PlatformType } from '@quodsi/shared/src/platform/PlatformType';
import { VersionUpgraderFactory } from '@quodsi/shared/src/versioning/VersionUpgraderFactory';
import { LucidVersionUpgrader } from './LucidVersionUpgrader';
import { PageProxy } from 'lucid-extension-sdk';
import { NotificationService } from '../services/NotificationService';

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
     * Checks if a page needs upgrading and performs upgrade if necessary
     */
    async handlePageLoad(page: PageProxy): Promise<void> {
        try {
            // Get current version from page
            const preflightResult = await this.versionManager.checkUpgrade(page);
            
            if (!preflightResult.canUpgrade) {
                return;
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
                return;
            }

            // Perform upgrade
            await this.versionManager.performUpgrade(page);

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.notificationService.showError(`Error during version check: ${message}`);
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
