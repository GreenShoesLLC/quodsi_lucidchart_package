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
// The first fix for finding 1 inferred the clear from the key being ABSENT, and
// that inference was itself a defect: absence also means "this panel never
// mentioned the field", which is precisely what ConnectorsEditor sends. So
// selecting a connector whose source was a ranked activity PERMANENTLY deleted
// the ranking. Deletion is now driven by an explicit declaration on the payload
// (CLEARED_FIELDS_KEY) instead — the tests below pin both halves: a declared
// clear deletes, and a silent partial payload never does.
//
// Finding 2 — deleting the ranked STATE left the ranking dangling, which this
// branch's QueueRankingValidation grades as ERROR, i.e. the model stops
// simulating. cleanupStateReferences cleaned every other name-keyed reference
// but not this one.

import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ModelManager } from '../../src/core/ModelManager';
import {
    ActivityLucid,
    activityAuthoritativeClearedFields,
    activityStorageRemoveKeys,
} from '../../src/types/ActivityLucid';
import {
    Activity,
    CLEARED_FIELDS_KEY,
    ConnectType,
    SimulationObjectType,
} from '@quodsi/lucid-shared';
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

/**
 * The reconstruction ConnectorsEditor.extractActivityData performs, reproduced
 * field for field: an Activity rebuilt from the constructor arguments plus
 * connectType and financialProperties, and NOTHING else. queueRanking, levers,
 * description and failureProperties are all absent from what that panel sends.
 * ConnectorsEditor is reached by selecting any connector whose source is an
 * Activity, so this payload hits storage during ordinary routing edits.
 */
function connectorsEditorPayload(stored: any, connectType: ConnectType): any {
    const rebuilt = new Activity(
        stored.id,
        stored.name,
        stored.capacity || 1,
        stored.inboundQueueCapacity || Infinity,
        stored.outboundQueueCapacity || Infinity,
        stored.actions || [],
        stored.x || 0,
        stored.y || 0
    );
    rebuilt.connectType = connectType;
    rebuilt.financialProperties = stored.financialProperties;
    return overTheWire(rebuilt);
}

/** A save from the activity editor, which owns the Queue Ranking control and so
 *  is entitled to declare the field cleared. */
function activityEditorClearPayload(stored: any): any {
    const { queueRanking, ...rest } = stored;
    return overTheWire({ ...rest, [CLEARED_FIELDS_KEY]: ['queueRanking'] });
}

function newManager(storage: StorageAdapter): ModelManager {
    const manager = new ModelManager(storage);
    // A model already exists and registration is not what is under test.
    (manager as any).modelDefinition = { model: { id: 'page-1', name: 'M' } };
    (manager as any).registerElement = async () => undefined;
    return manager;
}

// ─── finding 1 ──────────────────────────────────────────────────────────────

describe('clearing a queue ranking persists (finding 1)', () => {
    it('activityStorageRemoveKeys deletes only what was explicitly declared', () => {
        // Silence is not a clear — this is the whole fix.
        expect(activityStorageRemoveKeys(undefined)).toEqual([]);
        expect(activityStorageRemoveKeys([])).toEqual([]);
        // A declaration is honoured, but only for keys an Activity may clear.
        expect(activityStorageRemoveKeys(['queueRanking'])).toEqual(['queueRanking']);
        expect(activityStorageRemoveKeys(['capacity', 'name'])).toEqual([]);
        expect(activityStorageRemoveKeys(['capacity', 'queueRanking'])).toEqual(['queueRanking']);
    });

    it('an authoritative write-back declares the clear from the hydrated object', () => {
        expect(activityAuthoritativeClearedFields(RANKED_ACTIVITY as any)).toEqual([]);
        expect(activityAuthoritativeClearedFields({} as any)).toEqual(['queueRanking']);
        expect(activityAuthoritativeClearedFields(undefined)).toEqual(['queueRanking']);
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

        const manager = newManager(storage);

        // The modeller picks "(first come, first served)" and the panel saves.
        // The key itself is gone (JSON dropped the undefined); what makes this a
        // clear rather than silence is the explicit declaration.
        const cleared = activityEditorClearPayload(RANKED_ACTIVITY);
        expect('queueRanking' in cleared).toBe(false);
        expect(cleared[CLEARED_FIELDS_KEY]).toEqual(['queueRanking']);

        await manager.saveElementData(block, cleared, SimulationObjectType.Activity, page);

        const after = storedData(storage, block);
        expect('queueRanking' in after).toBe(false);
        // ...without collateral damage to the rest of the activity.
        expect(after.name).toBe('Triage');
        expect(after.capacity).toBe(1);
        // The declaration is ABOUT the payload, never part of it: it must not
        // reach shape data, from where it would be published in model JSON.
        expect(CLEARED_FIELDS_KEY in after).toBe(false);
    });

    it('honours a declaration only for keys an Activity may clear', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        const block = makeFakeActivityBlock('act-1');
        storage.setElementData(block, RANKED_ACTIVITY, SimulationObjectType.Activity);

        const manager = newManager(storage);

        // A declaration is not a licence to delete anything at all.
        const { capacity, ...withoutCapacity } = RANKED_ACTIVITY as any;
        await manager.saveElementData(
            block,
            overTheWire({ ...withoutCapacity, [CLEARED_FIELDS_KEY]: ['capacity', 'name'] }),
            SimulationObjectType.Activity,
            page,
        );

        const after = storedData(storage, block);
        expect(after.capacity).toBe(1);
        expect(after.name).toBe('Triage');
        expect(CLEARED_FIELDS_KEY in after).toBe(false);
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

        const manager = newManager(storage);

        // The payload OMITS queueRanking entirely — the same shape any partial
        // Activity save has — and says nothing about clearing it. Silence is not
        // a clear: the stored ranking must survive untouched.
        const { queueRanking, ...withoutRanking } = RANKED_ACTIVITY as any;
        const partial = overTheWire({ ...withoutRanking, capacity: 4 });
        expect('queueRanking' in partial).toBe(false);
        expect(CLEARED_FIELDS_KEY in partial).toBe(false);

        await manager.saveElementData(block, partial, SimulationObjectType.Activity, page);

        const after = storedData(storage, block);
        expect(after.queueRanking).toEqual({ stateName: 'severity', order: 'ASCENDING' });
        expect(after.capacity).toBe(4);
    });

    it('survives a ConnectorsEditor save, which never mentions queueRanking', async () => {
        // The reported defect. Selecting a connector whose source is a ranked
        // Activity opens ConnectorsEditor, which rebuilds the Activity from
        // connectType + financialProperties only and auto-saves it as an
        // "Activity" update. Under key-absence inference that PERMANENTLY
        // deleted the ranking; the modeller never touched Queue Ranking.
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        const block = makeFakeActivityBlock('act-1');
        storage.setElementData(block, RANKED_ACTIVITY, SimulationObjectType.Activity);

        const manager = newManager(storage);

        const payload = connectorsEditorPayload(RANKED_ACTIVITY, ConnectType.StateCondition);
        expect('queueRanking' in payload).toBe(false);
        expect(CLEARED_FIELDS_KEY in payload).toBe(false);

        await manager.saveElementData(block, payload, SimulationObjectType.Activity, page);

        const after = storedData(storage, block);
        expect(after.queueRanking).toEqual({ stateName: 'severity', order: 'ASCENDING' });
        // The edit the panel DID make still lands.
        expect(after.connectType).toBe(ConnectType.StateCondition);

        // And a fresh read of the shape — what reselecting the activity does —
        // still reports the ranking.
        expect(new ActivityLucid(block, storage).getSimulationObject().queueRanking).toEqual({
            stateName: 'severity',
            order: 'ASCENDING',
        });
    });

    it('survives ElementOpsHandler.handleElementConvert, which sends {} or a stub', async () => {
        // handleElementConvert calls saveElementData(element, data.data || {},
        // newType, page). Re-asserting an already-Activity block must not be a
        // silent clear of its ranking.
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        const block = makeFakeActivityBlock('act-1');
        storage.setElementData(block, RANKED_ACTIVITY, SimulationObjectType.Activity);

        const manager = newManager(storage);

        await manager.saveElementData(
            block,
            overTheWire({ id: 'act-1', name: 'Triage' }),
            SimulationObjectType.Activity,
            page,
        );

        expect(storedData(storage, block).queueRanking).toEqual({
            stateName: 'severity',
            order: 'ASCENDING',
        });
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
