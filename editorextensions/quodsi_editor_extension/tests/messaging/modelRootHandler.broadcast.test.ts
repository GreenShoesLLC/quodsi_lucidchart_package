// tests/messaging/modelRootHandler.broadcast.test.ts
//
// Pins WHO gets a MODEL_ROOT_SNAPSHOT, and who does not.
//
// sendSnapshot used to broadcast. Both consuming surfaces (the side panel and
// the pattern-editor modal) do need it -- that was the point -- but broadcast
// also enqueued a copy on the 'results' and 'studio-embed' channels, which
// never read the message and therefore never drain it, and made
// ensureChannelHasPanel log an error-level "Could not recover panel for ..."
// three times per snapshot. It now names its targets: 'model' always, and
// 'pattern' only while a pattern modal is actually registered.
//
// The other half this file pins is unchanged: MODEL_ROOT_UPDATE_RESULT goes
// only to 'model' (the requester) -- fanning a write RESULT out would let one
// surface's failure paint an error on a surface that never asked.
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
// Which channels currently have a registered panel. sendSnapshot consults the
// channel manager before addressing the 'pattern' channel, so tests set this
// to model "a pattern modal is open" vs "no pattern modal".
let patternChannelPanel: unknown = undefined;
jest.mock('../../src/core/messaging/index', () => ({
  router: {
    send: sendMock,
    getChannelManager: () => ({
      getChannel: (role: string) =>
        role === 'pattern' ? { ready: true, queue: [], panel: patternChannelPanel } : undefined,
    }),
  },
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
  patternChannelPanel = undefined;
  currentPage = { id: 'page-1' };
  modelManagerStub = {
    buildModelRootProjection: async () => ({ generators: [], arrivalPatterns: [] }),
    updateModelRoot: async () => undefined,
    validateModel: async () => undefined,
  };
});

describe('ModelRootHandler snapshot targeting', () => {
  it('sends MODEL_ROOT_SNAPSHOT to "model" only when no pattern modal is registered', async () => {
    await ModelRootHandler.sendSnapshot('corr-1');

    // Never 'broadcast': that queued a copy on 'results' and 'studio-embed',
    // neither of which reads this message, and logged an error per channel.
    expect(sendMock).toHaveBeenCalledTimes(1);
    const [target, msg] = sendMock.mock.calls[0];
    expect(target).toBe('model');
    expect(msg.type).toBe(EnvelopeMessageType.MODEL_ROOT_SNAPSHOT);
  });

  it('also sends it to "pattern" while a pattern modal IS registered, so both surfaces stay in sync', async () => {
    patternChannelPanel = { relayToIframe: () => undefined };

    await ModelRootHandler.sendSnapshot('corr-1');

    const targets = sendMock.mock.calls.map(([t]: [string]) => t);
    expect(targets).toEqual(['model', 'pattern']);
    for (const [, msg] of sendMock.mock.calls) {
      expect(msg.type).toBe(EnvelopeMessageType.MODEL_ROOT_SNAPSHOT);
    }
    // Each target gets its OWN envelope -- router.send stamps msg.target in
    // place, so a shared object would leave the panel's copy addressed to the
    // modal.
    const [, modelMsg] = sendMock.mock.calls[0];
    const [, patternMsg] = sendMock.mock.calls[1];
    expect(modelMsg).not.toBe(patternMsg);
    expect(modelMsg.target).toBe('model-iframe');
    expect(patternMsg.target).toBe('pattern-iframe');
  });

  it('a successful MODEL_ROOT_UPDATE targets the RESULT at "model" and follows with a targeted snapshot', async () => {
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
    expect(snapshotTarget).toBe('model');
    expect(snapshotMsg.type).toBe(EnvelopeMessageType.MODEL_ROOT_SNAPSHOT);
  });

  it('a write from the MODAL still refreshes the panel as well as the modal', async () => {
    patternChannelPanel = { relayToIframe: () => undefined };

    const msg = {
      id: 'req-3',
      type: EnvelopeMessageType.MODEL_ROOT_UPDATE,
      source: 'pattern-iframe',
      target: 'host',
      version: '1.0',
      data: { patch: { arrivalPatterns: [] } },
    } as any;

    await (ModelRootHandler as any).handleUpdate(msg);
    await flush();

    const calls = sendMock.mock.calls;
    // RESULT back to the requester (the modal), then the snapshot to BOTH.
    expect(calls[0][0]).toBe('pattern');
    expect(calls[0][1].type).toBe(EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT);
    expect(calls.slice(1).map(([t]: [string]) => t)).toEqual(['model', 'pattern']);
  });

  it('a failed MODEL_ROOT_UPDATE targets the failure RESULT at "model" only -- never fans it out', async () => {
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
    // have reached the OTHER surface, which would paint its UI with an error
    // it never asked for.
    expect(sendMock).toHaveBeenCalledTimes(1);
    const [target, resultMsg] = sendMock.mock.calls[0];
    expect(target).toBe('model');
    expect(resultMsg.type).toBe(EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT);
    expect(resultMsg.data.success).toBe(false);
  });
});
