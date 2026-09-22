// ClickUp 86e37z4rn: a write that PERSISTED must report success even when
// the post-write refresh (validateModel / referenceData rebuild / selection
// re-process) throws. Before this fix StatesHandler and EntitiesHandler ran
// the write and the refresh inside one try, so a refresh failure sent
// { success: false } for data that was already in storage -- the embedded
// Studio/Advisor relay (their only remaining caller) then showed the OLD
// list plus a "failed" status and aborted a multi-step proposal after a
// step that had landed. ModelRootHandler split the selection refresh out
// but still ran validateModel inside its try; same rule applies.
//
// The refresh failure is not swallowed silently: it gets its own error
// log, but never changes the result the panel sees. Mock style follows
// pageGuard.handlers.test.ts.
import { Viewport } from '../__mocks__/lucid-extension-sdk';

let currentPage: any = null;
(Viewport.prototype as any).getCurrentPage = function (): any { return currentPage; };
(Viewport.prototype as any).getSelectedItems = function (): any { return []; };

const sendMock = jest.fn();
jest.mock('../../src/core/messaging/index', () => ({
  router: {
    send: sendMock,
    getChannelManager: () => ({ getChannel: () => undefined }),
  },
}));

let modelManagerStub: any;
jest.mock('../../src/core/ModelManager', () => ({
  ModelManager: { getInstance: () => modelManagerStub, getClient: () => ({}) },
}));

const rebuildMock = jest.fn();
const selectionMock = jest.fn();
jest.mock('../../src/core/messaging/handlers/selection/SelectionHandler', () => ({
  SelectionHandler: {
    handleLucidSelectionEvent: (...args: unknown[]) => selectionMock(...args),
    sendSelectionChangedMessage: (...args: unknown[]) => rebuildMock(...args),
  },
}));

import { EnvelopeMessageType } from '@quodsi/lucid-shared';
import { ModelRootHandler } from '../../src/core/messaging/handlers/modelRootHandler';
import { StatesHandler } from '../../src/core/messaging/handlers/statesHandler';
import { EntitiesHandler } from '../../src/core/messaging/handlers/entitiesHandler';

const flush = () => new Promise((r) => setImmediate(r));

function msg(type: EnvelopeMessageType, data: unknown): any {
  return { id: `req-${type}`, type, source: 'studio-embed-iframe', target: 'host', version: '1.0', data };
}
function results(type: EnvelopeMessageType): any[] {
  return sendMock.mock.calls.filter((c) => c[1]?.type === type).map((c) => c[1].data);
}

beforeEach(() => {
  sendMock.mockClear();
  rebuildMock.mockReset().mockResolvedValue(undefined);
  selectionMock.mockReset().mockResolvedValue(undefined);
  currentPage = { id: 'page-B', getTitle: () => 'B' };
  modelManagerStub = {
    updateModelRoot: jest.fn().mockResolvedValue(undefined),
    updateStates: jest.fn().mockResolvedValue(undefined),
    updateEntities: jest.fn().mockResolvedValue(undefined),
    validateModel: jest.fn().mockResolvedValue(undefined),
    buildModelRootProjection: jest.fn().mockResolvedValue({}),
  };
});

describe('STATES_UPDATE', () => {
  const update = () =>
    (StatesHandler as any).handleStatesUpdate(msg(EnvelopeMessageType.STATES_UPDATE, { states: [] }));

  it('reports success when validateModel throws after the write persisted', async () => {
    modelManagerStub.validateModel.mockRejectedValue(new Error('validate boom'));
    await update();
    await flush();

    expect(modelManagerStub.updateStates).toHaveBeenCalledTimes(1);
    expect(results(EnvelopeMessageType.STATES_UPDATE_RESULT)).toEqual([{ success: true }]);
  });

  it('reports success when the referenceData rebuild throws after the write persisted', async () => {
    rebuildMock.mockRejectedValue(new Error('rebuild boom'));
    await update();
    await flush();

    expect(results(EnvelopeMessageType.STATES_UPDATE_RESULT)).toEqual([{ success: true }]);
  });

  it('still reports failure, and skips the refresh, when the write itself throws', async () => {
    modelManagerStub.updateStates.mockRejectedValue(new Error('write boom'));
    await update();
    await flush();

    expect(results(EnvelopeMessageType.STATES_UPDATE_RESULT)).toEqual([
      { success: false, errorMessage: 'write boom' },
    ]);
    expect(modelManagerStub.validateModel).not.toHaveBeenCalled();
    expect(rebuildMock).not.toHaveBeenCalled();
  });

  it('still runs the rebuild after a validateModel failure', async () => {
    // The two refresh steps are independent: a validation failure must not
    // deprive the panel of the fresh referenceData the write produced.
    modelManagerStub.validateModel.mockRejectedValue(new Error('validate boom'));
    await update();
    await flush();

    expect(rebuildMock).toHaveBeenCalledWith(true);
  });
});

describe('ENTITIES_UPDATE', () => {
  const update = () =>
    (EntitiesHandler as any).handleEntitiesUpdate(msg(EnvelopeMessageType.ENTITIES_UPDATE, { entities: [] }));

  it('reports success when validateModel throws after the write persisted', async () => {
    modelManagerStub.validateModel.mockRejectedValue(new Error('validate boom'));
    await update();
    await flush();

    expect(modelManagerStub.updateEntities).toHaveBeenCalledTimes(1);
    expect(results(EnvelopeMessageType.ENTITIES_UPDATE_RESULT)).toEqual([{ success: true }]);
  });

  it('reports success when the referenceData rebuild throws after the write persisted', async () => {
    rebuildMock.mockRejectedValue(new Error('rebuild boom'));
    await update();
    await flush();

    expect(results(EnvelopeMessageType.ENTITIES_UPDATE_RESULT)).toEqual([{ success: true }]);
  });

  it('still reports failure when the write itself throws', async () => {
    modelManagerStub.updateEntities.mockRejectedValue(new Error('write boom'));
    await update();
    await flush();

    expect(results(EnvelopeMessageType.ENTITIES_UPDATE_RESULT)).toEqual([
      { success: false, errorMessage: 'write boom' },
    ]);
    expect(rebuildMock).not.toHaveBeenCalled();
  });
});

describe('MODEL_ROOT_UPDATE', () => {
  const update = () =>
    (ModelRootHandler as any).handleUpdate(
      msg(EnvelopeMessageType.MODEL_ROOT_UPDATE, { patch: { states: [] }, basedOnPageId: 'page-B' }),
    );

  it('reports success when validateModel throws after the write persisted', async () => {
    modelManagerStub.validateModel.mockRejectedValue(new Error('validate boom'));
    await update();
    await flush();

    expect(modelManagerStub.updateModelRoot).toHaveBeenCalledTimes(1);
    expect(results(EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT)).toEqual([{ success: true }]);
    // The success-path snapshot and selection refresh still follow.
    expect(results(EnvelopeMessageType.MODEL_ROOT_SNAPSHOT)).toHaveLength(1);
    expect(selectionMock).toHaveBeenCalledTimes(1);
  });
});
