// tests/messaging/modelRootHandler.scheduleRouting.test.ts
//
// Mirrors modelRootHandler.routing.test.ts for the schedule-editor modal.
//
// GAP THIS CLOSES. Task 2's brief calls out three things that must be right
// (the 'schedule' channel role passed to RoutingModal, the double-open
// guard, and sendSnapshot's targeting) but does not mention
// ModelRootHandler.getResponseChannel. That function is what routes a
// MODEL_ROOT_UPDATE_RESULT back to whichever surface issued the write; it
// already special-cases 'pattern-iframe' -> 'pattern' for exactly this
// reason (see modelRootHandler.routing.test.ts's header comment -- before
// that fix, a pattern-modal write was acknowledged on the SIDE PANEL's
// channel and the modal's own save call hung for the full 30s timeout).
// ScheduleEditorView (Task 3) reuses the same createBufferingAccessor /
// useModelRootSource machinery PatternEditorView does, so a schedule-modal
// write is a MODEL_ROOT_UPDATE sourced 'schedule-iframe' -- without a
// matching 'schedule-iframe' -> 'schedule' branch here, it would hit the
// exact same hang this file pins against.
//
// Mocking style mirrors modelRootHandler.routing.test.ts.

import { Viewport } from '../__mocks__/lucid-extension-sdk';

let currentPage: any = null;
(Viewport.prototype as any).getCurrentPage = function (): any {
  return currentPage;
};

const sendMock = jest.fn();
// A schedule modal is open in this file's scenarios (the updates under test
// originate FROM it), so its channel has a registered panel -- which is what
// sendSnapshot consults before addressing the 'schedule' channel.
let scheduleChannelPanel: unknown = { relayToIframe: () => undefined };
jest.mock('../../src/core/messaging/index', () => ({
  router: {
    send: sendMock,
    getChannelManager: () => ({
      getChannel: (role: string) =>
        role === 'schedule' ? { ready: true, queue: [], panel: scheduleChannelPanel } : undefined,
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
    data: { patch: { arrivalSchedules: [] } },
  };
}

beforeEach(() => {
  sendMock.mockClear();
  scheduleChannelPanel = { relayToIframe: () => undefined };
  currentPage = { id: 'page-1' };
  modelManagerStub = {
    buildModelRootProjection: async () => ({ generators: [], arrivalSchedules: [] }),
    updateModelRoot: async () => undefined,
    validateModel: async () => undefined,
  };
});

describe('ModelRootHandler.getResponseChannel routing (schedule)', () => {
  it('routes a panel-originated (model-iframe) MODEL_ROOT_UPDATE_RESULT to "model" -- the working path is unchanged', async () => {
    await (ModelRootHandler as any).handleUpdate(updateMsg('model-iframe', 'req-panel-1'));
    await flush();

    const [resultTarget, resultMsg] = sendMock.mock.calls[0];
    expect(resultTarget).toBe('model');
    expect(resultMsg.type).toBe(EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT);
    expect(resultMsg.data.success).toBe(true);
  });

  it('routes a modal-originated (schedule-iframe) MODEL_ROOT_UPDATE_RESULT to "schedule"', async () => {
    await (ModelRootHandler as any).handleUpdate(updateMsg('schedule-iframe', 'req-schedule-1'));
    await flush();

    const [resultTarget, resultMsg] = sendMock.mock.calls[0];
    expect(resultTarget).toBe('schedule');
    expect(resultMsg.type).toBe(EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT);
    expect(resultMsg.data.success).toBe(true);
  });

  it('still refreshes BOTH surfaces with the follow-up MODEL_ROOT_SNAPSHOT after a schedule-originated update', async () => {
    await (ModelRootHandler as any).handleUpdate(updateMsg('schedule-iframe', 'req-schedule-2'));
    await flush();

    // RESULT to the requester, then the snapshot to the panel AND the modal.
    expect(sendMock).toHaveBeenCalledTimes(3);
    expect(sendMock.mock.calls.slice(1).map(([t]: [string]) => t)).toEqual(['model', 'schedule']);
    for (const [, msg] of sendMock.mock.calls.slice(1)) {
      expect(msg.type).toBe(EnvelopeMessageType.MODEL_ROOT_SNAPSHOT);
    }
  });

  it('routes a failed schedule-originated update\'s RESULT to "schedule" too, and never broadcasts the error', async () => {
    modelManagerStub.updateModelRoot = async () => {
      throw new Error('boom');
    };

    await (ModelRootHandler as any).handleUpdate(updateMsg('schedule-iframe', 'req-schedule-3'));
    await flush();

    // Same shape as the pattern case (see
    // modelRootHandler.routing.test.ts): the failure RESULT goes to the
    // requester ALONE; the corrective snapshot behind it (Plan 2b polish
    // P3) fans out like any other snapshot.
    expect(sendMock).toHaveBeenCalledTimes(3);
    const [target, resultMsg] = sendMock.mock.calls[0];
    expect(target).toBe('schedule');
    expect(resultMsg.type).toBe(EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT);
    expect(resultMsg.data.success).toBe(false);

    expect(sendMock.mock.calls.slice(1).map(([t]: [string]) => t)).toEqual(['model', 'schedule']);
    for (const [, msg] of sendMock.mock.calls.slice(1)) {
      expect(msg.type).toBe(EnvelopeMessageType.MODEL_ROOT_SNAPSHOT);
    }
  });
});
