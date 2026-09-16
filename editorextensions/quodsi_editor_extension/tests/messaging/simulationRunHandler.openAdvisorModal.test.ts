// tests/messaging/simulationRunHandler.openAdvisorModal.test.ts
//
// OPEN_ADVISOR_MODAL opens the compiled Advisor consult (quodsim-react
// ?view=advisor) in an AdvisorConsultModal. Unlike Studies it needs no server
// model id (the consult carries the document inline via
// STUDIO_CATALOG.document), so it opens instantly with the focus on the query
// string -- no UpsertModel. Mocks mirror
// modelRootHandler.settingsModalGuard.test.ts: router + ModelManager stubbed,
// the modal's show() spied so the URL can be read off the mock SDK's
// `.config`.
//
// `new AdvisorConsultModal(...)` resolves `getApiBaseUrl()`, which reads the
// webpack-injected `__LOCAL_API_OVERRIDE__` global (see apiBaseUrl.ts) --
// undefined at jest runtime otherwise.
(globalThis as any).__LOCAL_API_OVERRIDE__ = '';

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
import { AdvisorConsultModal } from '../../src/panels/AdvisorConsultModal';

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

let shown: AdvisorConsultModal[];

/** The modal URL's query, decoded (the test runtime has URLSearchParams). */
function queryOf(modal: AdvisorConsultModal): URLSearchParams {
  const url: string = (modal as any).config.url;
  expect(url.startsWith('quodsim-react/index.html?')).toBe(true);
  return new URLSearchParams(url.slice(url.indexOf('?') + 1));
}

beforeEach(() => {
  shown = [];
  jest.spyOn(AdvisorConsultModal.prototype, 'show').mockImplementation(async function (this: AdvisorConsultModal) {
    shown.push(this);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('OPEN_ADVISOR_MODAL', () => {
  it('opens without URLSearchParams -- the Lucid extension sandbox does not provide it', () => {
    // Smoke 2026-09-04: the first build threw inside the router ("Error
    // handling message") because the handler built its query string with
    // `new URLSearchParams()`, which exists in Node (so jest passed) but not
    // in the Lucid extension VM. Every sibling modal encodes by hand with
    // `encodeURIComponent`; this pins that the modal does too.
    const saved = (globalThis as any).URLSearchParams;
    delete (globalThis as any).URLSearchParams;
    try {
      expect(SimulationRunHandler.handleMessage(openMessage({
        focusId: 'a1', focusType: 'Activity', focusName: 'Triage & Sort', mode: 'definition',
      }))).toBe(true);
    } finally {
      (globalThis as any).URLSearchParams = saved;
    }
    expect(shown).toHaveLength(1);
    expect(queryOf(shown[0]).get('focusName')).toBe('Triage & Sort');
  });

  it('is handled', () => {
    expect(SimulationRunHandler.handleMessage(openMessage({ focusType: 'Model', focusId: '', mode: 'definition' }))).toBe(true);
    expect(shown).toHaveLength(1);
  });

  it('opens the compiled advisor view with the focus on the query string, titled "Ask the Advisor"', () => {
    SimulationRunHandler.handleMessage(openMessage({
      focusId: 'a1', focusType: 'Activity', focusName: 'Triage & Sort', mode: 'definition', modalSize: 'medium',
    }));

    expect(shown[0]).toBeInstanceOf(AdvisorConsultModal);
    const q = queryOf(shown[0]);
    expect(q.get('view')).toBe('advisor');
    expect(q.get('title')).toBe('Ask the Advisor');
    expect(q.has('apiBaseUrl')).toBe(true);
    expect(q.get('focusType')).toBe('Activity');
    expect(q.get('focusId')).toBe('a1');
    expect(q.get('focusName')).toBe('Triage & Sort'); // encoded on the wire, decoded here
    expect(q.get('mode')).toBe('definition');
    expect((shown[0] as any).config.chromeless).toBe(true);
    // No Studio iframe any more.
    expect(q.has('studioPath')).toBe(false);
  });

  it('omits focusName when absent and defaults type/mode when the payload is empty', () => {
    SimulationRunHandler.handleMessage(openMessage(undefined));
    const q = queryOf(shown[0]);
    expect(q.get('focusType')).toBe('Model');
    expect(q.get('focusId')).toBe('');
    expect(q.has('focusName')).toBe(false);
    expect(q.get('mode')).toBe('definition');
  });
});
