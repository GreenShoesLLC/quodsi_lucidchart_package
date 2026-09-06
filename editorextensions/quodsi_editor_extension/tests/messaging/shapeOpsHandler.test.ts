// editorextensions/quodsi_editor_extension/tests/messaging/shapeOpsHandler.test.ts
//
// Advisor drawing half, Task 4: ShapeOpsHandler creates/deletes/moves shapes
// on the current page in response to SHAPE_CREATE / SHAPE_DELETE / SHAPE_MOVE,
// sent by the embedded Studio iframe with source 'studio-embed-iframe' (see
// embedWriteRouting.test.ts). Mocking style mirrors
// elementOpsHandler.routing.test.ts: mock the SDK's Viewport (via the shared
// __mocks__ file), core/messaging's router, core/ModelManager, and the
// selection handler. LucidElementFactory is additionally mocked here so
// creation tests can drive it with a minimal fake block/line (no shapeData,
// no getPage) without exercising the real conversion/naming pipeline --
// that pipeline is already covered by tests/conversion/*.
//
// Fix round 1 (task review): covers four findings against the original
// Task 4 cut --
//   C1 registerElement() alone never reaches the page: it only updates the
//      in-memory ModelDefinition, and validateModel's rebuild-from-storage
//      throws the merged record away in favor of the conversion defaults
//      createPlatformObject wrote. The fix writes the merged record through
//      modelManager.getStorageAdapter().updateElementData(item, record)
//      BEFORE validateModel, and strips x/y/width/height off the Advisor's
//      element first so a stray coordinate can't clobber the placed box.
//   C2 client.loadBlockClasses(['ProcessBlock']) must be awaited before
//      page.addBlock, exactly as LucidPageConversionService does -- the
//      SDK rejects addBlock for an unloaded class.
//   I1 (in shapePlacement.test.ts) placeAtFlowEnd needs the ModelDefinition
//      (getModelDefinition()), not the Model root (getModel()).
//   I2 removeElement(id) must run BEFORE the corresponding delete(), lines
//      first then the block -- calling it after delete() finds nothing on
//      the live page and silently no-ops the cascades.
import { Viewport } from '../__mocks__/lucid-extension-sdk';

let currentPage: any = null;
(Viewport.prototype as any).getCurrentPage = function (): any {
  return currentPage;
};
(Viewport.prototype as any).getSelectedItems = function (): any {
  return [];
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

function msg(type: EnvelopeMessageType, data: unknown, source = 'studio-embed-iframe', id = `req-${type}`): any {
  return { id, type, source, target: 'host', version: '1.0', data };
}

function resultCalls(type: EnvelopeMessageType) {
  return sendMock.mock.calls.filter((c) => c[1]?.type === type);
}

function fakeAnchorBlock(id: string, box: { x: number; y: number; w: number; h: number }) {
  return { id, getBoundingBox: () => box };
}

let allBlocksMap: Map<string, any>;
let allLinesMap: Map<string, any>;
let addBlockMock: jest.Mock;
let addLineMock: jest.Mock;
let storageAdapterStub: any;
let callOrder: string[];

beforeEach(() => {
  sendMock.mockClear();
  handleLucidSelectionEventMock.mockClear();
  createPlatformObjectMock.mockReset();
  callOrder = [];

  clientStub = {
    loadBlockClasses: jest.fn(async () => {
      callOrder.push('loadBlockClasses');
    }),
  };

  allBlocksMap = new Map<string, any>([
    ['a1', fakeAnchorBlock('a1', { x: 100, y: 100, w: 80, h: 60 })],
    ['a2', fakeAnchorBlock('a2', { x: 500, y: 100, w: 80, h: 60 })],
  ]);
  allLinesMap = new Map<string, any>();

  addBlockMock = jest.fn((def: any) => {
    callOrder.push('addBlock');
    const newBlock = {
      id: 'blk-9',
      textAreas: new Map<string, string>(),
      getBoundingBox: () => def.boundingBox,
      setBoundingBox: jest.fn(),
      delete: jest.fn(),
    };
    allBlocksMap.set(newBlock.id, newBlock);
    return newBlock;
  });

  addLineMock = jest.fn((def: any) => {
    callOrder.push('addLine');
    const newLine = { id: 'ln-9', delete: jest.fn() };
    allLinesMap.set(newLine.id, newLine);
    return newLine;
  });

  currentPage = {
    id: 'page-1',
    allBlocks: allBlocksMap,
    allLines: allLinesMap,
    addBlock: addBlockMock,
    addLine: addLineMock,
  };

  storageAdapterStub = {
    updateElementData: jest.fn(() => {
      callOrder.push('updateElementData');
    }),
  };

  modelManagerStub = {
    registerElement: jest.fn(async () => {
      callOrder.push('registerElement');
    }),
    removeElement: jest.fn(async () => {
      callOrder.push('removeElement');
    }),
    validateModel: jest.fn(async () => {
      callOrder.push('validateModel');
    }),
    getModelDefinition: jest.fn().mockResolvedValue(null),
    invalidateModelCache: jest.fn(),
    getStorageAdapter: jest.fn(() => storageAdapterStub),
  };
});

describe('SHAPE_CREATE', () => {
  it('creates an Activity near a1 on the right, writes the merged record to storage, and strips stray geometry', async () => {
    createPlatformObjectMock.mockReturnValue({
      getSimulationObject: () => ({
        id: 'placeholder',
        type: SimulationObjectType.Activity,
        name: 'New Activity',
        capacity: 1,
      }),
    });

    const handled = await (ShapeOpsHandler as any).handleShapeCreate(
      msg(EnvelopeMessageType.SHAPE_CREATE, {
        shapeType: 'Activity',
        // x/y/width/height are stray Advisor-authored geometry -- must never
        // reach the merged record, which would otherwise let them clobber
        // the placement engine's computed box.
        element: { name: 'Triage', capacity: 2, x: 999, y: 999, width: 999, height: 999 },
        near: { elementId: 'a1', side: 'right' },
      })
    );

    expect(handled).toBe(true);

    // C2: loadBlockClasses(['ProcessBlock']) must be awaited before addBlock.
    expect(clientStub.loadBlockClasses).toHaveBeenCalledWith(['ProcessBlock']);

    // round(1.75*80) = 140 -> x = 100 + 80 + 140 = 320
    expect(addBlockMock).toHaveBeenCalledWith({
      className: 'ProcessBlock',
      boundingBox: { x: 320, y: 100, w: 80, h: 80 },
    });

    const createdBlock = allBlocksMap.get('blk-9');
    expect(createdBlock.textAreas.get('Text')).toBe('Triage');

    expect(createPlatformObjectMock).toHaveBeenCalledWith(createdBlock, SimulationObjectType.Activity, true);

    const expectedRecord = { id: 'blk-9', type: SimulationObjectType.Activity, name: 'Triage', capacity: 2 };

    // C1: registerElement's in-memory write...
    expect(modelManagerStub.registerElement).toHaveBeenCalledWith(expectedRecord, createdBlock);
    // ...AND the storage write that actually makes it stick past the next
    // validateModel() rebuild-from-storage.
    expect(modelManagerStub.getStorageAdapter).toHaveBeenCalled();
    expect(storageAdapterStub.updateElementData).toHaveBeenCalledWith(createdBlock, expectedRecord);

    expect(modelManagerStub.validateModel).toHaveBeenCalled();

    // Full ordering: block class loaded, block added, registered in-memory,
    // written to storage, THEN validated.
    expect(callOrder).toEqual([
      'loadBlockClasses',
      'addBlock',
      'registerElement',
      'updateElementData',
      'validateModel',
    ]);

    const calls = resultCalls(EnvelopeMessageType.SHAPE_CREATE_RESULT);
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe('studio-embed');
    expect(calls[0][1]).toMatchObject({
      target: 'studio-embed-iframe',
      data: { success: true, id: 'blk-9' },
    });

    expect(handleLucidSelectionEventMock).toHaveBeenCalled();
  });

  it('creates a Connector between two blocks, writes the merged record to storage, and strips stray geometry', async () => {
    createPlatformObjectMock.mockReturnValue({
      getSimulationObject: () => ({
        id: 'placeholder',
        type: SimulationObjectType.Connector,
        name: 'New Connector',
        probability: 1,
      }),
    });

    const sourceBlock = allBlocksMap.get('a1');
    const targetBlock = allBlocksMap.get('a2');

    const handled = await (ShapeOpsHandler as any).handleShapeCreate(
      msg(EnvelopeMessageType.SHAPE_CREATE, {
        shapeType: 'Connector',
        element: { sourceId: 'a1', targetId: 'a2', probability: 1, x: 5, y: 5 },
      })
    );

    expect(handled).toBe(true);

    // A Connector never touches block classes.
    expect(clientStub.loadBlockClasses).not.toHaveBeenCalled();

    expect(addLineMock).toHaveBeenCalledWith({
      endpoint1: { connection: sourceBlock, linkX: 1, linkY: 0.5 },
      endpoint2: { connection: targetBlock, linkX: 0, linkY: 0.5 },
    });

    expect(createPlatformObjectMock).toHaveBeenCalledWith(
      allLinesMap.get('ln-9'),
      SimulationObjectType.Connector,
      true
    );

    const expectedRecord = {
      id: 'ln-9',
      type: SimulationObjectType.Connector,
      name: 'New Connector',
      probability: 1,
      sourceId: 'a1',
      targetId: 'a2',
    };

    expect(modelManagerStub.registerElement).toHaveBeenCalledWith(expectedRecord, allLinesMap.get('ln-9'));
    expect(storageAdapterStub.updateElementData).toHaveBeenCalledWith(allLinesMap.get('ln-9'), expectedRecord);

    const calls = resultCalls(EnvelopeMessageType.SHAPE_CREATE_RESULT);
    expect(calls[0][1]).toMatchObject({ data: { success: true, id: 'ln-9' } });
  });

  it('fails without creating anything when the near-anchor is unknown', async () => {
    const handled = await (ShapeOpsHandler as any).handleShapeCreate(
      msg(EnvelopeMessageType.SHAPE_CREATE, {
        shapeType: 'Activity',
        element: { name: 'Triage' },
        near: { elementId: 'nope', side: 'right' },
      })
    );

    expect(handled).toBe(false);
    expect(clientStub.loadBlockClasses).not.toHaveBeenCalled();
    expect(addBlockMock).not.toHaveBeenCalled();
    expect(modelManagerStub.registerElement).not.toHaveBeenCalled();
    expect(storageAdapterStub.updateElementData).not.toHaveBeenCalled();

    const calls = resultCalls(EnvelopeMessageType.SHAPE_CREATE_RESULT);
    expect(calls[0][1].data.success).toBe(false);
    expect(calls[0][1].data.errorMessage).toEqual(expect.stringContaining('nope'));
  });

  it('places near a Resource record id by resolving it through the resource\'s shapeId pointer block', async () => {
    const pointerBlock = fakeAnchorBlock('blk-r1', { x: 500, y: 200, w: 80, h: 60 });
    allBlocksMap.set('blk-r1', pointerBlock);

    modelManagerStub.getModelDefinition = jest.fn().mockResolvedValue({
      resources: {
        get: (id: string) => (id === 'r1' ? { id: 'r1', shapeId: 'blk-r1' } : undefined),
      },
    });

    createPlatformObjectMock.mockReturnValue({
      getSimulationObject: () => ({
        id: 'placeholder',
        type: SimulationObjectType.Activity,
        name: 'New Activity',
        capacity: 1,
      }),
    });

    const handled = await (ShapeOpsHandler as any).handleShapeCreate(
      msg(EnvelopeMessageType.SHAPE_CREATE, {
        shapeType: 'Activity',
        element: { name: 'Triage' },
        near: { elementId: 'r1', side: 'right' },
      })
    );

    expect(handled).toBe(true);

    // round(1.75*80) = 140 -> x = 500 + 80 + 140 = 720, same y as the
    // pointer block ('blk-r1'), not the Advisor's 'r1' record id.
    expect(addBlockMock).toHaveBeenCalledWith({
      className: 'ProcessBlock',
      boundingBox: { x: 720, y: 200, w: 80, h: 80 },
    });
  });

  it('fails without creating anything when a Connector endpoint is unknown', async () => {
    const handled = await (ShapeOpsHandler as any).handleShapeCreate(
      msg(EnvelopeMessageType.SHAPE_CREATE, {
        shapeType: 'Connector',
        element: { sourceId: 'a1', targetId: 'nope' },
      })
    );

    expect(handled).toBe(false);
    expect(addLineMock).not.toHaveBeenCalled();
    expect(modelManagerStub.registerElement).not.toHaveBeenCalled();
    expect(storageAdapterStub.updateElementData).not.toHaveBeenCalled();

    const calls = resultCalls(EnvelopeMessageType.SHAPE_CREATE_RESULT);
    expect(calls[0][1].data.success).toBe(false);
    expect(calls[0][1].data.errorMessage).toEqual(expect.stringContaining('nope'));
  });
});

describe('SHAPE_DELETE', () => {
  function fakeLine(id: string, sourceId: string | undefined, targetId: string | undefined) {
    return {
      id,
      getEndpoint1: () => ({ connection: sourceId ? { id: sourceId } : undefined }),
      getEndpoint2: () => ({ connection: targetId ? { id: targetId } : undefined }),
      delete: jest.fn(() => {
        callOrder.push(`delete:${id}`);
      }),
    };
  }

  it('deletes an Activity and its connected lines, lines first, removeElement BEFORE each delete', async () => {
    const a1 = allBlocksMap.get('a1');
    a1.delete = jest.fn(() => {
      callOrder.push('delete:a1');
    });

    modelManagerStub.removeElement = jest.fn((id: string) => {
      callOrder.push(`removeElement:${id}`);
      return Promise.resolve();
    });

    const l1 = fakeLine('l1', 'a1', 'x'); // a1 -> x
    const l2 = fakeLine('l2', 'y', 'a1'); // y -> a1
    const l3 = fakeLine('l3', 'x', 'y'); // unrelated -- must survive
    allLinesMap.set('l1', l1);
    allLinesMap.set('l2', l2);
    allLinesMap.set('l3', l3);

    const handled = await (ShapeOpsHandler as any).handleShapeDelete(
      msg(EnvelopeMessageType.SHAPE_DELETE, { shapeType: 'Activity', elementId: 'a1' })
    );

    expect(handled).toBe(true);

    expect(l1.delete).toHaveBeenCalled();
    expect(l2.delete).toHaveBeenCalled();
    expect(l3.delete).not.toHaveBeenCalled();
    expect(a1.delete).toHaveBeenCalled();

    // I2: removeElement(id) must run BEFORE the matching delete(), lines
    // first then the block -- calling it after delete() finds nothing on
    // the live page and silently skips the cascades (destination
    // references, orphaned patterns/schedules, clearElementData).
    expect(callOrder).toEqual([
      'removeElement:l1',
      'delete:l1',
      'removeElement:l2',
      'delete:l2',
      'removeElement:a1',
      'delete:a1',
      'validateModel',
    ]);

    const calls = resultCalls(EnvelopeMessageType.SHAPE_DELETE_RESULT);
    expect(calls[0][1]).toMatchObject({
      data: { success: true, deletedIds: ['l1', 'l2', 'a1'] },
    });

    expect(handleLucidSelectionEventMock).toHaveBeenCalled();
  });

  it('deletes a Connector by its own id, removeElement before delete', async () => {
    modelManagerStub.removeElement = jest.fn((id: string) => {
      callOrder.push(`removeElement:${id}`);
      return Promise.resolve();
    });

    const line = fakeLine('l1', 'a1', 'a2');
    allLinesMap.set('l1', line);

    const handled = await (ShapeOpsHandler as any).handleShapeDelete(
      msg(EnvelopeMessageType.SHAPE_DELETE, { shapeType: 'Connector', elementId: 'l1' })
    );

    expect(handled).toBe(true);
    expect(line.delete).toHaveBeenCalled();
    expect(modelManagerStub.removeElement).toHaveBeenCalledWith('l1');
    expect(callOrder).toEqual(['removeElement:l1', 'delete:l1', 'validateModel']);

    const calls = resultCalls(EnvelopeMessageType.SHAPE_DELETE_RESULT);
    expect(calls[0][1]).toMatchObject({ data: { success: true, deletedIds: ['l1'] } });
  });

  it('fails when the element to delete is unknown', async () => {
    const handled = await (ShapeOpsHandler as any).handleShapeDelete(
      msg(EnvelopeMessageType.SHAPE_DELETE, { shapeType: 'Activity', elementId: 'nope' })
    );

    expect(handled).toBe(false);
    expect(modelManagerStub.removeElement).not.toHaveBeenCalled();

    const calls = resultCalls(EnvelopeMessageType.SHAPE_DELETE_RESULT);
    expect(calls[0][1].data.success).toBe(false);
    expect(calls[0][1].data.errorMessage).toEqual(expect.stringContaining('nope'));
  });
});

describe('SHAPE_MOVE', () => {
  it('moves a block to new coordinates, keeping its size', async () => {
    const a1 = allBlocksMap.get('a1');
    a1.setBoundingBox = jest.fn();

    const handled = await (ShapeOpsHandler as any).handleShapeMove(
      msg(EnvelopeMessageType.SHAPE_MOVE, { elementId: 'a1', x: 50, y: 60 })
    );

    expect(handled).toBe(true);
    expect(a1.setBoundingBox).toHaveBeenCalledWith({ x: 50, y: 60, w: 80, h: 60 });

    const calls = resultCalls(EnvelopeMessageType.SHAPE_MOVE_RESULT);
    expect(calls[0][1]).toMatchObject({ data: { success: true } });
  });

  it('fails when the element to move is unknown', async () => {
    const handled = await (ShapeOpsHandler as any).handleShapeMove(
      msg(EnvelopeMessageType.SHAPE_MOVE, { elementId: 'nope', x: 1, y: 2 })
    );

    expect(handled).toBe(false);

    const calls = resultCalls(EnvelopeMessageType.SHAPE_MOVE_RESULT);
    expect(calls[0][1].data.success).toBe(false);
    expect(calls[0][1].data.errorMessage).toEqual(expect.stringContaining('nope'));
  });

  it('invalidates the model cache after a successful move', async () => {
    const a1 = allBlocksMap.get('a1');
    a1.setBoundingBox = jest.fn();
    modelManagerStub.invalidateModelCache = jest.fn();

    const handled = await (ShapeOpsHandler as any).handleShapeMove(
      msg(EnvelopeMessageType.SHAPE_MOVE, { elementId: 'a1', x: 50, y: 60 })
    );

    expect(handled).toBe(true);
    expect(modelManagerStub.invalidateModelCache).toHaveBeenCalled();
  });

  it('resolves a Resource record id (not a block id) through its shapeId pointer', async () => {
    allBlocksMap.set('blk-r1', fakeAnchorBlock('blk-r1', { x: 500, y: 200, w: 80, h: 60 }));
    const pointerBlock = allBlocksMap.get('blk-r1');
    pointerBlock.setBoundingBox = jest.fn();

    modelManagerStub.getModelDefinition = jest.fn().mockResolvedValue({
      resources: {
        get: (id: string) => (id === 'r1' ? { id: 'r1', shapeId: 'blk-r1' } : undefined),
      },
    });
    modelManagerStub.invalidateModelCache = jest.fn();

    const handled = await (ShapeOpsHandler as any).handleShapeMove(
      msg(EnvelopeMessageType.SHAPE_MOVE, { elementId: 'r1', x: 10, y: 20 })
    );

    expect(handled).toBe(true);
    expect(pointerBlock.setBoundingBox).toHaveBeenCalledWith({ x: 10, y: 20, w: 80, h: 60 });
    expect(modelManagerStub.invalidateModelCache).toHaveBeenCalled();

    const calls = resultCalls(EnvelopeMessageType.SHAPE_MOVE_RESULT);
    expect(calls[0][1]).toMatchObject({ data: { success: true } });
  });

  it('fails when an id is neither a block nor a resource with a shapeId', async () => {
    modelManagerStub.getModelDefinition = jest.fn().mockResolvedValue({
      resources: {
        get: () => undefined,
      },
    });

    const handled = await (ShapeOpsHandler as any).handleShapeMove(
      msg(EnvelopeMessageType.SHAPE_MOVE, { elementId: 'nope', x: 1, y: 2 })
    );

    expect(handled).toBe(false);

    const calls = resultCalls(EnvelopeMessageType.SHAPE_MOVE_RESULT);
    expect(calls[0][1].data.success).toBe(false);
    expect(calls[0][1].data.errorMessage).toEqual(expect.stringContaining('nope'));
  });
});

describe('ShapeOpsHandler.handleMessage routing', () => {
  it('handles SHAPE_CREATE/SHAPE_DELETE/SHAPE_MOVE and defers everything else', () => {
    const block = allBlocksMap.get('a1');
    createPlatformObjectMock.mockReturnValue({ getSimulationObject: () => ({ id: 'x', type: SimulationObjectType.Activity, name: 'X' }) });

    expect(ShapeOpsHandler.handleMessage(msg(EnvelopeMessageType.SHAPE_CREATE, { shapeType: 'Activity', element: {} }))).toBe(true);
    expect(ShapeOpsHandler.handleMessage(msg(EnvelopeMessageType.SHAPE_DELETE, { shapeType: 'Activity', elementId: block.id }))).toBe(true);
    expect(ShapeOpsHandler.handleMessage(msg(EnvelopeMessageType.SHAPE_MOVE, { elementId: 'nope', x: 0, y: 0 }))).toBe(true);
    expect(ShapeOpsHandler.handleMessage(msg(EnvelopeMessageType.ELEMENT_UPDATE, {}))).toBe(false);
  });
});
