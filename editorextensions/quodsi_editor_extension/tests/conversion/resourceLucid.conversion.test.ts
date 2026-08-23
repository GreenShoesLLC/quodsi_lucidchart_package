// editorextensions/quodsi_editor_extension/tests/conversion/resourceLucid.conversion.test.ts
//
// Converting a block to a Resource is a MODEL-LEVEL write plus a pointer.
//
// Under storage format 1 the block's q_data WAS the resource: name, capacity,
// geometry and financials all lived on the shape, so two shapes could not
// share one resource and a resource could not exist without a shape. Format 2
// puts the record in the page's q_resources list and leaves the block holding
// nothing but `{ resourceId }` -- which is also the ONLY thing that tells
// ResourceStorageMigration a block is already migrated, so a stray `name` or
// `capacity` written here would re-classify the block as format 1 on the next
// open.
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ResourceLucid } from '../../src/types/ResourceLucid';
import { SimulationObjectType } from '@quodsi/lucid-shared';
import { makeFakePage, makeFakeBlock, addBlock } from '../helpers/fakeProxies';

describe('ResourceLucid.createFromConversion (format 2)', () => {
    it('appends a record to q_resources (id = block id, name/capacity parsed from text) and writes a pointer', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('p');
        const blk = addBlock(page, makeFakeBlock('blk-1', { text: 'name: Nurse | capacity: 3' }));

        ResourceLucid.createFromConversion(blk, sa, 'user');

        expect(sa.getResources(page)).toEqual([
            expect.objectContaining({ id: 'blk-1', name: 'Nurse', capacity: 3, description: '' }),
        ]);
        expect(sa.getElementType(blk)).toMatchObject({
            type: SimulationObjectType.Resource,
            mappingSource: 'user',
        });

        const ptr = sa.getElementData(blk) as any;
        expect(ptr.resourceId).toBe('blk-1');
        // Nothing but the pointer: see the migration-classification note above.
        expect(ptr.name).toBeUndefined();
        expect(ptr.capacity).toBeUndefined();
        expect(ptr.x).toBeUndefined();
        expect(ptr.financialProperties).toBeUndefined();
    });

    it('dedupes the name against existing records', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('p');
        sa.setResources(page, [{ id: 'other', name: 'Nurse' }]);
        const blk = addBlock(page, makeFakeBlock('blk-1', { text: 'Nurse' }));

        ResourceLucid.createFromConversion(blk, sa);

        expect(sa.getResources(page).map((r) => r.name)).toEqual(['Nurse', 'Nurse_2']);
    });

    it('converting the same block twice does not duplicate the record', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('p');
        const blk = addBlock(page, makeFakeBlock('blk-1', { text: 'Nurse' }));

        ResourceLucid.createFromConversion(blk, sa);
        ResourceLucid.createFromConversion(blk, sa);

        expect(sa.getResources(page)).toHaveLength(1);
        // ...and re-conversion must not rename the record it already owns.
        expect(sa.getResources(page)[0].name).toBe('Nurse');
    });
});
