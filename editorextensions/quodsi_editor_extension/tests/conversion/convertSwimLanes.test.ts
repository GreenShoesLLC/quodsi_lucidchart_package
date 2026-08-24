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

  it('re-conversion reuses the lane resources it already minted', async () => {
    // Re-running "Convert page" is a routine gesture: a user adds a shape and
    // converts again. Minting a fresh UUID per lane every pass would append a
    // duplicate resource for every existing lane on every conversion, leaving
    // the model littered with orphans (the lane only ever points at the newest)
    // and the auto-requirement list growing without bound.
    const storageAdapter = new StorageAdapter();
    const page = makeFakePage('p1');
    const swimlane = addBlock(
      page,
      makeFakeBlock('sw-1', {
        className: 'AdvancedSwimLaneBlock',
        box: { x: 0, y: 0, w: 200, h: 200 },
        lanes: ['Nurse', 'Doctor'],
      })
    );

    const svc = makeService(storageAdapter);
    await (svc as any).convertSwimLanes(page, new Map());

    const first = {
      records: storageAdapter.getResources(page).map((r) => ({ ...r })),
      lanes: JSON.parse(swimlane.shapeData.get('q_swimlane') as string).lanes,
    };
    expect(first.records).toHaveLength(2);

    const usedNamesByType = new Map<SimulationObjectType, Set<string>>();
    const secondCount = await (svc as any).convertSwimLanes(page, usedNamesByType);

    // Every lane was already linked, so nothing new was created.
    expect(secondCount).toBe(0);
    const records = storageAdapter.getResources(page);
    expect(records).toHaveLength(2);
    expect(records.map((r) => r.id)).toEqual(first.records.map((r) => r.id));
    expect(records.map((r) => r.name)).toEqual(['Nurse', 'Doctor']);

    const lanes = JSON.parse(swimlane.shapeData.get('q_swimlane') as string).lanes;
    expect(lanes.map((l: any) => l.resourceId)).toEqual(first.lanes.map((l: any) => l.resourceId));
    expect(lanes.map((l: any) => l.laneId)).toEqual(first.lanes.map((l: any) => l.laneId));

    // A kept lane still reserves the name of the record it points at, so a
    // later pass cannot mint "Nurse" a second time for some other shape.
    expect(Array.from(usedNamesByType.get(SimulationObjectType.Resource) ?? [])).toEqual([
      'Nurse',
      'Doctor',
    ]);
  });

  it('mints only the lanes that are new when a lane is added to an already-converted swimlane', async () => {
    const storageAdapter = new StorageAdapter();
    const page = makeFakePage('p1');
    const swimlane = addBlock(
      page,
      makeFakeBlock('sw-1', {
        className: 'AdvancedSwimLaneBlock',
        box: { x: 0, y: 0, w: 200, h: 200 },
        lanes: ['Nurse'],
      })
    );

    const svc = makeService(storageAdapter);
    await (svc as any).convertSwimLanes(page, new Map());
    const firstId = storageAdapter.getResources(page)[0].id;

    // The user drags in a second lane and converts again.
    (swimlane as any).getPrimaryLanes = () => [
      { index: 0, getTitle: () => 'Nurse', getBoundingBox: () => ({ x: 0, y: 0, w: 200, h: 100 }) },
      { index: 1, getTitle: () => 'Doctor', getBoundingBox: () => ({ x: 0, y: 100, w: 200, h: 100 }) },
    ];
    const count = await (svc as any).convertSwimLanes(page, new Map());

    expect(count).toBe(1);
    const records = storageAdapter.getResources(page);
    expect(records.map((r) => r.name)).toEqual(['Nurse', 'Doctor']);
    const lanes = JSON.parse(swimlane.shapeData.get('q_swimlane') as string).lanes;
    expect(lanes[0].resourceId).toBe(firstId);
    expect(lanes[1].resourceId).toBe(records[1].id);
  });

  it('re-mints a lane whose resourceId no longer resolves in q_resources', async () => {
    // The record was deleted from the Resources tab; the lane pointer is
    // dangling. Keeping it would leave the lane permanently pointing at
    // nothing, so conversion mints a replacement.
    const storageAdapter = new StorageAdapter();
    const page = makeFakePage('p1');
    const swimlane = addBlock(
      page,
      makeFakeBlock('sw-1', {
        className: 'AdvancedSwimLaneBlock',
        box: { x: 0, y: 0, w: 200, h: 200 },
        lanes: ['Nurse'],
      })
    );
    swimlane.shapeData.set('q_swimlane', JSON.stringify({
      lanes: [{ laneId: 'l0', titleSnapshot: 'Nurse', assignmentMode: 'runtime-derive', resourceId: 'gone' }],
      lastSyncedAt: 'x',
    }));

    const svc = makeService(storageAdapter);
    const count = await (svc as any).convertSwimLanes(page, new Map());

    expect(count).toBe(1);
    const records = storageAdapter.getResources(page);
    expect(records).toHaveLength(1);
    const lanes = JSON.parse(swimlane.shapeData.get('q_swimlane') as string).lanes;
    expect(lanes[0].resourceId).toBe(records[0].id);
    expect(lanes[0].resourceId).not.toBe('gone');
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
