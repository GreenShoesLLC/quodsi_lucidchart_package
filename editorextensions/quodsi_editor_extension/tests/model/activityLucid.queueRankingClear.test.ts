// tests/model/activityLucid.queueRankingClear.test.ts
//
// Final-review findings 1 and 2 for queue ranking, both about DELETION rather
// than assignment.
//
// Finding 1 — clearing a ranking never persisted. Setting Queue Ranking back to
// "(first come, first served)" means `queueRanking: undefined`, and undefined
// is invisible twice over: the panel→extension JSON transport drops the key
// before the message is sent, and StorageAdapter.updateElementData strips
// undefined-valued keys before merging (deliberately — a partial update must
// not clobber stored width/height). So the stored ranking survived a clear: the
// panel showed FIFO, the shape still ranked, reselecting rehydrated the old
// value and the published model still ranked the queue in simulation.
//
// Finding 2 — deleting the ranked STATE left the ranking dangling, which this
// branch's QueueRankingValidation grades as ERROR, i.e. the model stops
// simulating. cleanupStateReferences cleaned every other name-keyed reference
// but not this one.

import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ModelManager } from '../../src/core/ModelManager';
import { ActivityLucid, activityStorageRemoveKeys } from '../../src/types/ActivityLucid';
import { SimulationObjectType } from '@quodsi/lucid-shared';
import { makeFakeBlock, makeFakePage } from '../helpers/fakeProxies';

// ─── helpers ────────────────────────────────────────────────────────────────

/** makeFakeBlock plus the BlockProxy surface ActivityLucid touches. */
function makeFakeActivityBlock(id: string): any {
    const block = makeFakeBlock(id);
    block.getBoundingBox = () => ({ x: 10, y: 20, w: 120, h: 60 });
    block.textAreas = new Map([['t', 'Triage']]);
    block.getClassName = () => 'Process';
    return block;
}

const RANKED_ACTIVITY = {
    id: 'act-1',
    name: 'Triage',
    capacity: 1,
    inboundQueueCapacity: 999999,
    outboundQueueCapacity: 999999,
    actions: [],
    queueRanking: { stateName: 'severity', order: 'ASCENDING' },
};

/** What actually reaches the extension: JSON drops undefined-valued keys, so a
 *  cleared ranking arrives as a MISSING key, indistinguishable from silence. */
function overTheWire<T>(data: T): any {
    return JSON.parse(JSON.stringify(data));
}

function storedData(storage: StorageAdapter, element: any): any {
    return storage.getElementData<any>(element);
}

// ─── finding 1 ──────────────────────────────────────────────────────────────

describe('clearing a queue ranking persists (finding 1)', () => {
    it('activityStorageRemoveKeys asks for deletion only when there is no ranking', () => {
        expect(activityStorageRemoveKeys(RANKED_ACTIVITY as any)).toEqual([]);
        expect(activityStorageRemoveKeys({ } as any)).toEqual(['queueRanking']);
        expect(activityStorageRemoveKeys(undefined)).toEqual(['queueRanking']);
    });

    it('drops the stored ranking on the panel save path (ModelManager.saveElementData)', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        const block = makeFakeActivityBlock('act-1');
        storage.setElementData(block, RANKED_ACTIVITY, SimulationObjectType.Activity);
        expect(storedData(storage, block).queueRanking).toEqual({
            stateName: 'severity',
            order: 'ASCENDING',
        });

        const manager = new ModelManager(storage);
        // A model already exists and registration is not what is under test.
        (manager as any).modelDefinition = { model: { id: 'page-1', name: 'M' } };
        (manager as any).registerElement = async () => undefined;

        // The modeller picks "(first come, first served)" and the panel saves.
        const cleared = overTheWire({ ...RANKED_ACTIVITY, queueRanking: undefined });
        expect('queueRanking' in cleared).toBe(false);

        await manager.saveElementData(block, cleared, SimulationObjectType.Activity, page);

        const after = storedData(storage, block);
        expect('queueRanking' in after).toBe(false);
        // ...without collateral damage to the rest of the activity.
        expect(after.name).toBe('Triage');
        expect(after.capacity).toBe(1);
    });

    it('drops the stored ranking on the ActivityLucid write-back too', () => {
        const storage = new StorageAdapter();
        const block = makeFakeActivityBlock('act-1');
        storage.setElementData(block, RANKED_ACTIVITY, SimulationObjectType.Activity);

        const activityLucid = new ActivityLucid(block, storage);
        expect(activityLucid.getSimulationObject().queueRanking).toEqual({
            stateName: 'severity',
            order: 'ASCENDING',
        });

        // Back to FIFO.
        activityLucid.getSimulationObject().queueRanking = undefined;
        activityLucid.updateFromPlatform();

        expect('queueRanking' in storedData(storage, block)).toBe(false);
        // A fresh read agrees — this is what reselecting the shape does.
        expect(new ActivityLucid(block, storage).getSimulationObject().queueRanking).toBeUndefined();
    });

    it('still preserves a ranking the panel did not mention (no over-deletion)', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        const block = makeFakeActivityBlock('act-1');
        storage.setElementData(block, RANKED_ACTIVITY, SimulationObjectType.Activity);

        const manager = new ModelManager(storage);
        (manager as any).modelDefinition = { model: { id: 'page-1', name: 'M' } };
        (manager as any).registerElement = async () => undefined;

        // A Generator save must not touch an Activity's stored ranking, and an
        // Activity save that still carries the ranking must keep it.
        await manager.saveElementData(
            block,
            overTheWire({ ...RANKED_ACTIVITY, capacity: 4 }),
            SimulationObjectType.Activity,
            page,
        );

        const after = storedData(storage, block);
        expect(after.queueRanking).toEqual({ stateName: 'severity', order: 'ASCENDING' });
        expect(after.capacity).toBe(4);
    });
});

// ─── finding 2 ──────────────────────────────────────────────────────────────

describe('deleting the ranked state clears the ranking (finding 2)', () => {
    function pageWithActivity(storage: StorageAdapter, activity: any) {
        const page = makeFakePage('page-1');
        const block = makeFakeActivityBlock(activity.id);
        storage.setElementData(block, activity, SimulationObjectType.Activity);
        page.allBlocks.set(block.id, block);
        return { page, block };
    }

    it('drops a queueRanking naming the deleted state', async () => {
        const storage = new StorageAdapter();
        const { page, block } = pageWithActivity(storage, RANKED_ACTIVITY);
        const manager = new ModelManager(storage);

        const affected = await (manager as any).cleanupStateReferences('state-sev', 'severity', page);

        expect('queueRanking' in storedData(storage, block)).toBe(false);
        expect(affected).toBe(1);
    });

    it('leaves a queueRanking on a DIFFERENT state alone', async () => {
        const storage = new StorageAdapter();
        const { page, block } = pageWithActivity(storage, RANKED_ACTIVITY);
        const manager = new ModelManager(storage);

        const affected = await (manager as any).cleanupStateReferences('state-other', 'urgency', page);

        expect(storedData(storage, block).queueRanking).toEqual({
            stateName: 'severity',
            order: 'ASCENDING',
        });
        expect(affected).toBe(0);
    });
});
