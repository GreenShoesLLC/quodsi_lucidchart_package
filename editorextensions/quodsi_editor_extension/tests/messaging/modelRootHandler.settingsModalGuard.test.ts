// tests/messaging/modelRootHandler.settingsModalGuard.test.ts
//
// Mirrors modelRootHandler.scheduleModalGuard.test.ts / .workScheduleModalGuard.test.ts
// for OPEN_SETTINGS_MODAL (Complexity Views, Task 11b). Same hazard, same
// fix: a singleton surface with nothing between click and modal, so a
// double-click would open TWO modals and the second's frameLoaded would
// re-register the singleton 'settings' channel over the first -- orphaning
// the first modal's replies.
//
// THE STRUCTURAL DIFFERENCE from its three siblings: Settings is GLOBAL. Its
// payload carries no id at all -- no shapeId, no scheduleId -- so there is
// no "message with no id" case to test: an empty `data` (or a missing
// `data` entirely) is not malformed, it is simply "use the default modal
// size", and must still open the modal and take the guard.

const sendMock = jest.fn();
const settingsChannel: { ready: boolean; queue: unknown[]; panel?: unknown } = {
  ready: false,
  queue: [],
};
jest.mock('../../src/core/messaging/index', () => ({
  router: {
    send: sendMock,
    registerChannel: jest.fn(),
    clearFromGlobalRegistry: jest.fn(),
    getChannelManager: () => ({
      getChannel: (role: string) => (role === 'settings' ? settingsChannel : undefined),
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
import { SettingsModal } from '../../src/panels/SettingsModal';

function openMessage(data: Record<string, unknown> = {}): any {
  return {
    id: `open-${Math.random()}`,
    type: EnvelopeMessageType.OPEN_SETTINGS_MODAL,
    source: 'model-iframe',
    target: 'host',
    version: '1.0',
    data,
  };
}

/** The modal instances .show() was called on, in order. */
let shown: SettingsModal[];

beforeEach(() => {
  shown = [];
  jest.spyOn(SettingsModal.prototype, 'show').mockImplementation(async function (
    this: SettingsModal,
  ) {
    shown.push(this);
  });
  // Reset the handler's guard between tests -- it is module-level static state.
  (ModelRootHandler as any).openSettingsModal = null;
  settingsChannel.panel = undefined;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('OPEN_SETTINGS_MODAL single-modal guard', () => {
  it('opens exactly one modal for a double-click', () => {
    ModelRootHandler.handleMessage(openMessage());
    ModelRootHandler.handleMessage(openMessage());

    expect(shown).toHaveLength(1);
  });

  it('opens with no shapeId/scheduleId on the URL -- Settings is global', () => {
    ModelRootHandler.handleMessage(openMessage());

    expect((shown[0] as any).config.url).toContain('view=settings');
    expect((shown[0] as any).config.url).not.toContain('shapeId=');
    expect((shown[0] as any).config.url).not.toContain('scheduleId=');
  });

  it('an entirely empty message (no data at all) still opens the modal and takes the guard', () => {
    ModelRootHandler.handleMessage({
      id: 'open-empty',
      type: EnvelopeMessageType.OPEN_SETTINGS_MODAL,
      source: 'model-iframe',
      target: 'host',
      version: '1.0',
    } as any);

    expect(shown).toHaveLength(1);
    // The guard was taken by the call above -- a second open is refused.
    ModelRootHandler.handleMessage(openMessage());
    expect(shown).toHaveLength(1);
  });

  it('opens again once the first modal has closed', () => {
    ModelRootHandler.handleMessage(openMessage());
    expect(shown).toHaveLength(1);

    // Lucid fires frameClosed when the modal's iframe goes away; SettingsModal
    // forwards it to the handler's release callback.
    (shown[0] as any).frameClosed();

    ModelRootHandler.handleMessage(openMessage());
    expect(shown).toHaveLength(2);
  });

  it('a LATE frameClosed from the first modal does not release a newer modal\'s claim', () => {
    ModelRootHandler.handleMessage(openMessage());
    const first = shown[0];
    (first as any).frameClosed();

    ModelRootHandler.handleMessage(openMessage());
    expect(shown).toHaveLength(2);

    // The first modal's frameClosed arriving a second time (Lucid fires it
    // asynchronously off iframe unload) must not clear the SECOND modal's
    // claim -- otherwise the guard reopens a hole exactly when two modals
    // are in play.
    (first as any).frameClosed();
    ModelRootHandler.handleMessage(openMessage());
    expect(shown).toHaveLength(2);
  });

  it('does not interfere with the independent pattern/schedule/work-schedule guards', () => {
    (ModelRootHandler as any).openPatternModal = null;
    (ModelRootHandler as any).openScheduleModal = null;
    (ModelRootHandler as any).openWorkScheduleModal = null;
    ModelRootHandler.handleMessage(openMessage());
    expect(shown).toHaveLength(1);
    expect((ModelRootHandler as any).openPatternModal).toBeNull();
    expect((ModelRootHandler as any).openScheduleModal).toBeNull();
    expect((ModelRootHandler as any).openWorkScheduleModal).toBeNull();
  });
});
