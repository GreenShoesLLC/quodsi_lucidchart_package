// tests/messaging/simulationRunHandler.openStatusModal.test.ts
//
// OPEN_STATUS_MODAL (ClickUp 86e3f949t) opens quodsi_studio's shared
// StatusPanel in a Lucid modal (quodsim-react ?view=status) instead of
// Studio's /status page in a browser tab. The view fetches the public
// GET /status itself, so the modal only needs the API base URL on its URL.
// Mocks mirror simulationRunHandler.openAdvisorModal.test.ts.
(globalThis as any).__LOCAL_API_OVERRIDE__ = '';

jest.mock('../../src/core/messaging/index', () => ({
  router: {
    send: jest.fn(),
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
import { StatusModal } from '../../src/panels/StatusModal';

function openMessage(): any {
  return {
    id: `open-${Math.random()}`,
    type: EnvelopeMessageType.OPEN_STATUS_MODAL,
    source: 'model-iframe',
    target: 'host',
    version: '1.0',
    data: {},
  };
}

let shown: StatusModal[];

function queryOf(modal: StatusModal): URLSearchParams {
  const url: string = (modal as any).config.url;
  expect(url.startsWith('quodsim-react/index.html?')).toBe(true);
  return new URLSearchParams(url.slice(url.indexOf('?') + 1));
}

beforeEach(() => {
  shown = [];
  (globalThis as any).__LOCAL_API_OVERRIDE__ = '';
  jest.spyOn(StatusModal.prototype, 'show').mockImplementation(async function (this: StatusModal) {
    shown.push(this);
  });
  (SimulationRunHandler as any).openStatusModal = null;
});

afterEach(() => {
  jest.restoreAllMocks();
  (globalThis as any).__LOCAL_API_OVERRIDE__ = '';
});

describe('OPEN_STATUS_MODAL', () => {
  it('is handled and opens the status view in a titled modal', () => {
    expect(SimulationRunHandler.handleMessage(openMessage())).toBe(true);
    expect(shown).toHaveLength(1);
    expect(shown[0]).toBeInstanceOf(StatusModal);
    expect(queryOf(shown[0]).get('view')).toBe('status');
    expect((shown[0] as any).config.title).toBe('Quodsi status');
  });

  it('passes the API base URL on the query string, the same way the Advisor modal does', () => {
    (globalThis as any).__LOCAL_API_OVERRIDE__ = 'http://localhost:8000';
    SimulationRunHandler.handleMessage(openMessage());
    expect(queryOf(shown[0]).get('apiBaseUrl')).toBe('http://localhost:8000');
  });

  it('still opens with an empty apiBaseUrl when none is configured (the view shows a clear message)', () => {
    SimulationRunHandler.handleMessage(openMessage());
    expect(queryOf(shown[0]).get('apiBaseUrl')).toBe('');
  });

  it('builds its URL without URLSearchParams (absent in the Lucid extension sandbox)', () => {
    const saved = (globalThis as any).URLSearchParams;
    delete (globalThis as any).URLSearchParams;
    try {
      expect(SimulationRunHandler.handleMessage(openMessage())).toBe(true);
    } finally {
      (globalThis as any).URLSearchParams = saved;
    }
    expect(shown).toHaveLength(1);
  });

  it('ignores a second open while one is showing, and allows a new one after it closes', () => {
    SimulationRunHandler.handleMessage(openMessage());
    SimulationRunHandler.handleMessage(openMessage());
    expect(shown).toHaveLength(1);

    (shown[0] as any).frameClosed();
    SimulationRunHandler.handleMessage(openMessage());
    expect(shown).toHaveLength(2);
  });
});
