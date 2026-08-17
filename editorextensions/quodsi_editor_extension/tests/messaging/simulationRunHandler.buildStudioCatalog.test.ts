// tests/messaging/simulationRunHandler.buildStudioCatalog.test.ts
//
// Review F4 on wire-cleanup Phase B2 Task 9: `buildStudioCatalog` must relay
// `finishDateTime` (a host-projection-only field with no clean-wire slot,
// sourced from the live `Model` instance, not the serialized result) or every
// calendar-mode embed open hits a hard `missing_finish_datetime` validation
// blocker on the Studio side (`quodsi_studio`'s ScenariosEditor validation).
// Also pins the comment correction: relayed connectors carry ONLY
// id/name/sourceId/targetId/weight (RelayCatalogConnector's real field list).

import { SimulationRunHandler } from '../../src/core/messaging/handlers/simulationRunHandler';
import type { ISerializedModel } from '@quodsi/lucid-shared';

function buildCatalog(model: Partial<ISerializedModel>, modelId: string, finishDateTime: string | null) {
  // buildStudioCatalog is private static; reached via an `as any` cast, same
  // pattern used throughout this test suite for protected/private methods.
  return (SimulationRunHandler as any).buildStudioCatalog(model, modelId, finishDateTime);
}

describe('SimulationRunHandler.buildStudioCatalog (review F4)', () => {
  it('relays finishDateTime for a calendar-mode model', () => {
    const model: Partial<ISerializedModel> = {
      name: 'Calendar Model',
      timeMode: 'calendar' as any,
      timeUnit: 'minutes' as any,
      replications: 1,
      runTime: { value: 30, unit: 'days' } as any,
      startDateTime: '2027-01-01T00:00:00.000Z',
      activities: [],
      generators: [],
      resources: [],
      resourceRequirements: [],
      connectors: [],
      entities: [],
      states: [],
    };

    const catalog = buildCatalog(model, 'page-1', '2027-01-31T00:00:00.000Z');

    expect(catalog.model.startDateTime).toBe('2027-01-01T00:00:00.000Z');
    expect(catalog.model.finishDateTime).toBe('2027-01-31T00:00:00.000Z');
  });

  it('relays finishDateTime as null for a clock-mode model', () => {
    const model: Partial<ISerializedModel> = {
      name: 'Clock Model',
      timeUnit: 'minutes' as any,
      replications: 1,
      runTime: { value: 24, unit: 'hours' } as any,
      activities: [],
      generators: [],
      resources: [],
      resourceRequirements: [],
      connectors: [],
      entities: [],
      states: [],
    };

    const catalog = buildCatalog(model, 'page-1', null);

    expect(catalog.model.finishDateTime).toBeNull();
  });

  it('relays only id/name/sourceId/targetId/weight for connectors', () => {
    const model: Partial<ISerializedModel> = {
      name: 'M',
      timeUnit: 'minutes' as any,
      replications: 1,
      runTime: { value: 24, unit: 'hours' } as any,
      activities: [],
      generators: [],
      resources: [],
      resourceRequirements: [],
      connectors: [
        {
          id: 'c1',
          name: 'C1',
          sourceId: 'a1',
          targetId: 'a2',
          weight: 1,
          priority: 2,
          entityId: 'entity-1',
          condition: { stateId: 's1', comparison: 'equal', value: 1 },
        } as any,
      ],
      entities: [],
      states: [],
    };

    const catalog = buildCatalog(model, 'page-1', null);

    expect(catalog.connectors).toEqual([
      { id: 'c1', name: 'C1', sourceId: 'a1', targetId: 'a2', weight: 1 },
    ]);
  });
});
