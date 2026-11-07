// A line is proposed as a Connector only between a valid flow pair
// (source Activity or Generator, target Activity), judged on each end's
// stored type, else its proposed type. The rule is flowPair in @quodsi/shared.
import { LucidPageAnalyzer } from '../../src/services/conversion/LucidPageAnalyzer';
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

function previewOf(blocks: Array<[string, string]>, lines: Array<[string, string, string]>) {
  const page: any = {
    id: 'p1',
    shapeData: makeShapeData(),
    allBlocks: new Map(),
    allLines: new Map(),
    getTitle: () => 'Page 1',
  };
  for (const [id, text] of blocks) page.allBlocks.set(id, makeBlock(id, text, page));
  for (const [id, s, t] of lines) page.allLines.set(id, makeLine(id, s, t, page));
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
});
