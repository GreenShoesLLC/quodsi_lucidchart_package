// tests/messaging/elementOpsHandler.scheduleRouting.test.ts
//
// Same gap as modelRootHandler.scheduleRouting.test.ts, but for
// ElementOpsHandler.handleElementUpdate -- and the more urgent of the two.
//
// quodsi_studio's ScheduleModal creates and LINKS a default schedule the
// first time a generator has none (ScheduleModal.tsx ~line 142), via
// accessor.updateShape(...). That is an ELEMENT_UPDATE, handled here, not
// by ModelRootHandler. Before the branch this file pins, a schedule-modal-
// originated ELEMENT_UPDATE's RESULT was routed to 'model' (the side
// panel's channel) instead of 'schedule' (the modal's own channel) -- the
// modal never hears its acknowledgement, and useModelRootSource's saveShape
// hangs for the full 30s ELEMENT_UPDATE timeout before rejecting and
// rolling back. That is the FIRST thing a user does: open the schedule
// editor on a fresh Scheduled generator and add a row.
//
// Mirrors elementOpsHandler.routing.test.ts's ELEMENT_UPDATE describe block
// exactly, 'schedule-iframe'/'schedule' substituted for 'pattern-iframe'/
// 'pattern'.

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

import { EnvelopeMessageType } from '@quodsi/lucid-shared';
import { ElementOpsHandler } from '../../src/core/messaging/handlers/elementOpsHandler';

function updateMsg(source: string, id: string): any {
  return {
    id,
    type: EnvelopeMessageType.ELEMENT_UPDATE,
    source,
    target: 'host',
    version: '1.0',
    data: { elementId: 'shape-1', type: 'Generator', data: { arrivalScheduleId: 'sched-1' } },
  };
}

beforeEach(() => {
  sendMock.mockClear();
  handleLucidSelectionEventMock.mockClear();
  currentPage = {
    id: 'page-1',
    allBlocks: { get: (id: string) => (id === 'shape-1' ? { id: 'shape-1' } : undefined) },
    allLines: { get: () => undefined },
  };
  modelManagerStub = {
    saveElementData: jest.fn().mockResolvedValue(undefined),
    validateModel: jest.fn().mockResolvedValue(undefined),
  };
});

describe('ElementOpsHandler.getResponseChannel routing -- ELEMENT_UPDATE (the schedule modal\'s first-use link write)', () => {
  it('routes a panel-originated (model-iframe) ELEMENT_UPDATE_RESULT to "model" -- the working path is unchanged', async () => {
    await (ElementOpsHandler as any).handleElementUpdate(updateMsg('model-iframe', 'req-panel-1'));

    expect(sendMock).toHaveBeenCalledTimes(1);
    const [target, msg] = sendMock.mock.calls[0];
    expect(target).toBe('model');
    expect(msg.type).toBe(EnvelopeMessageType.ELEMENT_UPDATE_RESULT);
    expect(msg.data.success).toBe(true);
  });

  it('routes a modal-originated (schedule-iframe) ELEMENT_UPDATE_RESULT to "schedule"', async () => {
    await (ElementOpsHandler as any).handleElementUpdate(updateMsg('schedule-iframe', 'req-schedule-1'));

    expect(sendMock).toHaveBeenCalledTimes(1);
    const [target, msg] = sendMock.mock.calls[0];
    expect(target).toBe('schedule');
    expect(msg.type).toBe(EnvelopeMessageType.ELEMENT_UPDATE_RESULT);
    expect(msg.data.success).toBe(true);
  });

  it('routes a failed modal-originated ELEMENT_UPDATE_RESULT to "schedule" too', async () => {
    modelManagerStub.saveElementData = jest.fn().mockRejectedValue(new Error('boom'));

    await (ElementOpsHandler as any).handleElementUpdate(updateMsg('schedule-iframe', 'req-schedule-2'));

    expect(sendMock).toHaveBeenCalledTimes(1);
    const [target, msg] = sendMock.mock.calls[0];
    expect(target).toBe('schedule');
    expect(msg.data.success).toBe(false);
  });
});
