// editorextensions/quodsi_editor_extension/tests/messaging/tourHandler.integration.test.ts
//
// The L3 + L6 contract end to end (spec 2026-10-16): TOUR_LOAD_EXAMPLE builds
// the Airport example with the REAL page builder and un-converts it; the
// panel's Convert (AUTO_CONVERT_PAGE's path: LucidPageAnalyzer
// .analyzePageForPreview -> buildAutoMappings -> convertPageWithMappings)
// then maps every element to its stored type and keeps its tuned data.
//
// Real ModelManager + StorageAdapter + LucidElementFactory +
// LucidPageAnalyzer + LucidPageConversionService over fake page proxies.
import { Viewport, DocumentProxy, documentPagesForTests } from '../__mocks__/lucid-extension-sdk';
import { makeFakeBlock, makeFakeLine, makeFakePage, addBlock, addLine } from '../helpers/fakeProxies';

let currentPage: any = null;
(Viewport.prototype as any).getCurrentPage = function (): any {
  return currentPage;
};
(Viewport.prototype as any).setCurrentPage = function (page: any): void {
  currentPage = page;
};
(Viewport.prototype as any).getSelectedItems = function (): any[] {
  return [];
};

let pageCounter = 0;
const builtBoxes = new Map<string, { x: number; y: number; w: number; h: number }>();
(DocumentProxy.prototype as any).addPage = function ({ title }: { title: string }): any {
  pageCounter += 1;
  const page = makeFakePage(`page-${pageCounter}`);
  page.getTitle = () => title;
  page.delete = () => {
    const i = documentPagesForTests.indexOf(page);
    if (i >= 0) documentPagesForTests.splice(i, 1);
  };
  let itemCounter = 0;
  page.addBlock = ({ boundingBox }: any) => {
    const block = addBlock(page, makeFakeBlock(`${page.id}-b${++itemCounter}`, { box: boundingBox }));
    block.textStyles = { set: jest.fn(async () => undefined) };
    builtBoxes.set(block.id, boundingBox);
    return block;
  };
  page.addLine = ({ endpoint1, endpoint2 }: any) =>
    addLine(page, makeFakeLine(`${page.id}-l${++itemCounter}`, {
      endpoint1: { connection: endpoint1.connection },
      endpoint2: { connection: endpoint2.connection },
    }));
  documentPagesForTests.push(page);
  return page;
};

const sendMock = jest.fn();
jest.mock('../../src/core/messaging/index', () => ({
  router: { send: sendMock },
}));
jest.mock('../../src/core/messaging/handlers/pageContextRefresh', () => ({
  refreshPageContext: jest.fn(),
}));

import { EnvelopeMessageType, SimulationObjectType } from '@quodsi/lucid-shared';
import { ModelManager } from '../../src/core/ModelManager';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { LucidElementFactory } from '../../src/services/LucidElementFactory';
import { LucidPageAnalyzer } from '../../src/services/conversion/LucidPageAnalyzer';
import { LucidPageConversionService } from '../../src/services/conversion/LucidPageConversionService';
import { buildAutoMappings } from '../../src/core/messaging/handlers/diagramMappingRelayHandler';
import { TourHandler, EXAMPLE_TEXT_SIZE } from '../../src/core/messaging/handlers/tourHandler';

const flush = async () => {
  for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r));
};

let storage: StorageAdapter;
let manager: ModelManager;

beforeEach(() => {
  documentPagesForTests.length = 0;
  sendMock.mockClear();
  currentPage = makeFakePage('page-user');
  documentPagesForTests.push(currentPage);
  storage = new StorageAdapter();
  manager = new ModelManager(storage);
  (ModelManager as any).getClient = () => ({ loadBlockClasses: async () => {} });
  (ModelManager as any).getInstance = () => manager;
});

function blockNamed(page: any, name: string): any {
  for (const [, block] of page.allBlocks) {
    if (storage.getElementData<any>(block)?.name === name) return block;
  }
  throw new Error(`no block named ${name}`);
}

it('load example -> auto Convert: every element keeps its stored type and tuned data', async () => {
  TourHandler.handleMessage({
    id: 'req-load', type: EnvelopeMessageType.TOUR_LOAD_EXAMPLE, source: 'model-iframe',
    target: 'host', version: '1.0', data: { replace: false },
  } as any);
  await flush();

  const result = sendMock.mock.calls.find((c) => c[1]?.type === EnvelopeMessageType.TOUR_LOAD_EXAMPLE_RESULT);
  expect(result?.[1].data).toMatchObject({ outcome: 'loaded' });
  const page = documentPagesForTests.find((p) => p.id === result![1].data.pageId);
  expect(page.getTitle()).toBe('Airport Security (example)');
  expect(storage.isQuodsiModel(page)).toBe(false);

  // The panel's Convert path (DiagramMappingRelayHandler.handleAutoConvert).
  const preview = new LucidPageAnalyzer().analyzePageForPreview(page, storage);
  const mappings = buildAutoMappings(preview);
  const service = new LucidPageConversionService(manager, new LucidElementFactory(storage), storage);
  await service.convertPageWithMappings(page, mappings, new Set());

  // Every element mapped to the type it was built as.
  const expected: Array<[string, SimulationObjectType]> = [
    ['Passengers Arrive', SimulationObjectType.Generator],
    ['ID Check', SimulationObjectType.Activity],
    ['Security Screening', SimulationObjectType.Activity],
    ['Pickup belongings & Exit', SimulationObjectType.Activity],
  ];
  for (const [name, type] of expected) {
    expect(mappings.get(blockNamed(page, name).id)).toBe(type);
    expect(storage.getElementType(blockNamed(page, name))?.type).toBe(type);
  }
  expect(page.allLines.size).toBe(3);
  for (const [, line] of page.allLines) {
    expect(mappings.get(line.id)).toBe(SimulationObjectType.Connector);
    expect(storage.getElementType(line)?.type).toBe(SimulationObjectType.Connector);
  }

  // Tuned data kept.
  const screening = storage.getElementData<any>(blockNamed(page, 'Security Screening'));
  expect(screening.capacity).toBe(3);
  expect(screening.levers).toEqual([
    expect.objectContaining({ path: 'capacity', range: { min: 4, max: 8, step: 1 } }),
  ]);
  const generator = storage.getElementData<any>(blockNamed(page, 'Passengers Arrive'));
  expect(generator.interarrivalTime).toEqual({ unit: 'minutes', distribution: 'exponential', scale: 1.5 });
  expect(storage.getElementData<any>(blockNamed(page, 'ID Check')).capacity).toBe(2);
  expect(storage.getElementData<any>(blockNamed(page, 'Pickup belongings & Exit')).capacity).toBe(5);

  // Model-level run settings came back from q_pending_model.
  const model = storage.getElementData<any>(page);
  expect(model.type).toBe(SimulationObjectType.Model);
  expect(model.replications).toBe(10);
  expect(model.seed).toBe(12345);
  expect(model.runTime).toEqual({ unit: 'hours', value: 8 });
  expect(storage.takePendingModel(page)).toBeNull();
});

// Daniel's smoke, 2026-10-19: every block came out 80x80 with Lucid's
// default text, so the 120x60 activities sat 10px lower than the 80x80
// generator (the generator's line bent) and the names overflowed.
it('builds the example at drawio sizes, centres aligned, with small text', async () => {
  TourHandler.handleMessage({
    id: 'req-load', type: EnvelopeMessageType.TOUR_LOAD_EXAMPLE, source: 'model-iframe',
    target: 'host', version: '1.0', data: { replace: false },
  } as any);
  await flush();

  const result = sendMock.mock.calls.find((c) => c[1]?.type === EnvelopeMessageType.TOUR_LOAD_EXAMPLE_RESULT);
  const page = documentPagesForTests.find((p) => p.id === result![1].data.pageId);
  const box = (name: string) => builtBoxes.get(blockNamed(page, name).id)!;

  // drawio's 80x80 / 120x60 layout, scaled by EXAMPLE_LAYOUT_SCALE (1.5) so
  // the names fit their blocks in Lucid (smoke 2, 2026-10-19).
  expect(box('Passengers Arrive')).toMatchObject({ x: 135, y: 495, w: 120, h: 120 });
  expect(box('ID Check')).toMatchObject({ w: 180, h: 90 });
  const centreY = (b: { y: number; h: number }) => b.y + b.h / 2;
  for (const name of ['ID Check', 'Security Screening', 'Pickup belongings & Exit']) {
    expect(centreY(box(name))).toBe(centreY(box('Passengers Arrive')));
  }
  for (const [, block] of page.allBlocks) {
    expect(block.textStyles.set).toHaveBeenCalledWith('Text', { size: EXAMPLE_TEXT_SIZE });
  }
});
