// editorextensions/quodsi_editor_extension/tests/messaging/shapeOpsHandler.drawInPlace.test.ts
//
// Advisor tasks in Lucid (spec 2026-10-25), Task 5: MODEL_CREATE_PAGE draws a
// build on the modal's own page when that page is current and its model is
// empty (no activities, generators or resources); with `requireInPlace` it
// refuses any other case (another page showing -> OTHER_PAGE_LINE, a model
// already there -> NOT_EMPTY_LINE); without it, it keeps today's new page.
// A draw that fails part-way leaves the page exactly as it was.
//
// Mocking style mirrors shapeOpsHandler.createPage.test.ts; the page-level
// writes go through a REAL StorageAdapter on a fake page's shapeData, so the
// merge and the rollback are read back from storage, not from call args.
import { Viewport, DocumentProxy, documentPagesForTests } from '../__mocks__/lucid-extension-sdk';

let currentPage: any = null;
(Viewport.prototype as any).getCurrentPage = function (): any {
  return currentPage;
};
(Viewport.prototype as any).getSelectedItems = function (): any {
  return [];
};
const setCurrentPageSpy = jest.fn();
(Viewport.prototype as any).setCurrentPage = function (page: any): void {
  setCurrentPageSpy(page);
};

let addPageMock: jest.Mock;
(DocumentProxy.prototype as any).addPage = function (def: any): any {
  return addPageMock(def);
};

const sendMock = jest.fn();
jest.mock('../../src/core/messaging/index', () => ({
  router: { send: sendMock },
}));

let modelManagerStub: any;
let clientStub: any;
jest.mock('../../src/core/ModelManager', () => ({
  ModelManager: {
    getInstance: () => modelManagerStub,
    getClient: () => clientStub,
  },
}));

jest.mock('../../src/core/messaging/handlers/selection/SelectionHandler', () => ({
  SelectionHandler: { handleLucidSelectionEvent: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../../src/services/LucidElementFactory', () => ({
  LucidElementFactory: jest.fn().mockImplementation(() => ({
    createPlatformObject: (element: any, type: unknown) => ({
      getSimulationObject: () => ({ id: 'placeholder', type, name: `Placeholder ${element.id}` }),
    }),
  })),
}));

import { EnvelopeMessageType, OTHER_PAGE_LINE, NOT_EMPTY_LINE, SimulationObjectType } from '@quodsi/lucid-shared';
import { ShapeOpsHandler } from '../../src/core/messaging/handlers/shapeOpsHandler';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { makeFakeBlock, makeFakePage } from '../helpers/fakeProxies';

/** The page keys a draw may touch (and a rollback must restore). */
const PAGE_KEYS = ['q_data', 'q_resources', 'q_res_requirements', 'q_states', 'q_entities'];

function msg(data: unknown): any {
  return { id: 'req-build', type: EnvelopeMessageType.MODEL_CREATE_PAGE, source: 'studio-embed-iframe', target: 'host', version: '1.0', data };
}

function reply(): any {
  const calls = sendMock.mock.calls.filter((c) => c[1]?.type === EnvelopeMessageType.MODEL_CREATE_PAGE_RESULT);
  expect(calls).toHaveLength(1);
  return calls[0][1].data;
}

function buildDocument() {
  return {
    name: 'Clinic',
    replications: 5,
    runTime: 480,
    resources: [{ id: 'r1', name: 'Nurse', capacity: 2, x: 400, y: 200 }],
    resourceRequirements: [{ id: 'rr1', resourceId: 'r1' }],
    states: [{ id: 's1', name: 'Busy' }],
    entities: [{ id: 'e1', name: 'Patient' }],
    generators: [{ id: 'g1', name: 'Arrivals', x: 0, y: 0 }],
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

let storage: StorageAdapter;
let otherPage: any;
let note: any;
let drawn: { blocks: any[]; lines: any[] };
let order: string[];
let failAddBlockOnCall: number | null;
let failAddLineOnCall: number | null;
let modelCounts: { activities: number; generators: number; resources: number } | null;

function readKeys(page: any): Record<string, string | undefined> {
  return Object.fromEntries(PAGE_KEYS.map((k) => [k, page.shapeData.get(k)]));
}

beforeEach(() => {
  sendMock.mockClear();
  setCurrentPageSpy.mockClear();
  order = [];
  drawn = { blocks: [], lines: [] };
  failAddBlockOnCall = null;
  failAddLineOnCall = null;
  modelCounts = { activities: 0, generators: 0, resources: 0 };
  storage = new StorageAdapter();

  currentPage = makeFakePage('page-1');
  currentPage.getTitle = () => 'Clinic floor';
  currentPage.setTitle = jest.fn();
  // An existing, non-model shape: a note in the top-left of the page.
  note = makeFakeBlock('note-1', { box: { x: 0, y: 0, w: 400, h: 300 } });
  currentPage.allBlocks.set(note.id, note);
  currentPage.addBlock = jest.fn((def: any) => {
    const n = drawn.blocks.length + 1;
    if (failAddBlockOnCall === n) throw new Error('Lucid rejected the block');
    const block = makeFakeBlock(`blk-${n}`, { box: def.boundingBox });
    block.delete = jest.fn(() => order.push(`delete:${block.id}`));
    currentPage.allBlocks.set(block.id, block);
    drawn.blocks.push(block);
    return block;
  });
  currentPage.addLine = jest.fn(() => {
    const n = drawn.lines.length + 1;
    if (failAddLineOnCall === n) throw new Error('Lucid rejected the line');
    const line: any = { id: `ln-${n}`, delete: jest.fn(() => order.push(`delete:ln-${n}`)) };
    currentPage.allLines.set(line.id, line);
    drawn.lines.push(line);
    return line;
  });

  // The page's model as it stands: run settings, one resource the build keeps
  // and one it replaces, one state.
  currentPage.shapeData.set('q_data', JSON.stringify({ id: 'page-1', type: SimulationObjectType.Model, name: 'My clinic', replications: 3, seed: 7 }));
  storage.setResources(currentPage, [
    { id: 'r-keep', name: 'Porter', capacity: 1 } as any,
    { id: 'r1', name: 'Old nurse', capacity: 1 } as any,
  ]);
  storage.setStates(currentPage, [{ id: 's-keep', name: 'Idle' } as any]);

  otherPage = makeFakePage('page-9');
  otherPage.getTitle = () => 'Waiting room';
  documentPagesForTests.length = 0;
  documentPagesForTests.push(currentPage, otherPage);

  addPageMock = jest.fn(() => {
    const page = makeFakePage('page-new');
    page.addBlock = jest.fn((def: any) => {
      const block = makeFakeBlock(`new-${page.allBlocks.size + 1}`, { box: def.boundingBox });
      page.allBlocks.set(block.id, block);
      return block;
    });
    page.addLine = jest.fn(() => ({ id: `new-ln-${Math.random()}` }));
    return page;
  });

  clientStub = { loadBlockClasses: jest.fn(async () => undefined) };

  jest.spyOn(storage, 'updateElementData').mockImplementation(() => undefined);

  modelManagerStub = {
    getCurrentPageId: jest.fn(() => 'page-1'),
    setCurrentPage: jest.fn(),
    getModelDefinition: jest.fn(async () => {
      if (!modelCounts) return null;
      const list = (n: number) => ({ getAll: () => Array.from({ length: n }, (_, i) => ({ id: `x${i}` })) });
      return { activities: list(modelCounts.activities), generators: list(modelCounts.generators), resources: list(modelCounts.resources) };
    }),
    // Page-level writes land in the page's shapeData the way the real ones do.
    saveElementData: jest.fn(async (page: any, data: any) => {
      const prev = JSON.parse(page.shapeData.get('q_data') ?? '{}');
      page.shapeData.set('q_data', JSON.stringify({ ...prev, ...data }));
    }),
    updateModelRoot: jest.fn(async (patch: any, page: any) => {
      if (patch.resources) storage.setResources(page, patch.resources);
      if (patch.resourceRequirements) storage.setResourceRequirements(page, patch.resourceRequirements);
    }),
    updateStates: jest.fn(async (states: any, page: any) => storage.setStates(page, states)),
    updateEntities: jest.fn(async (entities: any, page: any) => storage.setEntities(page, entities)),
    registerElement: jest.fn(async () => undefined),
    setElementData: jest.fn(),
    removeElement: jest.fn(async (id: string) => order.push(`removeElement:${id}`)),
    invalidateModelCache: jest.fn(),
    validateModel: jest.fn(async () => undefined),
    getStorageAdapter: () => storage,
  };
});

afterEach(() => {
  jest.restoreAllMocks();
  documentPagesForTests.length = 0;
});

describe('MODEL_CREATE_PAGE on its own empty page', () => {
  it('draws on that page: no new page, run settings and lists merged, the page and model keep their names', async () => {
    const handled = await (ShapeOpsHandler as any).handleModelCreatePage(
      msg({ document: buildDocument(), basedOnPageId: 'page-1', requireInPlace: true }),
    );

    expect(handled).toBe(true);
    expect(addPageMock).not.toHaveBeenCalled();
    expect(setCurrentPageSpy).not.toHaveBeenCalled();
    expect(currentPage.setTitle).not.toHaveBeenCalled();
    expect(currentPage.addBlock).toHaveBeenCalledTimes(4);
    expect(currentPage.addLine).toHaveBeenCalledTimes(2);

    // Run settings merged over the page's: the build's win, the page's others stay,
    // and the model keeps its name.
    const model = JSON.parse(currentPage.shapeData.get('q_data'));
    expect(model).toMatchObject({ id: 'page-1', name: 'My clinic', replications: 5, seed: 7, runTime: 480 });

    // Lists merged by id: the build's r1 replaces the page's, r-keep stays; no geometry.
    expect(storage.getResources(currentPage)).toEqual([
      { id: 'r1', name: 'Nurse', capacity: 2 },
      { id: 'r-keep', name: 'Porter', capacity: 1 },
    ]);
    expect(storage.getStates(currentPage)).toEqual([{ id: 's1', name: 'Busy' }, { id: 's-keep', name: 'Idle' }]);
    expect(storage.getEntities(currentPage)).toEqual([{ id: 'e1', name: 'Patient' }]);

    // The resource block is a pointer at the record.
    expect(modelManagerStub.setElementData).toHaveBeenCalledWith(
      drawn.blocks[3], { id: 'blk-4', resourceId: 'r1' }, SimulationObjectType.Resource,
    );
    expect(clientStub.loadBlockClasses).toHaveBeenCalledWith(['ProcessBlock']);
    expect(modelManagerStub.validateModel).toHaveBeenCalled();

    expect(reply()).toEqual({
      success: true,
      pageId: 'page-1',
      idMap: { g1: 'blk-1', a1: 'blk-2', a2: 'blk-3', r1: 'blk-4', c1: 'ln-1', c2: 'ln-2' },
    });
  });

  it('places the drawn blocks clear of the shapes already on the page, keeping their layout', async () => {
    await (ShapeOpsHandler as any).handleModelCreatePage(
      msg({ document: buildDocument(), basedOnPageId: 'page-1', requireInPlace: true }),
    );

    const noteBox = note.getBoundingBox();
    const boxes = drawn.blocks.map((b) => b.getBoundingBox());
    for (const box of boxes) {
      const overlaps = box.x < noteBox.x + noteBox.w && box.x + box.w > noteBox.x
        && box.y < noteBox.y + noteBox.h && box.y + box.h > noteBox.y;
      expect(overlaps).toBe(false);
    }
    // The document's own layout survives as offsets (g1 -> a1 is 200 apart),
    // scaled by LAYOUT_SCALE (1.5) for Lucid's label text.
    expect(boxes[1].x - boxes[0].x).toBe(300);
    expect(boxes[3].y - boxes[0].y).toBe(300);
  });

  it('draws in place without requireInPlace too, when the current page is its own and empty', async () => {
    await (ShapeOpsHandler as any).handleModelCreatePage(msg({ document: buildDocument(), basedOnPageId: 'page-1' }));
    expect(addPageMock).not.toHaveBeenCalled();
    expect(reply()).toMatchObject({ success: true, pageId: 'page-1' });
  });
});

describe('a draw that fails part-way', () => {
  it('the third block fails: every block drawn is removed and the page data is as before', async () => {
    const before = readKeys(currentPage);
    failAddBlockOnCall = 3;

    const handled = await (ShapeOpsHandler as any).handleModelCreatePage(
      msg({ document: buildDocument(), basedOnPageId: 'page-1', requireInPlace: true }),
    );

    expect(handled).toBe(false);
    expect(drawn.blocks).toHaveLength(2);
    for (const block of drawn.blocks) expect(block.delete).toHaveBeenCalled();
    // removeElement before each delete.
    expect(order).toEqual(['removeElement:blk-2', 'delete:blk-2', 'removeElement:blk-1', 'delete:blk-1']);
    expect(readKeys(currentPage)).toEqual(before);
    expect(addPageMock).not.toHaveBeenCalled();
    // Revalidated once, on the restored page, so no partial-draw validation lingers.
    expect(modelManagerStub.validateModel).toHaveBeenCalledTimes(1);
    expect(modelManagerStub.invalidateModelCache.mock.invocationCallOrder[0])
      .toBeLessThan(modelManagerStub.validateModel.mock.invocationCallOrder[0]);
    const data = reply();
    expect(data.success).toBe(false);
    expect(data.errorMessage).toEqual(expect.stringContaining('a2'));
  });

  it('a line fails: the lines go first, then the blocks, and the page data is as before', async () => {
    const before = readKeys(currentPage);
    failAddLineOnCall = 2;

    await (ShapeOpsHandler as any).handleModelCreatePage(
      msg({ document: buildDocument(), basedOnPageId: 'page-1', requireInPlace: true }),
    );

    expect(order[0]).toBe('removeElement:ln-1');
    expect(order[1]).toBe('delete:ln-1');
    expect(order.filter((o) => o.startsWith('delete:'))).toHaveLength(5);
    expect(readKeys(currentPage)).toEqual(before);
    expect(reply().success).toBe(false);
  });

  it('a merge write fails (states): the run settings and lists come back as they were, nothing drawn', async () => {
    const before = readKeys(currentPage);
    modelManagerStub.updateStates.mockImplementationOnce(async (states: any, page: any) => {
      storage.setStates(page, states);
      throw new Error('states write failed');
    });

    const handled = await (ShapeOpsHandler as any).handleModelCreatePage(
      msg({ document: buildDocument(), basedOnPageId: 'page-1', requireInPlace: true }),
    );

    expect(handled).toBe(false);
    // The run settings and resources had already been written before the states failed.
    expect(modelManagerStub.saveElementData).toHaveBeenCalled();
    expect(modelManagerStub.updateModelRoot).toHaveBeenCalled();
    expect(readKeys(currentPage)).toEqual(before);
    expect(JSON.parse(currentPage.shapeData.get('q_data'))).toEqual(JSON.parse(before.q_data!));
    expect(currentPage.addBlock).not.toHaveBeenCalled();
    expect(currentPage.addLine).not.toHaveBeenCalled();
    expect(Array.from(currentPage.allBlocks.keys())).toEqual(['note-1']);
    const data = reply();
    expect(data.success).toBe(false);
    expect(data.errorMessage).toEqual(expect.stringContaining('states'));
  });
});

describe('MODEL_CREATE_PAGE that cannot draw on its own page', () => {
  it('requireInPlace with another page showing: refuses naming the page, draws nothing', async () => {
    await (ShapeOpsHandler as any).handleModelCreatePage(
      msg({ document: buildDocument(), basedOnPageId: 'page-9', requireInPlace: true }),
    );
    expect(reply()).toEqual({ success: false, errorMessage: OTHER_PAGE_LINE('Waiting room') });
    expect(currentPage.addBlock).not.toHaveBeenCalled();
    expect(addPageMock).not.toHaveBeenCalled();
    expect(modelManagerStub.saveElementData).not.toHaveBeenCalled();
  });

  it('requireInPlace on a page whose model is not empty: refuses with NOT_EMPTY_LINE, draws nothing', async () => {
    modelCounts = { activities: 1, generators: 0, resources: 0 };
    await (ShapeOpsHandler as any).handleModelCreatePage(
      msg({ document: buildDocument(), basedOnPageId: 'page-1', requireInPlace: true }),
    );
    expect(reply()).toEqual({ success: false, errorMessage: NOT_EMPTY_LINE });
    expect(currentPage.addBlock).not.toHaveBeenCalled();
    expect(addPageMock).not.toHaveBeenCalled();
    expect(modelManagerStub.saveElementData).not.toHaveBeenCalled();
  });

  // Ruling R7: in place only on a page that already is a Quodsi model.
  it('requireInPlace on a page with no Quodsi model: refuses with NOT_EMPTY_LINE, draws nothing', async () => {
    modelCounts = null;
    await (ShapeOpsHandler as any).handleModelCreatePage(
      msg({ document: buildDocument(), basedOnPageId: 'page-1', requireInPlace: true }),
    );
    expect(reply()).toEqual({ success: false, errorMessage: NOT_EMPTY_LINE });
    expect(currentPage.addBlock).not.toHaveBeenCalled();
    expect(addPageMock).not.toHaveBeenCalled();
    expect(modelManagerStub.saveElementData).not.toHaveBeenCalled();
  });

  it('without requireInPlace, a page with no Quodsi model gets a new page, nothing drawn on it', async () => {
    modelCounts = null;
    const before = readKeys(currentPage);
    await (ShapeOpsHandler as any).handleModelCreatePage(msg({ document: buildDocument(), basedOnPageId: 'page-1' }));
    expect(addPageMock).toHaveBeenCalledWith({ title: 'Clinic' });
    expect(currentPage.addBlock).not.toHaveBeenCalled();
    expect(currentPage.addLine).not.toHaveBeenCalled();
    expect(readKeys(currentPage)).toEqual(before);
    expect(reply()).toMatchObject({ success: true, pageId: 'page-new' });
  });

  it('a page with only a resource is not empty', async () => {
    modelCounts = { activities: 0, generators: 0, resources: 1 };
    await (ShapeOpsHandler as any).handleModelCreatePage(
      msg({ document: buildDocument(), basedOnPageId: 'page-1', requireInPlace: true }),
    );
    expect(reply()).toEqual({ success: false, errorMessage: NOT_EMPTY_LINE });
  });

  it('without requireInPlace, a page that is not empty gets a new page (today)', async () => {
    modelCounts = { activities: 2, generators: 1, resources: 0 };
    await (ShapeOpsHandler as any).handleModelCreatePage(msg({ document: buildDocument(), basedOnPageId: 'page-1' }));
    expect(addPageMock).toHaveBeenCalledWith({ title: 'Clinic' });
    expect(currentPage.addBlock).not.toHaveBeenCalled();
  });

  it('without requireInPlace, another page showing gets a new page (today)', async () => {
    await (ShapeOpsHandler as any).handleModelCreatePage(msg({ document: buildDocument(), basedOnPageId: 'page-9' }));
    expect(addPageMock).toHaveBeenCalledWith({ title: 'Clinic' });
    expect(currentPage.addBlock).not.toHaveBeenCalled();
  });
});
