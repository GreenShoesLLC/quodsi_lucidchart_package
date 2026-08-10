// editorextensions/quodsi_editor_extension/tests/messaging/referenceDataBuilder.stateExpressions.test.ts
//
// EditorReferenceData strips exactly what the delete-time expression detector
// needs (activities[].actions[].modifications, generators[].initialStateModifications)
// unless referenceDataBuilder puts it back. This pins the wire shape end-to-end:
// build a summary from a fake ModelDefinition, then feed that summary straight
// into the real shared detector (findExpressionsReferencingState) and confirm it
// finds the hits. A regression here would make the builder run and silently find
// nothing — the exact "worse than no warning" failure mode this feature exists to
// avoid.
import { referenceDataBuilder } from '../../src/core/messaging/handlers/selection/utils/referenceDataBuilder';
import { findExpressionsReferencingState } from '@quodsi/lucid-shared';
import type { ModelManager } from '../../src/core/ModelManager';

/** Duck-typed list manager: buildAllReferenceData only ever calls .getAll(). */
function list<T>(items: T[]) {
  return { getAll: () => items } as any;
}

function fakeModelManager(modelDef: any): ModelManager {
  return { getModelDefinition: async () => modelDef } as unknown as ModelManager;
}

describe('referenceDataBuilder — state-expression wiring', () => {
  it('carries an activity action modification valueExpression through to the summary', async () => {
    const modelDef = {
      activities: list([
        {
          id: 'activity_1',
          name: 'Process',
          connectType: 'CONNECT',
          actions: [
            {
              id: 'action_1',
              actionType: 'ASSIGN',
              modifications: [
                {
                  stateUniqueId: 'total_MODEL_1',
                  stateName: 'total',
                  operation: 'ASSIGN',
                  valueExpression: 'qty * unit_price',
                },
              ],
            },
          ],
        },
      ]),
      generators: list([]),
      resources: list([]),
      entities: list([]),
      resourceRequirements: list([]),
      connectors: list([]),
      states: list([]),
      timePatterns: list([]),
      timeDistributedConfigs: list([]),
      scenarios: list([]),
    };

    const referenceData = await referenceDataBuilder.buildAllReferenceData(fakeModelManager(modelDef));

    expect(referenceData.activities?.[0].actions?.[0].modifications).toEqual([
      {
        stateUniqueId: 'total_MODEL_1',
        stateName: 'total',
        operation: 'ASSIGN',
        valueExpression: 'qty * unit_price',
      },
    ]);

    // Integration check: the summary this builder produces is exactly what the
    // dialog will hand to the real shared detector — prove that hop works too.
    const hits = findExpressionsReferencingState(
      {
        activities: referenceData.activities,
        generators: referenceData.generators,
        connectors: referenceData.connectors as unknown as Record<string, unknown>[] | undefined,
      },
      'unit_price'
    );
    expect(hits).toEqual([{ elementId: 'activity_1', stateName: 'total', expression: 'qty * unit_price' }]);
  });

  it('recurses into BRANCH ifTrue/ifFalse so a nested modification is still visible', async () => {
    const modelDef = {
      activities: list([
        {
          id: 'activity_2',
          name: 'Route',
          actions: [
            {
              id: 'branch_1',
              actionType: 'BRANCH',
              ifTrue: [
                {
                  id: 'action_2',
                  actionType: 'ASSIGN',
                  modifications: [
                    {
                      stateUniqueId: 'flag_MODEL_1',
                      stateName: 'flag',
                      operation: 'ASSIGN',
                      valueExpression: 'now() - entry_time',
                    },
                  ],
                },
              ],
              ifFalse: [],
            },
          ],
        },
      ]),
      generators: list([]),
      resources: list([]),
      entities: list([]),
      resourceRequirements: list([]),
      connectors: list([]),
      states: list([]),
      timePatterns: list([]),
      timeDistributedConfigs: list([]),
      scenarios: list([]),
    };

    const referenceData = await referenceDataBuilder.buildAllReferenceData(fakeModelManager(modelDef));

    const hits = findExpressionsReferencingState(
      {
        activities: referenceData.activities,
        generators: referenceData.generators,
        connectors: referenceData.connectors as unknown as Record<string, unknown>[] | undefined,
      },
      'entry_time'
    );
    expect(hits).toEqual([{ elementId: 'activity_2', stateName: 'flag', expression: 'now() - entry_time' }]);
  });

  it('carries generator initialStateModifications through to the summary', async () => {
    const modelDef = {
      activities: list([]),
      generators: list([
        {
          id: 'generator_1',
          name: 'Arrivals',
          generationConfig: {
            initialStateModifications: [
              {
                stateUniqueId: 'priority_ENTITY_1',
                stateName: 'priority',
                operation: 'ASSIGN',
                valueExpression: 'base_priority + 1',
              },
            ],
          },
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

    const referenceData = await referenceDataBuilder.buildAllReferenceData(fakeModelManager(modelDef));

    expect(referenceData.generators?.[0].initialStateModifications).toEqual([
      {
        stateUniqueId: 'priority_ENTITY_1',
        stateName: 'priority',
        operation: 'ASSIGN',
        valueExpression: 'base_priority + 1',
      },
    ]);

    const hits = findExpressionsReferencingState(
      {
        activities: referenceData.activities,
        generators: referenceData.generators,
        connectors: referenceData.connectors as unknown as Record<string, unknown>[] | undefined,
      },
      'base_priority'
    );
    expect(hits).toEqual([{ elementId: 'generator_1', stateName: 'priority', expression: 'base_priority + 1' }]);
  });

  it('omits valueExpression for literal-value modifications', async () => {
    const modelDef = {
      activities: list([
        {
          id: 'activity_3',
          name: 'Literal',
          actions: [
            {
              id: 'action_3',
              actionType: 'ASSIGN',
              modifications: [
                { stateUniqueId: 'count_MODEL_1', stateName: 'count', operation: 'ADD', value: 1 },
              ],
            },
          ],
        },
      ]),
      generators: list([]),
      resources: list([]),
      entities: list([]),
      resourceRequirements: list([]),
      connectors: list([]),
      states: list([]),
      timePatterns: list([]),
      timeDistributedConfigs: list([]),
      scenarios: list([]),
    };

    const referenceData = await referenceDataBuilder.buildAllReferenceData(fakeModelManager(modelDef));

    const mod = referenceData.activities?.[0].actions?.[0].modifications?.[0];
    expect(mod).toEqual({ stateUniqueId: 'count_MODEL_1', stateName: 'count', operation: 'ADD' });
    expect(mod && 'valueExpression' in mod).toBe(false);
  });
});
