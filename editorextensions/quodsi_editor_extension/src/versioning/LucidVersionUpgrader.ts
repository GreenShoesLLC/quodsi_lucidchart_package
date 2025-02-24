import { BaseVersionUpgrader } from '@quodsi/shared/src/versioning/BaseVersionUpgrader';
import { UpgradeOptions } from '@quodsi/shared/src/versioning/IVersionUpgrader';
import { UpgradeIssue } from '@quodsi/shared/src/versioning/PreflightResult';
import { getTransformationsBetweenVersions } from '@quodsi/shared/src/versioning/transformations';
import { PageProxy, ElementProxy } from 'lucid-extension-sdk';
import { LucidPreflightChecker } from './LucidPreflightChecker';

interface ShapeDataBackup {
    meta: string;
    data: string;
}

/**
 * Lucid-specific implementation of version upgrader
 */
export class LucidVersionUpgrader extends BaseVersionUpgrader {
    private static readonly META_KEY = 'q_meta';
    private static readonly DATA_KEY = 'q_data';
    
    private preflightChecker: LucidPreflightChecker;
    private backupData: Map<string, ShapeDataBackup>;

    constructor(currentVersion: string, options?: UpgradeOptions) {
        super(currentVersion, options);
        this.preflightChecker = new LucidPreflightChecker();
        this.backupData = new Map();
    }

    /**
     * Gets the source version from the page metadata
     */
    protected async getSourceVersion(page: PageProxy): Promise<string> {
        const version = this.preflightChecker.getPageVersion(page);
        return version || '';
    }

    /**
     * Performs Lucid-specific validation
     */
    protected async validatePlatformRequirements(page: PageProxy): Promise<UpgradeIssue[]> {
        return this.preflightChecker.validatePage(page);
    }

    /**
     * Backs up current state before upgrade
     */
    protected async beginUpgrade(page: PageProxy): Promise<void> {
        this.backupData.clear();

        // Backup page data
        this.backupElementData('page', page);

        // Backup blocks
        for (const block of page.blocks.values()) {
            this.backupElementData(block.id, block);
        }

        // Backup lines
        for (const line of page.lines.values()) {
            this.backupElementData(line.id, line);
        }
    }

    /**
     * Backs up an element's shape data
     */
    private backupElementData(id: string, element: ElementProxy): void {
        const meta = element.shapeData.get(LucidVersionUpgrader.META_KEY);
        const data = element.shapeData.get(LucidVersionUpgrader.DATA_KEY);

        if (meta && data && typeof meta === 'string' && typeof data === 'string') {
            this.backupData.set(id, { meta, data });
        }
    }

    /**
     * Performs the upgrade on all elements
     */
    protected async performUpgrade(page: PageProxy): Promise<void> {
        const sourceVersion = await this.getSourceVersion(page);
        const transformations = getTransformationsBetweenVersions(sourceVersion, this.currentVersion);

        // Upgrade page/model first
        await this.upgradeElement(page, transformations, 'Model');

        // Upgrade blocks
        for (const block of page.blocks.values()) {
            await this.upgradeElement(block, transformations);
        }

        // Upgrade lines
        for (const line of page.lines.values()) {
            await this.upgradeElement(line, transformations);
        }
    }

    /**
     * Upgrades a single element
     */
    private async upgradeElement(
        element: ElementProxy, 
        transformations: any[], 
        forceType?: string
    ): Promise<void> {
        const metaStr = element.shapeData.get(LucidVersionUpgrader.META_KEY);
        const dataStr = element.shapeData.get(LucidVersionUpgrader.DATA_KEY);

        if (!metaStr || !dataStr || typeof metaStr !== 'string' || typeof dataStr !== 'string') return;

        try {
            const meta = JSON.parse(metaStr);
            const data = JSON.parse(dataStr);

            const elementType = forceType || meta.type;
            const transform = transformations.find(t => t.objectType === elementType);

            if (transform && transform.transformations.length > 0) {
                // Transform the data
                const newData = transform.transformations[0].transform(data);

                // Update metadata
                meta.version = this.currentVersion;
                meta.lastModified = new Date().toISOString();

                // Save back to element
                element.shapeData.set(LucidVersionUpgrader.META_KEY, JSON.stringify(meta));
                element.shapeData.set(LucidVersionUpgrader.DATA_KEY, JSON.stringify(newData));
            }
        } catch (error) {
            throw new Error(`Failed to upgrade element ${element.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Verifies upgrade and cleans up backup if successful
     */
    protected async finalizeUpgrade(page: PageProxy): Promise<void> {
        // Verify blocks
        for (const block of page.blocks.values()) {
            const metaStr = block.shapeData.get(LucidVersionUpgrader.META_KEY);
            if (!metaStr || typeof metaStr !== 'string') continue;

            try {
                const meta = JSON.parse(metaStr);
                if (meta.version !== this.currentVersion) {
                    throw new Error(`Block ${block.id} was not upgraded correctly`);
                }
            } catch (error) {
                throw new Error(`Failed to verify block ${block.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        // Verify lines
        for (const line of page.lines.values()) {
            const metaStr = line.shapeData.get(LucidVersionUpgrader.META_KEY);
            if (!metaStr || typeof metaStr !== 'string') continue;

            try {
                const meta = JSON.parse(metaStr);
                if (meta.version !== this.currentVersion) {
                    throw new Error(`Line ${line.id} was not upgraded correctly`);
                }
            } catch (error) {
                throw new Error(`Failed to verify line ${line.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        // Clear backup data after successful upgrade
        this.backupData.clear();
    }

    /**
     * Restores previous state if upgrade fails
     */
    protected async rollbackUpgrade(page: PageProxy): Promise<void> {
        if (this.backupData.size === 0) return;

        // Restore page data
        const pageBackup = this.backupData.get('page');
        if (pageBackup) {
            this.restoreElementData(page, pageBackup);
        }

        // Restore blocks
        for (const block of page.blocks.values()) {
            const blockBackup = this.backupData.get(block.id);
            if (blockBackup) {
                this.restoreElementData(block, blockBackup);
            }
        }

        // Restore lines
        for (const line of page.lines.values()) {
            const lineBackup = this.backupData.get(line.id);
            if (lineBackup) {
                this.restoreElementData(line, lineBackup);
            }
        }

        this.backupData.clear();
    }

    /**
     * Restores an element's shape data from backup
     */
    private restoreElementData(element: ElementProxy, backup: ShapeDataBackup): void {
        element.shapeData.set(LucidVersionUpgrader.META_KEY, backup.meta);
        element.shapeData.set(LucidVersionUpgrader.DATA_KEY, backup.data);
    }
}
