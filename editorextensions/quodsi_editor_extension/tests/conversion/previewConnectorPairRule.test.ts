// A line is proposed as a Connector only between a valid flow pair
// (source Activity or Generator, target Activity), judged on each end's
// stored type, else its proposed type. The rule is flowPair in @quodsi/shared.
import { LucidPageAnalyzer } from '../../src/services/conversion/LucidPageAnalyzer';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { SimulationObjectType } from '@quodsi/lucid-shared';
import { LucidPageConversionService } from '../../src/services/conversion/LucidPageConversionService';
import { LucidElementFactory } from '../../src/services/LucidElementFactory';

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
  return {
    id,
    shapeData: makeShapeData(),
    textAreas: new Map([['t1', text]]),
    getClassName: () => 'ProcessBlock',
    getBoundingBox: () => ({ x: 0, y: 0, w: 100, h: 60 }),
    getPage: () => page,
    properties: new Map<string, string>(),
  } as any;
}

function makeLine(id: string, sourceId: string, targetId: string, page: any) {
  return {
    id,
    shapeData: makeShapeData(),
    textAreas: new Map<string, string>(),
    getEndpoint1: () => ({ x: 0, y: 0, connection: { id: sourceId } }),
    getEndpoint2: () => ({ x: 10, y: 10, connection: { id: targetId } }),
    getPage: () => page,
  } as any;
}

function buildPage(
  blocks: Array<[string, string, string?]>,
  lines: Array<[string, string, string]>,
) {
  const page: any = {
    id: 'p1',
    shapeData: makeShapeData(),
    allBlocks: new Map(),
    allLines: new Map(),
    getTitle: () => 'Page 1',
  };
  for (const [id, text, stored] of blocks) {
    const b = makeBlock(id, text, page);
    if (stored) b.shapeData.set('q_data', JSON.stringify({ id, type: stored }));
    page.allBlocks.set(id, b);
  }
  for (const [id, s, t] of lines) page.allLines.set(id, makeLine(id, s, t, page));
  return page;
}

function previewOf(blocks: Array<[string, string, string?]>, lines: Array<[string, string, string]>) {
  const page = buildPage(blocks, lines);
  const preview = new LucidPageAnalyzer().analyzePageForPreview(page, new StorageAdapter());
  return new Map(preview.mappings.map((m) => [m.elementId, m.proposedType]));
}

describe('preview proposes a Connector only between a valid flow pair', () => {
  it('proposes a Connector from a Generator into an Activity', () => {
    const p = previewOf([['g', 'Arrivals'], ['a', 'Process']], [['l', 'g', 'a']]);
    expect(p.get('l')).toBe(SimulationObjectType.Connector);
  });

  it('does not propose a line into a Resource-mapped shape as a Connector', () => {
    const p = previewOf(
      [['g', 'Arrivals'], ['r', 'name: Pool | type: resource']],
      [['l', 'g', 'r']],
    );
    expect(p.get('r')).toBe(SimulationObjectType.Resource);
    expect(p.get('l')).toBeNull();
  });

  it('judges an end by its stored type, not its topology', () => {
    // 's' has an incoming line (topology: Activity) but is stored as a Resource.
    const p = previewOf(
      [['g', 'Arrivals'], ['s', 'Pool', SimulationObjectType.Resource]],
      [['l', 'g', 's']],
    );
    expect(p.get('l')).toBeNull();
  });

  it('keeps a Connector from an Activity into a Generator (either direction)', () => {
    const p = previewOf(
      [['a', 'Process', SimulationObjectType.Activity], ['g', 'Arrivals', SimulationObjectType.Generator]],
      [['l', 'a', 'g']],
    );
    expect(p.get('l')).toBe(SimulationObjectType.Connector);
  });
});

describe('Convert skips a line mapped to Connector that is not a valid pair', () => {
  async function convert(mappings: Map<string, SimulationObjectType | null>) {
    const page = buildPage(
      [['g', 'Arrivals'], ['r', 'Pool']],
      [['l', 'g', 'r']],
    );
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
    return { registered, skipped: storageAdapter.getSkippedElements(page) };
  }

  it('skips the line as an automatic skip when an end is a Resource', async () => {
    const { registered, skipped } = await convert(new Map<string, SimulationObjectType | null>([
      ['g', SimulationObjectType.Generator],
      ['r', SimulationObjectType.Resource],
      ['l', SimulationObjectType.Connector],
    ]));
    expect(registered.some((e) => e.id === 'l')).toBe(false);
    expect(skipped['l']).toBe('auto');
  });

  it('still converts a line between a valid pair', async () => {
    const { registered } = await convert(new Map<string, SimulationObjectType | null>([
      ['g', SimulationObjectType.Generator],
      ['r', SimulationObjectType.Activity],
      ['l', SimulationObjectType.Connector],
    ]));
    expect(registered.some((e) => e.id === 'l')).toBe(true);
  });
});
