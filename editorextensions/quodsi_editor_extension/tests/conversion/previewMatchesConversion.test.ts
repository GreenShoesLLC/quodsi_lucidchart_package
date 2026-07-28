// editorextensions/quodsi_editor_extension/tests/conversion/previewMatchesConversion.test.ts
//
// The mapping preview must show the names conversion will actually assign.
//
// It used to invent its own: a block's class name ("ProcessBlock") where
// conversion produces "Activity 1", and "Line abc123→def456" for connectors.
// Both now run the shared naming policy through the same ConversionNamer
// bookkeeping, so the sequence numbers and _2 suffixes line up.
//
// This test compares the two paths directly rather than asserting fixed strings,
// so it keeps holding if the naming policy itself changes — the invariant is
// "preview == conversion", not any particular name.
import { LucidPageConversionService } from '../../src/services/conversion/LucidPageConversionService';
import { LucidPageAnalyzer } from '../../src/services/conversion/LucidPageAnalyzer';
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

/** A page that exercises every naming rule at once. */
function buildPage() {
  const page: any = {
    id: 'p1',
    shapeData: makeShapeData(),
    allBlocks: new Map(),
    allLines: new Map(),
    getTitle: () => 'Page 1',
  };
  page.allBlocks.set('gen', makeBlock('gen', 'Arrivals', page));
  page.allBlocks.set('p1', makeBlock('p1', 'Process', page));   // duplicate name
  page.allBlocks.set('p2', makeBlock('p2', 'Process', page));   // -> Process_2
  page.allBlocks.set('u1', makeBlock('u1', null, page));        // unnamed -> sequence
  page.allLines.set('l1', makeLine('l1', 'gen', 'p1', page));
  page.allLines.set('l2', makeLine('l2', 'gen', 'p2', page));   // into the deduped one
  page.allLines.set('l3', makeLine('l3', 'p1', 'u1', page, 'Yes'));  // labelled line
  return page;
}

const MAPPINGS = new Map<string, SimulationObjectType | null>([
  ['gen', SimulationObjectType.Generator],
  ['p1', SimulationObjectType.Activity],
  ['p2', SimulationObjectType.Activity],
  ['u1', SimulationObjectType.Activity],
  ['l1', SimulationObjectType.Connector],
  ['l2', SimulationObjectType.Connector],
  ['l3', SimulationObjectType.Connector],
]);

describe('conversion preview names match conversion output', () => {
  it('assigns the same name to every element in both paths', async () => {
    // --- preview ---
    const previewStorage = new StorageAdapter();
    const preview = new LucidPageAnalyzer().analyzePageForPreview(buildPage(), previewStorage);
    const previewNames = new Map(preview.mappings.map((m) => [m.elementId, m.elementName]));

    // --- conversion ---
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
    await svc.convertPageWithMappings(buildPage(), MAPPINGS, new Set());
    const convertedNames = new Map(registered.map((e: any) => [e.id, e.name]));

    // Every converted element's name must be what the preview promised.
    expect(convertedNames.size).toBeGreaterThan(0);
    for (const [elementId, converted] of convertedNames) {
      expect(previewNames.get(elementId)).toBe(converted);
    }
  });

  it('predicts the de-duplicated name, not the raw label', async () => {
    const preview = new LucidPageAnalyzer().analyzePageForPreview(buildPage(), new StorageAdapter());
    const byId = new Map(preview.mappings.map((m) => [m.elementId, m.elementName]));
    expect(byId.get('p1')).toBe('Process');
    expect(byId.get('p2')).toBe('Process_2');
    // ...and the connector into the de-duplicated activity says so.
    expect(byId.get('l2')).toBe('Arrivals → Process_2');
  });

  it('predicts the sequence fallback and the labelled connector', async () => {
    const preview = new LucidPageAnalyzer().analyzePageForPreview(buildPage(), new StorageAdapter());
    const byId = new Map(preview.mappings.map((m) => [m.elementId, m.elementName]));
    // 3rd activity claimed (Process, Process_2, then this one).
    expect(byId.get('u1')).toBe('Activity 3');
    // A labelled line keeps its label, exactly as conversion does.
    expect(byId.get('l3')).toBe('Yes');
  });
});
