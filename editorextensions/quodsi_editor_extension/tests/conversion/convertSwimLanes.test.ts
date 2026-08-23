// editorextensions/quodsi_editor_extension/tests/conversion/convertSwimLanes.test.ts
//
// Auto-converting swimlane lanes is a WRITE TO q_resources, not to the
// in-memory ModelDefinition.
//
// Format 1 stashed a whole resource record inline on each lane mapping and,
// on top of that, pushed a Resource plus a hand-built ResourceRequirement
// straight into the cached ModelDefinition. Both are gone: the lane keeps a
// `resourceId` pointer, the record lives on the page, and the auto-requirement
// is DERIVED at build time (reconcileAutoRequirements). The stubbed
// getModelDefinition below throws precisely so a re-added `modelDef.resources.add`
// cannot pass this suite.
import { LucidPageConversionService } from '../../src/services/conversion/LucidPageConversionService';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { SimulationObjectType } from '@quodsi/lucid-shared';
import { makeFakeBlock, makeFakePage, addBlock } from '../helpers/fakeProxies';

function makeService(storageAdapter: StorageAdapter): LucidPageConversionService {
  const modelManager: any = {
    registerElement: async () => {},
    removeElement: async () => {},
    initializeModel: async () => {},
    validateModel: async () => ({ isValid: true, messages: [] }),
    getModelDefinition: async () => {
      throw new Error('convertSwimLanes must not touch the in-memory ModelDefinition');
    },
  };
  const factory: any = { createPlatformObject: () => { throw new Error('unused'); } };
  return new LucidPageConversionService(modelManager, factory, storageAdapter);
}

describe('LucidPageConversionService.convertSwimLanes (format 2)', () => {
  it('writes one q_resources record per lane and points the lane mapping at it', async () => {
    const storageAdapter = new StorageAdapter();
    const page = makeFakePage('p1');
    // A record already on the page: convertSwimLanes appends, never replaces.
    storageAdapter.setResources(page, [{ id: 'pre-existing', name: 'Existing' }]);

    const swimlane = addBlock(
      page,
      makeFakeBlock('sw-1', {
        className: 'AdvancedSwimLaneBlock',
        box: { x: 0, y: 0, w: 200, h: 200 },
        // Both lanes are titled the same, so the second must be de-duplicated.
        lanes: ['Nurse', 'Nurse'],
      })
    );

    const svc = makeService(storageAdapter);
    const usedNamesByType = new Map<SimulationObjectType, Set<string>>();
    const count = await (svc as any).convertSwimLanes(page, usedNamesByType);

    expect(count).toBe(2);

    const records = storageAdapter.getResources(page);
    expect(records.map((r) => r.name)).toEqual(['Existing', 'Nurse', 'Nurse_2']);
    expect(records[1]).toMatchObject({
      capacity: 1,
      description: 'Auto-created from swimlane lane: Nurse',
    });
    // Lane resources are model-level records with no shape of their own, so
    // their ids are minted UUIDs -- not a block id.
    expect(records[1].id).not.toBe('sw-1');
    expect(records[1].id).not.toBe(records[2].id);

    const swimlaneData = JSON.parse(swimlane.shapeData.get('q_swimlane') as string);
    expect(swimlaneData.lanes).toHaveLength(2);
    swimlaneData.lanes.forEach((lane: any, i: number) => {
      expect(lane.titleSnapshot).toBe('Nurse');
      expect(lane.assignmentMode).toBe('runtime-derive');
      expect(lane.laneId).toBeTruthy();
      expect(lane.resourceId).toBe(records[i + 1].id);
      // The inline format-1 record must not come back.
      expect('resource' in lane).toBe(false);
    });

    // The names the lanes took are reserved for the rest of the conversion.
    expect(Array.from(usedNamesByType.get(SimulationObjectType.Resource)!)).toEqual(['Nurse', 'Nurse_2']);
  });

  it('leaves q_resources untouched on a page with no swimlane blocks', async () => {
    const storageAdapter = new StorageAdapter();
    const page = makeFakePage('p1');
    addBlock(page, makeFakeBlock('b1', { className: 'ProcessBlock' }));

    const svc = makeService(storageAdapter);
    const count = await (svc as any).convertSwimLanes(page, new Map());

    expect(count).toBe(0);
    expect(page.shapeData.get('q_resources')).toBeUndefined();
  });
});
