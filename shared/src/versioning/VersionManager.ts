import { IVersionUpgrader, UpgradeOptions } from './IVersionUpgrader';
import { PreflightResult } from './PreflightResult';
import { PlatformType } from '../platform/PlatformType';
import { VersionUpgraderFactory } from './VersionUpgraderFactory';

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
export class VersionManager {
    private upgrader: IVersionUpgrader;

    constructor(
        platform: PlatformType,
        private readonly options: VersionManagerOptions = {}
    ) {
        this.upgrader = VersionUpgraderFactory.createUpgrader(platform, options);
    }

    /**
     * Checks if the provided version needs an upgrade
     */
    needsUpgrade(version: string): boolean {
        return this.upgrader.canUpgrade(version);
    }

    /**
     * Performs preflight check for upgrade
     */
    async checkUpgrade(page: any): Promise<PreflightResult> {
        return this.upgrader.preflight(page);
    }

    /**
     * Performs the upgrade process
     */
    async performUpgrade(page: any): Promise<void> {
        try {
            this.options.onUpgradeStart?.();
            this.options.onNotify?.('Starting upgrade process...');

            await this.upgrader.upgrade(page);

            this.options.onUpgradeComplete?.();
            this.options.onNotify?.('Upgrade completed successfully');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.options.onUpgradeFailed?.(error as Error);
            this.options.onNotify?.(`Upgrade failed: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Gets the current version number
     */
    getCurrentVersion(): string {
        return this.upgrader.currentVersion;
    }
}
