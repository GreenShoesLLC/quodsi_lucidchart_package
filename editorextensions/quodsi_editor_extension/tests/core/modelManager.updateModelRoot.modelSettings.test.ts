// tests/core/modelManager.updateModelRoot.modelSettings.test.ts
//
// spec 2026-09-12 §2: Lucid's Model editor saves its Basic and Levers tabs
// through MODEL_ROOT_UPDATE. updateModelRoot merges the model's own fields into
// the page's q_data (no registerElement: that resets the rebuild-diff
// baseline), refuses before writing anything when the page has no model data,
// turns a blank name into the page title, and routes `states` through
// updateStates.
import { ModelManager } from '../../src/core/ModelManager';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { SimulationObjectType } from '@quodsi/lucid-shared';
import { makeFakePage } from '../helpers/fakeProxies';

function makeManager(opts: { title?: string; withModel?: boolean } = {}) {
    const storageAdapter = new StorageAdapter();
    const mm: any = Object.create(ModelManager.prototype);
    mm.storageAdapter = storageAdapter;
    mm.debug = { debug() {}, warn() {}, error() {}, info() {} };
    mm.changeTracker = { modelDefinitionDirty: false };
    mm.markModelDirty = () => { mm.changeTracker.modelDefinitionDirty = true; };
    mm.registerElement = jest.fn();
    const page = makeFakePage('page-1');
    if (opts.title !== undefined) page.getTitle = () => opts.title;
    mm.currentPage = page;
    if (opts.withModel !== false) {
        storageAdapter.setElementData(
            page,
            { id: 'page-1', name: 'Clinic', replications: 1, seed: 7, levers: [{ leverId: 'lv', propertyName: 'SEED' }], startDateTime: '2026-06-01T08:00:00.000Z' } as any,
            SimulationObjectType.Model,
        );
    }
    return { mm, storageAdapter, page };
}

const stored = (sa: StorageAdapter, page: any) => sa.getElementData<any>(page);

describe('updateModelRoot: model settings', () => {
    it('merges model fields into the page q_data, keeping fields the patch omits, and marks dirty', async () => {
        const { mm, storageAdapter, page } = makeManager();

        await mm.updateModelRoot({ name: 'Clinic 2', replications: 5, runTime: { value: 8, unit: 'hours' } }, page);

        expect(stored(storageAdapter, page)).toMatchObject({
            id: 'page-1', name: 'Clinic 2', replications: 5, seed: 7, runTime: { value: 8, unit: 'hours' },
        });
        expect(mm.changeTracker.modelDefinitionDirty).toBe(true);
        expect(mm.registerElement).not.toHaveBeenCalled();
    });

    it('clears a date with null and levers with []', async () => {
        const { mm, storageAdapter, page } = makeManager();

        await mm.updateModelRoot({ startDateTime: null, levers: [] }, page);

        expect(stored(storageAdapter, page).startDateTime).toBeNull();
        expect(stored(storageAdapter, page).levers).toEqual([]);
    });

    it('stores the trimmed page title when the name is blank', async () => {
        const { mm, storageAdapter, page } = makeManager({ title: '  Emergency Dept  ' });

        await mm.updateModelRoot({ name: '   ' }, page);

        expect(stored(storageAdapter, page).name).toBe('Emergency Dept');
    });

    it("stores 'Untitled Model' when the name is blank and the page has no title", async () => {
        const { mm, storageAdapter, page } = makeManager({ title: '' });

        await mm.updateModelRoot({ name: '' }, page);

        expect(stored(storageAdapter, page).name).toBe('Untitled Model');
    });

    it('keeps a non-blank name as sent', async () => {
        const { mm, storageAdapter, page } = makeManager({ title: 'Emergency Dept' });

        await mm.updateModelRoot({ name: 'Triage model' }, page);

        expect(stored(storageAdapter, page).name).toBe('Triage model');
    });

    it('refuses a settings patch on a page with no model data before writing ANY key', async () => {
        const { mm, storageAdapter, page } = makeManager({ withModel: false });

        await expect(
            mm.updateModelRoot({ arrivalPatterns: [{ id: 'ap-1', name: 'P1' }], name: 'X' }, page),
        ).rejects.toThrow('updateModelRoot: this page has no model data; convert it before editing settings.');

        expect(storageAdapter.getArrivalPatterns(page)).toEqual([]);
        expect(stored(storageAdapter, page)).toBeNull();
        expect(mm.changeTracker.modelDefinitionDirty).toBe(false);
    });

    it('still writes a patch with no settings keys on a page with no model data', async () => {
        const { mm, storageAdapter, page } = makeManager({ withModel: false });

        await mm.updateModelRoot({ arrivalPatterns: [{ id: 'ap-1', name: 'P1' }] }, page);

        expect(storageAdapter.getArrivalPatterns(page)).toEqual([{ id: 'ap-1', name: 'P1' }]);
    });

    it('throws on `id` and on `scenarios` before writing anything', async () => {
        const { mm, storageAdapter, page } = makeManager();

        await expect(mm.updateModelRoot({ name: 'X', id: 'other' }, page)).rejects.toThrow(/\bid\b/);
        await expect(mm.updateModelRoot({ scenarios: [] }, page)).rejects.toThrow(/scenarios/);

        expect(stored(storageAdapter, page).name).toBe('Clinic');
    });
});

describe('updateModelRoot: states', () => {
    it('routes states through updateStates, which diffs storage and cleans a deleted state', async () => {
        const { mm, storageAdapter, page } = makeManager();
        const kept = { id: 's2', name: 'B', componentType: 'model', dataType: 'number', initialValue: 0 };
        storageAdapter.setStates(page, [{ id: 's1', name: 'A', componentType: 'model', dataType: 'number', initialValue: 0 } as any, kept as any]);
        mm.cleanupStateReferences = jest.fn().mockResolvedValue(0);

        await mm.updateModelRoot({ states: [kept] }, page);

        expect(mm.cleanupStateReferences).toHaveBeenCalledWith('s1', 'A', page);
        expect(storageAdapter.getStates(page).map((s: any) => s.id)).toEqual(['s2']);
        expect(mm.changeTracker.modelDefinitionDirty).toBe(true);
    });

    it('writes model settings, then the arrival and schedule lists, then states, then entities', async () => {
        const { mm, storageAdapter, page } = makeManager();
        const order: string[] = [];
        const updateElementData = storageAdapter.updateElementData.bind(storageAdapter);
        storageAdapter.updateElementData = ((...args: Parameters<typeof updateElementData>) => { order.push('settings'); return updateElementData(...args); }) as any;
        const setArrivalPatterns = storageAdapter.setArrivalPatterns.bind(storageAdapter);
        storageAdapter.setArrivalPatterns = ((...args: Parameters<typeof setArrivalPatterns>) => { order.push('arrivalPatterns'); return setArrivalPatterns(...args); }) as any;
        const setWorkSchedules = storageAdapter.setWorkSchedules.bind(storageAdapter);
        storageAdapter.setWorkSchedules = ((...args: Parameters<typeof setWorkSchedules>) => { order.push('workSchedules'); return setWorkSchedules(...args); }) as any;
        mm.updateStates = jest.fn(async () => { order.push('states'); });
        mm.updateEntities = jest.fn(async () => { order.push('entities'); });

        await mm.updateModelRoot({ entities: [], states: [], workSchedules: [], arrivalPatterns: [], name: 'Clinic 3' }, page);

        expect(order).toEqual(['settings', 'arrivalPatterns', 'workSchedules', 'states', 'entities']);
    });
});
