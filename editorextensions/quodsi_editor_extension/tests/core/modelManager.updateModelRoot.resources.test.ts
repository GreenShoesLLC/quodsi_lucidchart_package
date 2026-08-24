import { ModelManager } from '../../src/core/ModelManager';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { makeFakePage } from '../helpers/fakeProxies';

function makeManager() {
    const storageAdapter = new StorageAdapter();
    const mm: any = Object.create(ModelManager.prototype);
    mm.storageAdapter = storageAdapter;
    mm.debug = { debug() {}, warn() {}, error() {}, info() {} };
    mm.changeTracker = { modelDefinitionDirty: false };
    mm.markModelDirty = () => { mm.changeTracker.modelDefinitionDirty = true; };
    mm.currentPage = makeFakePage('p');
    return { mm, storageAdapter, page: mm.currentPage };
}

describe('updateModelRoot: resources / resourceRequirements', () => {
    it('persists resources to q_resources with transient markers stripped and marks dirty', async () => {
        const { mm, storageAdapter, page } = makeManager();
        await mm.updateModelRoot({ resources: [{ id: 'r1', name: 'Nurse', capacity: 2, shapeId: 'blk', shapeLabel: 'Nurse', laneRef: { blockId: 'b', laneId: 'l' } }] }, page);
        expect(storageAdapter.getResources(page)).toEqual([{ id: 'r1', name: 'Nurse', capacity: 2 }]);
        expect(mm.changeTracker.modelDefinitionDirty).toBe(true);
    });

    it('removing a resource cascades: its auto + any custom requirement requesting it are dropped from q_res_requirements and actions are cleared', async () => {
        const { mm, storageAdapter, page } = makeManager();
        storageAdapter.setResources(page, [{ id: 'r1', name: 'Nurse' }, { id: 'r2', name: 'Doctor' }]);
        storageAdapter.setResourceRequirements(page, [
            { id: 'custom', name: 'Either', rootClause: { id: 'c', mode: 'require_any', requests: [{ resourceId: 'r1' }, { resourceId: 'r2' }] } } as any,
            { id: 'r2', name: 'Doctor', rootClause: { id: 'c2', mode: 'require_all', requests: [{ resourceId: 'r2' }] } } as any,
        ]);
        const cleared: string[] = [];
        mm.cleanupRequirementReferences = async (reqId: string) => { cleared.push(reqId); return 0; };

        await mm.updateModelRoot({ resources: [{ id: 'r2', name: 'Doctor' }] }, page);

        expect(storageAdapter.getResources(page)).toEqual([{ id: 'r2', name: 'Doctor' }]);
        expect(storageAdapter.getResourceRequirements(page).map((r: any) => r.id)).toEqual(['r2']);
        expect(cleared).toEqual(['custom']);
    });

    it('resourceRequirements: plain autos are stripped before storage; custom and overridden autos are kept', async () => {
        const { mm, storageAdapter, page } = makeManager();
        storageAdapter.setResources(page, [{ id: 'r1', name: 'Nurse' }]);
        await mm.updateModelRoot({ resourceRequirements: [
            { id: 'r1', name: 'Nurse', rootClause: { id: 'a', mode: 'require_all', requests: [{ resourceId: 'r1' }] } },          // plain auto -> stripped
            { id: 'r1x', name: 'Override', rootClause: { id: 'b', mode: 'require_all', requests: [{ resourceId: 'r1', quantity: 2 }] } },
        ] }, page);
        expect(storageAdapter.getResourceRequirements(page).map((r: any) => r.id)).toEqual(['r1x']);
    });

    it('still throws on an unknown key before writing anything', async () => {
        const { mm, page } = makeManager();
        await expect(mm.updateModelRoot({ resources: [{ id: 'r1', name: 'N' }], bogus: 1 }, page)).rejects.toThrow(/bogus/);
        expect(page.shapeData.get('q_resources')).toBeUndefined();
    });

    it('a resource created mid-session gets its auto-requirement on the next build', async () => {
        // updateModelRoot marks dirty; the builder's reconcile derives the auto. Exercise the real builder.
        const { ModelDefinitionPageBuilder } = await import('../../src/core/ModelDefinitionPageBuilder');
        const { LucidElementFactory } = await import('../../src/services/LucidElementFactory');
        const { mm, storageAdapter, page } = makeManager();
        await mm.updateModelRoot({ resources: [{ id: 'new-1', name: 'Tech' }] }, page);
        const def = new ModelDefinitionPageBuilder(storageAdapter, new LucidElementFactory(storageAdapter)).buildFromConvertedPage(page)!;
        expect(def.resourceRequirements.get('new-1')?.name).toBe('Tech');
    });
});
