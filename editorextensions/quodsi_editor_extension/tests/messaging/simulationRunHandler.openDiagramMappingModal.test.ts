// tests/messaging/simulationRunHandler.openDiagramMappingModal.test.ts
//
// OPEN_DIAGRAM_MAPPING_MODAL opens the Diagram Mapping screen inline, in the
// extension's own quodsim-react bundle (spec 2026-09-15, "Diagram Mapping
// opens inline"). Unlike the old path (SimulationRunHandler.openEmbedSurfaceModal),
// it no longer resolves a server model id via UpsertModel or opens a hosted
// Studio embed -- it talks straight to DiagramMappingRelayHandler. Mocks
// mirror modelRootHandler.settingsModalGuard.test.ts and
// simulationRunHandler.openAdvisorModal.test.ts: router + ModelManager
// stubbed, the modal's show() spied so the singleton guard can be observed
// directly, and scenarioSync's upsertModel spied to prove it is never called.

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
jest.mock('../../src/core/sync/scenarioSync', () => ({
  upsertModel: upsertModelMock,
  canonicalModelName: jest.fn(),
  pushModelDefinitionSnapshot: jest.fn(),
}));

import { EnvelopeMessageType } from '@quodsi/lucid-shared';
import { SimulationRunHandler } from '../../src/core/messaging/handlers/simulationRunHandler';
import { DiagramMappingModal } from '../../src/panels/DiagramMappingModal';

function openMessage(data: Record<string, unknown> | undefined = {}): any {
  return {
    id: `open-${Math.random()}`,
    type: EnvelopeMessageType.OPEN_DIAGRAM_MAPPING_MODAL,
    source: 'model-iframe',
    target: 'host',
    version: '1.0',
    data,
  };
}

let shown: DiagramMappingModal[];

beforeEach(() => {
  shown = [];
  upsertModelMock.mockClear();
  jest.spyOn(DiagramMappingModal.prototype, 'show').mockImplementation(async function (
    this: DiagramMappingModal,
  ) {
    shown.push(this);
  });
  // Reset the handler's guard between tests -- it is module-level static state.
  (SimulationRunHandler as any).openDiagramMappingModal = null;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('OPEN_DIAGRAM_MAPPING_MODAL', () => {
  it('opens DiagramMappingModal inline and makes NO UpsertModel call', () => {
    expect(
      SimulationRunHandler.handleMessage(openMessage({ documentId: 'd1', pageId: 'p1' })),
    ).toBe(true);

    expect(shown).toHaveLength(1);
    expect((shown[0] as any).config.url).toContain('view=diagram-mapping');
    expect((shown[0] as any).config.title).toBe('Diagram Mapping');
    expect(upsertModelMock).not.toHaveBeenCalled();
  });

  it('opens with no documentId/pageId on the payload -- they are no longer required', () => {
    expect(SimulationRunHandler.handleMessage(openMessage(undefined))).toBe(true);
    expect(shown).toHaveLength(1);
  });

  it('opens exactly one modal for a double-click', () => {
    SimulationRunHandler.handleMessage(openMessage());
    SimulationRunHandler.handleMessage(openMessage());

    expect(shown).toHaveLength(1);
  });

  it('opens again once the first modal has closed', () => {
    SimulationRunHandler.handleMessage(openMessage());
    expect(shown).toHaveLength(1);

    // Lucid fires frameClosed when the modal's iframe goes away; DiagramMappingModal
    // forwards it to the handler's release callback.
    (shown[0] as any).frameClosed();

    SimulationRunHandler.handleMessage(openMessage());
    expect(shown).toHaveLength(2);
  });

  it('a LATE frameClosed from the first modal does not release a newer modal\'s claim', () => {
    SimulationRunHandler.handleMessage(openMessage());
    const first = shown[0];
    (first as any).frameClosed();

    SimulationRunHandler.handleMessage(openMessage());
    expect(shown).toHaveLength(2);

    (first as any).frameClosed();
    SimulationRunHandler.handleMessage(openMessage());
    expect(shown).toHaveLength(2);
  });
});
