import { BaseVersionUpgrader, UpgradeOptions, UpgradeIssue, QUODSI_VERSION, upgradeElements } from '@quodsi/lucid-shared';
import type { RawElement } from '@quodsi/lucid-shared';
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
     * Performs the upgrade on all elements by delegating the per-element
     * transform decision to the pure core engine, while keeping platform
     * concerns (mappingSource preservation, page version stamping, which
     * shapes to rewrite) here in the adapter.
     */
    protected async performUpgrade(page: PageProxy): Promise<void> {
        const sourceVersion = await this.getSourceVersion(page);

        interface Target {
            element: ElementProxy;
            blob: RawElement;
            mappingSource: any;
            isPage: boolean;
        }
        const targets: Target[] = [];

        const collect = (element: ElementProxy, isPage: boolean): void => {
            const dataStr = element.shapeData.get(LucidVersionUpgrader.DATA_KEY);
            if (!dataStr || typeof dataStr !== 'string') return;
            let blob: any;
            try {
                blob = JSON.parse(dataStr);
            } catch {
                throw new Error(`Failed to parse q_data for element ${element.id}`);
            }
            if (!blob || !blob.type) return;
            targets.push({ element, blob, mappingSource: blob.mappingSource, isPage });
        };

        // Page/model first, then blocks, then lines
        collect(page, true);
        for (const block of page.blocks.values()) collect(block, false);
        for (const line of page.lines.values()) collect(line, false);

        // Pure core upgrade
        const result = upgradeElements(targets.map(t => t.blob), sourceVersion);

        // Write back, preserving platform + version concerns adapter-side.
        result.elements.forEach((upgraded, i) => {
            const t = targets[i];
            const changed = upgraded !== t.blob; // engine returns same ref when untouched
            if (!changed && !t.isPage) return;    // match prior behavior: don't rewrite untouched shapes

            if (t.mappingSource !== undefined) {
                (upgraded as any).mappingSource = t.mappingSource;
            }
            if (t.isPage) {
                (upgraded as any).version = result.toVersion;
            }
            t.element.shapeData.set(LucidVersionUpgrader.DATA_KEY, JSON.stringify(upgraded));
        });
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
