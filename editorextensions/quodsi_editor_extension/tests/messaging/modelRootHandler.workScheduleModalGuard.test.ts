// tests/messaging/modelRootHandler.workScheduleModalGuard.test.ts
//
// Mirrors modelRootHandler.scheduleModalGuard.test.ts for
// OPEN_WORK_SCHEDULE_MODAL (work schedules, spec 2026-08-27 §6). Same hazard,
// same fix: a singleton surface with nothing between click and modal, so a
// double-click would open TWO modals and the second's frameLoaded would
// re-register the singleton 'work-schedule' channel over the first --
// orphaning the first modal's replies and hanging its own writes for the full
// 30s MODEL_ROOT_UPDATE timeout.
//
// THE ONE STRUCTURAL DIFFERENCE from its two siblings: the payload carries a
// SCHEDULE id, not a shape id. A work schedule is a model-level record; the
// shape that FOLLOWS it is edited by the Resource/Activity capacity control,
// not here. WorkScheduleModal's own prop is literally `scheduleId` and its
// header says so.

const sendMock = jest.fn();
const workScheduleChannel: { ready: boolean; queue: unknown[]; panel?: unknown } = {
  ready: false,
  queue: [],
};
jest.mock('../../src/core/messaging/index', () => ({
  router: {
    send: sendMock,
    registerChannel: jest.fn(),
    clearFromGlobalRegistry: jest.fn(),
    getChannelManager: () => ({
      getChannel: (role: string) => (role === 'work-schedule' ? workScheduleChannel : undefined),
      isChannelReady: () => false,
      flushQueue: jest.fn(),
    }),
  },
}));

jest.mock('../../src/core/ModelManager', () => ({
  ModelManager: {
    getInstance: () => ({}),
    getClient: () => ({}),
  },
}));

import { EnvelopeMessageType } from '@quodsi/lucid-shared';
import { ModelRootHandler } from '../../src/core/messaging/handlers/modelRootHandler';
import { WorkScheduleEditorModal } from '../../src/panels/WorkScheduleEditorModal';

function openMessage(scheduleId = 'ws-1'): any {
  return {
    id: `open-${Math.random()}`,
    type: EnvelopeMessageType.OPEN_WORK_SCHEDULE_MODAL,
    source: 'model-iframe',
    target: 'host',
    version: '1.0',
    data: { scheduleId },
  };
}

/** The modal instances .show() was called on, in order. */
let shown: WorkScheduleEditorModal[];

beforeEach(() => {
  shown = [];
  jest.spyOn(WorkScheduleEditorModal.prototype, 'show').mockImplementation(async function (
    this: WorkScheduleEditorModal,
  ) {
    shown.push(this);
  });
  (ModelRootHandler as any).openWorkScheduleModal = null;
  workScheduleChannel.panel = undefined;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('OPEN_WORK_SCHEDULE_MODAL single-modal guard', () => {
  it('opens exactly one modal for a double-click', () => {
    ModelRootHandler.handleMessage(openMessage());
    ModelRootHandler.handleMessage(openMessage());

    expect(shown).toHaveLength(1);
  });

  it('puts the schedule id -- not a shape id -- on the modal URL', () => {
    ModelRootHandler.handleMessage(openMessage('ws-42'));

    expect((shown[0] as any).config.url).toContain('view=work-schedule');
    expect((shown[0] as any).config.url).toContain('scheduleId=ws-42');
    expect((shown[0] as any).config.url).not.toContain('shapeId=');
  });

  it('opens again once the first modal has closed', () => {
    ModelRootHandler.handleMessage(openMessage());
    expect(shown).toHaveLength(1);

    (shown[0] as any).frameClosed();

    ModelRootHandler.handleMessage(openMessage('ws-2'));
    expect(shown).toHaveLength(2);
    expect((shown[1] as any).config.url).toContain('scheduleId=ws-2');
  });

  it('a LATE frameClosed from the first modal does not release a newer modal\'s claim', () => {
    ModelRootHandler.handleMessage(openMessage());
    const first = shown[0];
    (first as any).frameClosed();

    ModelRootHandler.handleMessage(openMessage('ws-2'));
    expect(shown).toHaveLength(2);

    (first as any).frameClosed();
    ModelRootHandler.handleMessage(openMessage('ws-3'));
    expect(shown).toHaveLength(2);
  });

  it('a message with no scheduleId neither opens a modal nor takes the guard', () => {
    ModelRootHandler.handleMessage({
      id: 'open-bad',
      type: EnvelopeMessageType.OPEN_WORK_SCHEDULE_MODAL,
      source: 'model-iframe',
      target: 'host',
      version: '1.0',
      data: {},
    } as any);

    expect(shown).toHaveLength(0);

    ModelRootHandler.handleMessage(openMessage());
    expect(shown).toHaveLength(1);
  });

  it('does not interfere with the independent "pattern"/"schedule" guards', () => {
    (ModelRootHandler as any).openPatternModal = null;
    (ModelRootHandler as any).openScheduleModal = null;
    ModelRootHandler.handleMessage(openMessage());
    expect(shown).toHaveLength(1);
    expect((ModelRootHandler as any).openPatternModal).toBeNull();
    expect((ModelRootHandler as any).openScheduleModal).toBeNull();
  });
});
