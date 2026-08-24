// editorextensions/quodsi_editor_extension/tests/messaging/referenceDataBuilder.repairRequirement.test.ts
//
// The activity summary in EditorReferenceData is what the shared requirement
// editor's usage counts read (activities[].failureProperties.
// repairResourceRequirementId). Without this field, a resource requirement
// referenced only from an activity's Failure tab (repair resource) would be
// undercounted relative to drawio and Visio, which both already surface it.
import { referenceDataBuilder } from '../../src/core/messaging/handlers/selection/utils/referenceDataBuilder';
import type { ModelManager } from '../../src/core/ModelManager';

/** Duck-typed list manager: buildAllReferenceData only ever calls .getAll(). */
function list<T>(items: T[]) {
  return { getAll: () => items } as any;
}

function fakeModelManager(modelDef: any): ModelManager {
  return { getModelDefinition: async () => modelDef } as unknown as ModelManager;
}

describe('referenceDataBuilder — repair requirement', () => {
  it('carries failureProperties.repairResourceRequirementId on the activity summary', async () => {
    const modelDef = {
      activities: list([
        {
          id: 'act-repair',
          name: 'Repairable',
          actions: [],
          failureProperties: {
            repairResourceRequirementId: 'req-fix',
          },
        },
        {
          id: 'act-plain',
          name: 'Plain',
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

    const withRepair = referenceData.activities!.find((a) => a.id === 'act-repair')!;
    const without = referenceData.activities!.find((a) => a.id === 'act-plain')!;

    expect(withRepair.failureProperties).toEqual({ repairResourceRequirementId: 'req-fix' });
    expect(without.failureProperties).toBeUndefined();
  });
});
