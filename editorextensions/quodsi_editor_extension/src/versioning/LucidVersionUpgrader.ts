import { BaseVersionUpgrader, UpgradeOptions, UpgradeIssue, MODEL_SCHEMA_VERSION, upgradeElements, SimulationObjectType } from '@quodsi/lucid-shared';
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
    // Review R3 (wire-cleanup Phase B2 Task 9, round 3): mirror
    // StorageAdapter.RESOURCE_REQUIREMENTS_KEY / STATES_KEY. Both are
    // page-level PLAIN ARRAYS (not per-shape q_data envelopes) that
    // performUpgrade previously never touched at all — an existing
    // document's custom requirements kept `rootClauses[]`/`clauseId`/
    // `subClauses` forever (and `ModelDefinitionPageBuilder.
    // deserializeClause(undefined)` threw on load, since the clean reader
    // expects `rootClause` singular), and stored states kept their old
    // UPPERCASE enum values, which then flowed un-mapped onto the
    // 2026.11.01 wire.
    private static readonly RESOURCE_REQUIREMENTS_KEY = 'q_res_requirements';
    private static readonly STATES_KEY = 'q_states';

    private preflightChecker: LucidPreflightChecker;
    private backupData: Map<string, ShapeDataBackup>;
    private entitiesBackup: { existed: boolean; data?: string } = { existed: false };
    private requirementsBackup: { existed: boolean; data?: string } = { existed: false };
    private statesBackup: { existed: boolean; data?: string } = { existed: false };

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

        // Backup the page-level resource-requirements and states lists
        // (review R3) — same treatment as entities, so a failed upgrade
        // rolls these back too instead of leaving them upgraded (or
        // partially upgraded) while everything else reverts.
        const requirementsData = page.shapeData.get(LucidVersionUpgrader.RESOURCE_REQUIREMENTS_KEY);
        this.requirementsBackup = typeof requirementsData === 'string'
            ? { existed: true, data: requirementsData }
            : { existed: false };

        const statesData = page.shapeData.get(LucidVersionUpgrader.STATES_KEY);
        this.statesBackup = typeof statesData === 'string'
            ? { existed: true, data: statesData }
            : { existed: false };

        // Backup blocks. `allBlocks`, not `blocks` — the latter is
        // documented (and implemented, via a shallower SDK list call) as
        // "not including ones inside groups". `performUpgrade` below and
        // `ModelDefinitionPageBuilder.buildFromConvertedPage` (the actual
        // reader that constructs ActivityLucid/GeneratorLucid/ConnectorLucid
        // from this same page) both need to agree on which elements exist —
        // buildFromConvertedPage already iterates `allBlocks`/`allLines`, so
        // using the shallow list here silently skipped any Activity/
        // Generator/Resource block (or Connector line) a user had grouped
        // (Ctrl+G — an ordinary action), leaving it un-upgraded but still
        // read by clean-name-only readers (wire-cleanup Phase B2 Task 10
        // finding).
        for (const block of page.allBlocks.values()) {
            this.backupElementData(block.id, block);
        }

        // Backup lines — same `allLines` reasoning as blocks above.
        for (const line of page.allLines.values()) {
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
     * Reads a page-level JSON array (q_res_requirements / q_states) as
     * plain objects. Corrupt/absent data reads as empty, same posture as
     * every other page-level list read in this class (`entitiesById`'s own
     * parse above, and `StorageAdapter.getResourceRequirements`/`getStates`).
     */
    private readPageArray(page: PageProxy, key: string): any[] {
        const raw = page.shapeData.get(key);
        if (!raw || typeof raw !== 'string') return [];
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    /**
     * Flattens an upgraded envelope back to the plain `{id, ...domain}`
     * shape `q_res_requirements`/`q_states` store — NOT the same shape as
     * `flattenEnvelope` (shared), which also carries `type` back onto the
     * result. Neither `ISerializedResourceRequirement` nor `ISerializedState`
     * has a `type` slot (wire-cleanup Phase B2 Task 9 — no clean-wire
     * class-tag), and these two arrays were never envelope/type-tagged
     * blobs in the first place.
     */
    private flattenArrayItem(upgraded: any): any {
        const domain = upgraded?.domain ?? upgraded;
        const id = upgraded?.id ?? domain?.id;
        return { ...domain, id };
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

        // Page/model first, then blocks, then lines. `allBlocks`/`allLines`
        // (not `blocks`/`lines`) — see the matching comment in
        // `beginUpgrade` above: the shallow lists exclude anything inside a
        // Lucid Group, which `ModelDefinitionPageBuilder` does NOT exclude
        // when it builds the ModelDefinition these same shapes feed into.
        collect(page, true);
        for (const block of page.allBlocks.values()) collect(block, false);
        for (const line of page.allLines.values()) collect(line, false);

        // Review R3: the page-level resource-requirements and states lists
        // are plain arrays, not per-shape q_data blobs, so `collect` above
        // never sees them. Tag each entry with a synthetic RawElement
        // `type` (registry keys 'ResourceRequirement'/'State' exist — B1
        // Task 7 registered both) and fold them into the SAME
        // `upgradeElements` call as every shape-backed element below —
        // one call, not two/three separate ones, so the cross-element
        // UpgradeContext (state-name resolution, weight groups, etc.) sees
        // the full sibling set, exactly like the golden acceptance test
        // (`cleanTransforms.golden.test.ts`) builds one combined
        // `rawElements` array for a host's whole document.
        // Spread the stored entry FIRST: a dialog-authored entry can carry a
        // stale `type` (e.g. State's SimulationObject-shaped `type: 'None'`),
        // and that must not shadow the synthetic registry key below or the
        // element's transforms (e.g. StateTransforms) never run.
        const storedRequirements = this.readPageArray(page, LucidVersionUpgrader.RESOURCE_REQUIREMENTS_KEY);
        const requirementInputs: RawElement[] = storedRequirements.map((r) => ({ ...r, type: 'ResourceRequirement' }));

        const storedStates = this.readPageArray(page, LucidVersionUpgrader.STATES_KEY);
        const stateInputs: RawElement[] = storedStates.map((s) => ({ ...s, type: 'State' }));

        // Pure core upgrade — returns envelopes; mappingSource is preserved inside
        // platform, so the adapter no longer re-attaches it.
        const combinedInputs: RawElement[] = [...targets.map(t => t.blob), ...requirementInputs, ...stateInputs];
        const result = upgradeElements(combinedInputs, sourceVersion);
        const elementResults = result.elements.slice(0, targets.length);
        const requirementResults = result.elements.slice(targets.length, targets.length + requirementInputs.length);
        const stateResults = result.elements.slice(targets.length + requirementInputs.length);

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

        elementResults.forEach((upgraded, i) => {
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

        // Write the upgraded resource-requirements / states lists back.
        // Flat RawElement inputs are always re-wrapped into a NEW envelope
        // object by `upgradeElements` (they're never already-envelopes, so
        // the "return by reference when untouched" fast path never applies
        // here) — the by-reference `changed` check the per-shape loop above
        // uses can't distinguish "really changed" for these, so — same
        // allowance already given to the page's own q_data above (`t.isPage`
        // always writes) — always write back when the list is non-empty.
        if (requirementInputs.length > 0) {
            const upgradedRequirements = requirementResults.map((el) => this.flattenArrayItem(el));
            page.shapeData.set(LucidVersionUpgrader.RESOURCE_REQUIREMENTS_KEY, JSON.stringify(upgradedRequirements));
        }

        if (stateInputs.length > 0) {
            const upgradedStates = stateResults.map((el) => this.flattenArrayItem(el));
            page.shapeData.set(LucidVersionUpgrader.STATES_KEY, JSON.stringify(upgradedStates));
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

        // Restore the page-level resource-requirements and states lists
        // (review R3), same delete-if-didn't-exist posture as entities.
        if (this.requirementsBackup.existed) {
            page.shapeData.set(LucidVersionUpgrader.RESOURCE_REQUIREMENTS_KEY, this.requirementsBackup.data!);
        } else {
            page.shapeData.delete(LucidVersionUpgrader.RESOURCE_REQUIREMENTS_KEY);
        }

        if (this.statesBackup.existed) {
            page.shapeData.set(LucidVersionUpgrader.STATES_KEY, this.statesBackup.data!);
        } else {
            page.shapeData.delete(LucidVersionUpgrader.STATES_KEY);
        }

        // Restore blocks. `allBlocks`/`allLines` — matches `beginUpgrade`'s
        // backup scope above; a shallow restore here would leave grouped
        // elements upgraded (or partially upgraded) even after a rollback.
        for (const block of page.allBlocks.values()) {
            const blockBackup = this.backupData.get(block.id);
            if (blockBackup) {
                this.restoreElementData(block, blockBackup);
            }
        }

        // Restore lines
        for (const line of page.allLines.values()) {
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
