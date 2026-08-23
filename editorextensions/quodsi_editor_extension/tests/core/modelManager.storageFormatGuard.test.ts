// tests/core/modelManager.storageFormatGuard.test.ts
//
// Plan 2b Task 5: ensureModelDefinition() gained a storage-format FORWARD
// guard and an unconditional migrate-on-open, both ahead of the schema
// version check.
//
//   - A document stamped HIGHER than LUCID_STORAGE_FORMAT was written by a
//     newer extension. Reading it with the old readers would silently
//     default away whatever they do not recognise (the same silent-loss
//     class of bug the upgrade-failure guard exists for), so the build is
//     refused outright and an `extension_outdated` ERROR is surfaced.
//   - Everything at or below the current format is migrated
//     UNCONDITIONALLY -- the schema-version upgrade only runs when versions
//     differ, so a current-schema document still holding shape-owned
//     resources would otherwise never move to q_resources.
//   - Duplicate names resolved by that migration are user-visible facts, so
//     they surface ONCE as a WARNING on the next validation.
//
// Harness copied from tests/model/modelManager.upgradeFailure.test.ts: a
// real StorageAdapter over fake proxies, LucidVersionManager.handlePageLoad
// stubbed, router.send captured to read the broadcast validation result.

import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ModelManager } from '../../src/core/ModelManager';
import { LucidVersionManager } from '../../src/versioning/LucidVersionManager';
import { ModelDefinitionPageBuilder } from '../../src/core/ModelDefinitionPageBuilder';
import { router } from '../../src/core/messaging';
import { LUCID_STORAGE_FORMAT } from '../../src/core/storageFormat';
import { SimulationObjectType } from '@quodsi/lucid-shared';
import { makeFakePage, makeFakeBlock, addBlock } from '../helpers/fakeProxies';
import { buildLegacyResourcesPage } from '../fixtures/legacyResourcesPage';

/** Model-typed q_data on the page — the only shape that reaches the guard. */
function markAsQuodsiPage(storage: StorageAdapter, page: any): void {
    storage.setElementData(page, { id: 'model-1', name: 'M' } as any, SimulationObjectType.Model);
}

/** A Resource BLOCK in storage format 2: q_data holds a pointer, nothing else. */
function addBlockPointer(storage: StorageAdapter, page: any, blockId: string, resourceId: string): void {
    const block = addBlock(page, makeFakeBlock(blockId));
    storage.setElementData(block, { id: blockId, resourceId }, SimulationObjectType.Resource);
}

function issuesFrom(sendSpy: jest.SpyInstance): any[] {
    const calls = sendSpy.mock.calls.filter(([, envelope]: any[]) => (envelope as any).type === 'MODEL_VALIDATION_RESULT');
    expect(calls.length).toBeGreaterThan(0);
    return (calls[calls.length - 1][1] as any).data.issues;
}

describe('ModelManager — storage-format forward guard + migrate-on-open (Plan 2b Task 5)', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('refuses a document stamped newer than LUCID_STORAGE_FORMAT with an extension_outdated ERROR and builds nothing', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        markAsQuodsiPage(storage, page);
        page.shapeData.set('q_lucid_format', String(LUCID_STORAGE_FORMAT + 1));

        const handlePageLoadSpy = jest.spyOn(LucidVersionManager.prototype, 'handlePageLoad');
        const buildSpy = jest.spyOn(ModelDefinitionPageBuilder.prototype, 'buildFromConvertedPage');
        const sendSpy = jest.spyOn(router, 'send').mockImplementation(() => { });

        const manager = new ModelManager(storage);
        manager.setCurrentPage(page);

        const def = await manager.getModelDefinition();

        expect(def).toBeNull();
        expect((manager as any).modelDefinition).toBeNull();
        // The guard fires BEFORE the schema-version check and before the build.
        expect(handlePageLoadSpy).not.toHaveBeenCalled();
        expect(buildSpy).not.toHaveBeenCalled();

        const issues = issuesFrom(sendSpy);
        expect(issues).toHaveLength(1);
        expect(issues[0].code).toBe('extension_outdated');
        expect(issues[0].severity).toBe('error');
        expect(issues[0].message).toMatch(/Update the Quodsi extension/);
        // No "reload to retry" advice: reloading cannot help; only an update can.
        expect(issues[0].message).not.toMatch(/Reload the page to retry/);

        // Retry-not-latch: the gate stays unmarked so a later call re-checks.
        expect((manager as any).versionCheckedPageId).toBeNull();
    });

    it('migrates an unstamped legacy page before the version check and stamps it', async () => {
        const storage = new StorageAdapter();
        const page = buildLegacyResourcesPage(storage);
        expect(storage.getStorageFormat(page)).toBeNull();

        let resourcesExistedAtVersionCheck: boolean | null = null;
        jest.spyOn(LucidVersionManager.prototype, 'handlePageLoad').mockImplementation(async () => {
            resourcesExistedAtVersionCheck = page.shapeData.get('q_resources') !== undefined;
            return { upgraded: false, sourceVersion: '', targetVersion: '' };
        });
        jest.spyOn(router, 'send').mockImplementation(() => { });

        const manager = new ModelManager(storage);
        manager.setCurrentPage(page);

        const def = await manager.getModelDefinition();

        // Migration ran AHEAD of the schema-version upgrade, not after it.
        expect(resourcesExistedAtVersionCheck).toBe(true);
        expect(storage.getStorageFormat(page)).toBe(LUCID_STORAGE_FORMAT);
        // One block record + two lane records, now all model-level.
        expect(def!.resources.size()).toBe(3);
    });

    it('surfaces migration renames ONCE as a WARNING on the next validation, then never again', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        markAsQuodsiPage(storage, page);

        // The rename case from resourceStorageMigration.test.ts: a 'Nurse'
        // block record and a 'Nurse' lane record collide once both storage
        // locations merge into q_resources.
        const blk = addBlock(page, makeFakeBlock('blk-n', { text: 'Nurse' }));
        storage.setElementData(blk, { id: 'blk-n', name: 'Nurse', capacity: 1 } as any, SimulationObjectType.Resource);
        const swim = addBlock(page, makeFakeBlock('blk-s', { className: 'AdvancedSwimLaneBlock', lanes: ['Nurse'] }));
        swim.shapeData.set('q_swimlane', JSON.stringify({
            lanes: [{
                laneId: 'l0', titleSnapshot: 'Nurse', assignmentMode: 'runtime-derive',
                resource: { id: 'res-lane-n', name: 'Nurse', capacity: 1, description: '' }
            }],
            lastSyncedAt: 'x',
        }));

        jest.spyOn(LucidVersionManager.prototype, 'handlePageLoad')
            .mockResolvedValue({ upgraded: false, sourceVersion: '', targetVersion: '' });
        jest.spyOn(router, 'send').mockImplementation(() => { });

        const manager = new ModelManager(storage);
        manager.setCurrentPage(page);

        const v1 = await manager.validateModel();
        const v2 = await manager.validateModel();

        const renamesV1 = v1.issues.filter(i => i.code === 'resource_renamed_on_migration');
        expect(renamesV1).toHaveLength(1);
        expect(renamesV1[0].severity).toBe('warning');
        expect(renamesV1[0].message).toContain('Nurse -> Nurse_2');
        // Consumed once: a permanent nag for a one-time event would be noise.
        expect(v2.issues.filter(i => i.code === 'resource_renamed_on_migration')).toHaveLength(0);
        // The counts the panel renders agree with the list it renders.
        expect(v1.summary.warningCount).toBe(v1.issues.filter(i => i.severity === 'warning').length);
    });

    it('a migration throw is reported through the existing upgrade_failed path and the gate is not latched', async () => {
        const storage = new StorageAdapter();
        const page = buildLegacyResourcesPage(storage);
        const nurse = page.allBlocks.get('blk-nurse');
        const nurseDataBefore = nurse.shapeData.get('q_data');

        // The final write of the migration — everything before it has already
        // rewritten block q_data to pointers, so this proves the restore.
        const originalSet = page.shapeData.set.bind(page.shapeData);
        page.shapeData.set = (key: string, value: string) => {
            if (key === 'q_resources') throw new Error('simulated q_resources write failure');
            originalSet(key, value);
        };

        const handlePageLoadSpy = jest.spyOn(LucidVersionManager.prototype, 'handlePageLoad')
            .mockResolvedValue({ upgraded: false, sourceVersion: '', targetVersion: '' });
        const buildSpy = jest.spyOn(ModelDefinitionPageBuilder.prototype, 'buildFromConvertedPage');
        const sendSpy = jest.spyOn(router, 'send').mockImplementation(() => { });

        const manager = new ModelManager(storage);
        manager.setCurrentPage(page);

        const def = await manager.getModelDefinition();

        expect(def).toBeNull();
        expect(handlePageLoadSpy).not.toHaveBeenCalled();
        expect(buildSpy).not.toHaveBeenCalled();

        const issues = issuesFrom(sendSpy);
        expect(issues).toHaveLength(1);
        expect(issues[0].code).toBe('upgrade_failed');
        expect(issues[0].message).toContain('simulated q_resources write failure');

        expect((manager as any).versionCheckedPageId).toBeNull();
        // The migration's own restore envelope put the block records back.
        expect(nurse.shapeData.get('q_data')).toBe(nurseDataBefore);
        expect(page.shapeData.get('q_lucid_format')).toBeUndefined();
    });
});

describe('ModelManager.validateModel — resource-link rejections surface as WARNINGs (Plan 2b Task 5)', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('reports a dangling pointer and a duplicate claim, each against the claiming block', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        markAsQuodsiPage(storage, page);
        storage.setStorageFormat(page, LUCID_STORAGE_FORMAT);
        storage.setResources(page, [{ id: 'r1', name: 'Nurse', capacity: 1 }]);

        // Document order decides the winner: blk-1 claims r1, blk-2 is the
        // duplicate. blk-3 points at a record that is not there at all.
        addBlockPointer(storage, page, 'blk-1', 'r1');
        addBlockPointer(storage, page, 'blk-2', 'r1');
        addBlockPointer(storage, page, 'blk-3', 'ghost');

        jest.spyOn(LucidVersionManager.prototype, 'handlePageLoad')
            .mockResolvedValue({ upgraded: false, sourceVersion: '', targetVersion: '' });
        jest.spyOn(router, 'send').mockImplementation(() => { });

        const manager = new ModelManager(storage);
        manager.setCurrentPage(page);

        const result = await manager.validateModel();

        const duplicate = result.issues.find(i => i.code === 'resource_link_duplicate');
        const dangling = result.issues.find(i => i.code === 'resource_link_dangling');

        expect(duplicate).toBeDefined();
        expect(duplicate!.severity).toBe('warning');
        expect(duplicate!.elementId).toBe('blk-2');
        // Friendly copy: the resource NAME, resolved from the model, not the id.
        expect(duplicate!.message).toContain('Nurse');

        expect(dangling).toBeDefined();
        expect(dangling!.severity).toBe('warning');
        expect(dangling!.elementId).toBe('blk-3');
        expect(dangling!.message).toContain('ghost');

        // A WARNING never blocks simulation, and the counts match the list.
        expect(result.summary.warningCount).toBe(result.issues.filter(i => i.severity === 'warning').length);
        expect(result.isValid).toBe(result.summary.errorCount === 0);
    });
});
