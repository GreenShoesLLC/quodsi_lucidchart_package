// tests/messaging/simulationRunHandler.openStudiesModal.test.ts
//
// OPEN_STUDIES_MODAL opens the compiled Studies surface (quodsim-react
// ?view=studies) at once and syncs the model in the background: UpsertModel
// (server id) AND the model-definition snapshot push. The modal pulls the
// outcome with REQUEST_STUDIO_EMBED_PATH, answered STUDIO_EMBED_PATH
// { modelId?, synced, error? } only once both are done. Mocks mirror
// simulationRunHandler.openAdvisorModal.test.ts.

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

const upsertModelMock = jest.fn();
const pushSnapshotMock = jest.fn();
jest.mock('../../src/core/sync/scenarioSync', () => ({
  upsertModel: (...args: unknown[]) => upsertModelMock(...args),
  canonicalModelName: jest.fn(async () => 'Clinic'),
  pushModelDefinitionSnapshot: (...args: unknown[]) => pushSnapshotMock(...args),
}));

jest.mock('lucid-extension-sdk', () => {
  const actual = jest.requireActual('lucid-extension-sdk');
  return {
    ...actual,
    Viewport: class {
      getCurrentPage() {
        return { id: 'pg-1' };
      }
    },
  };
});

import { EnvelopeMessageType } from '@quodsi/lucid-shared';
import { SimulationRunHandler } from '../../src/core/messaging/handlers/simulationRunHandler';
import { StudiesModal } from '../../src/panels/StudiesModal';

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};

function openMessage(): any {
  return {
    id: `open-${Math.random()}`,
    type: EnvelopeMessageType.OPEN_STUDIES_MODAL,
    source: 'model-iframe',
    target: 'host',
    version: '1.0',
    data: { documentId: 'doc-1', pageId: 'pg-1', modalSize: 'large' },
  };
}

function pathRequest(): any {
  return {
    id: `req-${Math.random()}`,
    type: EnvelopeMessageType.REQUEST_STUDIO_EMBED_PATH,
    source: 'studio-embed-iframe',
    target: 'host',
    version: '1.0',
    data: {},
  };
}

function params(modal: StudiesModal): Record<string, string> {
  const url: string = (modal as any).config.url;
  const q = new URLSearchParams(url.slice(url.indexOf('?') + 1));
  return Object.fromEntries(q.entries());
}

/** The STUDIO_EMBED_PATH replies sent so far. */
function replies(): Array<{ channel: string; msg: any }> {
  return sendMock.mock.calls
    .filter(([, m]) => m.type === EnvelopeMessageType.STUDIO_EMBED_PATH)
    .map(([channel, msg]) => ({ channel, msg }));
}

let shown: StudiesModal[];

beforeEach(() => {
  shown = [];
  sendMock.mockClear();
  upsertModelMock.mockReset();
  pushSnapshotMock.mockReset();
  (SimulationRunHandler as any).studiesSync = null;
  (SimulationRunHandler as any).scenarioModelIdCache.clear();
  jest.spyOn(StudiesModal.prototype, 'show').mockImplementation(async function (this: StudiesModal) {
    shown.push(this);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('OPEN_STUDIES_MODAL', () => {
  it('first open: opens the compiled Studies view without a modelId and replies once upsert AND snapshot are done', async () => {
    const upsert = deferred<{ serverModelId: string | null }>();
    const snap = deferred<void>();
    upsertModelMock.mockReturnValue(upsert.promise);
    pushSnapshotMock.mockReturnValue(snap.promise);

    expect(SimulationRunHandler.handleMessage(openMessage())).toBe(true);
    await flush();
    expect(shown).toHaveLength(1);
    const p = params(shown[0]);
    expect(p.view).toBe('studies');
    expect(p.title).toBe('Studies');
    expect('apiBaseUrl' in p).toBe(true);
    expect('modelId' in p).toBe(false);
    expect((shown[0] as any).config.chromeless).toBe(true);
    expect((shown[0] as any).config.url.startsWith('quodsim-react/index.html?')).toBe(true);

    SimulationRunHandler.handleMessage(pathRequest());
    upsert.resolve({ serverModelId: 'srv-1' });
    await flush();
    expect(replies()).toHaveLength(0); // snapshot push still in flight

    snap.resolve();
    await flush();
    const r = replies();
    expect(r).toHaveLength(1);
    expect(r[0].channel).toBe('studio-embed');
    expect(r[0].msg.target).toBe('studio-embed-iframe');
    expect(r[0].msg.data).toEqual({ modelId: 'srv-1', synced: true });
  });

  it('cached open: carries the cached modelId, waits for the snapshot, and replies with a changed upsert id', async () => {
    upsertModelMock.mockResolvedValue({ serverModelId: 'srv-1' });
    pushSnapshotMock.mockResolvedValue(undefined);
    SimulationRunHandler.handleMessage(openMessage());
    await flush();

    const upsert = deferred<{ serverModelId: string | null }>();
    const snap = deferred<void>();
    upsertModelMock.mockReturnValue(upsert.promise);
    pushSnapshotMock.mockReturnValue(snap.promise);
    sendMock.mockClear();

    SimulationRunHandler.handleMessage(openMessage());
    await flush();
    expect(shown).toHaveLength(2);
    expect(params(shown[1]).modelId).toBe('srv-1');

    SimulationRunHandler.handleMessage(pathRequest());
    upsert.resolve({ serverModelId: 'srv-2' });
    await flush();
    expect(replies()).toHaveLength(0);

    snap.resolve();
    await flush();
    expect(replies()[0].msg.data).toEqual({ modelId: 'srv-2', synced: true });
  });

  it('snapshot push failure: replies synced:false with the cached id and the error', async () => {
    upsertModelMock.mockResolvedValue({ serverModelId: 'srv-1' });
    pushSnapshotMock.mockResolvedValue(undefined);
    SimulationRunHandler.handleMessage(openMessage());
    await flush();
    sendMock.mockClear();

    pushSnapshotMock.mockRejectedValue(new Error('snapshot boom'));
    SimulationRunHandler.handleMessage(openMessage());
    await flush();
    SimulationRunHandler.handleMessage(pathRequest());
    await flush();
    expect(replies()[0].msg.data).toEqual({ modelId: 'srv-1', synced: false, error: 'snapshot boom' });
  });

  it('upsert with no id and no cache: replies model id unresolved', async () => {
    upsertModelMock.mockResolvedValue({ serverModelId: null });
    pushSnapshotMock.mockResolvedValue(undefined);
    SimulationRunHandler.handleMessage(openMessage());
    await flush();
    SimulationRunHandler.handleMessage(pathRequest());
    await flush();
    const data = replies()[0].msg.data;
    expect(data.synced).toBe(false);
    expect(data.error).toBe('model id unresolved');
    expect(data.modelId).toBeUndefined();
  });

  it('REQUEST_STUDIO_EMBED_PATH with no Studies open: replies no pending Studies open', async () => {
    SimulationRunHandler.handleMessage(pathRequest());
    await flush();
    const data = replies()[0].msg.data;
    expect(data.synced).toBe(false);
    expect(data.error).toBe('no pending Studies open');
    expect(data.modelId).toBeUndefined();
  });
});
