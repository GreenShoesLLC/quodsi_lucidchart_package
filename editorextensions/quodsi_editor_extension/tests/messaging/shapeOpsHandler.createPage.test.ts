// editorextensions/quodsi_editor_extension/tests/messaging/shapeOpsHandler.createPage.test.ts
//
// Advisor drawing half, Task 5: ShapeOpsHandler.MODEL_CREATE_PAGE builds a
// whole new page from an Advisor-authored document -- positions and all --
// in one shot: create the page, switch to it, write the page-level model
// (run settings, model root, states, entities), create every block
// (generators, activities, resources) then every line (connectors,
// endpoints resolved through the resulting id map), validate, and reply
// with the page id and the id map. Any failure after the page was created
// rolls the page back: restore the original page on both the viewport and
// ModelManager, then delete the new page.
//
// Mocking style mirrors shapeOpsHandler.test.ts: mock the SDK's Viewport and
// DocumentProxy (via the shared __mocks__ file, monkey-patched here the same
// way that file patches Viewport.prototype), core/messaging's router,
// core/ModelManager, the selection handler, and LucidElementFactory.
import { Viewport, DocumentProxy } from '../__mocks__/lucid-extension-sdk';

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

const handleLucidSelectionEventMock = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/core/messaging/handlers/selection/SelectionHandler', () => ({
  SelectionHandler: {
    handleLucidSelectionEvent: (...args: unknown[]) => handleLucidSelectionEventMock(...args),
  },
}));

const createPlatformObjectMock = jest.fn();
jest.mock('../../src/services/LucidElementFactory', () => ({
  LucidElementFactory: jest.fn().mockImplementation(() => ({
    createPlatformObject: createPlatformObjectMock,
  })),
}));

import { EnvelopeMessageType, SimulationObjectType } from '@quodsi/lucid-shared';
import { ShapeOpsHandler } from '../../src/core/messaging/handlers/shapeOpsHandler';

function msg(data: unknown, source = 'studio-embed-iframe', id = 'req-create-page'): any {
  return { id, type: EnvelopeMessageType.MODEL_CREATE_PAGE, source, target: 'host', version: '1.0', data };
}

function resultCalls() {
  return sendMock.mock.calls.filter((c) => c[1]?.type === EnvelopeMessageType.MODEL_CREATE_PAGE_RESULT);
}

let newPage: any;
let newPageBlocks: Map<string, any>;
let newPageLines: Map<string, any>;
let addBlockMock: jest.Mock;
let addLineMock: jest.Mock;
let deletePageMock: jest.Mock;
let blockCounter: number;
let lineCounter: number;
let storageAdapterStub: any;
let callOrder: string[];
let failAddBlockOnCall: number | null;

function buildDocument() {
  return {
    name: 'Clinic',
    description: 'A clinic model',
    replications: 5,
    seed: 42,
    timeUnit: 'MINUTES',
    timeMode: 'CLOCK_TIME',
    runTime: 480,
    warmupTime: 30,
    startDateTime: '2026-01-01T08:00:00Z',
    resources: [{ id: 'r1', name: 'Nurse', capacity: 2, x: 700, y: 100 }],
    resourceRequirements: [{ id: 'rr1', resourceId: 'r1' }],
    arrivalPatterns: [{ id: 'ap1' }],
    arrivalSchedules: [{ id: 'as1' }],
    workSchedules: [{ id: 'ws1' }],
    states: [{ id: 's1', name: 'Busy' }],
    entities: [{ id: 'e1', name: 'Patient' }],
    generators: [{ id: 'g1', name: 'Arrivals', x: 100, y: 100 }],
    activities: [
      { id: 'a1', name: 'Triage', x: 300, y: 100 },
      { id: 'a2', name: 'Exam', x: 500, y: 100 },
    ],
    connectors: [
      { id: 'c1', sourceId: 'g1', targetId: 'a1', probability: 1 },
      { id: 'c2', sourceId: 'a1', targetId: 'a2', probability: 1 },
    ],
  };
}

beforeEach(() => {
  sendMock.mockClear();
  setCurrentPageSpy.mockClear();
  handleLucidSelectionEventMock.mockClear();
  createPlatformObjectMock.mockReset();
  callOrder = [];
  blockCounter = 0;
  lineCounter = 0;
  failAddBlockOnCall = null;

  currentPage = { id: 'page-1', allBlocks: new Map(), allLines: new Map() };

  clientStub = {
    loadBlockClasses: jest.fn(async () => {
      callOrder.push('loadBlockClasses');
    }),
  };

  newPageBlocks = new Map<string, any>();
  newPageLines = new Map<string, any>();

  addBlockMock = jest.fn((def: any) => {
    blockCounter += 1;
    callOrder.push(`addBlock:${def.boundingBox.x},${def.boundingBox.y}`);
    if (failAddBlockOnCall !== null && blockCounter === failAddBlockOnCall) {
      throw new Error('Lucid rejected the block');
    }
    const block = {
      id: `blk-${blockCounter}`,
      textAreas: new Map<string, string>(),
      getBoundingBox: () => def.boundingBox,
      setBoundingBox: jest.fn(),
      delete: jest.fn(),
    };
    newPageBlocks.set(block.id, block);
    return block;
  });

  addLineMock = jest.fn((def: any) => {
    lineCounter += 1;
    callOrder.push('addLine');
    const line = { id: `ln-${lineCounter}`, delete: jest.fn() };
    newPageLines.set(line.id, line);
    return line;
  });

  deletePageMock = jest.fn(() => {
    callOrder.push('page.delete');
  });

  newPage = {
    id: 'page-2',
    allBlocks: newPageBlocks,
    allLines: newPageLines,
    addBlock: addBlockMock,
    addLine: addLineMock,
    delete: deletePageMock,
  };

  addPageMock = jest.fn((def: any) => {
    callOrder.push('addPage');
    return newPage;
  });

  storageAdapterStub = {
    updateElementData: jest.fn((element: any) => {
      callOrder.push(`updateElementData:${element.id}`);
    }),
  };

  modelManagerStub = {
    setCurrentPage: jest.fn((page: any) => {
      callOrder.push(`modelManager.setCurrentPage:${page.id}`);
    }),
    saveElementData: jest.fn(async () => {
      callOrder.push('saveElementData');
    }),
    updateModelRoot: jest.fn(async () => {
      callOrder.push('updateModelRoot');
    }),
    updateStates: jest.fn(async () => {
      callOrder.push('updateStates');
    }),
    updateEntities: jest.fn(async () => {
      callOrder.push('updateEntities');
    }),
    registerElement: jest.fn(async (record: any) => {
      callOrder.push(`registerElement:${record.id}`);
    }),
    // Fix round 1 (task review, CRITICAL): the resource pointer write --
    // ModelManager's own public setElementData, NOT registerElement/storage
    // updateElementData -- see createResourceBlockRecord's doc comment.
    setElementData: jest.fn((element: any) => {
      callOrder.push(`setElementData:${element.id}`);
    }),
    validateModel: jest.fn(async () => {
      callOrder.push('validateModel');
    }),
    getModelDefinition: jest.fn().mockResolvedValue(null),
    getStorageAdapter: jest.fn(() => storageAdapterStub),
  };

  createPlatformObjectMock.mockImplementation((element: any, type: SimulationObjectType) => ({
    getSimulationObject: () => ({
      id: 'placeholder',
      type,
      name: `Placeholder ${element.id}`,
    }),
  }));
});

describe('MODEL_CREATE_PAGE', () => {
  it('creates a page, writes page-level model data, creates blocks and lines, and replies with the id map', async () => {
    const document = buildDocument();

    const handled = await (ShapeOpsHandler as any).handleModelCreatePage(msg({ document }));

    expect(handled).toBe(true);

    // Page creation and switch.
    expect(addPageMock).toHaveBeenCalledWith({ title: 'Clinic' });
    expect(setCurrentPageSpy).toHaveBeenCalledWith(newPage);
    expect(modelManagerStub.setCurrentPage).toHaveBeenCalledWith(newPage);

    // Page-level Model write -- the same call handleElementUpdate makes for
    // type Model -- carries only the run-settings keys, plus id.
    expect(modelManagerStub.saveElementData).toHaveBeenCalledWith(
      newPage,
      {
        name: 'Clinic',
        description: 'A clinic model',
        replications: 5,
        seed: 42,
        timeUnit: 'MINUTES',
        timeMode: 'CLOCK_TIME',
        runTime: 480,
        warmupTime: 30,
        startDateTime: '2026-01-01T08:00:00Z',
        id: 'page-2',
      },
      SimulationObjectType.Model,
      newPage
    );

    // Model root patch -- only the recognised keys. Fix round 1 (task
    // review, MINOR 1): resources are geometry-stripped before the write --
    // q_resources is a model-level list with no x/y, unlike the block list
    // used to place the resource's block below.
    expect(modelManagerStub.updateModelRoot).toHaveBeenCalledWith(
      {
        resources: [{ id: 'r1', name: 'Nurse', capacity: 2 }],
        resourceRequirements: document.resourceRequirements,
        arrivalPatterns: document.arrivalPatterns,
        arrivalSchedules: document.arrivalSchedules,
        workSchedules: document.workSchedules,
      },
      newPage
    );

    expect(modelManagerStub.updateStates).toHaveBeenCalledWith(document.states, newPage);
    expect(modelManagerStub.updateEntities).toHaveBeenCalledWith(document.entities, newPage);

    // Block classes loaded exactly once for the whole page, not per block.
    expect(clientStub.loadBlockClasses).toHaveBeenCalledTimes(1);
    expect(clientStub.loadBlockClasses).toHaveBeenCalledWith(['ProcessBlock']);

    // 4 blocks: generator, 2 activities, 1 resource -- in that order, each an
    // 80x80 box at the record's own x/y.
    expect(addBlockMock).toHaveBeenNthCalledWith(1, { className: 'ProcessBlock', boundingBox: { x: 100, y: 100, w: 80, h: 80 } });
    expect(addBlockMock).toHaveBeenNthCalledWith(2, { className: 'ProcessBlock', boundingBox: { x: 300, y: 100, w: 80, h: 80 } });
    expect(addBlockMock).toHaveBeenNthCalledWith(3, { className: 'ProcessBlock', boundingBox: { x: 500, y: 100, w: 80, h: 80 } });
    expect(addBlockMock).toHaveBeenNthCalledWith(4, { className: 'ProcessBlock', boundingBox: { x: 700, y: 100, w: 80, h: 80 } });

    expect(newPageBlocks.get('blk-1').textAreas.get('Text')).toBe('Arrivals');
    expect(newPageBlocks.get('blk-2').textAreas.get('Text')).toBe('Triage');
    expect(newPageBlocks.get('blk-3').textAreas.get('Text')).toBe('Exam');
    expect(newPageBlocks.get('blk-4').textAreas.get('Text')).toBe('Nurse');

    // 2 lines, endpoints resolved through the id map (g1->blk-1, a1->blk-2,
    // a2->blk-3).
    expect(addLineMock).toHaveBeenNthCalledWith(1, {
      endpoint1: { connection: newPageBlocks.get('blk-1'), linkX: 1, linkY: 0.5 },
      endpoint2: { connection: newPageBlocks.get('blk-2'), linkX: 0, linkY: 0.5 },
    });
    expect(addLineMock).toHaveBeenNthCalledWith(2, {
      endpoint1: { connection: newPageBlocks.get('blk-2'), linkX: 1, linkY: 0.5 },
      endpoint2: { connection: newPageBlocks.get('blk-3'), linkX: 0, linkY: 0.5 },
    });

    // registerElement for every record, with id = the Lucid id.
    expect(modelManagerStub.registerElement).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'blk-1', name: 'Arrivals' }),
      newPageBlocks.get('blk-1')
    );
    expect(modelManagerStub.registerElement).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'blk-2', name: 'Triage' }),
      newPageBlocks.get('blk-2')
    );
    expect(modelManagerStub.registerElement).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'blk-3', name: 'Exam' }),
      newPageBlocks.get('blk-3')
    );
    // Fix round 1 (task review, CRITICAL): the resource block is NEVER
    // created via createPlatformObject/registerElement -- that path
    // (ResourceLucid.createFromConversion) mints a second, orphaned
    // q_resources record because the block's own id never matches the
    // Advisor's resource id. Instead it gets a direct pointer write.
    expect(createPlatformObjectMock).not.toHaveBeenCalledWith(
      expect.anything(),
      SimulationObjectType.Resource,
      expect.anything()
    );
    expect(modelManagerStub.registerElement).not.toHaveBeenCalledWith(
      expect.anything(),
      newPageBlocks.get('blk-4')
    );
    expect(modelManagerStub.setElementData).toHaveBeenCalledWith(
      newPageBlocks.get('blk-4'),
      { id: 'blk-4', resourceId: 'r1' },
      SimulationObjectType.Resource
    );
    expect(modelManagerStub.registerElement).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ln-1', sourceId: 'blk-1', targetId: 'blk-2' }),
      newPageLines.get('ln-1')
    );
    expect(modelManagerStub.registerElement).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ln-2', sourceId: 'blk-2', targetId: 'blk-3' }),
      newPageLines.get('ln-2')
    );

    // Storage write-back (C1 pattern) for generators/activities/connectors --
    // but NOT for the resource block, whose q_data is only a pointer at the
    // q_resources record already written by updateModelRoot above; merging a
    // domain record onto it would corrupt the pointer (ResourceLucid's
    // storage-format-2 contract).
    expect(storageAdapterStub.updateElementData).toHaveBeenCalledWith(newPageBlocks.get('blk-1'), expect.objectContaining({ id: 'blk-1' }));
    expect(storageAdapterStub.updateElementData).toHaveBeenCalledWith(newPageBlocks.get('blk-2'), expect.objectContaining({ id: 'blk-2' }));
    expect(storageAdapterStub.updateElementData).toHaveBeenCalledWith(newPageBlocks.get('blk-3'), expect.objectContaining({ id: 'blk-3' }));
    expect(storageAdapterStub.updateElementData).toHaveBeenCalledWith(newPageLines.get('ln-1'), expect.objectContaining({ id: 'ln-1' }));
    expect(storageAdapterStub.updateElementData).toHaveBeenCalledWith(newPageLines.get('ln-2'), expect.objectContaining({ id: 'ln-2' }));
    expect(storageAdapterStub.updateElementData).not.toHaveBeenCalledWith(newPageBlocks.get('blk-4'), expect.anything());

    expect(modelManagerStub.validateModel).toHaveBeenCalled();

    const calls = resultCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe('studio-embed');
    expect(calls[0][1]).toMatchObject({
      target: 'studio-embed-iframe',
      data: {
        success: true,
        pageId: 'page-2',
        idMap: {
          g1: 'blk-1',
          a1: 'blk-2',
          a2: 'blk-3',
          r1: 'blk-4',
          c1: 'ln-1',
          c2: 'ln-2',
        },
      },
    });

    expect(handleLucidSelectionEventMock).toHaveBeenCalled();

    // Order: page created & switched, page-level writes, block classes
    // loaded once, blocks created+registered+stored, lines
    // created+registered+stored, then validated.
    expect(callOrder).toEqual([
      'addPage',
      'modelManager.setCurrentPage:page-2',
      'saveElementData',
      'updateModelRoot',
      'updateStates',
      'updateEntities',
      'loadBlockClasses',
      'addBlock:100,100',
      'registerElement:blk-1',
      'updateElementData:blk-1',
      'addBlock:300,100',
      'registerElement:blk-2',
      'updateElementData:blk-2',
      'addBlock:500,100',
      'registerElement:blk-3',
      'updateElementData:blk-3',
      'addBlock:700,100',
      'setElementData:blk-4',
      'addLine',
      'registerElement:ln-1',
      'updateElementData:ln-1',
      'addLine',
      'registerElement:ln-2',
      'updateElementData:ln-2',
      'validateModel',
    ]);
  });

  it('rolls the page back and fails naming the record when a block create throws partway through', async () => {
    const document = buildDocument();
    // 3rd addBlock call is the second activity, 'a2'.
    failAddBlockOnCall = 3;

    const handled = await (ShapeOpsHandler as any).handleModelCreatePage(msg({ document }));

    expect(handled).toBe(false);

    // Rollback: original page restored on both the viewport and ModelManager,
    // THEN the new page is deleted.
    expect(setCurrentPageSpy).toHaveBeenCalledWith(currentPage);
    expect(modelManagerStub.setCurrentPage).toHaveBeenCalledWith(currentPage);
    expect(deletePageMock).toHaveBeenCalled();

    const deleteIndex = callOrder.indexOf('page.delete');
    const restoreIndex = callOrder.indexOf(`modelManager.setCurrentPage:${currentPage.id}`);
    expect(restoreIndex).toBeGreaterThanOrEqual(0);
    expect(deleteIndex).toBeGreaterThan(restoreIndex);

    expect(modelManagerStub.validateModel).not.toHaveBeenCalled();

    const calls = resultCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0][1].data.success).toBe(false);
    expect(calls[0][1].data.errorMessage).toEqual(expect.stringContaining('a2'));
  });
});
