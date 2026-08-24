// editorextensions/quodsi_editor_extension/tests/messaging/resourceSelectionPayload.test.ts
//
// What the panel receives when a Resource BLOCK is selected: the flattened
// pointer `{ id: <block id>, type: 'Resource', resourceId? }`.
//
// ResourceProcessor builds this through itemDataBuilder.buildModelItemData,
// which serializes the block's OWN q_data rather than looking a domain
// Resource up by id. That distinction is the whole point of storage format 2
// -- the block does not own the record -- and it has to survive a block whose
// pointer is not set yet: an unlinked Resource shape is a normal state
// (the record it pointed at was reassigned, or the shape was just converted
// by a path that has not linked it), and it must render, not throw.
import { BlockProxy } from '../__mocks__/lucid-extension-sdk';
import { itemDataBuilder } from '../../src/core/messaging/handlers/selection/utils/itemDataBuilder';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { SimulationObjectType } from '@quodsi/lucid-shared';
import { makeFakeBlock, makeFakePage, addBlock } from '../helpers/fakeProxies';

/** The real code branches on `instanceof BlockProxy` to pick a name. */
function asBlockProxy(block: any): any {
  Object.setPrototypeOf(block, BlockProxy.prototype);
  return block;
}

function makeModelManager(storage: StorageAdapter): any {
  return {
    getElementData: (el: any) => storage.getElementData(el),
    getElementType: (el: any) => storage.getElementType(el),
    isUnconvertedElement: () => false,
  };
}

describe('Resource selection payload', () => {
  it('is the block id plus the pointer, with no record fields on the shape', async () => {
    const storage = new StorageAdapter();
    const page = makeFakePage('p1');
    const block = asBlockProxy(addBlock(page, makeFakeBlock('blk-1', { text: 'Nurse' })));
    storage.setResources(page, [{ id: 'res-1', name: 'Nurse', capacity: 2 }]);
    storage.setElementData(block, { id: 'blk-1', resourceId: 'res-1' }, SimulationObjectType.Resource);

    const payload = await itemDataBuilder.buildModelItemData(block, makeModelManager(storage));

    expect(payload.id).toBe('blk-1');
    expect(payload.metadata.type).toBe(SimulationObjectType.Resource);
    expect((payload.data as any).resourceId).toBe('res-1');
    expect((payload.data as any).name).toBeUndefined();
    expect((payload.data as any).capacity).toBeUndefined();
  });

  it('yields resourceId: undefined for an unlinked Resource block instead of throwing', async () => {
    const storage = new StorageAdapter();
    const page = makeFakePage('p1');
    const block = asBlockProxy(addBlock(page, makeFakeBlock('blk-2', { text: 'Nurse' })));
    storage.setElementData(block, { id: 'blk-2' }, SimulationObjectType.Resource);

    const payload = await itemDataBuilder.buildModelItemData(block, makeModelManager(storage));

    expect(payload.id).toBe('blk-2');
    expect(payload.metadata.type).toBe(SimulationObjectType.Resource);
    expect((payload.data as any).resourceId).toBeUndefined();
  });
});
