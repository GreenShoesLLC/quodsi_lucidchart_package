describe('ModelManager.cleanupRequirementReferences', () => {
  function harness(elementDataByBlockId: Record<string, any>) {
    const saved: Record<string, any> = {};
    const blocks = new Map(
      Object.keys(elementDataByBlockId).map((id) => [id, { id }])
    );
    const storageAdapter = {
      getElementData: (block: { id: string }) => elementDataByBlockId[block.id],
      getElementType: (_block: { id: string }) => ({ type: 'Activity' }),
      setElementData: (block: { id: string }, data: any, _type: unknown) => {
        saved[block.id] = data;
      },
    };
    const page = { allBlocks: blocks };
    return { saved, storageAdapter, page };
  }

  it('clears a repair requirement reference (failureProperties.repairResourceRequirementId) on delete', async () => {
    const elementDataByBlockId = {
      'activity-1': {
        actions: [],
        failureProperties: { repairResourceRequirementId: 'req-1' },
      },
    };
    const { saved, storageAdapter, page } = harness(elementDataByBlockId);
    const { ModelManager } = require('../../src/core/ModelManager');
    const mm: any = Object.create(ModelManager.prototype);
    mm.storageAdapter = storageAdapter;
    mm.debug = { debug: () => {}, error: () => {} };

    const affectedCount = await mm.cleanupRequirementReferences('req-1', page);

    expect(affectedCount).toBe(1);
    expect(saved['activity-1'].failureProperties.repairResourceRequirementId).toBe('');
  });

  it('leaves a repair requirement reference to a DIFFERENT requirement untouched', async () => {
    const elementDataByBlockId = {
      'activity-1': {
        actions: [],
        failureProperties: { repairResourceRequirementId: 'req-other' },
      },
    };
    const { saved, storageAdapter, page } = harness(elementDataByBlockId);
    const { ModelManager } = require('../../src/core/ModelManager');
    const mm: any = Object.create(ModelManager.prototype);
    mm.storageAdapter = storageAdapter;
    mm.debug = { debug: () => {}, error: () => {} };

    const affectedCount = await mm.cleanupRequirementReferences('req-1', page);

    expect(affectedCount).toBe(0);
    expect(saved['activity-1']).toBeUndefined();
  });

  it('clears both an action reference AND a repair reference on the same activity in one pass', async () => {
    const elementDataByBlockId = {
      'activity-1': {
        actions: [{ id: 'a1', type: 'seize', resourceRequirementId: 'req-1' }],
        failureProperties: { repairResourceRequirementId: 'req-1' },
      },
    };
    const { saved, storageAdapter, page } = harness(elementDataByBlockId);
    const { ModelManager } = require('../../src/core/ModelManager');
    const mm: any = Object.create(ModelManager.prototype);
    mm.storageAdapter = storageAdapter;
    mm.debug = { debug: () => {}, error: () => {} };

    const affectedCount = await mm.cleanupRequirementReferences('req-1', page);

    expect(affectedCount).toBe(1);
    expect(saved['activity-1'].actions).toEqual([]);
    expect(saved['activity-1'].failureProperties.repairResourceRequirementId).toBe('');
  });
});
