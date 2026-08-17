// tests/model/modelManager.upgradeFailure.test.ts
//
// Wire-cleanup Phase B2 Task 11, carry item 4 (sanctioned edit):
// ModelManager.ensureModelDefinition()'s version-check catch block used to
// only `this.debug.error(...)` a failed upgrade and then fall straight
// through to building the model from storage that may still carry old
// field names -- the clean-only readers (ModelDefinitionPageBuilder /
// *Lucid classes) would silently default away anything they don't
// recognize instead of failing loudly (a silent-loss class of bug).
// Mirrors the drawio/Visio B1 posture (DrawioModelManager.bootstrap's
// upgradeOnOpen catch): on upgrade failure, surface a visible error and do
// NOT proceed to build.

import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ModelManager } from '../../src/core/ModelManager';
import { LucidVersionManager } from '../../src/versioning/LucidVersionManager';
import { ModelDefinitionPageBuilder } from '../../src/core/ModelDefinitionPageBuilder';
import { router } from '../../src/core/messaging';
import { SimulationObjectType } from '@quodsi/lucid-shared';
import { makeFakePage } from '../helpers/fakeProxies';

describe('ModelManager — upgrade-on-open failure surfaces a visible error and blocks the build (Task 11 carry item 4)', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('upgrade throws -> build not invoked -> error surfaced via MODEL_VALIDATION_RESULT', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        // A converted Quodsi page (Model-typed q_data) -- the ONLY shape that
        // reaches the version-check branch at all (storageAdapter.isQuodsiModel).
        storage.setElementData(page, { id: 'model-1', name: 'M' } as any, SimulationObjectType.Model);

        const handlePageLoadSpy = jest
            .spyOn(LucidVersionManager.prototype, 'handlePageLoad')
            .mockRejectedValueOnce(new Error('simulated upgrade failure'));
        const buildSpy = jest.spyOn(ModelDefinitionPageBuilder.prototype, 'buildFromConvertedPage');
        const sendSpy = jest.spyOn(router, 'send').mockImplementation(() => {});

        const manager = new ModelManager(storage);
        manager.setCurrentPage(page);

        const result = await (manager as any).ensureModelDefinition();

        expect(handlePageLoadSpy).toHaveBeenCalledTimes(1);
        // Build not invoked: the clean-only readers never ran over
        // possibly-stale storage.
        expect(buildSpy).not.toHaveBeenCalled();
        // No half-built model: ensureModelDefinition returns null, and the
        // manager's own in-memory field agrees (no stale/wrong-page data
        // left behind for a later flush to leak).
        expect(result).toBeNull();
        expect((manager as any).modelDefinition).toBeNull();

        // Error surfaced via the one mechanism in this file already proven
        // to reach the user (the Model Editor's Validation tab) -- the
        // SAME MODEL_VALIDATION_RESULT broadcast validateModel() uses for
        // its own "no model initialized" case.
        expect(sendSpy).toHaveBeenCalledTimes(1);
        const [channel, envelope] = sendSpy.mock.calls[0];
        expect(channel).toBe('model');
        expect((envelope as any).type).toBe('MODEL_VALIDATION_RESULT');
        expect((envelope as any).data.isValid).toBe(false);
        expect((envelope as any).data.issues).toHaveLength(1);
        expect((envelope as any).data.issues[0].code).toBe('upgrade_failed');
        expect((envelope as any).data.issues[0].message).toContain('simulated upgrade failure');

        // Retry-not-latch: the version gate was deliberately left unmarked,
        // so a later call retries the version check instead of silently
        // reusing the failed result forever (mirrors DrawioModelManager.
        // bootstrap resetting bootstrappedRoot on a caught upgrade-on-open
        // failure). The retry's downstream build against this bare fake
        // page is out of scope here (ModelDefinitionPageBuilder needs real
        // Lucid element data this test doesn't construct) -- only the
        // version-check retry itself is being pinned, so any rejection past
        // that point is swallowed.
        handlePageLoadSpy.mockResolvedValueOnce({ upgraded: false, sourceVersion: '', targetVersion: '' });
        await (manager as any).ensureModelDefinition().catch(() => {});
        expect(handlePageLoadSpy).toHaveBeenCalledTimes(2);
    });

    it('a successful upgrade check still proceeds to build (non-regression)', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        storage.setElementData(page, { id: 'model-1', name: 'M' } as any, SimulationObjectType.Model);

        jest
            .spyOn(LucidVersionManager.prototype, 'handlePageLoad')
            .mockResolvedValueOnce({ upgraded: false, sourceVersion: '', targetVersion: '' });
        const buildSpy = jest.spyOn(ModelDefinitionPageBuilder.prototype, 'buildFromConvertedPage');
        jest.spyOn(router, 'send').mockImplementation(() => {});

        const manager = new ModelManager(storage);
        manager.setCurrentPage(page);

        // The build itself may still fail against this bare fake page
        // (ModelDefinitionPageBuilder needs real Lucid element data this
        // test doesn't construct) -- irrelevant here. Only proving the
        // fix's early-return catch does NOT fire on a successful check, so
        // the builder still gets a chance to run at all.
        await (manager as any).ensureModelDefinition().catch(() => {});

        expect(buildSpy).toHaveBeenCalledTimes(1);
    });
});
