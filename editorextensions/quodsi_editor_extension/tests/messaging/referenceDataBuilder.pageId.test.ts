// Page guard (spec 2026-09-11): referenceData names the page it was built
// from, so the panel's states/requirements/model writes can echo it back.
import { referenceDataBuilder } from '../../src/core/messaging/handlers/selection/utils/referenceDataBuilder';
import type { ModelManager } from '../../src/core/ModelManager';

function list<T>(items: T[]) {
  return { getAll: () => items } as any;
}

const emptyModelDef = {
  activities: list([]),
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

describe('referenceDataBuilder — pageId', () => {
  it('stamps referenceData with the model manager’s current page id', async () => {
    const mm = {
      getModelDefinition: async () => emptyModelDef,
      getCurrentPageId: () => 'page-7',
    } as unknown as ModelManager;

    const referenceData = await referenceDataBuilder.buildAllReferenceData(mm);

    expect(referenceData.pageId).toBe('page-7');
  });

  it('leaves pageId undefined when no page is tracked', async () => {
    const mm = {
      getModelDefinition: async () => emptyModelDef,
      getCurrentPageId: () => undefined,
    } as unknown as ModelManager;

    const referenceData = await referenceDataBuilder.buildAllReferenceData(mm);

    expect(referenceData.pageId).toBeUndefined();
  });
});
