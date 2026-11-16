// tests/messaging/simulationRunHandler.runScenarioTrace.test.ts
//
// Spec 2026-11-16-lucid-trace: a Lucid run's trace setting goes from RUN_SCENARIO to the
// SaveAndSubmitSimulation data action, and an old embed that sends none gets no trace keys.
import { EnvelopeMessageType } from '@quodsi/lucid-shared';

const sendMock = jest.fn();
jest.mock('../../src/core/messaging/index', () => ({ router: { send: sendMock } }));
jest.mock('../../src/core/ModelManager', () => ({ ModelManager: { getClient: () => ({}) } }));

import { SimulationRunHandler } from '../../src/core/messaging/handlers/simulationRunHandler';
import { SimulationHandler, traceActionData } from '../../src/core/messaging/handlers/simulationHandler';

const runScenario = (data: Record<string, unknown>) =>
  (SimulationRunHandler as any).handleRunScenario({
    id: 'm1', type: EnvelopeMessageType.RUN_SCENARIO, source: 'studio-embed', target: 'host', version: '1.0', data,
  });

describe('RUN_SCENARIO trace', () => {
  let handleRunRequest: jest.SpyInstance;
  beforeEach(() => {
    sendMock.mockClear();
    handleRunRequest = jest.spyOn(SimulationHandler, 'handleRunRequest').mockResolvedValue({ accepted: true } as any);
  });
  afterEach(() => handleRunRequest.mockRestore());

  it('handleRunScenario forwards traceReps', async () => {
    await runScenario({ scenarioId: 's1', enableAnimation: false, traceReps: 4 });
    expect(handleRunRequest.mock.calls[0][0].data).toMatchObject({ scenarioDefinitionId: 's1', traceReps: 4 });
  });

  it('and sends none when the embed sent none', async () => {
    await runScenario({ scenarioId: 's1', enableAnimation: false });
    expect(handleRunRequest.mock.calls[0][0].data).not.toHaveProperty('traceReps');
  });
});

describe('traceActionData', () => {
  it('the data action carries enableTrace and traceReps when set', () => {
    expect(traceActionData(4)).toEqual({ enableTrace: true, traceReps: 4 });
  });

  it('and no trace keys when not set', () => {
    expect(traceActionData(undefined)).toEqual({});
    expect(traceActionData(0)).toEqual({});
  });
});
