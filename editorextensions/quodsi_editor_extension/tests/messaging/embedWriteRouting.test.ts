// tests/messaging/embedWriteRouting.test.ts
//
// Advisor write half: the embedded Studio iframe (via the panel's
// EmbeddedStudioFrame) posts ELEMENT_UPDATE / MODEL_ROOT_UPDATE /
// STATES_UPDATE / ENTITIES_UPDATE with source 'studio-embed-iframe'. Each
// handler must answer on the 'studio-embed' channel -- on 'model' the result
// would never reach the iframe and the write would hang for 30 s. Mocks
// follow elementOpsHandler.routing.test.ts.
import { Viewport } from '../__mocks__/lucid-extension-sdk';

let currentPage: any = null;
(Viewport.prototype as any).getCurrentPage = function (): any { return currentPage; };
(Viewport.prototype as any).getSelectedItems = function (): any { return []; };

const sendMock = jest.fn();
jest.mock('../../src/core/messaging/index', () => ({ router: { send: sendMock } }));

let modelManagerStub: any;
jest.mock('../../src/core/ModelManager', () => ({
  ModelManager: { getInstance: () => modelManagerStub, getClient: () => ({}) },
}));
jest.mock('../../src/core/messaging/handlers/selection/SelectionHandler', () => ({
  SelectionHandler: {
    handleLucidSelectionEvent: jest.fn().mockResolvedValue(undefined),
    sendSelectionChangedMessage: jest.fn().mockResolvedValue(undefined),
  },
}));

import { EnvelopeMessageType } from '@quodsi/lucid-shared';
import { ElementOpsHandler } from '../../src/core/messaging/handlers/elementOpsHandler';
import { ModelRootHandler } from '../../src/core/messaging/handlers/modelRootHandler';
import { StatesHandler } from '../../src/core/messaging/handlers/statesHandler';
import { EntitiesHandler } from '../../src/core/messaging/handlers/entitiesHandler';

function msg(type: EnvelopeMessageType, source: string, data: unknown): any {
  return { id: `req-${type}-${source}`, type, source, target: 'host', version: '1.0', data };
}
function resultFor(type: EnvelopeMessageType) {
  return sendMock.mock.calls.find((c) => c[1]?.type === type);
}

beforeEach(() => {
  sendMock.mockClear();
  currentPage = {
    id: 'page-1',
    allBlocks: { get: (id: string) => (id === 'a1' ? { id: 'a1' } : undefined) },
    allLines: { get: () => undefined },
    getTitle: () => 'P',
  };
  modelManagerStub = {
    saveElementData: jest.fn().mockResolvedValue(undefined),
    updateModelRoot: jest.fn().mockResolvedValue(undefined),
    updateStates: jest.fn().mockResolvedValue(undefined),
    updateEntities: jest.fn().mockResolvedValue(undefined),
    validateModel: jest.fn().mockResolvedValue(undefined),
    // ModelRootHandler.sendSnapshot runs after a model-root write (fire-and-forget).
    buildModelRootProjection: jest.fn().mockResolvedValue({}),
  };
});

describe('write results route back to the embedded Studio iframe', () => {
  it('ELEMENT_UPDATE from studio-embed-iframe answers on studio-embed', async () => {
    await (ElementOpsHandler as any).handleElementUpdate(msg(EnvelopeMessageType.ELEMENT_UPDATE, 'studio-embed-iframe', { elementId: 'a1', type: 'Activity', data: { capacity: 2 } }));
    const call = resultFor(EnvelopeMessageType.ELEMENT_UPDATE_RESULT)!;
    expect(call[0]).toBe('studio-embed');
    expect(call[1]).toMatchObject({ target: 'studio-embed-iframe', data: { success: true } });
  });

  it('MODEL_ROOT_UPDATE from studio-embed-iframe answers on studio-embed', async () => {
    await (ModelRootHandler as any).handleUpdate(msg(EnvelopeMessageType.MODEL_ROOT_UPDATE, 'studio-embed-iframe', { patch: { resources: [] } }));
    const call = resultFor(EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT)!;
    expect(call[0]).toBe('studio-embed');
    expect(call[1]).toMatchObject({ target: 'studio-embed-iframe', data: { success: true } });
  });

  it('STATES_UPDATE from studio-embed-iframe answers on studio-embed (success and failure)', async () => {
    StatesHandler.handleMessage(msg(EnvelopeMessageType.STATES_UPDATE, 'studio-embed-iframe', { states: [] }));
    await new Promise((r) => setImmediate(r));
    let call = resultFor(EnvelopeMessageType.STATES_UPDATE_RESULT)!;
    expect(call[0]).toBe('studio-embed');
    expect(call[1]).toMatchObject({ target: 'studio-embed-iframe', data: { success: true } });

    sendMock.mockClear();
    modelManagerStub.updateStates.mockRejectedValueOnce(new Error('boom'));
    StatesHandler.handleMessage(msg(EnvelopeMessageType.STATES_UPDATE, 'studio-embed-iframe', { states: [] }));
    await new Promise((r) => setImmediate(r));
    call = resultFor(EnvelopeMessageType.STATES_UPDATE_RESULT)!;
    expect(call[0]).toBe('studio-embed');
    expect(call[1]).toMatchObject({ data: { success: false, errorMessage: 'boom' } });
  });

  it('ENTITIES_UPDATE from studio-embed-iframe answers on studio-embed', async () => {
    EntitiesHandler.handleMessage(msg(EnvelopeMessageType.ENTITIES_UPDATE, 'studio-embed-iframe', { entities: [] }));
    await new Promise((r) => setImmediate(r));
    const call = resultFor(EnvelopeMessageType.ENTITIES_UPDATE_RESULT)!;
    expect(call[0]).toBe('studio-embed');
    expect(call[1]).toMatchObject({ target: 'studio-embed-iframe', data: { success: true } });
  });

  it('the panel path is unchanged: model-iframe still answers on model', async () => {
    StatesHandler.handleMessage(msg(EnvelopeMessageType.STATES_UPDATE, 'model-iframe', { states: [] }));
    await new Promise((r) => setImmediate(r));
    expect(resultFor(EnvelopeMessageType.STATES_UPDATE_RESULT)![0]).toBe('model');
  });
});
