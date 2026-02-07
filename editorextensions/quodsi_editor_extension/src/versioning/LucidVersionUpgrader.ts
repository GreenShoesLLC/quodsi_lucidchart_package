import { BaseVersionUpgrader, UpgradeOptions, UpgradeIssue, QUODSI_VERSION } from '@quodsi/shared';
import { getTransformationsBetweenVersions } from '@quodsi/shared';
import { PageProxy, ElementProxy } from 'lucid-extension-sdk';
import { LucidPreflightChecker } from './LucidPreflightChecker';

interface ShapeDataBackup {
    data: string;
}

/**
 * Lucid-specific implementation of version upgrader.
 * Works with the single q_data key format (type, id, mappingSource, version all in q_data).
 */
export class LucidVersionUpgrader extends BaseVersionUpgrader {
    private static readonly DATA_KEY = 'q_data';

    private preflightChecker: LucidPreflightChecker;
    private backupData: Map<string, ShapeDataBackup>;

    constructor(currentVersion: string, options?: UpgradeOptions) {
        super(currentVersion, options);
        this.preflightChecker = new LucidPreflightChecker();
        this.backupData = new Map();
    }

    /**
     * Gets the source version from the page's q_data (version field)
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
     * Backs up an element's shape data (only q_data now)
     */
    private backupElementData(id: string, element: ElementProxy): void {
        const data = element.shapeData.get(LucidVersionUpgrader.DATA_KEY);

        if (data && typeof data === 'string') {
            this.backupData.set(id, { data });
        }
    }

    /**
     * Performs the upgrade on all elements
     */
    protected async performUpgrade(page: PageProxy): Promise<void> {
        const sourceVersion = await this.getSourceVersion(page);
        const transformations = getTransformationsBetweenVersions(sourceVersion, this.currentVersion);

        // Upgrade page/model first
        await this.upgradeElement(page, transformations, true);

        // Upgrade blocks
        for (const block of page.blocks.values()) {
            await this.upgradeElement(block, transformations, false);
        }

        // Upgrade lines
        for (const line of page.lines.values()) {
            await this.upgradeElement(line, transformations, false);
        }
    }

    /**
     * Upgrades a single element's q_data
     */
    private async upgradeElement(
        element: ElementProxy,
        transformations: any[],
        isPage: boolean
    ): Promise<void> {
        const dataStr = element.shapeData.get(LucidVersionUpgrader.DATA_KEY);

        if (!dataStr || typeof dataStr !== 'string') return;

        try {
            const data = JSON.parse(dataStr);
            const elementType = data.type;

            if (!elementType) return;

            const transform = transformations.find(t => t.objectType === elementType);

            if (transform && transform.transformations.length > 0) {
                // Transform the component data
                const transformedData = transform.transformations[0].transform(data);

                // Preserve type info fields
                transformedData.type = data.type;
                transformedData.id = data.id;
                if (data.mappingSource) {
                    transformedData.mappingSource = data.mappingSource;
                }

                // Update version on page only
                if (isPage) {
                    transformedData.version = this.currentVersion;
                }

                // Save back to element
                element.shapeData.set(LucidVersionUpgrader.DATA_KEY, JSON.stringify(transformedData));
            } else if (isPage) {
                // Even if no transform needed, update page version
                data.version = this.currentVersion;
                element.shapeData.set(LucidVersionUpgrader.DATA_KEY, JSON.stringify(data));
            }
        } catch (error) {
            throw new Error(`Failed to upgrade element ${element.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Verifies upgrade was successful
     */
    protected async finalizeUpgrade(page: PageProxy): Promise<void> {
        // Verify the page version was updated
        const pageDataStr = page.shapeData.get(LucidVersionUpgrader.DATA_KEY);
        if (pageDataStr && typeof pageDataStr === 'string') {
            try {
                const pageData = JSON.parse(pageDataStr);
                if (pageData.version !== this.currentVersion) {
                    throw new Error(`Page version was not upgraded correctly`);
                }
            } catch (error) {
                if (error instanceof Error && error.message.includes('not upgraded')) {
                    throw error;
                }
                throw new Error(`Failed to verify page upgrade: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        element.shapeData.set(LucidVersionUpgrader.DATA_KEY, backup.data);
    }
}
