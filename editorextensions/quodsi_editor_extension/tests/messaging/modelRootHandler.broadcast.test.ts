// tests/messaging/modelRootHandler.broadcast.test.ts
//
// Task 2 review followup: sendSnapshot moving to `router.send('broadcast', …)`
// is this task's one behaviour change to shared code, and it had no test
// anywhere in the suite -- there was no pre-existing test to update, so
// nothing broke when it changed, but nothing guards it either. This file
// pins both halves: the snapshot goes to 'broadcast' (so the pattern modal
// and the model panel both see model-root writes live), and
// MODEL_ROOT_UPDATE_RESULT still goes only to 'model' (the requester) --
// broadcasting a write RESULT would let one surface's failure paint an
// error on the other surface that never asked.
//
// Mocks lucid-extension-sdk's Viewport in place (monkey-patched on the
// SAME module instance modelRootHandler.ts resolves via jest's
// moduleNameMapper -- see tests/__mocks__/lucid-extension-sdk.ts) rather
// than re-mocking the module, so PatternEditorModal's real import of
// Modal/EditorClient from that same mock file keeps working. core/messaging
// and core/ModelManager are mocked before importing ModelRootHandler, same
// as tests/messaging/simulationRunHandler.requestStudioCatalog.test.ts,
// both to stub their behaviour and to sidestep the RoutingModal <->
// core/messaging circular-require documented in patternEditorModal.test.ts.

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
  // sendSnapshot's continuation (after its internal `await
  // buildModelRootProjection(...)`) runs on a later microtask than
  // handleUpdate's own fire-and-forget call to it; a macrotask boundary
  // guarantees it has run before assertions.
  return new Promise((resolve) => setImmediate(resolve));
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

describe('ModelRootHandler broadcast behaviour', () => {
  it('sendSnapshot sends MODEL_ROOT_SNAPSHOT to broadcast, not to a single channel', async () => {
    await ModelRootHandler.sendSnapshot('corr-1');

    expect(sendMock).toHaveBeenCalledTimes(1);
    const [target, msg] = sendMock.mock.calls[0];
    expect(target).toBe('broadcast');
    expect(msg.type).toBe(EnvelopeMessageType.MODEL_ROOT_SNAPSHOT);
  });

  it('a successful MODEL_ROOT_UPDATE targets the RESULT at "model" and broadcasts the follow-up snapshot', async () => {
    const msg = {
      id: 'req-1',
      type: EnvelopeMessageType.MODEL_ROOT_UPDATE,
      source: 'model-iframe',
      target: 'host',
      version: '1.0',
      data: { patch: { arrivalPatterns: [] } },
    } as any;

    await (ModelRootHandler as any).handleUpdate(msg);
    await flush();

    expect(sendMock).toHaveBeenCalledTimes(2);

    const [resultTarget, resultMsg] = sendMock.mock.calls[0];
    expect(resultTarget).toBe('model');
    expect(resultMsg.type).toBe(EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT);
    expect(resultMsg.data.success).toBe(true);

    const [snapshotTarget, snapshotMsg] = sendMock.mock.calls[1];
    expect(snapshotTarget).toBe('broadcast');
    expect(snapshotMsg.type).toBe(EnvelopeMessageType.MODEL_ROOT_SNAPSHOT);
  });

  it('a failed MODEL_ROOT_UPDATE targets the failure RESULT at "model" only -- never broadcasts an error', async () => {
    modelManagerStub.updateModelRoot = async () => {
      throw new Error('boom');
    };

    const msg = {
      id: 'req-2',
      type: EnvelopeMessageType.MODEL_ROOT_UPDATE,
      source: 'model-iframe',
      target: 'host',
      version: '1.0',
      data: { patch: {} },
    } as any;

    await (ModelRootHandler as any).handleUpdate(msg);
    await flush();

    // No post-update snapshot on failure (it's outside the try/catch's
    // success path) -- and critically, the failure RESULT itself must not
    // have gone to 'broadcast', which would paint the OTHER surface's UI
    // with an error it never asked for.
    expect(sendMock).toHaveBeenCalledTimes(1);
    const [target, resultMsg] = sendMock.mock.calls[0];
    expect(target).toBe('model');
    expect(resultMsg.type).toBe(EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT);
    expect(resultMsg.data.success).toBe(false);
  });
});
