describe('ModelManager.updateModelRoot', () => {
  function harness() {
    const saved: Record<string, unknown> = {};
    const storageAdapter = {
      setArrivalPatterns: (_p: unknown, v: unknown) => { saved.arrivalPatterns = v; },
      getArrivalPatterns: () => [],
      setArrivalSchedules: (_p: unknown, v: unknown) => { saved.arrivalSchedules = v; },
      getArrivalSchedules: () => [],
      setWorkSchedules: (_p: unknown, v: unknown) => { saved.workSchedules = v; },
      getWorkSchedules: () => [],
    };
    const changeTracker = {
      modelDefinitionDirty: false,
      validationDirty: false,
      lastModelDefinitionUpdate: 0,
      lastValidationUpdate: 0,
      pendingChanges: new Set<string>(),
    };
    return { saved, storageAdapter, changeTracker };
  }

  it('persists an arrivalPatterns patch and self-invalidates the ModelDefinition cache', async () => {
    const { saved, storageAdapter, changeTracker } = harness();
    const { ModelManager } = require('../../src/core/ModelManager');
    const mm: any = Object.create(ModelManager.prototype);
    mm.storageAdapter = storageAdapter;
    mm.debug = { debug: () => {}, error: () => {} };
    mm.changeTracker = changeTracker;

    await mm.updateModelRoot({ arrivalPatterns: [{ id: 'ap-1', name: 'P1' }] }, { id: 'page-1' });

    expect(saved.arrivalPatterns).toEqual([{ id: 'ap-1', name: 'P1' }]);

    // Pins the sibling convention (updateStates / updateEntities /
    // updateResourceRequirements / updateScenarios all self-invalidate):
    // a caller that reads buildModelRootProjection right after a write must
    // not see a stale cached ModelDefinition, even without an intervening
    // validateModel() call.
    expect(changeTracker.modelDefinitionDirty).toBe(true);
  });

  it('persists an arrivalSchedules patch and self-invalidates the ModelDefinition cache', async () => {
    const { saved, storageAdapter, changeTracker } = harness();
    const { ModelManager } = require('../../src/core/ModelManager');
    const mm: any = Object.create(ModelManager.prototype);
    mm.storageAdapter = storageAdapter;
    mm.debug = { debug: () => {}, error: () => {} };
    mm.changeTracker = changeTracker;

    await mm.updateModelRoot({ arrivalSchedules: [{ id: 'as-1', name: 'S1' }] }, { id: 'page-1' });

    expect(saved.arrivalSchedules).toEqual([{ id: 'as-1', name: 'S1' }]);
    expect(changeTracker.modelDefinitionDirty).toBe(true);
  });

  // The one worth having: a single patch carrying BOTH model-root keys must
  // persist both. This is the actual test of whether updateModelRoot's
  // dispatch generalised for a second model-level list, or whether
  // arrivalSchedules just became a second hardcoded special case sitting
  // next to arrivalPatterns without proving the route is generic.
  it('persists both arrivalPatterns and arrivalSchedules from a single mixed patch', async () => {
    const { saved, storageAdapter, changeTracker } = harness();
    const { ModelManager } = require('../../src/core/ModelManager');
    const mm: any = Object.create(ModelManager.prototype);
    mm.storageAdapter = storageAdapter;
    mm.debug = { debug: () => {}, error: () => {} };
    mm.changeTracker = changeTracker;

    await mm.updateModelRoot(
      {
        arrivalPatterns: [{ id: 'ap-1', name: 'P1' }],
        arrivalSchedules: [{ id: 'as-1', name: 'S1' }],
      },
      { id: 'page-1' }
    );

    expect(saved.arrivalPatterns).toEqual([{ id: 'ap-1', name: 'P1' }]);
    expect(saved.arrivalSchedules).toEqual([{ id: 'as-1', name: 'S1' }]);
    expect(changeTracker.modelDefinitionDirty).toBe(true);
  });

  it('persists a workSchedules patch and self-invalidates the ModelDefinition cache', async () => {
    const { saved, storageAdapter, changeTracker } = harness();
    const { ModelManager } = require('../../src/core/ModelManager');
    const mm: any = Object.create(ModelManager.prototype);
    mm.storageAdapter = storageAdapter;
    mm.debug = { debug: () => {}, error: () => {} };
    mm.changeTracker = changeTracker;

    await mm.updateModelRoot(
      { workSchedules: [{ id: 'ws-1', name: 'Nursing team' }] },
      { id: 'page-1' }
    );

    expect(saved.workSchedules).toEqual([{ id: 'ws-1', name: 'Nursing team' }]);
    expect(changeTracker.modelDefinitionDirty).toBe(true);
  });

  // Three model-level lists in ONE patch. CapacitySourcePicker's "New
  // schedule" is the real-world shape of this: it writes the whole
  // `workSchedules` list, and the caller writes the link in the same breath.
  // Without a `workSchedules` case in updateModelRoot the whole patch would
  // THROW (unknown key) and nothing at all would persist -- all-or-nothing is
  // the documented contract, so a missing case is not a partial write, it is
  // a total one.
  it('persists workSchedules alongside the two arrival lists in a single mixed patch', async () => {
    const { saved, storageAdapter, changeTracker } = harness();
    const { ModelManager } = require('../../src/core/ModelManager');
    const mm: any = Object.create(ModelManager.prototype);
    mm.storageAdapter = storageAdapter;
    mm.debug = { debug: () => {}, error: () => {} };
    mm.changeTracker = changeTracker;

    await mm.updateModelRoot(
      {
        arrivalPatterns: [{ id: 'ap-1', name: 'P1' }],
        arrivalSchedules: [{ id: 'as-1', name: 'S1' }],
        workSchedules: [{ id: 'ws-1', name: 'Nursing team' }],
      },
      { id: 'page-1' }
    );

    expect(saved.arrivalPatterns).toEqual([{ id: 'ap-1', name: 'P1' }]);
    expect(saved.arrivalSchedules).toEqual([{ id: 'as-1', name: 'S1' }]);
    expect(saved.workSchedules).toEqual([{ id: 'ws-1', name: 'Nursing team' }]);
    expect(changeTracker.modelDefinitionDirty).toBe(true);
  });

  // spec 2026-09-11: Lucid's Entities tab mounts the shared EntitiesEditor,
  // which writes accessor.updateModel({ entities }). The key must route to
  // updateEntities -- the one place that re-inserts the Default Entity and
  // runs the reference cascade -- not to a bare setEntities.
  it('routes an entities patch through updateEntities', async () => {
    const { storageAdapter, changeTracker } = harness();
    const { ModelManager } = require('../../src/core/ModelManager');
    const mm: any = Object.create(ModelManager.prototype);
    mm.storageAdapter = storageAdapter;
    mm.debug = { debug: () => {}, error: () => {} };
    mm.changeTracker = changeTracker;
    const updateEntities = jest.fn().mockResolvedValue(undefined);
    mm.updateEntities = updateEntities;

    const entities = [{ id: 'ent-1', name: 'Customer', description: 'walk-in' }];
    const page = { id: 'page-1' };
    await mm.updateModelRoot({ entities }, page);

    expect(updateEntities).toHaveBeenCalledTimes(1);
    expect(updateEntities).toHaveBeenCalledWith(entities, page);
    expect(changeTracker.modelDefinitionDirty).toBe(true);
  });

  it('still rejects a mixed patch with an unknown key before writing entities', async () => {
    const { storageAdapter, changeTracker } = harness();
    const { ModelManager } = require('../../src/core/ModelManager');
    const mm: any = Object.create(ModelManager.prototype);
    mm.storageAdapter = storageAdapter;
    mm.debug = { debug: () => {}, error: () => {} };
    mm.changeTracker = changeTracker;
    const updateEntities = jest.fn().mockResolvedValue(undefined);
    mm.updateEntities = updateEntities;

    await expect(
      mm.updateModelRoot({ entities: [], bogus: 1 }, { id: 'page-1' })
    ).rejects.toThrow(/bogus/);
    expect(updateEntities).not.toHaveBeenCalled();
  });

  it('throws on an unknown key rather than dropping it silently', async () => {
    const { storageAdapter, changeTracker } = harness();
    const { ModelManager } = require('../../src/core/ModelManager');
    const mm: any = Object.create(ModelManager.prototype);
    mm.storageAdapter = storageAdapter;
    mm.debug = { debug: () => {}, error: () => {} };
    mm.changeTracker = changeTracker;

    await expect(
      mm.updateModelRoot({ somethingNobodyHandles: [1, 2] }, { id: 'page-1' })
    ).rejects.toThrow(/somethingNobodyHandles/);
  });

  it('is all-or-nothing: a mixed known+unknown patch persists nothing and does not mark the cache dirty', async () => {
    const { saved, storageAdapter, changeTracker } = harness();
    const { ModelManager } = require('../../src/core/ModelManager');
    const mm: any = Object.create(ModelManager.prototype);
    mm.storageAdapter = storageAdapter;
    mm.debug = { debug: () => {}, error: () => {} };
    mm.changeTracker = changeTracker;

    await expect(
      mm.updateModelRoot(
        { arrivalPatterns: [{ id: 'ap-1', name: 'P1' }], bogus: true },
        { id: 'page-1' }
      )
    ).rejects.toThrow(/bogus/);

    // The recognised key must NOT have been written -- a partial write
    // followed by a loud failure would leave React's cache diverged from
    // storage just as badly as a silent drop would.
    expect(saved.arrivalPatterns).toBeUndefined();
    expect(changeTracker.modelDefinitionDirty).toBe(false);
  });
});
