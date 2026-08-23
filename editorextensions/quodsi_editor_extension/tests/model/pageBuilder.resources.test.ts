import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ModelDefinitionPageBuilder } from '../../src/core/ModelDefinitionPageBuilder';
import { LucidElementFactory } from '../../src/services/LucidElementFactory';
import { migrateResourcesToModelLevel } from '../../src/core/ResourceStorageMigration';
import { buildLegacyResourcesPage, IDS } from '../fixtures/legacyResourcesPage';
import { makeFakePage, makeFakeBlock, addBlock } from '../helpers/fakeProxies';
import { SimulationObjectType } from '@quodsi/lucid-shared';

function build(page: any) {
    const sa = new StorageAdapter();
    const builder = new ModelDefinitionPageBuilder(sa, new LucidElementFactory(sa));
    const def = builder.buildFromConvertedPage(page)!;
    return { def, builder, sa };
}

describe('ModelDefinitionPageBuilder with q_resources', () => {
    it('reads resources from q_resources; geometry follows the LINKED BLOCK, lanes are unpositioned', () => {
        const sa = new StorageAdapter();
        const page = buildLegacyResourcesPage(sa);
        migrateResourcesToModelLevel(page, sa);
        const { def } = build(page);

        const nurse: any = def.resources.get(IDS.nurseBlock);
        expect(nurse.x).toBe(400); expect(nurse.y).toBe(50); expect(nurse.width).toBe(120);
        expect(nurse.shapeId).toBe(IDS.nurseBlock);
        expect(nurse.laneRef).toBeUndefined();

        const doctor: any = def.resources.get(IDS.laneDoctorResource);
        expect(doctor.laneRef).toEqual({ blockId: IDS.swimlane, laneId: IDS.laneDoctor });
        expect(doctor.shapeId).toBeUndefined();
        expect(JSON.parse(JSON.stringify(doctor.toJSON())).x).toBeUndefined();  // sparse: no geometry on the wire

        // transient markers never serialize
        const wire = JSON.parse(JSON.stringify(nurse.toJSON()));
        expect(wire.shapeId).toBeUndefined(); expect(wire.shapeLabel).toBeUndefined(); expect(wire.laneRef).toBeUndefined();
    });

    it('geometry follows the block even when resource id !== block id', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('p');
        sa.setResources(page, [{ id: 'res-uuid', name: 'Bay', capacity: 1 }]);
        const blk = addBlock(page, makeFakeBlock('blk-1', { box: { x: 7, y: 9, w: 50, h: 40 } }));
        sa.setElementData(blk, { id: 'blk-1', resourceId: 'res-uuid' }, SimulationObjectType.Resource);
        const { def } = build(page);
        const bay: any = def.resources.get('res-uuid');
        expect([bay.x, bay.y, bay.width, bay.height]).toEqual([7, 9, 50, 40]);
        expect(bay.shapeId).toBe('blk-1');
    });

    it('derives one auto-requirement per resource, keeps the custom one, and refreshes auto names', () => {
        const sa = new StorageAdapter();
        const page = buildLegacyResourcesPage(sa);
        migrateResourcesToModelLevel(page, sa);
        sa.setResourceRequirements(page, [
            ...sa.getResourceRequirements(page),
            // a stale AUTO-SHAPED override under a resource id, with an old name
            { id: IDS.laneTechResource, name: 'Old Tech Name', rootClause: { id: 'c', mode: 'require_all', requests: [{ resourceId: IDS.laneTechResource, quantity: 1 }] } } as any,
            // a genuinely CUSTOM override under a resource id: the user replaced
            // Nurse's auto-requirement with a real multi-resource rule. Not auto
            // shaped, so it must keep its own name and clause -- never renamed to
            // the resource name, never replaced by a derived auto.
            {
                id: IDS.nurseBlock, name: 'Custom Nurse Rule',
                rootClause: {
                    id: 'c-nurse', mode: 'require_all', requests: [
                        { resourceId: IDS.nurseBlock, quantity: 2 },
                        { resourceId: IDS.laneDoctorResource, quantity: 1 },
                    ]
                }
            } as any,
        ]);
        const { def } = build(page);
        expect(def.resourceRequirements.get(IDS.laneDoctorResource)).toBeDefined();
        expect(def.resourceRequirements.get(IDS.laneTechResource)!.name).toBe('Tech');   // renamed to the resource name

        const nurseReq = def.resourceRequirements.get(IDS.nurseBlock)!;
        expect(nurseReq.name).toBe('Custom Nurse Rule');          // NOT renamed to 'Nurse'
        expect(nurseReq.rootClause.id).toBe('c-nurse');           // NOT replaced by a derived auto
        expect(nurseReq.rootClause.requests).toEqual([
            { resourceId: IDS.nurseBlock, quantity: 2 },
            { resourceId: IDS.laneDoctorResource, quantity: 1 },
        ]);

        expect(def.resourceRequirements.get(IDS.customReq)!.name).toBe('Doctor or 2 Nurses');
        expect(def.resourceRequirements.size()).toBe(4);
    });

    it('rejects a dangling pointer and a duplicate claim deterministically, leaving the resource unclaimed', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('p');
        sa.setResources(page, [{ id: 'res-a', name: 'A' }]);
        const b1 = addBlock(page, makeFakeBlock('blk-1', { box: { x: 1, y: 1, w: 1, h: 1 } }));
        sa.setElementData(b1, { id: 'blk-1', resourceId: 'res-a' }, SimulationObjectType.Resource);
        const b2 = addBlock(page, makeFakeBlock('blk-2', { box: { x: 2, y: 2, w: 2, h: 2 } }));
        sa.setElementData(b2, { id: 'blk-2', resourceId: 'res-a' }, SimulationObjectType.Resource);         // duplicate
        const b3 = addBlock(page, makeFakeBlock('blk-3'));
        sa.setElementData(b3, { id: 'blk-3', resourceId: 'res-gone' }, SimulationObjectType.Resource);      // dangling
        const { def, builder } = build(page);

        const a: any = def.resources.get('res-a');
        expect(a.shapeId).toBe('blk-1'); expect(a.x).toBe(1);
        const rejected = builder.getLastResourceLinkRejections();
        expect(rejected.map(r => [r.elementId, r.reason, r.resourceId])).toEqual([
            ['blk-2', 'duplicate', 'res-a'],
            ['blk-3', 'dangling', 'res-gone'],
        ]);
        expect(def.resources.size()).toBe(1);   // no resource is minted from a pointer
    });

    it('a Resource block with no resourceId is simply unlinked (no resource, no rejection)', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('p');
        const b = addBlock(page, makeFakeBlock('blk-1'));
        sa.setElementData(b, { id: 'blk-1' }, SimulationObjectType.Resource);
        const { def, builder } = build(page);
        expect(def.resources.size()).toBe(0);
        expect(builder.getLastResourceLinkRejections()).toEqual([]);
    });
});
