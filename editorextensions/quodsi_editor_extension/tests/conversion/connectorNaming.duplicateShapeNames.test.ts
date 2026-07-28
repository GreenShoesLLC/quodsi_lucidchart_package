// editorextensions/quodsi_editor_extension/tests/conversion/connectorNaming.duplicateShapeNames.test.ts
//
// Regression: two shapes sharing a name produce two connectors with the SAME
// name, which DuplicateNameValidation reports as an ERROR — and connectors
// cannot be renamed in the UI, so the model is stuck un-simulatable.
// (ClickUp 86e233g6f, reported by Renee. Already fixed in drawio.)
//
// Renee's model: a Generator feeding two Activities that are both labelled
// "Process". The blocks loop de-duplicates them to "Process" / "Process_2",
// but the connectors are named off the block's raw canvas TEXT, which still
// says "Process" for both — and the lines loop applies no uniqueness pass at
// all (unlike the blocks loop). Either defect alone yields a collision.
//
// Drives the REAL LucidElementFactory + StorageAdapter (the factory's type
// guards are duck-typed, so fake proxies are enough) so the assertions cover
// the actual naming path rather than a restatement of it.
import { LucidPageConversionService } from '../../src/services/conversion/LucidPageConversionService';
import { LucidElementFactory } from '../../src/services/LucidElementFactory';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { SimulationObjectType } from '@quodsi/lucid-shared';

function makeShapeData() {
  const m = new Map<string, string>();
  return {
    get: (k: string) => m.get(k),
    set: (k: string, v: string) => { m.set(k, v); },
    delete: (k: string) => { m.delete(k); },
    keys: () => m.keys(),
  };
}

function makeBlock(id: string, text: string, page: any) {
  const block: any = {
    id,
    shapeData: makeShapeData(),
    textAreas: new Map<string, string>([['t1', text]]),
    getClassName: () => 'ProcessBlock',
    getBoundingBox: () => ({ x: 0, y: 0, w: 100, h: 60 }),
    getPage: () => page,
    properties: new Map<string, string>(),
  };
  return block;
}

function makeLine(id: string, sourceId: string, targetId: string, page: any) {
  return {
    id,
    shapeData: makeShapeData(),
    getEndpoint1: () => ({ x: 0, y: 0, connection: { id: sourceId } }),
    getEndpoint2: () => ({ x: 10, y: 10, connection: { id: targetId } }),
    getPage: () => page,
  } as any;
}

function makePage(id: string) {
  const page: any = {
    id,
    shapeData: makeShapeData(),
    allBlocks: new Map(),
    allLines: new Map(),
    getTitle: () => 'Page 1',
  };
  return page;
}

/** Fake ModelManager that records what the conversion registered.
 *  `initializeModel` must stamp the page the way the real one does, or
 *  convertPageWithMappings bails with "Failed to initialize model on page". */
function makeModelManager(registered: any[], storageAdapter: StorageAdapter) {
  return {
    registerElement: async (el: any) => { registered.push(el); },
    removeElement: async () => {},
    initializeModel: async (model: any, page: any) => {
      storageAdapter.setElementData(page, model, SimulationObjectType.Model);
    },
    validateModel: async () => ({ isValid: true, messages: [] }),
    getModelDefinition: async () => null,
  } as any;
}

describe('connector naming when two shapes share a name (86e233g6f)', () => {
  async function convertReneesModel() {
    const page = makePage('p1');
    // One Generator feeding two Activities BOTH labelled "Process".
    const gen = makeBlock('gen', 'Generator', page);
    const p1 = makeBlock('proc1', 'Process', page);
    const p2 = makeBlock('proc2', 'Process', page);
    page.allBlocks.set('gen', gen);
    page.allBlocks.set('proc1', p1);
    page.allBlocks.set('proc2', p2);

    const l1 = makeLine('l1', 'gen', 'proc1', page);
    const l2 = makeLine('l2', 'gen', 'proc2', page);
    page.allLines.set('l1', l1);
    page.allLines.set('l2', l2);

    const registered: any[] = [];
    const storageAdapter = new StorageAdapter();
    const factory = new LucidElementFactory(storageAdapter);
    const svc = new LucidPageConversionService(
      makeModelManager(registered, storageAdapter),
      factory,
      storageAdapter,
    );

    const mappings = new Map<string, SimulationObjectType | null>([
      ['gen', SimulationObjectType.Generator],
      ['proc1', SimulationObjectType.Activity],
      ['proc2', SimulationObjectType.Activity],
      ['l1', SimulationObjectType.Connector],
      ['l2', SimulationObjectType.Connector],
    ]);

    await svc.convertPageWithMappings(page, mappings, new Set());

    const activities = registered.filter((e) => e.type === SimulationObjectType.Activity);
    const connectors = registered.filter((e) => e.type === SimulationObjectType.Connector);
    return { activities, connectors };
  }

  it('de-duplicates the two same-named activities (existing behavior)', async () => {
    const { activities } = await convertReneesModel();
    expect(activities).toHaveLength(2);
    expect(new Set(activities.map((a) => a.name)).size).toBe(2);
    expect(activities.map((a) => a.name).sort()).toEqual(['Process', 'Process_2']);
  });

  it('gives the two connectors DISTINCT names', async () => {
    // The reported bug: both land on "Generator → Process", DuplicateNameValidation
    // raises an ERROR, and the user cannot rename a connector to escape it.
    const { connectors } = await convertReneesModel();
    expect(connectors).toHaveLength(2);
    const names = connectors.map((c) => c.name);
    expect(new Set(names).size).toBe(2);
  });

  it('de-duplicates two connectors between the SAME pair of shapes', async () => {
    // Second, independent collision mode: no duplicate shape names at all, but
    // two parallel lines between one pair both derive "Generator → Process".
    // Only the uniqueness pass catches this one.
    const page = makePage('p1');
    const gen = makeBlock('gen', 'Generator', page);
    const proc = makeBlock('proc', 'Process', page);
    page.allBlocks.set('gen', gen);
    page.allBlocks.set('proc', proc);
    page.allLines.set('l1', makeLine('l1', 'gen', 'proc', page));
    page.allLines.set('l2', makeLine('l2', 'gen', 'proc', page));

    const registered: any[] = [];
    const storageAdapter = new StorageAdapter();
    const svc = new LucidPageConversionService(
      makeModelManager(registered, storageAdapter),
      new LucidElementFactory(storageAdapter),
      storageAdapter,
    );
    await svc.convertPageWithMappings(
      page,
      new Map<string, SimulationObjectType | null>([
        ['gen', SimulationObjectType.Generator],
        ['proc', SimulationObjectType.Activity],
        ['l1', SimulationObjectType.Connector],
        ['l2', SimulationObjectType.Connector],
      ]),
      new Set(),
    );

    const names = registered
      .filter((e) => e.type === SimulationObjectType.Connector)
      .map((c) => c.name);
    expect(names).toHaveLength(2);
    expect(new Set(names).size).toBe(2);
    expect(names.sort()).toEqual(['Generator → Process', 'Generator → Process_2']);
  });

  it('names each connector after the de-duplicated activity it actually points at', async () => {
    // Not just unique — CORRECT. The connector into the activity that became
    // "Process_2" must say so; naming it "Generator → Process" would point the
    // user (and any name-keyed change request) at the wrong activity.
    const { connectors } = await convertReneesModel();
    const byTarget = new Map(connectors.map((c) => [c.targetId, c.name]));
    expect(byTarget.get('proc1')).toBe('Generator → Process');
    expect(byTarget.get('proc2')).toBe('Generator → Process_2');
  });
});
