// Task 7 (D2): forward guard on the model schema version stamped on the page.
// A page saved with a strictly newer, well-formed MODEL_SCHEMA_VERSION is
// refused with an extension_outdated ERROR and nothing is written. Absent or
// unparseable versions open normally.

import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ModelManager } from '../../src/core/ModelManager';
import { LucidVersionManager } from '../../src/versioning/LucidVersionManager';
import { ModelDefinitionPageBuilder } from '../../src/core/ModelDefinitionPageBuilder';
import { router } from '../../src/core/messaging';
import { EXTENSION_UPDATE_ADVICE } from '../../src/core/storageFormat';
import { SimulationObjectType, MODEL_SCHEMA_VERSION } from '@quodsi/lucid-shared';
import { makeFakePage } from '../helpers/fakeProxies';

function pageWithVersion(storage: StorageAdapter, version?: string): any {
    const page = makeFakePage('page-1');
    storage.setElementData(
        page,
        { id: 'model-1', name: 'M' } as any,
        SimulationObjectType.Model,
        version === undefined ? undefined : ({ version } as any)
    );
    return page;
}

function issuesFrom(sendSpy: jest.SpyInstance): any[] {
    const calls = sendSpy.mock.calls.filter(([, envelope]: any[]) => (envelope as any).type === 'MODEL_VALIDATION_RESULT');
    expect(calls.length).toBeGreaterThan(0);
    return (calls[calls.length - 1][1] as any).data.issues;
}

describe('ModelManager - model schema forward guard (D2)', () => {
    afterEach(() => jest.restoreAllMocks());

    it('refuses a page saved with a newer schema version and writes nothing', async () => {
        const storage = new StorageAdapter();
        const page = pageWithVersion(storage, '9999.01.01');
        const before = page.shapeData.get('q_data');

        const handlePageLoadSpy = jest.spyOn(LucidVersionManager.prototype, 'handlePageLoad');
        const buildSpy = jest.spyOn(ModelDefinitionPageBuilder.prototype, 'buildFromConvertedPage');
        const sendSpy = jest.spyOn(router, 'send').mockImplementation(() => { });

        const manager = new ModelManager(storage);
        manager.setCurrentPage(page);

        expect(await manager.getModelDefinition()).toBeNull();
        expect(handlePageLoadSpy).not.toHaveBeenCalled();
        expect(buildSpy).not.toHaveBeenCalled();

        const issues = issuesFrom(sendSpy);
        expect(issues).toHaveLength(1);
        expect(issues[0].code).toBe('extension_outdated');
        expect(issues[0].severity).toBe('error');
        expect(issues[0].message).toContain('9999.01.01');
        expect(issues[0].message).toContain(MODEL_SCHEMA_VERSION);
        expect(issues[0].message).toContain(EXTENSION_UPDATE_ADVICE);

        expect(page.shapeData.get('q_data')).toBe(before);
        expect((manager as any).versionCheckedPageId).toBeNull();
    });

    it.each([
        ['equal', MODEL_SCHEMA_VERSION],
        ['older', '2026.08.20'],
    ])('opens a page with an %s version', async (_name, version) => {
        const storage = new StorageAdapter();
        const page = pageWithVersion(storage, version);
        const handlePageLoadSpy = jest.spyOn(LucidVersionManager.prototype, 'handlePageLoad')
            .mockResolvedValue({ upgraded: false, sourceVersion: '', targetVersion: '' });
        jest.spyOn(router, 'send').mockImplementation(() => { });

        const manager = new ModelManager(storage);
        manager.setCurrentPage(page);
        await manager.getModelDefinition();

        expect(handlePageLoadSpy).toHaveBeenCalled();
    });

    it('does not refuse a page with no version key', async () => {
        const storage = new StorageAdapter();
        const page = pageWithVersion(storage);
        const data = JSON.parse(page.shapeData.get('q_data'));
        delete data.version;
        page.shapeData.set('q_data', JSON.stringify(data));
        const handlePageLoadSpy = jest.spyOn(LucidVersionManager.prototype, 'handlePageLoad')
            .mockResolvedValue({ upgraded: false, sourceVersion: '', targetVersion: '' });
        jest.spyOn(router, 'send').mockImplementation(() => { });

        const manager = new ModelManager(storage);
        manager.setCurrentPage(page);
        await manager.getModelDefinition();

        expect(handlePageLoadSpy).toHaveBeenCalled();
    });

    it('does not refuse an unparseable version', async () => {
        const storage = new StorageAdapter();
        const page = pageWithVersion(storage, 'garbage');
        const handlePageLoadSpy = jest.spyOn(LucidVersionManager.prototype, 'handlePageLoad')
            .mockResolvedValue({ upgraded: false, sourceVersion: '', targetVersion: '' });
        jest.spyOn(router, 'send').mockImplementation(() => { });

        const manager = new ModelManager(storage);
        manager.setCurrentPage(page);
        await manager.getModelDefinition();

        expect(handlePageLoadSpy).toHaveBeenCalled();
    });
});
