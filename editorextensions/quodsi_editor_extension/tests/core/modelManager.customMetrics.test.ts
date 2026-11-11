// tests/core/modelManager.customMetrics.test.ts
//
// Custom metrics in Lucid (spec 2026-11-10 custom metrics, Task 11):
//   - a recipe-built metric written the way the shared Metrics tab writes it
//     (states, then each activity's actions, then the records) and read back
//     by a fresh ModelManager has no drift: Lucid's storage keeps everything
//     the recipe wrote (states incl. resetAtWarmupEnd, the actions'
//     modifications and conditions, the entity-type guard).
//   - a Save that swaps two state names (Total <-> Count) goes through
//     placeholder names in the host rename, so the user's own expressions
//     swap too instead of merging.
import { BlockProxy } from 'lucid-extension-sdk';
import { SimulationObjectType } from '@quodsi/lucid-shared';
import {
    StateModification,
    StateOperation,
    checkMetric,
    defaultNames,
    planCycleTimeMetric,
    toMetricModelView,
    type ModelDefinition,
} from '@quodsi/shared';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ModelManager } from '../../src/core/ModelManager';
import { router } from '../../src/core/messaging';
import { makeFakeBlock, makeFakePage, addBlock } from '../helpers/fakeProxies';

const T = SimulationObjectType;

async function freshManager(storage: StorageAdapter, page: any): Promise<ModelManager> {
    const manager = new ModelManager(storage);
    (manager as any).versionCheckedPageId = page.id; // skip the once-per-page upgrade
    manager.setCurrentPage(page);
    await manager.getModelDefinition();
    return manager;
}

function setupPage(activityExtras: Record<string, Record<string, unknown>> = {}) {
    const storage = new StorageAdapter();
    const page = makeFakePage('page-1');
    storage.setElementData(page, { id: 'm1', name: 'M', version: 1 } as any, T.Model);
    for (const id of ['A', 'B']) {
        const b = addBlock(page, makeFakeBlock(id, { text: id }));
        Object.setPrototypeOf(b, BlockProxy.prototype);
        storage.setElementData(b, { id, name: `Act ${id}`, ...(activityExtras[id] ?? {}) }, T.Activity);
    }
    return { storage, page };
}

describe('custom metrics through Lucid storage', () => {
    beforeEach(() => {
        jest.spyOn(router, 'send').mockImplementation(() => {});
    });
    afterEach(() => jest.restoreAllMocks());

    it.each([
        ['all entities', null],
        ['one entity type', 'ent-patient'],
    ])('a recipe-built metric over %s reloads with no drift', async (_label, entityTypeId) => {
        const { storage, page } = setupPage();
        const manager = await freshManager(storage, page);
        await manager.updateModelRoot({ entities: [{ id: 'ent-patient', name: 'Patient' }] }, page);

        const before = (await manager.getModelDefinition())!;
        const plan = planCycleTimeMetric(toMetricModelView(before), {
            name: 'AToB',
            answers: { startActivityId: 'A', startTiming: 'starts', stopActivityId: 'B', stopTiming: 'finishes', entityTypeId },
            names: defaultNames('AToB'),
        });
        expect(Object.keys(plan.activityActions).sort()).toEqual(['A', 'B']);

        // The shared Metrics tab's write order (applyMetricPlan).
        await manager.updateModelRoot({ states: plan.states.map((s) => s.toJSON()) }, page);
        for (const [activityId, actions] of Object.entries(plan.activityActions)) {
            const block = page.allBlocks.get(activityId);
            const stored = storage.getElementData<Record<string, unknown>>(block)!;
            await manager.saveElementData(block, { ...stored, id: activityId, actions: JSON.parse(JSON.stringify(actions)) }, T.Activity, page);
        }
        await manager.updateModelRoot({ customMetrics: JSON.parse(JSON.stringify(plan.customMetrics)) }, page);

        const reloaded = (await (await freshManager(storage, page)).getModelDefinition())!;
        const view = toMetricModelView(reloaded as ModelDefinition);
        expect(view.customMetrics).toEqual(JSON.parse(JSON.stringify(plan.customMetrics)));
        expect(view.customMetrics[0].answers.entityTypeId).toBe(entityTypeId);
        expect(view.states.find((s) => s.id === plan.metric.stateIds.start)?.resetAtWarmupEnd)
            .toBe(plan.states.find((s) => s.id === plan.metric.stateIds.start)?.resetAtWarmupEnd);
        expect(checkMetric(view, plan.metric)).toEqual([]);
    });

    it('a Save that swaps two state names swaps them in the user expressions too', async () => {
        const userMod = new StateModification('s-out', StateOperation.ASSIGN, undefined, { expression: 'A + 2*B' });
        const { storage, page } = setupPage({
            A: { actions: [{ id: 'act-user', type: 'assign', modifications: [userMod.toJSON()] }] },
        });
        const manager = await freshManager(storage, page);
        const state = (id: string, name: string) => ({ id, name, dataType: 'number', initialValue: 0 });
        await manager.updateModelRoot({ states: [state('s-a', 'A'), state('s-b', 'B'), state('s-out', 'Out')] }, page);

        await manager.updateModelRoot({ states: [state('s-a', 'B'), state('s-b', 'A'), state('s-out', 'Out')] }, page);

        const stored = storage.getElementData<any>(page.allBlocks.get('A'));
        expect(stored.actions[0].modifications[0].expression).toBe('B + 2*A');
    });
});
