// tests/messaging/modelRootHandler.shapes.test.ts
//
// Spec 2026-09-13 lucid-shape-writes §1: MODEL_ROOT_UPDATE carries an optional
// `shapes` list. The handler checks every entry before writing, applies the
// model patch, merges each shape (cleared fields declared), validates once,
// replies, pushes the tagged snapshot and re-processes the selection.

import { Viewport } from '../__mocks__/lucid-extension-sdk';
import { addBlock, makeFakeBlock, makeFakePage } from '../helpers/fakeProxies';

let currentPage: any = null;
(Viewport.prototype as any).getCurrentPage = function (): any {
  return currentPage;
};
(Viewport.prototype as any).getSelectedItems = function (): any {
  return [];
};

const sendMock = jest.fn();
jest.mock('../../src/core/messaging/index', () => ({
  router: {
    send: sendMock,
    getChannelManager: () => ({ getChannel: () => undefined }),
  },
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

import { EnvelopeMessageType, SimulationObjectType } from '@quodsi/lucid-shared';
import { CLEARED_FIELDS_KEY } from '../../src/core/clearedFields';
import { ModelRootHandler } from '../../src/core/messaging/handlers/modelRootHandler';

function flush(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function updateMsg(data: Record<string, unknown>): any {
  return {
    id: 'req-1',
    type: EnvelopeMessageType.MODEL_ROOT_UPDATE,
    source: 'model-iframe',
    target: 'host',
    version: '1.0',
    data: { basedOnPageId: 'page-1', ...data },
  };
}

let calls: string[];
let snapshotSpy: jest.SpyInstance;

beforeEach(() => {
  sendMock.mockClear();
  handleLucidSelectionEventMock.mockClear();
  calls = [];
  currentPage = makeFakePage('page-1');
  addBlock(currentPage, makeFakeBlock('act-1'));
  addBlock(currentPage, makeFakeBlock('gen-1'));
  const storedTypes: Record<string, string> = { 'act-1': 'Activity', 'gen-1': 'Generator' };
  modelManagerStub = {
    getElementType: (element: any) => ({ type: storedTypes[element.id], id: element.id }),
    updateModelRoot: jest.fn(async () => { calls.push('updateModelRoot'); }),
    saveElementData: jest.fn(async (element: any) => { calls.push(`save:${element.id}`); }),
    validateModel: jest.fn(async () => { calls.push('validate'); }),
    buildModelRootProjection: async () => ({ generators: [], arrivalPatterns: [] }),
  };
  snapshotSpy = jest.spyOn(ModelRootHandler as any, 'sendSnapshot').mockImplementation(async () => undefined);
});

afterEach(() => {
  snapshotSpy.mockRestore();
});

function result(): any {
  return sendMock.mock.calls.find(([, envelope]: any[]) => envelope.type === EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT)?.[1];
}

describe('ModelRootHandler shape edits', () => {
  it('merges each shape with its cleared fields declared, validates once, replies and pushes the tagged snapshot', async () => {
    await (ModelRootHandler as any).handleUpdate(updateMsg({
      patch: {},
      shapes: [{ shapeId: 'act-1', type: 'Activity', patch: { name: 'Triage', capacity: 2 }, clearedFields: ['queueRanking'] }],
    }));
    await flush();

    expect(modelManagerStub.saveElementData).toHaveBeenCalledWith(
      currentPage.allBlocks.get('act-1'),
      { name: 'Triage', capacity: 2, id: 'act-1', [CLEARED_FIELDS_KEY]: ['queueRanking'] },
      SimulationObjectType.Activity,
      currentPage,
    );
    expect(modelManagerStub.updateModelRoot).not.toHaveBeenCalled();
    expect(modelManagerStub.validateModel).toHaveBeenCalledTimes(1);
    expect(result().data.success).toBe(true);
    expect(snapshotSpy).toHaveBeenCalledWith('req-1');
    expect(handleLucidSelectionEventMock).toHaveBeenCalledTimes(1);
  });

  it('sends no cleared-field declaration when nothing was cleared', async () => {
    await (ModelRootHandler as any).handleUpdate(updateMsg({
      patch: {},
      shapes: [{ shapeId: 'gen-1', type: 'Generator', patch: { name: 'Arrivals' }, clearedFields: [] }],
    }));
    await flush();

    const payload = modelManagerStub.saveElementData.mock.calls[0][1];
    expect(CLEARED_FIELDS_KEY in payload).toBe(false);
  });

  it('applies the model patch, then the shapes, then validates', async () => {
    await (ModelRootHandler as any).handleUpdate(updateMsg({
      patch: { arrivalPatterns: [] },
      shapes: [{ shapeId: 'gen-1', type: 'Generator', patch: { mode: 'pattern' }, clearedFields: [] }],
    }));
    await flush();

    expect(calls).toEqual(['updateModelRoot', 'save:gen-1', 'validate']);
  });

  it('refuses the whole batch before any write when one clear is not allowed', async () => {
    await (ModelRootHandler as any).handleUpdate(updateMsg({
      patch: { arrivalPatterns: [] },
      shapes: [
        { shapeId: 'gen-1', type: 'Generator', patch: { mode: 'pattern' }, clearedFields: [] },
        { shapeId: 'act-1', type: 'Activity', patch: {}, clearedFields: ['name'] },
      ],
    }));
    await flush();

    expect(calls).toEqual([]);
    expect(result().data).toEqual({ success: false, errorMessage: 'Cannot clear name on Activity' });
    expect(snapshotSpy).toHaveBeenCalledWith('req-1');
    expect(handleLucidSelectionEventMock).not.toHaveBeenCalled();
  });

  it('refuses a shape on another page before any write', async () => {
    await (ModelRootHandler as any).handleUpdate(updateMsg({
      basedOnPageId: 'page-2',
      patch: {},
      shapes: [{ shapeId: 'act-1', type: 'Activity', patch: { name: 'X' }, clearedFields: [] }],
    }));
    await flush();

    expect(calls).toEqual([]);
    expect(result().data.success).toBe(false);
  });

  it('keeps a model-only update exactly as before', async () => {
    await (ModelRootHandler as any).handleUpdate(updateMsg({ patch: { entities: [] } }));
    await flush();

    expect(modelManagerStub.updateModelRoot).toHaveBeenCalledWith({ entities: [] }, currentPage, expect.anything());
    expect(modelManagerStub.saveElementData).not.toHaveBeenCalled();
    expect(calls).toEqual(['updateModelRoot', 'validate']);
  });
});
