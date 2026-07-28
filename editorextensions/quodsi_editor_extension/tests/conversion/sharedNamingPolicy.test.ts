// editorextensions/quodsi_editor_extension/tests/conversion/sharedNamingPolicy.test.ts
//
// Lucid conversion now runs the SAME naming policy as drawio and Visio
// (@quodsi/shared conversion/naming), reached through the proxy → NameableShape
// adapter. These tests pin the behavior that CHANGED as a result, so the
// unification can't silently drift back.
//
// Before: Lucid had its own chain — canvas text, else "<prefix> <className>".
// That fallback was identical for every unnamed block of a type ("Act
// ProcessBlock" twice), so duplicate names were the normal case.
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

function makeBlock(id: string, text: string | null, page: any) {
  return {
    id,
    shapeData: makeShapeData(),
    textAreas: text === null ? new Map<string, string>() : new Map([['t1', text]]),
    getClassName: () => 'ProcessBlock',
    getBoundingBox: () => ({ x: 0, y: 0, w: 100, h: 60 }),
    getPage: () => page,
    properties: new Map<string, string>(),
  } as any;
}

function makeLine(id: string, sourceId: string, targetId: string, page: any, label?: string) {
  return {
    id,
    shapeData: makeShapeData(),
    textAreas: label ? new Map([['t1', label]]) : new Map<string, string>(),
    getEndpoint1: () => ({ x: 0, y: 0, connection: { id: sourceId } }),
    getEndpoint2: () => ({ x: 10, y: 10, connection: { id: targetId } }),
    getPage: () => page,
  } as any;
}

function makePage() {
  return {
    id: 'p1',
    shapeData: makeShapeData(),
    allBlocks: new Map(),
    allLines: new Map(),
    getTitle: () => 'Page 1',
  } as any;
}

async function convert(page: any, mappings: Map<string, SimulationObjectType | null>) {
  const registered: any[] = [];
  const storageAdapter = new StorageAdapter();
  const svc = new LucidPageConversionService(
    {
      registerElement: async (el: any) => { registered.push(el); },
      removeElement: async () => {},
      initializeModel: async (model: any, p: any) => {
        storageAdapter.setElementData(p, model, SimulationObjectType.Model);
      },
      validateModel: async () => ({ isValid: true, messages: [] }),
      getModelDefinition: async () => null,
    } as any,
    new LucidElementFactory(storageAdapter),
    storageAdapter,
  );
  await svc.convertPageWithMappings(page, mappings, new Set());
  return registered;
}

describe('Lucid conversion on the shared naming policy', () => {
  it('names unnamed blocks "<Type> <n>" — unique per shape, not one shared class name', async () => {
    // Was: both became "Act ProcessBlock" and only de-duplication pulled them
    // apart into "Act ProcessBlock" / "Act ProcessBlock_2".
    const page = makePage();
    page.allBlocks.set('b1', makeBlock('b1', null, page));
    page.allBlocks.set('b2', makeBlock('b2', null, page));

    const registered = await convert(page, new Map([
      ['b1', SimulationObjectType.Activity],
      ['b2', SimulationObjectType.Activity],
    ]));

    const names = registered
      .filter((e) => e.type === SimulationObjectType.Activity)
      .map((a) => a.name)
      .sort();
    expect(names).toEqual(['Activity 1', 'Activity 2']);
  });

  it('still prefers what the user typed on the shape', async () => {
    const page = makePage();
    page.allBlocks.set('b1', makeBlock('b1', 'Triage', page));

    const registered = await convert(page, new Map([['b1', SimulationObjectType.Activity]]));
    expect(registered[0].name).toBe('Triage');
  });

  it("uses a line's own label as the connector name instead of '<source> → <target>'", async () => {
    // New in Lucid (drawio already did this): a user who labels an arrow "Yes"
    // has said what to call it, so deriving over the top of that is wrong.
    const page = makePage();
    page.allBlocks.set('gen', makeBlock('gen', 'Generator', page));
    page.allBlocks.set('act', makeBlock('act', 'Process', page));
    page.allLines.set('l1', makeLine('l1', 'gen', 'act', page, 'Yes'));

    const registered = await convert(page, new Map([
      ['gen', SimulationObjectType.Generator],
      ['act', SimulationObjectType.Activity],
      ['l1', SimulationObjectType.Connector],
    ]));

    const connector = registered.find((e) => e.type === SimulationObjectType.Connector);
    expect(connector.name).toBe('Yes');
  });

  it('falls back to "<source> → <target>" for an unlabelled line', async () => {
    const page = makePage();
    page.allBlocks.set('gen', makeBlock('gen', 'Generator', page));
    page.allBlocks.set('act', makeBlock('act', 'Process', page));
    page.allLines.set('l1', makeLine('l1', 'gen', 'act', page));

    const registered = await convert(page, new Map([
      ['gen', SimulationObjectType.Generator],
      ['act', SimulationObjectType.Activity],
      ['l1', SimulationObjectType.Connector],
    ]));

    const connector = registered.find((e) => e.type === SimulationObjectType.Connector);
    expect(connector.name).toBe('Generator → Process');
  });

  it('names resources without the block class ("Resource 1", not "Resource ProcessBlock")', async () => {
    const page = makePage();
    page.allBlocks.set('r1', makeBlock('r1', null, page));

    const registered = await convert(page, new Map([['r1', SimulationObjectType.Resource]]));
    expect(registered[0].name).toBe('Resource 1');
  });
});

describe('connector weight', () => {
  it('leaves every converted connector at weight 1, however many branches there are', async () => {
    // Weight is a RELATIVE SHARE. Conversion used to pre-divide it to
    // 1/outgoing, which only held for the connectors present at conversion:
    // a fourth branch drawn later defaults to 1 against siblings holding
    // 0.333, silently making it 3x more likely. 1 everywhere splits evenly
    // and keeps matching drawio/Visio and the editor's own help text.
    const page = makePage()
    page.allBlocks.set('gen', makeBlock('gen', 'Generator', page))
    page.allBlocks.set('a', makeBlock('a', 'A', page))
    page.allBlocks.set('b', makeBlock('b', 'B', page))
    page.allBlocks.set('c', makeBlock('c', 'C', page))
    // Three branches out of the SAME source — the case that used to yield 0.333.
    page.allLines.set('l1', makeLine('l1', 'gen', 'a', page))
    page.allLines.set('l2', makeLine('l2', 'gen', 'b', page))
    page.allLines.set('l3', makeLine('l3', 'gen', 'c', page))

    const registered = await convert(page, new Map([
      ['gen', SimulationObjectType.Generator],
      ['a', SimulationObjectType.Activity],
      ['b', SimulationObjectType.Activity],
      ['c', SimulationObjectType.Activity],
      ['l1', SimulationObjectType.Connector],
      ['l2', SimulationObjectType.Connector],
      ['l3', SimulationObjectType.Connector],
    ]))

    const weights = registered
      .filter((e) => e.type === SimulationObjectType.Connector)
      .map((c) => c.weight)
    expect(weights).toEqual([1, 1, 1])
  })
})
