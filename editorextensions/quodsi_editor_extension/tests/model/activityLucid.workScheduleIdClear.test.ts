// tests/model/activityLucid.workScheduleIdClear.test.ts
//
// Spec case W5 (work schedules, 2026-08-27 §8.5), Activity half.
//
// Switching an Activity's capacity control back to "Fixed capacity" calls
// accessor.updateShape(id, 'Activity', { workScheduleId: undefined }) --
// Studio is host-agnostic and `undefined` is its platform-neutral spelling
// of "cleared" (CapacitySourcePicker's own header says so). In Lucid that
// clear is invisible TWICE over: the panel->extension JSON transport drops
// an undefined-valued key before the message is ever sent, and
// StorageAdapter.updateElementData strips undefined-valued keys before
// merging (deliberately -- a partial update must not clobber stored
// width/height). Without the explicit cleared-field declaration the stored
// link therefore survives a clear, and the activity keeps following a
// schedule the author just detached it from.
//
// Modelled line-for-line on generatorLucid.arrivalPatternIdClear.test.ts,
// including its overTheWire() JSON round trip -- WITHOUT that round trip a
// clear test proves nothing, because the in-process object still carries the
// key that the real transport would have dropped.

import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ModelManager } from '../../src/core/ModelManager';
import { activityStorageRemoveKeys } from '../../src/types/ActivityLucid';
import { CLEARED_FIELDS_KEY, SimulationObjectType } from '@quodsi/lucid-shared';
import { makeFakeBlock, makeFakePage } from '../helpers/fakeProxies';

const LINKED_ACTIVITY = {
    id: 'act-1',
    name: 'Triage',
    capacity: 3,
    workScheduleId: 'ws-1',
};

/** What actually reaches the extension: JSON drops undefined-valued keys, so
 *  a cleared link arrives as a MISSING key, indistinguishable from silence. */
function overTheWire<T>(data: T): any {
    return JSON.parse(JSON.stringify(data));
}

function storedData(storage: StorageAdapter, element: any): any {
    return storage.getElementData<any>(element);
}

function newManager(storage: StorageAdapter): ModelManager {
    const manager = new ModelManager(storage);
    (manager as any).modelDefinition = { model: { id: 'page-1', name: 'M' } };
    (manager as any).registerElement = async () => undefined;
    return manager;
}

describe('activityStorageRemoveKeys honours workScheduleId', () => {
    it('deletes only what was explicitly declared, and only clearable keys', () => {
        // Silence is not a clear -- this is the whole point of the signal.
        expect(activityStorageRemoveKeys(undefined)).toEqual([]);
        expect(activityStorageRemoveKeys([])).toEqual([]);
        // A declaration is honoured, but only for keys an Activity may clear.
        expect(activityStorageRemoveKeys(['workScheduleId'])).toEqual(['workScheduleId']);
        expect(activityStorageRemoveKeys(['capacity', 'name'])).toEqual([]);
        expect(activityStorageRemoveKeys(['capacity', 'workScheduleId'])).toEqual(['workScheduleId']);
        // The pre-existing member is untouched by the addition.
        expect(activityStorageRemoveKeys(['queueRanking'])).toEqual(['queueRanking']);
    });
});

describe('clearing an activity workScheduleId link persists (spec W5)', () => {
    it('drops the stored link on the panel save path (ModelManager.saveElementData)', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        const block = makeFakeBlock('act-1');
        storage.setElementData(block, LINKED_ACTIVITY, SimulationObjectType.Activity);
        expect(storedData(storage, block).workScheduleId).toBe('ws-1');

        const manager = newManager(storage);

        // What the host writes when CapacitySourcePicker goes back to "Fixed
        // capacity": the key itself is gone (JSON dropped the undefined);
        // what makes this a clear rather than silence is the declaration.
        const cleared = overTheWire({
            name: 'Triage',
            capacity: 3,
            [CLEARED_FIELDS_KEY]: ['workScheduleId'],
        });
        expect('workScheduleId' in cleared).toBe(false);
        expect(cleared[CLEARED_FIELDS_KEY]).toEqual(['workScheduleId']);

        await manager.saveElementData(block, cleared, SimulationObjectType.Activity, page);

        const after = storedData(storage, block);
        expect('workScheduleId' in after).toBe(false);
        // ...without collateral damage to the rest of the activity.
        expect(after.name).toBe('Triage');
        expect(after.capacity).toBe(3);
        // The declaration is ABOUT the payload, never part of it: it must not
        // reach shape data, from where it would be published in model JSON.
        expect(CLEARED_FIELDS_KEY in after).toBe(false);
    });

    it('still preserves a link the payload did not mention (no over-deletion)', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        const block = makeFakeBlock('act-1');
        storage.setElementData(block, LINKED_ACTIVITY, SimulationObjectType.Activity);

        const manager = newManager(storage);

        // The payload OMITS workScheduleId entirely -- the same shape every
        // partial Activity save has (ConnectorsEditor rebuilds an Activity
        // from connectType + financialProperties alone) -- and says nothing
        // about clearing it. Silence is not a clear.
        const { workScheduleId, ...withoutLink } = LINKED_ACTIVITY as any;
        const partial = overTheWire({ ...withoutLink, name: 'Renamed' });
        expect('workScheduleId' in partial).toBe(false);
        expect(CLEARED_FIELDS_KEY in partial).toBe(false);

        await manager.saveElementData(block, partial, SimulationObjectType.Activity, page);

        const after = storedData(storage, block);
        expect(after.workScheduleId).toBe('ws-1');
        expect(after.name).toBe('Renamed');
    });

    it('honours a declaration only for clearable keys, not arbitrary ones', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        const block = makeFakeBlock('act-1');
        storage.setElementData(block, LINKED_ACTIVITY, SimulationObjectType.Activity);

        const manager = newManager(storage);

        const { capacity, ...withoutCapacity } = LINKED_ACTIVITY as any;
        await manager.saveElementData(
            block,
            overTheWire({ ...withoutCapacity, [CLEARED_FIELDS_KEY]: ['capacity', 'name'] }),
            SimulationObjectType.Activity,
            page,
        );

        const after = storedData(storage, block);
        // capacity/name are not in ACTIVITY_CLEARABLE_KEYS -- the declaration
        // names them, but neither is honoured.
        expect(after.capacity).toBe(3);
        expect(after.name).toBe('Triage');
        expect(after.workScheduleId).toBe('ws-1');
        expect(CLEARED_FIELDS_KEY in after).toBe(false);
    });
});
