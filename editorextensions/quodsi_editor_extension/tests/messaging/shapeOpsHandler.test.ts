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
jest.mock('../../src/core/ModelManager', () => ({
  ModelManager: {
    getInstance: () => modelManagerStub,
    getClient: () => ({}),
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

beforeEach(() => {
  sendMock.mockClear();
  handleLucidSelectionEventMock.mockClear();
  createPlatformObjectMock.mockReset();

  allBlocksMap = new Map<string, any>([
    ['a1', fakeAnchorBlock('a1', { x: 100, y: 100, w: 80, h: 60 })],
    ['a2', fakeAnchorBlock('a2', { x: 500, y: 100, w: 80, h: 60 })],
  ]);
  allLinesMap = new Map<string, any>();

  addBlockMock = jest.fn((def: any) => {
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

  modelManagerStub = {
    registerElement: jest.fn().mockResolvedValue(undefined),
    removeElement: jest.fn().mockResolvedValue(undefined),
    validateModel: jest.fn().mockResolvedValue(undefined),
    getModel: jest.fn().mockReturnValue(null),
  };
});

describe('SHAPE_CREATE', () => {
  it('creates an Activity near a1 on the right', async () => {
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
        element: { name: 'Triage', capacity: 2 },
        near: { elementId: 'a1', side: 'right' },
      })
    );

    expect(handled).toBe(true);

    // round(1.75*80) = 140 -> x = 100 + 80 + 140 = 320
    expect(addBlockMock).toHaveBeenCalledWith({
      className: 'ProcessBlock',
      boundingBox: { x: 320, y: 100, w: 80, h: 80 },
    });

    const createdBlock = allBlocksMap.get('blk-9');
    expect(createdBlock.textAreas.get('Text')).toBe('Triage');

    expect(createPlatformObjectMock).toHaveBeenCalledWith(createdBlock, SimulationObjectType.Activity, true);

    expect(modelManagerStub.registerElement).toHaveBeenCalledWith(
      { id: 'blk-9', type: SimulationObjectType.Activity, name: 'Triage', capacity: 2 },
      createdBlock
    );

    expect(modelManagerStub.validateModel).toHaveBeenCalled();

    const calls = resultCalls(EnvelopeMessageType.SHAPE_CREATE_RESULT);
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe('studio-embed');
    expect(calls[0][1]).toMatchObject({
      target: 'studio-embed-iframe',
      data: { success: true, id: 'blk-9' },
    });

    expect(handleLucidSelectionEventMock).toHaveBeenCalled();
  });

  it('creates a Connector between two blocks', async () => {
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
        element: { sourceId: 'a1', targetId: 'a2', probability: 1 },
      })
    );

    expect(handled).toBe(true);

    expect(addLineMock).toHaveBeenCalledWith({
      endpoint1: { connection: sourceBlock, linkX: 1, linkY: 0.5 },
      endpoint2: { connection: targetBlock, linkX: 0, linkY: 0.5 },
    });

    expect(createPlatformObjectMock).toHaveBeenCalledWith(
      allLinesMap.get('ln-9'),
      SimulationObjectType.Connector,
      true
    );

    expect(modelManagerStub.registerElement).toHaveBeenCalledWith(
      {
        id: 'ln-9',
        type: SimulationObjectType.Connector,
        name: 'New Connector',
        probability: 1,
        sourceId: 'a1',
        targetId: 'a2',
      },
      allLinesMap.get('ln-9')
    );

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
    expect(addBlockMock).not.toHaveBeenCalled();
    expect(modelManagerStub.registerElement).not.toHaveBeenCalled();

    const calls = resultCalls(EnvelopeMessageType.SHAPE_CREATE_RESULT);
    expect(calls[0][1].data.success).toBe(false);
    expect(calls[0][1].data.errorMessage).toEqual(expect.stringContaining('nope'));
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
      delete: jest.fn(),
    };
  }

  it('deletes an Activity and its connected lines, lines first, in traversal order', async () => {
    const a1 = allBlocksMap.get('a1');
    a1.delete = jest.fn();

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

    expect(modelManagerStub.removeElement.mock.calls.map((c: any[]) => c[0])).toEqual(['l1', 'l2', 'a1']);

    const calls = resultCalls(EnvelopeMessageType.SHAPE_DELETE_RESULT);
    expect(calls[0][1]).toMatchObject({
      data: { success: true, deletedIds: ['l1', 'l2', 'a1'] },
    });

    expect(handleLucidSelectionEventMock).toHaveBeenCalled();
  });

  it('deletes a Connector by its own id', async () => {
    const line = fakeLine('l1', 'a1', 'a2');
    allLinesMap.set('l1', line);

    const handled = await (ShapeOpsHandler as any).handleShapeDelete(
      msg(EnvelopeMessageType.SHAPE_DELETE, { shapeType: 'Connector', elementId: 'l1' })
    );

    expect(handled).toBe(true);
    expect(line.delete).toHaveBeenCalled();
    expect(modelManagerStub.removeElement).toHaveBeenCalledWith('l1');

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
