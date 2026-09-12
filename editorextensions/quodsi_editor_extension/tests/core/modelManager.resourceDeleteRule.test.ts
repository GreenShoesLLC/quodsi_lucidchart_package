// ModelManager applies the shared resource/requirement delete rule (spec
// 2026-09-11 resource delete cleanup) over stored shape data, with the user's
// Seize/Release choice. Real StorageAdapter, fake page.
import { ModelManager } from '../../src/core/ModelManager';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { SimulationObjectType } from '@quodsi/lucid-shared';
import { addBlock, addLine, makeFakeBlock, makeFakeLine, makeFakePage } from '../helpers/fakeProxies';

function setup() {
    const storage = new StorageAdapter();
    const page = makeFakePage('page-1');
    const mm: any = Object.create(ModelManager.prototype);
    mm.storageAdapter = storage;
    mm.debug = { debug() {}, warn() {}, error() {}, info() {} };
    mm.changeTracker = { modelDefinitionDirty: false };
    mm.markModelDirty = () => { mm.changeTracker.modelDefinitionDirty = true; };
    mm.currentPage = page;

    storage.setResources(page, [{ id: 'r1', name: 'Nurse' }, { id: 'r2', name: 'Aide' }] as any);
    // Format 2 stores only customs: r1's own requirement is NOT stored.
    storage.setResourceRequirements(page, [
        { id: 'either', name: 'Nurse or Aide', rootClause: { id: 'c1', mode: 'require_any', requests: [{ resourceId: 'r1' }, { resourceId: 'r2' }] } },
        { id: 'both', name: 'Nurse and Aide', rootClause: { id: 'c2', mode: 'require_all', requests: [{ resourceId: 'r1' }, { resourceId: 'r2' }] } },
    ] as any);

    const block = addBlock(page, makeFakeBlock('act-1'));
    storage.setElementData(block, {
        id: 'act-1',
        name: 'Triage',
        actions: [
            { id: 's-own', type: 'seize', resourceRequirementId: 'r1' },
            { id: 'loop', type: 'loop', actions: [{ id: 'r-both', type: 'release', resourceRequirementId: 'both' }] },
            { id: 'd-both', type: 'delay_with_resource', resourceRequirementId: 'both' },
            { id: 's-either', type: 'seize', resourceRequirementId: 'either' },
        ],
        failureProperties: { enabled: true, repairResourceRequirementId: 'both' },
        levers: [{ leverId: 'lv-1', propertyName: 'SEIZE_PRIORITY', actionId: 's-own' }],
    } as any, SimulationObjectType.Activity);

    const line = addLine(page, makeFakeLine('con-1'));
    storage.setElementData(line, {
        id: 'con-1', name: 'C1', sourceId: 'a', targetId: 'b', weight: 1,
        actions: [{ id: 'd-con', type: 'delay_with_resource', resourceRequirementId: 'r1' }],
    } as any, SimulationObjectType.Connector);

    return { mm, storage, page, block, line };
}

describe('updateModelRoot resource delete uses the shared rule', () => {
    it("'flag' (default): prunes requirements, clears delays, keeps Seize/Release, repair and levers", async () => {
        const { mm, storage, page, block, line } = setup();

        await mm.updateModelRoot({ resources: [{ id: 'r2', name: 'Aide' }] }, page);

        expect(storage.getResourceRequirements(page)).toEqual([
            { id: 'either', name: 'Nurse or Aide', rootClause: { id: 'c1', mode: 'require_any', requests: [{ resourceId: 'r2' }] } },
        ]);
        const activity = storage.getElementData<any>(block);
        expect(activity.actions.map((a: any) => [a.id, a.resourceRequirementId ?? null])).toEqual([
            ['s-own', 'r1'],
            ['loop', null],
            ['d-both', null],
            ['s-either', 'either'],
        ]);
        expect(activity.actions[1].actions[0].resourceRequirementId).toBe('both');
        expect(activity.failureProperties.repairResourceRequirementId).toBe('both');
        expect(activity.levers).toHaveLength(1);
        expect(storage.getElementData<any>(line).actions[0].resourceRequirementId).toBeNull();
    });

    it("'remove': removes Seize/Release (nested too) and their levers, clears the repair", async () => {
        const { mm, storage, page, block } = setup();

        await mm.updateModelRoot({ resources: [{ id: 'r2', name: 'Aide' }] }, page, { seizeRelease: 'remove' });

        const activity = storage.getElementData<any>(block);
        expect(activity.actions.map((a: any) => a.id)).toEqual(['loop', 'd-both', 's-either']);
        expect(activity.actions[0].actions).toEqual([]);
        expect(activity.failureProperties.repairResourceRequirementId).toBe('');
        expect(activity.levers).toEqual([]);
    });

    it("drops a stored override of surviving r2 that needed r1, but never cleans r2's steps", async () => {
        const { mm, storage, page } = setup();
        storage.setResourceRequirements(page, [
            ...storage.getResourceRequirements(page),
            { id: 'r2', name: 'Aide', rootClause: { id: 'c-r2', mode: 'require_all', requests: [{ resourceId: 'r1' }, { resourceId: 'r2' }] } },
        ] as any);
        const other = addBlock(page, makeFakeBlock('act-2'));
        storage.setElementData(other, {
            id: 'act-2',
            name: 'Treat',
            actions: [
                { id: 's-r2', type: 'seize', resourceRequirementId: 'r2' },
                { id: 'd-r2', type: 'delay_with_resource', resourceRequirementId: 'r2' },
                { id: 's-r1', type: 'seize', resourceRequirementId: 'r1' },
            ],
        } as any, SimulationObjectType.Activity);

        await mm.updateModelRoot({ resources: [{ id: 'r2', name: 'Aide' }] }, page, { seizeRelease: 'remove' });

        expect(storage.getResourceRequirements(page).map((r: any) => r.id)).not.toContain('r2');
        const activity = storage.getElementData<any>(other);
        expect(activity.actions.map((a: any) => [a.id, a.resourceRequirementId])).toEqual([
            ['s-r2', 'r2'],
            ['d-r2', 'r2'],
        ]);
    });
});

describe('updateResourceRequirements requirement delete uses the shared rule', () => {
    it("honours the choice for steps using the deleted requirement", async () => {
        const { mm, storage, page, block } = setup();
        const remaining = storage.getResourceRequirements(page).filter((r: any) => r.id !== 'both');

        await mm.updateResourceRequirements(remaining, page, { seizeRelease: 'remove' });

        const activity = storage.getElementData<any>(block);
        // 's-own' (index 0) uses 'r1', not the deleted requirement 'both', so it
        // is untouched -- the nested 'r-both' release lives inside 'loop'
        // (index 1), matching the 'flag'-default test's indexing above.
        expect(activity.actions[1].actions).toEqual([]);
        expect(activity.actions.find((a: any) => a.id === 'd-both').resourceRequirementId).toBeNull();
        expect(activity.failureProperties.repairResourceRequirementId).toBe('');
        expect(activity.actions.find((a: any) => a.id === 's-own').resourceRequirementId).toBe('r1');
    });

    it("never cleans a live resource's id when its stored record is missing from the incoming list", async () => {
        const { mm, storage, page, block } = setup();
        // A stored override of live resource r2 (id === resource id). The
        // plain-auto filters can strip such a record from an incoming list
        // without the user having deleted anything.
        const override = { id: 'r2', name: 'Aide', rootClause: { id: 'c-r2', mode: 'require_all', requests: [{ resourceId: 'r2', quantity: 2 }] } };
        storage.setResourceRequirements(page, [...storage.getResourceRequirements(page), override] as any);
        const activity = storage.getElementData<any>(block);
        storage.setElementData(block, {
            ...activity,
            actions: [
                ...activity.actions,
                { id: 's-r2', type: 'seize', resourceRequirementId: 'r2' },
                { id: 'd-r2', type: 'delay_with_resource', resourceRequirementId: 'r2' },
            ],
        } as any, SimulationObjectType.Activity);

        const incoming = storage.getResourceRequirements(page).filter((r: any) => r.id !== 'r2');
        await mm.updateResourceRequirements(incoming, page, { seizeRelease: 'remove' });

        const after = storage.getElementData<any>(block);
        expect(after.actions.find((a: any) => a.id === 's-r2')?.resourceRequirementId).toBe('r2');
        expect(after.actions.find((a: any) => a.id === 'd-r2')?.resourceRequirementId).toBe('r2');
    });

    it("defaults to 'flag' when no options are passed", async () => {
        const { mm, storage, page, block } = setup();
        const remaining = storage.getResourceRequirements(page).filter((r: any) => r.id !== 'both');

        await mm.updateResourceRequirements(remaining, page);

        const activity = storage.getElementData<any>(block);
        expect(activity.actions[1].actions[0].resourceRequirementId).toBe('both');
        expect(activity.failureProperties.repairResourceRequirementId).toBe('both');
    });
});
