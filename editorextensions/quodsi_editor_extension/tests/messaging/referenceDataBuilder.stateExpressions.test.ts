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
//
// Wire-cleanup Phase B2 Task 6/9: fixtures and expectations use the clean field
// names — action `type` (not `actionType`), modification `stateId`/`expression`
// (not `stateUniqueId`/`stateName`/`valueExpression`), Generator's flat
// `initialStates` (dissolved `EntitySourceConfig`, not nested
// `generationConfig.initialStateModifications`), Activity's `sourceConfig.
// initialStates` (not `.initialStateModifications`). Connector-level state
// changes are expressed as an ASSIGN action inside `actions` now — the old
// standalone `stateModifications` field has no `Connector` field any more, so
// the "connectors pass through untouched" case below exercises `actions`.
import { referenceDataBuilder } from '../../src/core/messaging/handlers/selection/utils/referenceDataBuilder';
import { findExpressionsReferencingState } from '@quodsi/lucid-shared';
import type { ModelManager } from '../../src/core/ModelManager';
import type { StateReferenceScope } from '@quodsi/lucid-shared';

/** Duck-typed list manager: buildAllReferenceData only ever calls .getAll(). */
function list<T>(items: T[]) {
  return { getAll: () => items } as any;
}

function fakeModelManager(modelDef: any): ModelManager {
  return { getModelDefinition: async () => modelDef } as unknown as ModelManager;
}

describe('referenceDataBuilder — state-expression wiring', () => {
  it('carries an activity action modification expression through to the summary', async () => {
    const modelDef = {
      activities: list([
        {
          id: 'activity_1',
          name: 'Process',
          routing: 'probability',
          actions: [
            {
              id: 'action_1',
              type: 'assign',
              modifications: [
                {
                  stateId: 'total',
                  operation: 'assign',
                  expression: 'qty * unit_price',
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
        stateId: 'total',
        operation: 'assign',
        expression: 'qty * unit_price',
      },
    ]);

    // Integration check: the summary this builder produces is exactly what the
    // dialog will hand to the real shared detector — prove that hop works too.
    const hits = findExpressionsReferencingState(
      {
        activities: referenceData.activities,
        generators: referenceData.generators,
        connectors: referenceData.connectors as unknown as StateReferenceScope['connectors'],
      },
      'unit_price'
    );
    expect(hits).toEqual([{ elementId: 'activity_1', stateId: 'total', expression: 'qty * unit_price' }]);
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
              type: 'branch',
              ifTrue: [
                {
                  id: 'action_2',
                  type: 'assign',
                  modifications: [
                    {
                      stateId: 'flag',
                      operation: 'assign',
                      expression: 'now() - entry_time',
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
        connectors: referenceData.connectors as unknown as StateReferenceScope['connectors'],
      },
      'entry_time'
    );
    expect(hits).toEqual([{ elementId: 'activity_2', stateId: 'flag', expression: 'now() - entry_time' }]);
  });

  it('carries generator initialStateModifications through to the summary', async () => {
    const modelDef = {
      activities: list([]),
      generators: list([
        {
          id: 'generator_1',
          name: 'Arrivals',
          // Wire-cleanup Phase B2 Task 5: EntitySourceConfig dissolved —
          // initialStates is flat on the Generator now.
          initialStates: [
            {
              stateId: 'priority',
              operation: 'assign',
              expression: 'base_priority + 1',
            },
          ],
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

    expect(referenceData.generators?.[0].initialStates).toEqual([
      {
        stateId: 'priority',
        operation: 'assign',
        expression: 'base_priority + 1',
      },
    ]);

    const hits = findExpressionsReferencingState(
      {
        activities: referenceData.activities,
        generators: referenceData.generators,
        connectors: referenceData.connectors as unknown as StateReferenceScope['connectors'],
      },
      'base_priority'
    );
    expect(hits).toEqual([{ elementId: 'generator_1', stateId: 'priority', expression: 'base_priority + 1' }]);
  });

  it('omits expression for literal-value modifications', async () => {
    const modelDef = {
      activities: list([
        {
          id: 'activity_3',
          name: 'Literal',
          actions: [
            {
              id: 'action_3',
              type: 'assign',
              modifications: [
                { stateId: 'count', operation: 'add', value: 1 },
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
    expect(mod).toEqual({ stateId: 'count', operation: 'add' });
    expect(mod && 'expression' in mod).toBe(false);
  });

  // Fix round 1, Finding 1: Activity.sourceConfig.initialStates (a
  // self-generating activity's own initial state modifications, distinct from a
  // Generator's own flat initialStates) was the one surface where the detector
  // (stateReferences.ts:335-336) and Lucid's own removal path
  // (ModelManager.cleanupStateReferences, ModelManager.ts:949-959) both already
  // looked, but the builder's activity summary didn't carry it -- a silent miss.
  it('carries an activity sourceConfig.initialStates expression through to the summary', async () => {
    const modelDef = {
      activities: list([
        {
          id: 'activity_4',
          name: 'SelfGen',
          sourceConfig: {
            initialStates: [
              {
                stateId: 'batch_size',
                operation: 'assign',
                expression: 'seed_qty * 2',
              },
            ],
          },
          actions: [],
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

    expect(referenceData.activities?.[0].sourceConfig?.initialStates).toEqual([
      {
        stateId: 'batch_size',
        operation: 'assign',
        expression: 'seed_qty * 2',
      },
    ]);

    const hits = findExpressionsReferencingState(
      {
        activities: referenceData.activities,
        generators: referenceData.generators,
        connectors: referenceData.connectors as unknown as StateReferenceScope['connectors'],
      },
      'seed_qty'
    );
    expect(hits).toEqual([{ elementId: 'activity_4', stateId: 'batch_size', expression: 'seed_qty * 2' }]);
  });

  // A LOOP body is the other recursive branch besides BRANCH's ifTrue/ifFalse;
  // only ifTrue was exercised before. cleanAction (stateReferences.ts) already
  // paid once for under-covering LOOP bodies, so this pins the detection side too.
  it('recurses into a LOOP body so a nested modification is still visible', async () => {
    const modelDef = {
      activities: list([
        {
          id: 'activity_5',
          name: 'Repeat',
          actions: [
            {
              id: 'loop_1',
              type: 'loop',
              count: 3,
              actions: [
                {
                  id: 'action_5',
                  type: 'assign',
                  modifications: [
                    {
                      stateId: 'total',
                      operation: 'assign',
                      expression: 'total + step_value',
                    },
                  ],
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

    // The summary itself nests the LOOP body under `actions`, mirroring the real model.
    expect(referenceData.activities?.[0].actions?.[0].actions?.[0].modifications).toEqual([
      {
        stateId: 'total',
        operation: 'assign',
        expression: 'total + step_value',
      },
    ]);

    const hits = findExpressionsReferencingState(
      {
        activities: referenceData.activities,
        generators: referenceData.generators,
        connectors: referenceData.connectors as unknown as StateReferenceScope['connectors'],
      },
      'step_value'
    );
    expect(hits).toEqual([{ elementId: 'activity_5', stateId: 'total', expression: 'total + step_value' }]);
  });

  // Connectors are already full Connector objects on EditorReferenceData (never
  // summarized), so the builder should pass them through untouched and the
  // detector should still find expression hits inside them. Every other test in
  // this file passes `connectors: []` -- this is the one that actually exercises
  // a populated connector.
  //
  // Wire-cleanup Phase B2 Task 5/9: the old standalone `stateModifications`
  // field on a connector has no `Connector` field any more (never executed by
  // the engine even before the rename) — connector-level state changes are
  // expressed as an ASSIGN action inside `actions`, which is what both the
  // detector (`walkActionsForExpressions`) and this fixture now use.
  it('passes connectors through untouched, and the detector finds expressions inside them', async () => {
    const modelDef = {
      activities: list([]),
      generators: list([]),
      resources: list([]),
      entities: list([]),
      resourceRequirements: list([]),
      connectors: list([
        {
          id: 'connector_1',
          actions: [
            {
              id: 'action_6',
              type: 'assign',
              modifications: [
                {
                  stateId: 'wait_time',
                  operation: 'assign',
                  expression: 'now() - entry_time',
                },
              ],
            },
          ],
        },
      ]),
      states: list([]),
      timePatterns: list([]),
      timeDistributedConfigs: list([]),
      scenarios: list([]),
    };

    const referenceData = await referenceDataBuilder.buildAllReferenceData(fakeModelManager(modelDef));

    expect(referenceData.connectors).toEqual([
      {
        id: 'connector_1',
        actions: [
          {
            id: 'action_6',
            type: 'assign',
            modifications: [
              {
                stateId: 'wait_time',
                operation: 'assign',
                expression: 'now() - entry_time',
              },
            ],
          },
        ],
      },
    ]);

    const hits = findExpressionsReferencingState(
      {
        activities: referenceData.activities,
        generators: referenceData.generators,
        connectors: referenceData.connectors as unknown as StateReferenceScope['connectors'],
      },
      'entry_time'
    );
    expect(hits).toEqual([{ elementId: 'connector_1', stateId: 'wait_time', expression: 'now() - entry_time' }]);
  });
});
