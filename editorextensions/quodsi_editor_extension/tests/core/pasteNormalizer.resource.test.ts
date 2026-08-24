// tests/core/pasteNormalizer.resource.test.ts
//
// Task 3 of the LucidChart Paste Normalizer plan: the Resource-block rule.
// A pasted Resource block carries the ORIGINAL block's pointer
// (`q_data.resourceId`). Four outcomes, by where that id resolves:
//   1. resolves on THIS page AND another item on this page still claims it
//      -> clone the record into this page's q_resources, point the paste at
//         the clone (levers cloned with fresh leverIds).
//   2. resolves on THIS page with NO other claimant (paste after the original
//      was deleted) -> keep the pointer, re-stamp the envelope only.
//   3. resolves only on ANOTHER page of the document -> clone that record
//      INTO this page's list, name deduped against this page.
//   4. resolves nowhere -> drop the pointer; the block arrives unlinked and
//      the panel's picker takes over.
//
// A "pasted" block is fabricated the one legitimate way (same as
// pasteNormalizer.detection.test.ts): write q_data through the real
// StorageAdapter on a throwaway fake carrying the ORIGINAL id, then copy the
// raw q_data STRING onto a new-id fake. That is byte-for-byte what Lucid
// paste leaves behind.
//
// Cross-page lookup: PageProxy has no back-reference to its document (see
// node_modules/lucid-extension-sdk/document/pageproxy.d.ts), so
// normalizePastedItems takes an optional `allPages` enumerator; production
// passes `() => [...new DocumentProxy(client).pages.values()]` from
// pasteHookWiring. These tests pass two fake pages directly.

import {
    ScenarioPropertyName,
    SimulationObjectType,
    StoredResourceRecord,
    SwimLaneQuodsiData,
} from '@quodsi/lucid-shared';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { normalizePastedItems } from '../../src/core/PasteNormalizer';
import { makeFakeBlock, makeFakePage, addBlock } from '../helpers/fakeProxies';

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

/** A NORMAL (not pasted) Resource pointer block already living on `page`. */
function addResourcePointerBlock(sa: StorageAdapter, page: any, blockId: string, resourceId: string): any {
    const block = addBlock(page, makeFakeBlock(blockId));
    sa.setElementData(block, { id: blockId, resourceId }, SimulationObjectType.Resource, { mappingSource: 'user' });
    return block;
}

/** A swimlane block on `page` whose single lane claims `resourceId`. */
function addSwimlaneClaiming(page: any, blockId: string, resourceId: string): any {
    const block = addBlock(page, makeFakeBlock(blockId, { className: 'AdvancedSwimLaneBlock' }));
    const swim: SwimLaneQuodsiData = {
        lanes: [{ laneId: 'lane-1', titleSnapshot: 'Nurses', assignmentMode: 'runtime-derive', resourceId }],
        lastSyncedAt: '2026-08-24T00:00:00.000Z',
    };
    block.shapeData.set('q_swimlane', JSON.stringify(swim));
    return block;
}

const NURSE: StoredResourceRecord = {
    id: 'res-1',
    name: 'Nurse',
    capacity: 3,
    description: 'Floor nurse',
    financialProperties: { enabled: true, costPerSeize: 5, costPerHourUtilized: 40, costPerHourIdle: 10 },
};

describe('PasteNormalizer — Resource blocks (Task 3)', () => {
    it('rule 1: another block on this page still claims the resource -> clones it and points the paste at the clone', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');
        sa.setResources(page, [NURSE]);
        const original = addResourcePointerBlock(sa, page, 'block-orig', 'res-1');
        const pasted = addBlock(page, makePastedResourceBlock(sa, 'block-new', 'block-orig', 'res-1'));

        const result = normalizePastedItems([pasted], sa);

        const records = sa.getResources(page);
        expect(records).toHaveLength(2);
        const clone = records.find((r) => r.id !== 'res-1')!;
        expect(clone.name).toBe('Nurse_2');
        expect(clone.id).not.toBe('res-1');
        expect(clone.capacity).toBe(3);
        expect(clone.description).toBe('Floor nurse');
        expect(clone.financialProperties).toEqual(NURSE.financialProperties);

        const pastedData = sa.getElementData<{ id: string; resourceId: string }>(pasted)!;
        expect(pastedData.id).toBe('block-new');
        expect(pastedData.resourceId).toBe(clone.id);
        expect(sa.getElementType(pasted)!.type).toBe(SimulationObjectType.Resource);
        expect(sa.getElementType(pasted)!.mappingSource).toBe('user');

        // The pre-existing block is never touched.
        expect(sa.getElementData<{ id: string; resourceId: string }>(original)).toEqual(
            expect.objectContaining({ id: 'block-orig', resourceId: 'res-1' })
        );

        expect(result.changed).toBe(true);
        expect(result.notices).toEqual([`Pasted resource linked to new copy 'Nurse_2'`]);
    });

    it('rule 1: a swimlane lane counts as a claimant', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');
        sa.setResources(page, [NURSE]);
        addSwimlaneClaiming(page, 'block-swim', 'res-1');
        const pasted = addBlock(page, makePastedResourceBlock(sa, 'block-new', 'block-orig', 'res-1'));

        const result = normalizePastedItems([pasted], sa);

        const records = sa.getResources(page);
        expect(records).toHaveLength(2);
        const clone = records.find((r) => r.id !== 'res-1')!;
        expect(sa.getElementData<{ resourceId: string }>(pasted)!.resourceId).toBe(clone.id);
        expect(result.notices).toEqual([`Pasted resource linked to new copy 'Nurse_2'`]);
    });

    it('rule 2: resolves on this page with no other claimant -> pointer kept, envelope re-stamped only', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');
        sa.setResources(page, [NURSE]);
        // The original block was deleted before the paste: nothing else claims res-1.
        const pasted = addBlock(page, makePastedResourceBlock(sa, 'block-new', 'block-orig', 'res-1'));

        const result = normalizePastedItems([pasted], sa);

        expect(sa.getResources(page)).toEqual([NURSE]);
        const pastedData = sa.getElementData<{ id: string; resourceId: string }>(pasted)!;
        expect(pastedData.id).toBe('block-new');
        expect(pastedData.resourceId).toBe('res-1');
        expect(result.changed).toBe(true);
        expect(result.notices).toEqual([]);
    });

    it('rule 3: resolves only on another page -> clones that record into this page, name deduped here', () => {
        const sa = new StorageAdapter();
        const sourcePage = makeFakePage('page-source');
        const targetPage = makeFakePage('page-target');
        sa.setResources(sourcePage, [NURSE]);
        // The target page happens to already have a resource called 'Nurse'.
        sa.setResources(targetPage, [{ id: 'res-other', name: 'Nurse', capacity: 1, description: '' }]);
        const pasted = addBlock(targetPage, makePastedResourceBlock(sa, 'block-new', 'block-orig', 'res-1'));

        const result = normalizePastedItems([pasted], sa, { allPages: () => [sourcePage, targetPage] });

        // Source page untouched.
        expect(sa.getResources(sourcePage)).toEqual([NURSE]);

        const records = sa.getResources(targetPage);
        expect(records).toHaveLength(2);
        const clone = records.find((r) => r.id !== 'res-other')!;
        expect(clone.name).toBe('Nurse_2');
        expect(clone.id).not.toBe('res-1');
        expect(clone.capacity).toBe(3);
        expect(sa.getElementData<{ resourceId: string }>(pasted)!.resourceId).toBe(clone.id);
        expect(result.notices).toEqual([`Pasted resource linked to new copy 'Nurse_2'`]);
    });

    it('rule 4: resolves nowhere -> pointer dropped, block arrives unlinked', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');
        sa.setResources(page, []);
        const pasted = addBlock(page, makePastedResourceBlock(sa, 'block-new', 'block-orig', 'res-gone'));

        const result = normalizePastedItems([pasted], sa, { allPages: () => [page] });

        expect(sa.getResources(page)).toEqual([]);
        const pastedData = sa.getElementData<{ id: string; resourceId?: string }>(pasted)!;
        expect(pastedData.id).toBe('block-new');
        expect(pastedData.resourceId).toBeUndefined();
        expect(sa.getElementType(pasted)!.type).toBe(SimulationObjectType.Resource);
        expect(result.changed).toBe(true);
        expect(result.notices).toEqual([
            'Pasted resource shape is not linked (its resource was not found)',
        ]);
    });

    it('clone levers get fresh leverIds; every other lever field survives', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');
        const withLevers: StoredResourceRecord = {
            ...NURSE,
            levers: [
                {
                    leverId: 'lever-1',
                    propertyName: ScenarioPropertyName.CAPACITY,
                    enabled: true,
                    label: 'Nurse count',
                    range: { min: 1, max: 5, step: 1 },
                },
            ],
        };
        sa.setResources(page, [withLevers]);
        addResourcePointerBlock(sa, page, 'block-orig', 'res-1');
        const pasted = addBlock(page, makePastedResourceBlock(sa, 'block-new', 'block-orig', 'res-1'));

        normalizePastedItems([pasted], sa);

        const clone = sa.getResources(page).find((r) => r.id !== 'res-1')!;
        expect(clone.levers).toHaveLength(1);
        expect(clone.levers![0].leverId).not.toBe('lever-1');
        expect(clone.levers![0].leverId).toBeTruthy();
        expect(clone.levers![0].label).toBe('Nurse count');
        expect(clone.levers![0].enabled).toBe(true);
        expect(clone.levers![0].propertyName).toBe(ScenarioPropertyName.CAPACITY);
        expect(clone.levers![0].range).toEqual({ min: 1, max: 5, step: 1 });
        // The source record's lever is untouched.
        expect(sa.getResources(page).find((r) => r.id === 'res-1')!.levers![0].leverId).toBe('lever-1');
    });

    it('is idempotent: a second pass writes nothing', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');
        sa.setResources(page, [NURSE]);
        addResourcePointerBlock(sa, page, 'block-orig', 'res-1');
        const pasted = addBlock(page, makePastedResourceBlock(sa, 'block-new', 'block-orig', 'res-1'));

        normalizePastedItems([pasted], sa);
        const qDataAfterFirst = pasted.shapeData.get('q_data');
        const resourcesAfterFirst = page.shapeData.get('q_resources');

        const second = normalizePastedItems([pasted], sa);

        expect(second.changed).toBe(false);
        expect(second.notices).toEqual([]);
        expect(pasted.shapeData.get('q_data')).toBe(qDataAfterFirst);
        expect(page.shapeData.get('q_resources')).toBe(resourcesAfterFirst);
    });

    it('two pasted copies of the same original each get their own clone', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');
        sa.setResources(page, [NURSE]);
        addResourcePointerBlock(sa, page, 'block-orig', 'res-1');
        const pastedA = addBlock(page, makePastedResourceBlock(sa, 'block-new-a', 'block-orig', 'res-1'));
        const pastedB = addBlock(page, makePastedResourceBlock(sa, 'block-new-b', 'block-orig', 'res-1'));

        const result = normalizePastedItems([pastedA, pastedB], sa);

        const records = sa.getResources(page);
        expect(records).toHaveLength(3);
        expect(records.map((r) => r.name)).toEqual(['Nurse', 'Nurse_2', 'Nurse_3']);
        const idA = sa.getElementData<{ resourceId: string }>(pastedA)!.resourceId;
        const idB = sa.getElementData<{ resourceId: string }>(pastedB)!.resourceId;
        expect(idA).not.toBe(idB);
        expect(result.notices).toEqual([
            `Pasted resource linked to new copy 'Nurse_2'`,
            `Pasted resource linked to new copy 'Nurse_3'`,
        ]);
    });
});
