// editorextensions/quodsi_editor_extension/tests/messaging/shapeOpsHandler.drawInPlace.undo.integration.test.ts
//
// The in-place draw's undo (drawModelInPage -> undoDraw) against the REAL
// ModelManager, StorageAdapter and LucidElementFactory -- only the Lucid SDK
// page, blocks and lines are faked. shapeOpsHandler.drawInPlace.test.ts stubs
// ModelManager, so the real removeElement cascades (an activity's destination
// cleanup, a generator's arrival-pattern removal from q_arrival_patterns, the
// rebuild diff on the next ensureModelDefinition) never run during its undo.
// Here they do, and the page must still come back exactly as it was.
//
// Setup mirrors tourHandler.integration.test.ts.
import { Viewport, documentPagesForTests } from '../__mocks__/lucid-extension-sdk';
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

const sendMock = jest.fn();
jest.mock('../../src/core/messaging/index', () => ({
  router: { send: sendMock },
}));
jest.mock('../../src/core/messaging/handlers/pageContextRefresh', () => ({
  refreshPageContext: jest.fn(),
}));
jest.mock('../../src/core/messaging/handlers/selection/SelectionHandler', () => ({
  SelectionHandler: { handleLucidSelectionEvent: jest.fn().mockResolvedValue(undefined) },
}));

import {
  ArrivalPattern,
  EnvelopeMessageType,
  GeneratorType,
  Model,
  SimulationObjectType,
} from '@quodsi/lucid-shared';
import { ModelManager } from '../../src/core/ModelManager';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ShapeOpsHandler } from '../../src/core/messaging/handlers/shapeOpsHandler';

/** Every page-level model key (StorageAdapter.PAGE_MODEL_KEYS). */
const PAGE_KEYS = [
  'q_data', 'q_states', 'q_entities', 'q_resources', 'q_res_requirements',
  'q_arrival_patterns', 'q_arrival_schedules', 'q_work_schedules',
  'q_skipped_elements', 'q_storage_format',
];

let storage: StorageAdapter;
let manager: ModelManager;
let note: any;
let drawnBlocks: any[];
let drawnLines: any[];
let failAddBlockOnCall: number | null;
let failAddLineOnCall: number | null;

function readKeys(page: any): Record<string, string | undefined> {
  return Object.fromEntries(PAGE_KEYS.map((k) => [k, page.shapeData.get(k)]));
}

function buildDocument() {
  const pattern = new ArrivalPattern('ap1', 'Morning rush').toJSON();
  return {
    name: 'Clinic',
    replications: 5,
    runTime: 480,
    resources: [{ id: 'r1', name: 'Nurse', capacity: 2, x: 400, y: 200 }],
    arrivalPatterns: [pattern],
    states: [{ id: 's1', name: 'Busy' }],
    entities: [{ id: 'e1', name: 'Patient' }],
    generators: [{
      id: 'g1', name: 'Arrivals', x: 0, y: 0,
      mode: GeneratorType.PATTERN, arrivalPatternId: 'ap1', entityId: 'e1',
    }],
    activities: [
      { id: 'a1', name: 'Triage', x: 200, y: 0 },
      { id: 'a2', name: 'Exam', x: 400, y: 0 },
    ],
    connectors: [
      { id: 'c1', sourceId: 'g1', targetId: 'a1' },
      { id: 'c2', sourceId: 'a1', targetId: 'a2' },
    ],
  };
}

function msg(data: unknown): any {
  return {
    id: 'req-build', type: EnvelopeMessageType.MODEL_CREATE_PAGE, source: 'studio-embed-iframe',
    target: 'host', version: '1.0', data,
  };
}

function reply(): any {
  const calls = sendMock.mock.calls.filter((c) => c[1]?.type === EnvelopeMessageType.MODEL_CREATE_PAGE_RESULT);
  expect(calls).toHaveLength(1);
  return calls[0][1].data;
}

beforeEach(async () => {
  documentPagesForTests.length = 0;
  sendMock.mockClear();
  drawnBlocks = [];
  drawnLines = [];
  failAddBlockOnCall = null;
  failAddLineOnCall = null;

  storage = new StorageAdapter();
  manager = new ModelManager(storage);
  (ModelManager as any).getClient = () => ({ loadBlockClasses: async () => {} });
  (ModelManager as any).getInstance = () => manager;

  const page = makeFakePage('page-1');
  page.getTitle = () => 'Clinic floor';
  // A non-model shape already on the page.
  note = addBlock(page, makeFakeBlock('note-1', { box: { x: 0, y: 0, w: 400, h: 300 } }));
  page.addBlock = ({ boundingBox }: any) => {
    const n = drawnBlocks.length + 1;
    if (failAddBlockOnCall === n) throw new Error('Lucid rejected the block');
    const block = addBlock(page, makeFakeBlock(`blk-${n}`, { box: boundingBox }));
    block.delete = jest.fn(() => page.allBlocks.delete(block.id));
    drawnBlocks.push(block);
    return block;
  };
  page.addLine = ({ endpoint1, endpoint2 }: any) => {
    const n = drawnLines.length + 1;
    if (failAddLineOnCall === n) throw new Error('Lucid rejected the line');
    const line = addLine(page, makeFakeLine(`ln-${n}`, {
      endpoint1: { connection: endpoint1.connection },
      endpoint2: { connection: endpoint2.connection },
    }));
    line.delete = jest.fn(() => page.allLines.delete(line.id));
    drawnLines.push(line);
    return line;
  };
  currentPage = page;
  documentPagesForTests.push(page);

  // An empty Quodsi model page, made the real way, then given model-level
  // records the build keeps (ap-keep, s-keep, e-keep). No resources: a page
  // with one is not empty, and the in-place draw refuses it.
  await manager.initializeModel(new Model('page-1', 'My clinic', 3), page);
  storage.setArrivalPatterns(page, [new ArrivalPattern('ap-keep', 'Evening').toJSON() as any]);
  storage.setStates(page, [{ id: 's-keep', name: 'Idle' } as any]);
  storage.setEntities(page, [{ id: 'e-keep', name: 'Visitor' } as any]);
  manager.invalidateModelCache();
});

afterEach(() => {
  documentPagesForTests.length = 0;
});

async function expectUndone(before: Record<string, string | undefined>) {
  // Nothing drawn is left on the page; the note is untouched.
  expect(Array.from(currentPage.allBlocks.keys())).toEqual(['note-1']);
  expect(currentPage.allLines.size).toBe(0);
  for (const item of [...drawnBlocks, ...drawnLines]) expect(item.delete).toHaveBeenCalledTimes(1);

  // Every page model key -- run settings, q_* lists incl. arrival patterns,
  // resources, states, entities -- is exactly the snapshot.
  expect(readKeys(currentPage)).toEqual(before);

  // No resource record left behind or duplicated (the build's r1 included).
  expect(storage.getResources(currentPage)).toEqual([]);

  // The in-memory registry no longer holds anything drawn ...
  for (const item of [...drawnBlocks, ...drawnLines]) {
    expect(manager.getElementById(item.id)).toBeUndefined();
  }
  for (const type of [SimulationObjectType.Activity, SimulationObjectType.Generator, SimulationObjectType.Connector]) {
    expect(manager.getElementsByType(type)).toEqual([]);
  }
  // ... and the rebuild it does next (diffing against the undone model) finds
  // the empty model the page started with, leaving storage alone.
  const definition = (await manager.getModelDefinition())!;
  expect(definition.activities.getAll()).toEqual([]);
  expect(definition.generators.getAll()).toEqual([]);
  expect(definition.connectors.getAll()).toEqual([]);
  expect(definition.resources.getAll()).toEqual([]);
  expect(definition.arrivalPatterns.getAll().map((p) => p.id)).toEqual(['ap-keep']);
  expect(readKeys(currentPage)).toEqual(before);
}

describe('an in-place draw that fails late, undone through the real ModelManager', () => {
  it('the last line fails: every line and block is removed and the page model is the snapshot', async () => {
    const before = readKeys(currentPage);
    failAddLineOnCall = 2;

    const handled = await (ShapeOpsHandler as any).handleModelCreatePage(
      msg({ document: buildDocument(), basedOnPageId: 'page-1', requireInPlace: true }),
    );

    expect(handled).toBe(false);
    // It did draw in place, and got as far as everything but the last line.
    expect(drawnBlocks).toHaveLength(4);
    expect(drawnLines).toHaveLength(1);
    const data = reply();
    expect(data.success).toBe(false);
    expect(data.errorMessage).toEqual(expect.stringContaining('c2'));

    await expectUndone(before);
  });

  it('the resource block (the last block) fails: the drawn generator and activities are removed, the page model is the snapshot', async () => {
    const before = readKeys(currentPage);
    failAddBlockOnCall = 4;

    const handled = await (ShapeOpsHandler as any).handleModelCreatePage(
      msg({ document: buildDocument(), basedOnPageId: 'page-1', requireInPlace: true }),
    );

    expect(handled).toBe(false);
    expect(drawnBlocks).toHaveLength(3);
    expect(drawnLines).toHaveLength(0);
    expect(reply().errorMessage).toEqual(expect.stringContaining('r1'));

    await expectUndone(before);
  });

  // The drawn generator uses the page's OWN pattern. Its removal must happen
  // through removeElement before the restore: left to the next rebuild's
  // deleted-generator diff, the orphan cleanup would run AFTER the restore and
  // delete ap-keep from the restored page.
  it("a drawn generator on the page's own pattern: the pattern survives the undo", async () => {
    const before = readKeys(currentPage);
    const document: any = buildDocument();
    delete document.arrivalPatterns;
    document.generators[0].arrivalPatternId = 'ap-keep';
    failAddLineOnCall = 2;

    const handled = await (ShapeOpsHandler as any).handleModelCreatePage(
      msg({ document, basedOnPageId: 'page-1', requireInPlace: true }),
    );

    expect(handled).toBe(false);
    expect(drawnBlocks).toHaveLength(4);
    await expectUndone(before);
    expect(storage.getArrivalPatterns(currentPage).map((p: any) => p.id)).toEqual(['ap-keep']);
  });

  it('control: the same draw without a failure leaves the drawn model registered', async () => {
    await (ShapeOpsHandler as any).handleModelCreatePage(
      msg({ document: buildDocument(), basedOnPageId: 'page-1', requireInPlace: true }),
    );
    expect(reply()).toMatchObject({ success: true, pageId: 'page-1' });
    const definition = (await manager.getModelDefinition())!;
    expect(definition.generators.getAll()).toHaveLength(1);
    expect(definition.activities.getAll()).toHaveLength(2);
    expect(definition.connectors.getAll()).toHaveLength(2);
    expect(definition.generators.getAll()[0].arrivalPatternId).toBe('ap1');
    expect(storage.getArrivalPatterns(currentPage).map((p: any) => p.id).sort()).toEqual(['ap-keep', 'ap1']);
  });
});
