// editorextensions/quodsi_editor_extension/tests/messaging/referenceDataBuilder.generatorRouting.test.ts
//
// Studio's shared ConnectorRoutingView (mounted from the routing tab) reads
// `routing`, `mode` and `entityId` off the generator summary in
// referenceData to drive its mode selector and single-entity-type hint.
// Without these fields, a generator's routing tab has nothing to render.
import { referenceDataBuilder } from '../../src/core/messaging/handlers/selection/utils/referenceDataBuilder';
import type { ModelManager } from '../../src/core/ModelManager';
import { ConnectType, GeneratorType } from '@quodsi/lucid-shared';

/** Duck-typed list manager: buildAllReferenceData only ever calls .getAll(). */
function list<T>(items: T[]) {
  return { getAll: () => items } as any;
}

function fakeModelManager(modelDef: any): ModelManager {
  return { getModelDefinition: async () => modelDef } as unknown as ModelManager;
}

async function buildReferenceData() {
  const modelDef = {
    activities: list([]),
    generators: list([
      {
        id: 'gen-fa',
        name: 'First Available Generator',
        routing: ConnectType.FirstAvailable,
        mode: GeneratorType.SCHEDULED,
        entityId: 'ent-vip',
      },
      {
        id: 'gen-plain',
        name: 'Plain Generator',
        routing: ConnectType.Probability,
      },
    ]),
    resources: list([]),
    entities: list([]),
    resourceRequirements: list([]),
    connectors: list([]),
    states: list([]),
    timePatterns: list([]),
    timeDistributedConfigs: list([]),
    scenarios: list([]),
  };

  return referenceDataBuilder.buildAllReferenceData(fakeModelManager(modelDef));
}

describe('referenceDataBuilder — generator routing', () => {
  it('carries routing, mode and entityId on the generator summary', async () => {
    const referenceData = await buildReferenceData();
    const fa = referenceData.generators!.find((g) => g.id === 'gen-fa')!;
    const plain = referenceData.generators!.find((g) => g.id === 'gen-plain')!;

    expect(fa.routing).toBe('first_available');
    expect(fa.mode).toBe('scheduled');
    expect(fa.entityId).toBe('ent-vip');
    expect(plain.routing).toBe('probability');
  });
});
