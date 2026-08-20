describe('ModelManager.updateModelRoot', () => {
  function harness() {
    const saved: Record<string, unknown> = {};
    const storageAdapter = {
      setArrivalPatterns: (_p: unknown, v: unknown) => { saved.arrivalPatterns = v; },
      getArrivalPatterns: () => [],
      setArrivalSchedules: (_p: unknown, v: unknown) => { saved.arrivalSchedules = v; },
      getArrivalSchedules: () => [],
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
