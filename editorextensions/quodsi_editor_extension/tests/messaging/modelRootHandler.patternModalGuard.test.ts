// tests/messaging/modelRootHandler.patternModalGuard.test.ts
//
// OPEN_PATTERN_MODAL is a singleton surface with nothing to slow it down.
// Unlike the Studies surfaces there is no server round trip between the click
// and the modal, so a double-click opened TWO modals; the second one's
// frameLoaded re-registered the singleton 'pattern' channel over the first, so
// the first modal's replies were routed to the second and its own writes hung
// for the full 30s MODEL_ROOT_UPDATE timeout before rejecting.
//
// Same mocking posture as modelRootHandler.broadcast.test.ts: core/messaging
// and core/ModelManager are mocked before ModelRootHandler is imported, both
// to stub behaviour and to sidestep the RoutingModal <-> core/messaging
// circular require documented in tests/model/patternEditorModal.test.ts.

const sendMock = jest.fn();
const patternChannel: { ready: boolean; queue: unknown[]; panel?: unknown } = {
  ready: false,
  queue: [],
};
jest.mock('../../src/core/messaging/index', () => ({
  router: {
    send: sendMock,
    registerChannel: jest.fn(),
    clearFromGlobalRegistry: jest.fn(),
    getChannelManager: () => ({
      getChannel: (role: string) => (role === 'pattern' ? patternChannel : undefined),
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
import { PatternEditorModal } from '../../src/panels/PatternEditorModal';

function openMessage(shapeId = 'gen-1'): any {
  return {
    id: `open-${Math.random()}`,
    type: EnvelopeMessageType.OPEN_PATTERN_MODAL,
    source: 'model-iframe',
    target: 'host',
    version: '1.0',
    data: { shapeId },
  };
}

/** The modal instances .show() was called on, in order. */
let shown: PatternEditorModal[];

beforeEach(() => {
  shown = [];
  jest.spyOn(PatternEditorModal.prototype, 'show').mockImplementation(async function (
    this: PatternEditorModal,
  ) {
    shown.push(this);
  });
  // Reset the handler's guard between tests -- it is module-level static state.
  (ModelRootHandler as any).openPatternModal = null;
  patternChannel.panel = undefined;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('OPEN_PATTERN_MODAL single-modal guard', () => {
  it('opens exactly one modal for a double-click', () => {
    ModelRootHandler.handleMessage(openMessage());
    ModelRootHandler.handleMessage(openMessage());

    expect(shown).toHaveLength(1);
  });

  it('opens again once the first modal has closed', () => {
    ModelRootHandler.handleMessage(openMessage());
    expect(shown).toHaveLength(1);

    // Lucid fires frameClosed when the modal's iframe goes away; PatternEditorModal
    // forwards it to the handler's release callback.
    (shown[0] as any).frameClosed();

    ModelRootHandler.handleMessage(openMessage('gen-2'));
    expect(shown).toHaveLength(2);
    expect((shown[1] as any).config.url).toContain('shapeId=gen-2');
  });

  it('a LATE frameClosed from the first modal does not release a newer modal\'s claim', () => {
    ModelRootHandler.handleMessage(openMessage());
    const first = shown[0];
    (first as any).frameClosed();

    ModelRootHandler.handleMessage(openMessage('gen-2'));
    expect(shown).toHaveLength(2);

    // The first modal's frameClosed arriving a second time (Lucid fires it
    // asynchronously off iframe unload) must not clear the SECOND modal's
    // claim -- otherwise the guard reopens a hole exactly when two modals are
    // in play.
    (first as any).frameClosed();
    ModelRootHandler.handleMessage(openMessage('gen-3'));
    expect(shown).toHaveLength(2);
  });

  it('a message with no shapeId neither opens a modal nor takes the guard', () => {
    ModelRootHandler.handleMessage({
      id: 'open-bad',
      type: EnvelopeMessageType.OPEN_PATTERN_MODAL,
      source: 'model-iframe',
      target: 'host',
      version: '1.0',
      data: {},
    } as any);

    expect(shown).toHaveLength(0);

    // A well-formed message right after must still work.
    ModelRootHandler.handleMessage(openMessage());
    expect(shown).toHaveLength(1);
  });
});
