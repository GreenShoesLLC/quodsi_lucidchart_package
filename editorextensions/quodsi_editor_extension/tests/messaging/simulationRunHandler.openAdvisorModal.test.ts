// tests/messaging/simulationRunHandler.openAdvisorModal.test.ts
//
// OPEN_ADVISOR_MODAL opens the embedded-Studio Advisor consult. Like
// OPEN_STATUS_MODAL and unlike Studies, it needs no server model id (the
// consult carries the document inline via STUDIO_CATALOG.document), so it
// opens a CONCRETE studioPath instantly -- no UpsertModel, no pending path.
// Mocks mirror modelRootHandler.settingsModalGuard.test.ts: router +
// ModelManager stubbed, the modal's show() spied so the URL can be read off
// the mock SDK's `.config`.
//
// `new StudioEmbedModal(...)` resolves `getStudioBaseUrl()`, which reads the
// webpack-injected `__LOCAL_STUDIO_OVERRIDE__` global (see authHandler.ts) --
// undefined at jest runtime otherwise. Same workaround as
// analyticsHandler.deferUntilAuth.test.ts / authHandler.cachedAuth.test.ts.
(globalThis as any).__LOCAL_STUDIO_OVERRIDE__ = '';

const sendMock = jest.fn();
jest.mock('../../src/core/messaging/index', () => ({
  router: {
    send: sendMock,
    registerChannel: jest.fn(),
    clearFromGlobalRegistry: jest.fn(),
    getChannelManager: () => ({
      getChannel: () => undefined,
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
import { SimulationRunHandler } from '../../src/core/messaging/handlers/simulationRunHandler';
import { StudioEmbedModal } from '../../src/panels/StudioEmbedModal';

function openMessage(data: Record<string, unknown> | undefined): any {
  return {
    id: `open-${Math.random()}`,
    type: EnvelopeMessageType.OPEN_ADVISOR_MODAL,
    source: 'model-iframe',
    target: 'host',
    version: '1.0',
    data,
  };
}

let shown: StudioEmbedModal[];

/** The Studio path the modal was opened at, decoded from the mock SDK's config url. */
function studioPathOf(modal: StudioEmbedModal): string {
  const url: string = (modal as any).config.url;
  const q = new URLSearchParams(url.slice(url.indexOf('?') + 1));
  return q.get('studioPath') ?? '';
}
function titleOf(modal: StudioEmbedModal): string {
  const url: string = (modal as any).config.url;
  const q = new URLSearchParams(url.slice(url.indexOf('?') + 1));
  return q.get('title') ?? '';
}

beforeEach(() => {
  shown = [];
  jest.spyOn(StudioEmbedModal.prototype, 'show').mockImplementation(async function (this: StudioEmbedModal) {
    shown.push(this);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('OPEN_ADVISOR_MODAL', () => {
  it('is handled', () => {
    expect(SimulationRunHandler.handleMessage(openMessage({ focusType: 'Model', focusId: '', mode: 'definition' }))).toBe(true);
    expect(shown).toHaveLength(1);
  });

  it('opens /embed/advisor with the focus on the query string, titled "Ask the Advisor"', () => {
    SimulationRunHandler.handleMessage(openMessage({
      focusId: 'a1', focusType: 'Activity', focusName: 'Triage & Sort', mode: 'definition', modalSize: 'medium',
    }));

    expect(titleOf(shown[0])).toBe('Ask the Advisor');
    const path = studioPathOf(shown[0]);
    expect(path.startsWith('/embed/advisor?')).toBe(true);
    const q = new URLSearchParams(path.slice('/embed/advisor?'.length));
    expect(q.get('focusType')).toBe('Activity');
    expect(q.get('focusId')).toBe('a1');
    expect(q.get('focusName')).toBe('Triage & Sort'); // encoded on the wire, decoded here
    expect(q.get('mode')).toBe('definition');
    // Concrete open: never the pending/pull path.
    expect((shown[0] as any).config.url).not.toContain('pending=1');
    // Not a public page: the token relay must run.
    expect((shown[0] as any).config.url).not.toContain('public=1');
  });

  it('omits focusName when absent and defaults type/mode when the payload is empty', () => {
    SimulationRunHandler.handleMessage(openMessage(undefined));
    const path = studioPathOf(shown[0]);
    const q = new URLSearchParams(path.slice('/embed/advisor?'.length));
    expect(q.get('focusType')).toBe('Model');
    expect(q.get('focusId')).toBe('');
    expect(q.has('focusName')).toBe(false);
    expect(q.get('mode')).toBe('definition');
  });
});
