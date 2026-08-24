// tests/core/pasteNormalizer.swimlane.test.ts
//
// Task 4 of the LucidChart Paste Normalizer plan: the swimlane-carrier rule.
// A pasted swimlane block carries `q_swimlane` (an `AdvancedSwimLaneBlock`
// shapeData key), not `q_data` -- Lucid's paste still copies it byte-for-byte
// onto the new block, so a pasted swimlane's lanes still point at whatever
// resources the ORIGINAL block's lanes pointed at. Because it has no `q_data`
// envelope, `isPastedItem` never sees it and it never enters the generic
// per-item loop; it is detected and normalized alongside that loop instead
// (see the swimlane pass in `normalizePastedItems`).
//
// Detection predicate: a swimlane block counts as "pasted" when at least one
// of its lanes' `laneId`s also appears on ANOTHER `AdvancedSwimLaneBlock`
// (same page, or any page in `opts.allPages` when supplied) -- mirroring
// `hasOtherClaimant`'s `AdvancedSwimLaneBlock` class gate. `laneId` is
// `generateUUID()`-minted at mapping time, so two independent lanes can never
// legitimately share one; a shared laneId is proof one is a copy of the
// other. A swimlane whose laneIds are globally unique is not a paste and is
// left untouched. Limitation (v1, matches the Resource rule's cross-page
// lookup): a collision on a page NOT covered by `opts.allPages` is invisible,
// so a same-gesture paste that lands only on an unlisted page is missed.
//
// Rule: for each non-null lane, keep `titleSnapshot` + `assignmentMode`, drop
// `resourceId` (and any legacy `resource` record -- rebuilding the lane
// object from only the kept fields drops both), mint a fresh `laneId`. Null
// lanes stay null. One notice per swimlane block:
// 'Pasted swimlane lanes are not linked to resources'.
//
// Fabrication pattern (same as pasteNormalizer.resource.test.ts): write a
// real q_swimlane blob onto a throwaway/source block via `shapeData.set`,
// then copy the raw STRING onto a new-id `AdvancedSwimLaneBlock` fake -- byte
// -for-byte what a Lucid paste leaves behind.

import { SwimLaneQuodsiData, SimulationObjectType } from '@quodsi/lucid-shared';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { normalizePastedItems } from '../../src/core/PasteNormalizer';
import { makeFakeBlock, makeFakePage, addBlock } from '../helpers/fakeProxies';

const SWIMLANE_KEY = 'q_swimlane';

function setSwimlaneData(block: any, swim: SwimLaneQuodsiData): void {
    block.shapeData.set(SWIMLANE_KEY, JSON.stringify(swim));
}

/** A detached block whose q_data was written for a DIFFERENT id: a paste. */
function makePastedResourceBlock(sa: StorageAdapter, newId: string, originalId: string, resourceId: string): any {
    const throwaway = makeFakeBlock(originalId);
    sa.setElementData(throwaway, { id: originalId, resourceId }, SimulationObjectType.Resource, {
        mappingSource: 'user',
    });
    const rawQData = throwaway.shapeData.get('q_data');
    const block = makeFakeBlock(newId);
    block.shapeData.set('q_data', rawQData!);
    return block;
}

describe('PasteNormalizer — swimlane blocks (Task 4)', () => {
    it('unlinks lanes on a pasted swimlane block: titles + mode kept, resourceId and legacy resource dropped, laneId refreshed', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');

        const source = addBlock(page, makeFakeBlock('swim-source', { className: 'AdvancedSwimLaneBlock' }));
        const sourceSwim: SwimLaneQuodsiData = {
            lanes: [
                { laneId: 'lane-a', titleSnapshot: 'Triage', assignmentMode: 'runtime-derive', resourceId: 'res-1' },
                null,
                {
                    laneId: 'lane-b',
                    titleSnapshot: 'Discharge',
                    assignmentMode: 'explicit',
                    resource: { id: 'legacy-1', name: 'Legacy Nurse', capacity: 1, description: '' },
                },
            ],
            lastSyncedAt: '2026-08-01T00:00:00.000Z',
        };
        setSwimlaneData(source, sourceSwim);
        const rawSwim = source.shapeData.get(SWIMLANE_KEY)!;

        const pasted = addBlock(page, makeFakeBlock('swim-new', { className: 'AdvancedSwimLaneBlock' }));
        pasted.shapeData.set(SWIMLANE_KEY, rawSwim);

        const result = normalizePastedItems([pasted], sa);

        expect(result.changed).toBe(true);
        expect(result.notices).toEqual(['Pasted swimlane lanes are not linked to resources']);

        const after = JSON.parse(pasted.shapeData.get(SWIMLANE_KEY)!) as SwimLaneQuodsiData;
        expect(after.lanes).toHaveLength(3);

        expect(after.lanes[0]).not.toBeNull();
        expect(after.lanes[0]!.titleSnapshot).toBe('Triage');
        expect(after.lanes[0]!.assignmentMode).toBe('runtime-derive');
        expect(after.lanes[0]!.resourceId).toBeUndefined();
        expect((after.lanes[0] as any).resource).toBeUndefined();
        expect(after.lanes[0]!.laneId).not.toBe('lane-a');

        expect(after.lanes[1]).toBeNull();

        expect(after.lanes[2]).not.toBeNull();
        expect(after.lanes[2]!.titleSnapshot).toBe('Discharge');
        expect(after.lanes[2]!.assignmentMode).toBe('explicit');
        expect(after.lanes[2]!.resourceId).toBeUndefined();
        expect((after.lanes[2] as any).resource).toBeUndefined();
        expect(after.lanes[2]!.laneId).not.toBe('lane-b');
        expect(after.lanes[2]!.laneId).not.toBe(after.lanes[0]!.laneId);

        // The source block -- not part of this paste's items -- is never touched.
        expect(source.shapeData.get(SWIMLANE_KEY)).toBe(rawSwim);
    });

    it('is idempotent: a second pass writes nothing (fresh laneIds no longer collide)', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');

        const source = addBlock(page, makeFakeBlock('swim-source', { className: 'AdvancedSwimLaneBlock' }));
        setSwimlaneData(source, {
            lanes: [{ laneId: 'lane-a', titleSnapshot: 'Triage', assignmentMode: 'runtime-derive', resourceId: 'res-1' }],
            lastSyncedAt: '2026-08-01T00:00:00.000Z',
        });
        const rawSwim = source.shapeData.get(SWIMLANE_KEY)!;

        const pasted = addBlock(page, makeFakeBlock('swim-new', { className: 'AdvancedSwimLaneBlock' }));
        pasted.shapeData.set(SWIMLANE_KEY, rawSwim);

        const first = normalizePastedItems([pasted], sa);
        expect(first.changed).toBe(true);
        const afterFirst = pasted.shapeData.get(SWIMLANE_KEY)!;

        const second = normalizePastedItems([pasted], sa);

        expect(second.changed).toBe(false);
        expect(second.notices).toEqual([]);
        expect(pasted.shapeData.get(SWIMLANE_KEY)).toBe(afterFirst);
    });

    it('a swimlane with globally-unique laneIds is not a paste -- left untouched', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');

        const swim: SwimLaneQuodsiData = {
            lanes: [{ laneId: 'unique-lane-1', titleSnapshot: 'Nurses', assignmentMode: 'runtime-derive', resourceId: 'res-1' }],
            lastSyncedAt: '2026-08-01T00:00:00.000Z',
        };
        const block = addBlock(page, makeFakeBlock('swim-1', { className: 'AdvancedSwimLaneBlock' }));
        setSwimlaneData(block, swim);
        const raw = block.shapeData.get(SWIMLANE_KEY)!;

        const result = normalizePastedItems([block], sa);

        expect(result.changed).toBe(false);
        expect(result.notices).toEqual([]);
        expect(block.shapeData.get(SWIMLANE_KEY)).toBe(raw);
    });

    it('ordering (Task 3 review ruling): a pasted swimlane is normalized before a pasted Resource block in the same batch', () => {
        // Setup: res-1 is claimed by exactly one thing right now -- the
        // pasted swimlane's lane. `collisionPartner` shares that lane's
        // laneId but, unlike this file's other fixtures, is NOT a
        // byte-identical copy: its lane carries no resourceId where the
        // pasted lane carries `res-1`. This is a reachable pre-normalizer
        // state, not a contrivance: a swimlane pasted BEFORE this normalizer
        // shipped left two byte-identical q_swimlane blobs sharing a laneId;
        // the user then linked a resource on only ONE of the two blocks
        // (via the panel's picker), leaving exactly this pair -- same
        // laneId, differing resourceId. It deliberately departs from this
        // file's byte-identical fabrication convention because a
        // byte-identical partner would itself carry `res-1` and remain a
        // permanent second claimant, masking the ordering effect under test.
        // If the batch normalized the Resource block first, it would see the
        // swimlane's lane as a second claimant and clone the resource;
        // normalizing the swimlane first drops that claim before the
        // Resource rule ever runs, so no clone is made and the pasted
        // Resource block keeps pointing at res-1 (rule 2).
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');
        sa.setResources(page, [{ id: 'res-1', name: 'Nurse', capacity: 3, description: '' }]);

        const collisionPartner = addBlock(page, makeFakeBlock('swim-partner', { className: 'AdvancedSwimLaneBlock' }));
        setSwimlaneData(collisionPartner, {
            lanes: [{ laneId: 'lane-1', titleSnapshot: 'Nurses', assignmentMode: 'runtime-derive' }],
            lastSyncedAt: '2026-08-01T00:00:00.000Z',
        });

        const pastedSwim = addBlock(page, makeFakeBlock('swim-new', { className: 'AdvancedSwimLaneBlock' }));
        setSwimlaneData(pastedSwim, {
            lanes: [{ laneId: 'lane-1', titleSnapshot: 'Nurses', assignmentMode: 'runtime-derive', resourceId: 'res-1' }],
            lastSyncedAt: '2026-08-01T00:00:00.000Z',
        });

        const pastedResource = addBlock(page, makePastedResourceBlock(sa, 'res-block-new', 'res-block-orig', 'res-1'));

        const result = normalizePastedItems([pastedSwim, pastedResource], sa);

        const swimAfter = JSON.parse(pastedSwim.shapeData.get(SWIMLANE_KEY)!) as SwimLaneQuodsiData;
        expect(swimAfter.lanes[0]!.resourceId).toBeUndefined();
        expect(swimAfter.lanes[0]!.laneId).not.toBe('lane-1');

        expect(sa.getResources(page)).toEqual([{ id: 'res-1', name: 'Nurse', capacity: 3, description: '' }]);
        const resData = sa.getElementData<{ id: string; resourceId: string }>(pastedResource)!;
        expect(resData.resourceId).toBe('res-1');

        expect(result.notices).toEqual(['Pasted swimlane lanes are not linked to resources']);
    });
});
