import { BaseVersionUpgrader, UpgradeOptions, UpgradeIssue, QUODSI_VERSION, upgradeElements, SimulationObjectType } from '@quodsi/lucid-shared';
import type { RawElement, ISerializedEntity } from '@quodsi/lucid-shared';
import { PageProxy, ElementProxy } from 'lucid-extension-sdk';
import { LucidPreflightChecker } from './LucidPreflightChecker';

interface ShapeDataBackup {
    data: string;
}

/**
 * Lucid-specific version upgrader. Delegates the per-element transform decision
 * to the pure core engine (which returns element envelopes) and keeps only
 * platform concerns here: which shapes to rewrite and stamping the page-level
 * version marker used by the migration gate.
 */
export class LucidVersionUpgrader extends BaseVersionUpgrader {
    private static readonly DATA_KEY = 'q_data';
    // Mirrors StorageAdapter.ENTITIES_KEY. Entities are no longer shape-mapped; the
    // migration below lifts legacy entity shapes into this page-level list.
    private static readonly ENTITIES_KEY = 'q_entities';

    private preflightChecker: LucidPreflightChecker;
    private backupData: Map<string, ShapeDataBackup>;
    private entitiesBackup: { existed: boolean; data?: string } = { existed: false };

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

        // Backup the page-level entities list so an entity-shape lift can be rolled back
        const entitiesData = page.shapeData.get(LucidVersionUpgrader.ENTITIES_KEY);
        this.entitiesBackup = typeof entitiesData === 'string'
            ? { existed: true, data: entitiesData }
            : { existed: false };

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

    protected async performUpgrade(page: PageProxy): Promise<void> {
        const sourceVersion = await this.getSourceVersion(page);

        interface Target {
            element: ElementProxy;
            blob: RawElement;
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
            targets.push({ element, blob, isPage });
        };

        // Page/model first, then blocks, then lines
        collect(page, true);
        for (const block of page.blocks.values()) collect(block, false);
        for (const line of page.lines.values()) collect(line, false);

        // Pure core upgrade — returns envelopes; mappingSource is preserved inside
        // platform, so the adapter no longer re-attaches it.
        const result = upgradeElements(targets.map(t => t.blob), sourceVersion);

        // Entities are no longer shape-mapped. Lift any legacy entity shapes into the
        // page-level q_entities list (preserving id == block.id so existing entityId
        // references in Generators/Activities/Create-actions still resolve), then strip
        // their q_data so the shapes become inert (kept on the canvas, ignored by the
        // model builder). Idempotent: keyed by id, and a stripped shape is no longer
        // collected on subsequent runs.
        const entitiesById = new Map<string, ISerializedEntity>();
        const existingEntitiesStr = page.shapeData.get(LucidVersionUpgrader.ENTITIES_KEY);
        if (existingEntitiesStr && typeof existingEntitiesStr === 'string') {
            try {
                for (const e of JSON.parse(existingEntitiesStr) as ISerializedEntity[]) {
                    entitiesById.set(e.id, e);
                }
            } catch {
                // Corrupt list — treat as empty and rebuild from shapes.
            }
        }
        let entitiesChanged = false;

        result.elements.forEach((upgraded, i) => {
            const t = targets[i];
            const type = (upgraded as any)?.type;

            if (!t.isPage && type === SimulationObjectType.Entity) {
                const domain = (upgraded as any).domain ?? upgraded;
                const id = (upgraded as any).id ?? t.element.id;
                if (!entitiesById.has(id)) {
                    entitiesById.set(id, {
                        id,
                        name: domain?.name ?? 'Entity',
                        description: domain?.description ?? '',
                        type: SimulationObjectType.Entity,
                        x: 0,
                        y: 0
                    });
                    entitiesChanged = true;
                }
                // Strip the entity binding; keep the physical shape.
                t.element.shapeData.delete(LucidVersionUpgrader.DATA_KEY);
                return;
            }

            const changed = upgraded !== t.blob; // engine returns same ref when untouched
            if (!changed && !t.isPage) return;    // don't rewrite untouched shapes

            if (t.isPage) {
                // The page retains a top-level version marker for the migration gate.
                (upgraded as any).version = result.toVersion;
            }
            t.element.shapeData.set(LucidVersionUpgrader.DATA_KEY, JSON.stringify(upgraded));
        });

        if (entitiesChanged) {
            page.shapeData.set(
                LucidVersionUpgrader.ENTITIES_KEY,
                JSON.stringify([...entitiesById.values()])
            );
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

        // Restore the page-level entities list (delete if it didn't exist pre-upgrade)
        if (this.entitiesBackup.existed) {
            page.shapeData.set(LucidVersionUpgrader.ENTITIES_KEY, this.entitiesBackup.data!);
        } else {
            page.shapeData.delete(LucidVersionUpgrader.ENTITIES_KEY);
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
