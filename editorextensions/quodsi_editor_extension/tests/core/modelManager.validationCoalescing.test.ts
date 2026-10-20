// ClickUp 86e359a0c: every selection event and every write ran
// ModelManager.validateModel(), each one a full rebuild from shape storage
// plus a MODEL_VALIDATION_RESULT broadcast. Seen 2026-09-06: dozens per
// second on an idle canvas, enough to trip Lucid's telemetry rate limit.
// validateModel() now coalesces: calls inside one short window share a single
// run, and a call that arrives while a run is in progress gets one fresh run
// after it. validateModelNow() keeps the immediate path for the Validate
// button.
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ModelManager } from '../../src/core/ModelManager';
import { LucidVersionManager } from '../../src/versioning/LucidVersionManager';
import { ModelDefinitionPageBuilder } from '../../src/core/ModelDefinitionPageBuilder';
import { router } from '../../src/core/messaging';
import { LUCID_STORAGE_FORMAT } from '../../src/core/storageFormat';
import { SimulationObjectType, EnvelopeMessageType } from '@quodsi/lucid-shared';
import { makeFakePage } from '../helpers/fakeProxies';

function setup() {
    jest.spyOn(LucidVersionManager.prototype, 'handlePageLoad').mockResolvedValue({
        upgraded: false, sourceVersion: '', targetVersion: '',
    } as any);
    const storage = new StorageAdapter();
    const page = makeFakePage('page-1');
    storage.setElementData(page, { id: 'model-1', name: 'M' } as any, SimulationObjectType.Model);
    storage.setStorageFormat(page, LUCID_STORAGE_FORMAT);
    const manager = new ModelManager(storage);
    manager.setCurrentPage(page);
    const sendSpy = jest.spyOn(router, 'send').mockImplementation(() => { });
    const buildSpy = jest.spyOn(ModelDefinitionPageBuilder.prototype, 'buildFromConvertedPage');
    const broadcasts = () =>
        sendSpy.mock.calls.filter(c => (c[1] as any)?.type === EnvelopeMessageType.MODEL_VALIDATION_RESULT).length;
    return { manager, buildSpy, broadcasts };
}

describe('ModelManager validation coalescing', () => {
    afterEach(() => jest.restoreAllMocks());

    it('back-to-back calls share one rebuild and one broadcast', async () => {
        const { manager, buildSpy, broadcasts } = setup();

        const results = await Promise.all([1, 2, 3, 4, 5].map(() => manager.validateModel()));

        expect(buildSpy).toHaveBeenCalledTimes(1);
        expect(broadcasts()).toBe(1);
        expect(new Set(results).size).toBe(1);
    });

    it('a call made while a run is in progress gets one fresh run after it', async () => {
        const { manager, buildSpy, broadcasts } = setup();
        // Hold the first run's rebuild open until the late calls are made.
        let release!: () => void;
        const gate = new Promise<void>(r => { release = r; });
        const original = (manager as any).runValidation.bind(manager);
        let runs = 0;
        jest.spyOn(manager as any, 'runValidation').mockImplementation(async () => {
            if (++runs === 1) await gate;
            return original();
        });

        const first = manager.validateModel();
        // Past the coalescing window: the first run has started and is blocked.
        await new Promise(r => setTimeout(r, ModelManager.VALIDATION_COALESCE_MS + 50));
        const late = [manager.validateModel(), manager.validateModel()];
        release();
        await Promise.all([first, ...late]);

        expect(buildSpy).toHaveBeenCalledTimes(2);
        expect(broadcasts()).toBe(2);
    });

    it('validateModelNow runs immediately on every call', async () => {
        const { manager, buildSpy, broadcasts } = setup();

        await manager.validateModelNow();
        await manager.validateModelNow();

        expect(buildSpy).toHaveBeenCalledTimes(2);
        expect(broadcasts()).toBe(2);
    });
});
