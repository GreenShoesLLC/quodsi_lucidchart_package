import { StorageAdapter } from '../../src/core/StorageAdapter';
import { migrateResourcesToModelLevel } from '../../src/core/ResourceStorageMigration';
import { LUCID_STORAGE_FORMAT } from '../../src/core/storageFormat';
import { buildLegacyResourcesPage, IDS } from '../fixtures/legacyResourcesPage';
import { makeFakePage, makeFakeBlock, addBlock } from '../helpers/fakeProxies';
import { SimulationObjectType } from '@quodsi/lucid-shared';

const readJson = (el: any, key: string) => JSON.parse(el.shapeData.get(key));

describe('migrateResourcesToModelLevel', () => {
    it('lifts block-owned and lane-owned records into q_resources, ids preserved, and leaves pointers', () => {
        const sa = new StorageAdapter();
        const page = buildLegacyResourcesPage(sa);

        const result = migrateResourcesToModelLevel(page, sa);

        expect(result.migrated).toBe(true);
        const stored = sa.getResources(page);
        expect(stored.map(r => r.id).sort()).toEqual([IDS.nurseBlock, IDS.laneDoctorResource, IDS.laneTechResource].sort());
        const nurse = stored.find(r => r.id === IDS.nurseBlock)!;
        expect(nurse).toMatchObject({
            name: 'Nurse', capacity: 3, description: 'Floor nurses',
            financialProperties: { enabled: true, costPerHourUtilized: 45 }
        });
        expect((nurse as any).x).toBeUndefined();  // geometry is not stored

        // block -> pointer, type preserved, nothing else left on the shape
        expect(sa.getElementType(page.allBlocks.get(IDS.nurseBlock))?.type).toBe(SimulationObjectType.Resource);
        const ptr = sa.getElementData(page.allBlocks.get(IDS.nurseBlock)) as any;
        expect(ptr.resourceId).toBe(IDS.nurseBlock);
        expect(ptr.name).toBeUndefined();
        expect(ptr.capacity).toBeUndefined();

        // lanes -> resourceId, inline record gone, other lane fields intact
        const swim = readJson(page.allBlocks.get(IDS.swimlane), 'q_swimlane');
        expect(swim.lanes[0]).toEqual({ laneId: IDS.laneDoctor, titleSnapshot: 'Doctor', assignmentMode: 'runtime-derive', resourceId: IDS.laneDoctorResource });
        expect(swim.lanes[1].resourceId).toBe(IDS.laneTechResource);
        expect(swim.lanes[1].resource).toBeUndefined();

        expect(sa.getStorageFormat(page)).toBe(LUCID_STORAGE_FORMAT);
    });

    it('is idempotent: a second pass writes nothing', () => {
        const sa = new StorageAdapter();
        const page = buildLegacyResourcesPage(sa);
        migrateResourcesToModelLevel(page, sa);
        const before = {
            res: page.shapeData.get('q_resources'),
            nurse: page.allBlocks.get(IDS.nurseBlock).shapeData.get('q_data'),
            swim: page.allBlocks.get(IDS.swimlane).shapeData.get('q_swimlane'),
        };
        const writes: string[] = [];
        const origSet = page.shapeData.set;
        page.shapeData.set = (k: string, v: string) => { writes.push(k); origSet(k, v); };

        const second = migrateResourcesToModelLevel(page, sa);

        expect(second.migrated).toBe(false);
        expect(second.renames).toEqual([]);
        expect(writes).toEqual([]);
        expect(page.shapeData.get('q_resources')).toBe(before.res);
        expect(page.allBlocks.get(IDS.nurseBlock).shapeData.get('q_data')).toBe(before.nurse);
        expect(page.allBlocks.get(IDS.swimlane).shapeData.get('q_swimlane')).toBe(before.swim);
    });

    it('stamps an unstamped page that has no resources at all, and reports no migration', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('p');
        const r = migrateResourcesToModelLevel(page, sa);
        expect(r.migrated).toBe(false);
        expect(sa.getStorageFormat(page)).toBe(LUCID_STORAGE_FORMAT);
        expect(page.shapeData.get('q_resources')).toBeUndefined();
    });

    it('renames a name collision between a block and a lane and reports it once', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('p');
        const blk = addBlock(page, makeFakeBlock('blk-n'));
        sa.setElementData(blk, { id: 'blk-n', name: 'Nurse', capacity: 1 } as any, SimulationObjectType.Resource);
        const swim = addBlock(page, makeFakeBlock('blk-s', { className: 'AdvancedSwimLaneBlock', lanes: ['Nurse'] }));
        swim.shapeData.set('q_swimlane', JSON.stringify({
            lanes: [{
                laneId: 'l0', titleSnapshot: 'Nurse', assignmentMode: 'runtime-derive',
                resource: { id: 'res-lane-n', name: 'Nurse', capacity: 1, description: '' }
            }], lastSyncedAt: 'x'
        }));

        const r = migrateResourcesToModelLevel(page, sa);

        expect(r.renames).toEqual([{ resourceId: 'res-lane-n', from: 'Nurse', to: 'Nurse_2' }]);
        const names = sa.getResources(page).map(x => x.name).sort();
        expect(names).toEqual(['Nurse', 'Nurse_2']);
        expect(migrateResourcesToModelLevel(page, sa).renames).toEqual([]);
    });

    it('first claimant wins when a block and a lane carry the same resource id', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('p');
        const blk = addBlock(page, makeFakeBlock('shared-id'));
        sa.setElementData(blk, { id: 'shared-id', name: 'Block Nurse', capacity: 1 } as any, SimulationObjectType.Resource);
        const swim = addBlock(page, makeFakeBlock('blk-s', { className: 'AdvancedSwimLaneBlock', lanes: ['L'] }));
        swim.shapeData.set('q_swimlane', JSON.stringify({
            lanes: [{
                laneId: 'l0', titleSnapshot: 'L', assignmentMode: 'runtime-derive',
                resource: { id: 'shared-id', name: 'Lane Nurse', capacity: 5, description: '' }
            }], lastSyncedAt: 'x'
        }));

        migrateResourcesToModelLevel(page, sa);

        const stored = sa.getResources(page);
        expect(stored).toHaveLength(1);
        expect(stored[0].name).toBe('Block Nurse');           // document order: the block came first
        expect(readJson(swim, 'q_swimlane').lanes[0].resourceId).toBe('shared-id'); // the lane still points; the builder's resolver rejects it as duplicate
    });

    it('leaves a pointer block alone even when a merge write put name/capacity back on it', () => {
        // StorageAdapter.updateElementData MERGES, so a panel edit on an
        // already-migrated pointer block writes name/capacity NEXT TO the
        // surviving resourceId. Classifying that as legacy would mint a second
        // record under the block id and repoint the block, silently discarding
        // the edit. `resourceId` present == already migrated, full stop.
        const sa = new StorageAdapter();
        const page = makeFakePage('p');
        const blk = addBlock(page, makeFakeBlock('blk-p'));
        sa.setElementData(blk, { id: 'blk-p', name: 'Nurse', capacity: 3 } as any, SimulationObjectType.Resource);
        migrateResourcesToModelLevel(page, sa);

        // the merge write a panel edit produces
        sa.updateElementData(blk, { id: 'blk-p', name: 'Edited', capacity: 9 } as any);
        const before = { res: page.shapeData.get('q_resources'), data: blk.shapeData.get('q_data') };
        expect((sa.getElementData(blk) as any).resourceId).toBe('blk-p');
        expect((sa.getElementData(blk) as any).name).toBe('Edited');

        const again = migrateResourcesToModelLevel(page, sa);

        expect(again.migrated).toBe(false);
        expect(again.renames).toEqual([]);
        expect(page.shapeData.get('q_resources')).toBe(before.res);
        expect(blk.shapeData.get('q_data')).toBe(before.data);
        expect(sa.getResources(page)).toHaveLength(1);
        expect(sa.getResources(page)[0].name).toBe('Nurse');   // no second record minted from the edit
    });

    it('drops stored PLAIN AUTO requirements for resources that exist, keeping customs', () => {
        // One-time seam. Format 1 persisted the auto-requirement a Resource
        // block minted alongside its record. Format 2 DERIVES that requirement
        // at build (reconcileAutoRequirements, id === resource.id), so a stored
        // copy is redundant -- and worse than redundant: updateResourceRequirements
        // diffs the panel's list against what is stored, so the first delete on
        // the Resources tab would read the leftover row as "the user deleted
        // this requirement" and strip Seize/Release off every shape using it.
        const sa = new StorageAdapter();
        const page = makeFakePage('p');
        const blk = addBlock(page, makeFakeBlock('r1'));
        sa.setElementData(blk, { id: 'r1', name: 'Nurse', capacity: 2 } as any, SimulationObjectType.Resource);
        sa.setResourceRequirements(page, [
            // the plain auto for r1 -- derivation recreates this identically
            { id: 'r1', name: 'Nurse', rootClause: { id: 'c1', mode: 'RequireAll', requests: [{ resourceId: 'r1' }], clauses: [] } },
            // a real custom requirement -- must survive
            { id: 'custom-1', name: 'Nurse x2', rootClause: { id: 'c1', mode: 'RequireAll', requests: [{ resourceId: 'r1', quantity: 2 }], clauses: [] } },
        ] as any);

        const result = migrateResourcesToModelLevel(page, sa);

        expect(result.migrated).toBe(true);
        expect(sa.getResourceRequirements(page).map(r => r.id)).toEqual(['custom-1']);

        // second pass writes nothing
        const writes: string[] = [];
        const origSet = page.shapeData.set;
        page.shapeData.set = (k: string, v: string) => { writes.push(k); origSet(k, v); };
        const before = page.shapeData.get('q_res_requirements');

        const second = migrateResourcesToModelLevel(page, sa);

        expect(second.migrated).toBe(false);
        expect(writes).toEqual([]);
        expect(page.shapeData.get('q_res_requirements')).toBe(before);
    });

    it('keeps a stored plain auto whose id matches NO resource', () => {
        // Nothing derives it, so dropping it would delete a requirement the
        // model still references.
        const sa = new StorageAdapter();
        const page = makeFakePage('p');
        sa.setResources(page, [{ id: 'r1', name: 'Nurse' }]);
        sa.setResourceRequirements(page, [
            { id: 'orphan', name: 'Orphan', rootClause: { id: 'c1', mode: 'RequireAll', requests: [{ resourceId: 'orphan' }], clauses: [] } },
        ] as any);

        migrateResourcesToModelLevel(page, sa);

        expect(sa.getResourceRequirements(page).map(r => r.id)).toEqual(['orphan']);
    });

    it('restores q_res_requirements too when a write throws mid-way', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('p');
        const blk = addBlock(page, makeFakeBlock('r1'));
        sa.setElementData(blk, { id: 'r1', name: 'Nurse', capacity: 2 } as any, SimulationObjectType.Resource);
        sa.setResourceRequirements(page, [
            { id: 'r1', name: 'Nurse', rootClause: { id: 'c1', mode: 'RequireAll', requests: [{ resourceId: 'r1' }], clauses: [] } },
        ] as any);
        const before = page.shapeData.get('q_res_requirements');

        const origSet = page.shapeData.set;
        page.shapeData.set = (k: string, v: string) => { if (k === 'q_resources') throw new Error('boom'); origSet(k, v); };

        expect(() => migrateResourcesToModelLevel(page, sa)).toThrow('boom');

        expect(page.shapeData.get('q_res_requirements')).toBe(before);
    });

    it('restores every touched key when a write throws mid-way', () => {
        const sa = new StorageAdapter();
        const page = buildLegacyResourcesPage(sa);
        const swim = page.allBlocks.get(IDS.swimlane);
        const snapshot = {
            nurse: page.allBlocks.get(IDS.nurseBlock).shapeData.get('q_data'),
            swim: swim.shapeData.get('q_swimlane'),
        };
        const origSet = page.shapeData.set;
        page.shapeData.set = (k: string, v: string) => { if (k === 'q_resources') throw new Error('boom'); origSet(k, v); };

        expect(() => migrateResourcesToModelLevel(page, sa)).toThrow('boom');

        expect(page.allBlocks.get(IDS.nurseBlock).shapeData.get('q_data')).toBe(snapshot.nurse);
        expect(swim.shapeData.get('q_swimlane')).toBe(snapshot.swim);
        expect(page.shapeData.get('q_resources')).toBeUndefined();
        expect(page.shapeData.get('q_lucid_format')).toBeUndefined();
    });
});
