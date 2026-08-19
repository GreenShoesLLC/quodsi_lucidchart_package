// tests/core/modelManager.buildModelRootProjection.test.ts
//
// Final fix wave, item 5a: buildModelRootProjection(page) ignored its `page`
// argument and always read `this.currentPage` (via getModelDefinition() ->
// ensureModelDefinition()), while its sibling updateModelRoot(patch, page)
// already honours the page it's given. Across a page switch, a caller that
// passes a DIFFERENT page than the one ModelManager currently has cached got
// that OTHER page's projection back, silently.
//
// Mirrors modelManager.updateModelRoot.test.ts's harness style:
// Object.create(ModelManager.prototype) + hand-set fields, real prototype
// methods (setCurrentPage, markModelDirty) doing the actual work.

describe('ModelManager.buildModelRootProjection', () => {
  function harness() {
    const changeTracker = {
      modelDefinitionDirty: false,
      validationDirty: false,
      lastModelDefinitionUpdate: 0,
      lastValidationUpdate: 0,
      pendingChanges: new Set<string>(),
    };
    const { ModelManager } = require('../../src/core/ModelManager');
    const mm: any = Object.create(ModelManager.prototype);
    mm.changeTracker = changeTracker;
    mm.debug = { debug: () => {}, error: () => {} };
    mm.currentPage = { id: 'page-A' };

    // Stub getModelDefinition to return a projection keyed off whichever
    // page is CURRENT at call time -- proves buildModelRootProjection reads
    // the model for the page it was told to switch to, not whatever page
    // was cached before the call.
    const defsByPage: Record<string, any> = {
      'page-A': {
        generators: { getAll: () => [{ id: 'gen-a', name: 'A', levers: [], entityId: 'e', mode: 'FREQUENCY' }] },
        arrivalPatterns: { getAll: () => [] },
        arrivalSchedules: { getAll: () => [{ id: 'as-a', name: 'Schedule A', toJSON: () => ({ id: 'as-a', name: 'Schedule A' }) }] },
        model: {},
      },
      'page-B': {
        generators: { getAll: () => [{ id: 'gen-b', name: 'B', levers: [], entityId: 'e', mode: 'FREQUENCY' }] },
        arrivalPatterns: { getAll: () => [] },
        arrivalSchedules: { getAll: () => [] },
        model: {},
      },
    };
    mm.getModelDefinition = async () => defsByPage[mm.currentPage.id];

    return { mm, changeTracker };
  }

  it('reads the passed page, not the previously-cached currentPage, when they differ', async () => {
    const { mm } = harness();

    const projection = await mm.buildModelRootProjection({ id: 'page-B' });

    expect(projection.generators).toEqual([
      expect.objectContaining({ id: 'gen-b' }),
    ]);
    expect(mm.currentPage.id).toBe('page-B');
  });

  it('includes arrivalSchedules in the projection, serialized via toJSON', async () => {
    const { mm } = harness();

    const projection = await mm.buildModelRootProjection({ id: 'page-A' });

    expect(projection.arrivalSchedules).toEqual([{ id: 'as-a', name: 'Schedule A' }]);
  });

  it('does not force a cache-dirty rebuild when the passed page matches currentPage', async () => {
    const { mm, changeTracker } = harness();

    await mm.buildModelRootProjection({ id: 'page-A' });

    expect(changeTracker.modelDefinitionDirty).toBe(false);
  });

  it('marks the cache dirty (via setCurrentPage) when switching to a different page', async () => {
    const { mm, changeTracker } = harness();

    await mm.buildModelRootProjection({ id: 'page-B' });

    expect(changeTracker.modelDefinitionDirty).toBe(true);
  });
});
