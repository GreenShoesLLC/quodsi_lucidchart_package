// tests/model/resourceLucid.workScheduleIdClear.test.ts
//
// Spec case W5 (work schedules, 2026-08-27 §8.5), Resource half.
//
// A Resource's clear reaches storage by a DIFFERENT road than an Activity's,
// and both roads are pinned here.
//
//  - THE ROAD LUCID ACTUALLY DRIVES. Under storage format 2 a Resource is a
//    model-level record in `q_resources`; a Resource BLOCK's q_data is only a
//    pointer (`{ resourceId }`). Studio's ResourceBasicTab says so in its own
//    header -- it writes through `accessor.updateModel({ resources })`, never
//    `updateShape`. `ModelManager.updateModelRoot` persists that patch with a
//    WHOLE-LIST replace (`setResources`), so a record rebuilt without the key
//    genuinely loses it: no merge, nothing to strip. That is the path
//    `{ workScheduleId: undefined }` really takes, and the first describe
//    below pins it END TO END, over the wire.
//
//  - THE ROAD THE SIGNAL PAVES. `resourceStorageRemoveKeys` exists anyway, as
//    the Activity/Generator lists do, so that a Resource-typed SHAPE payload
//    which one day does carry the link can clear it the same declared way
//    instead of inventing a second convention. It is filtered, never trusted.
//
// Modelled line-for-line on generatorLucid.arrivalPatternIdClear.test.ts,
// including its overTheWire() JSON round trip -- WITHOUT that round trip a
// clear test proves nothing, because the in-process object still carries the
// key that the real transport would have dropped.

import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ModelManager } from '../../src/core/ModelManager';
import { resourceStorageRemoveKeys } from '../../src/types/ResourceLucid';
import { makeFakePage } from '../helpers/fakeProxies';

const LINKED_RESOURCE = {
    id: 'res-1',
    name: 'Nurses',
    capacity: 3,
    workScheduleId: 'ws-1',
};

/** What actually reaches the extension: JSON drops undefined-valued keys, so
 *  a cleared link arrives as a MISSING key, indistinguishable from silence. */
function overTheWire<T>(data: T): any {
    return JSON.parse(JSON.stringify(data));
}

function newManager(storage: StorageAdapter): ModelManager {
    const manager = new ModelManager(storage);
    (manager as any).modelDefinition = { model: { id: 'page-1', name: 'M' } };
    (manager as any).cleanupResourceReferences = async () => [];
    (manager as any).cleanupRequirementReferences = async () => undefined;
    return manager;
}

describe('resourceStorageRemoveKeys', () => {
    it('deletes only what was explicitly declared, and only workScheduleId', () => {
        // Silence is not a clear -- this is the whole point of the signal.
        expect(resourceStorageRemoveKeys(undefined)).toEqual([]);
        expect(resourceStorageRemoveKeys([])).toEqual([]);
        // A declaration is honoured, but only for keys a Resource may clear.
        expect(resourceStorageRemoveKeys(['workScheduleId'])).toEqual(['workScheduleId']);
        expect(resourceStorageRemoveKeys(['capacity', 'name'])).toEqual([]);
        expect(resourceStorageRemoveKeys(['capacity', 'workScheduleId'])).toEqual(['workScheduleId']);
    });
});

describe('clearing a resource workScheduleId link persists (spec W5)', () => {
    it('drops the stored link on the model-root path (updateModelRoot -> q_resources)', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        storage.setResources(page, [LINKED_RESOURCE as any]);
        expect(storage.getResources(page)[0].workScheduleId).toBe('ws-1');

        const manager = newManager(storage);

        // What ResourceBasicTab writes when CapacitySourcePicker goes back to
        // "Fixed capacity": the whole record, with the link spread onto it as
        // `undefined`. JSON drops the key before the extension sees it.
        const { workScheduleId, ...withoutLink } = LINKED_RESOURCE as any;
        const cleared = overTheWire({ resources: [{ ...withoutLink, workScheduleId: undefined }] });
        expect('workScheduleId' in cleared.resources[0]).toBe(false);

        await manager.updateModelRoot(cleared, page as any);

        const after = storage.getResources(page)[0] as any;
        expect('workScheduleId' in after).toBe(false);
        // ...without collateral damage to the rest of the record.
        expect(after.name).toBe('Nurses');
        expect(after.capacity).toBe(3);
    });

    it('carries a link the patch DOES name straight through', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        storage.setResources(page, [{ id: 'res-1', name: 'Nurses', capacity: 1 } as any]);

        const manager = newManager(storage);

        await manager.updateModelRoot(
            overTheWire({ resources: [{ id: 'res-1', name: 'Nurses', capacity: 3, workScheduleId: 'ws-1' }] }),
            page as any,
        );

        const after = storage.getResources(page)[0] as any;
        expect(after.workScheduleId).toBe('ws-1');
        // The nominal capacity CapacitySourcePicker seeds rides the same patch
        // as the link -- two writes would build both from the same stale
        // record and the second would drop the first.
        expect(after.capacity).toBe(3);
    });

    it('leaves every OTHER record alone when one row clears its link', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        storage.setResources(page, [
            LINKED_RESOURCE as any,
            { id: 'res-2', name: 'Doctors', capacity: 2, workScheduleId: 'ws-1' } as any,
        ]);

        const manager = newManager(storage);

        const { workScheduleId, ...withoutLink } = LINKED_RESOURCE as any;
        await manager.updateModelRoot(
            overTheWire({
                resources: [
                    { ...withoutLink, workScheduleId: undefined },
                    { id: 'res-2', name: 'Doctors', capacity: 2, workScheduleId: 'ws-1' },
                ],
            }),
            page as any,
        );

        const after = storage.getResources(page) as any[];
        expect('workScheduleId' in after[0]).toBe(false);
        expect(after[1].workScheduleId).toBe('ws-1');
    });
});
