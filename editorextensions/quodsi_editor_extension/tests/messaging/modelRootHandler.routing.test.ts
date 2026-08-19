// tests/messaging/modelRootHandler.routing.test.ts
//
// Task 3b: OPEN_PATTERN_MODAL opens the arrival-pattern editor in its own
// Lucid modal, a separate iframe with its own router channel ('pattern').
// Before this task, handleUpdate's MODEL_ROOT_UPDATE_RESULT replies were
// hardcoded to router.send('model', …), so a write issued FROM the pattern
// modal was answered on the SIDE PANEL's channel -- the modal never heard
// its acknowledgement and useModelRootSource's saveShape/send calls timed
// out after 30s.
//
// This file pins ModelRootHandler.getResponseChannel: a MODEL_ROOT_UPDATE
// whose source is 'pattern-iframe' gets its RESULT routed to 'pattern';
// everything else (source 'model-iframe', the side panel) still gets
// 'model' -- unchanged from before this task, so the working panel path is
// provably unaffected. The follow-up MODEL_ROOT_SNAPSHOT stays a broadcast
// regardless of the requester (that's a different concern, pinned already
// by modelRootHandler.broadcast.test.ts -- this file only re-confirms it
// survives the routing change).
//
// Mocking style mirrors tests/messaging/modelRootHandler.broadcast.test.ts
// (Task 2's closely-related test): mock lucid-extension-sdk's Viewport in
// place via the shared __mocks__ file, mock core/messaging and
// core/ModelManager before importing ModelRootHandler.

import { Viewport } from '../__mocks__/lucid-extension-sdk';

let currentPage: any = null;
(Viewport.prototype as any).getCurrentPage = function (): any {
  return currentPage;
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

import { EnvelopeMessageType } from '@quodsi/lucid-shared';
import { ModelRootHandler } from '../../src/core/messaging/handlers/modelRootHandler';

function flush(): Promise<void> {
  // Same reasoning as modelRootHandler.broadcast.test.ts's flush(): the
  // post-update sendSnapshot() continuation runs on a later microtask than
  // handleUpdate's fire-and-forget call to it.
  return new Promise((resolve) => setImmediate(resolve));
}

function updateMsg(source: string, id: string): any {
  return {
    id,
    type: EnvelopeMessageType.MODEL_ROOT_UPDATE,
    source,
    target: 'host',
    version: '1.0',
    data: { patch: { arrivalPatterns: [] } },
  };
}

beforeEach(() => {
  sendMock.mockClear();
  currentPage = { id: 'page-1' };
  modelManagerStub = {
    buildModelRootProjection: async () => ({ generators: [], arrivalPatterns: [] }),
    updateModelRoot: async () => undefined,
    validateModel: async () => undefined,
  };
});

describe('ModelRootHandler.getResponseChannel routing', () => {
  it('routes a panel-originated (model-iframe) MODEL_ROOT_UPDATE_RESULT to "model" -- the working path is unchanged', async () => {
    await (ModelRootHandler as any).handleUpdate(updateMsg('model-iframe', 'req-panel-1'));
    await flush();

    const [resultTarget, resultMsg] = sendMock.mock.calls[0];
    expect(resultTarget).toBe('model');
    expect(resultMsg.type).toBe(EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT);
    expect(resultMsg.data.success).toBe(true);
  });

  it('routes a modal-originated (pattern-iframe) MODEL_ROOT_UPDATE_RESULT to "pattern"', async () => {
    await (ModelRootHandler as any).handleUpdate(updateMsg('pattern-iframe', 'req-pattern-1'));
    await flush();

    const [resultTarget, resultMsg] = sendMock.mock.calls[0];
    expect(resultTarget).toBe('pattern');
    expect(resultMsg.type).toBe(EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT);
    expect(resultMsg.data.success).toBe(true);
  });

  it('still broadcasts the follow-up MODEL_ROOT_SNAPSHOT after a pattern-originated update (Task 2 behaviour unaffected)', async () => {
    await (ModelRootHandler as any).handleUpdate(updateMsg('pattern-iframe', 'req-pattern-2'));
    await flush();

    expect(sendMock).toHaveBeenCalledTimes(2);
    const [snapshotTarget, snapshotMsg] = sendMock.mock.calls[1];
    expect(snapshotTarget).toBe('broadcast');
    expect(snapshotMsg.type).toBe(EnvelopeMessageType.MODEL_ROOT_SNAPSHOT);
  });

  it('routes a failed pattern-originated update\'s RESULT to "pattern" too, and never broadcasts the error', async () => {
    modelManagerStub.updateModelRoot = async () => {
      throw new Error('boom');
    };

    await (ModelRootHandler as any).handleUpdate(updateMsg('pattern-iframe', 'req-pattern-3'));
    await flush();

    expect(sendMock).toHaveBeenCalledTimes(1);
    const [target, resultMsg] = sendMock.mock.calls[0];
    expect(target).toBe('pattern');
    expect(resultMsg.type).toBe(EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT);
    expect(resultMsg.data.success).toBe(false);
  });
});
