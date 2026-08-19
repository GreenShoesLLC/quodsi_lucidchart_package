describe('ModelManager.updateModelRoot', () => {
  function harness() {
    const saved: Record<string, unknown> = {};
    const storageAdapter = {
      setArrivalPatterns: (_p: unknown, v: unknown) => { saved.arrivalPatterns = v; },
      getArrivalPatterns: () => [],
    };
    return { saved, storageAdapter };
  }

  it('persists an arrivalPatterns patch', async () => {
    const { saved, storageAdapter } = harness();
    const { ModelManager } = require('../../src/core/ModelManager');
    const mm: any = Object.create(ModelManager.prototype);
    mm.storageAdapter = storageAdapter;
    mm.debug = { debug: () => {}, error: () => {} };

    await mm.updateModelRoot({ arrivalPatterns: [{ id: 'ap-1', name: 'P1' }] }, { id: 'page-1' });

    expect(saved.arrivalPatterns).toEqual([{ id: 'ap-1', name: 'P1' }]);
  });

  it('throws on an unknown key rather than dropping it silently', async () => {
    const { storageAdapter } = harness();
    const { ModelManager } = require('../../src/core/ModelManager');
    const mm: any = Object.create(ModelManager.prototype);
    mm.storageAdapter = storageAdapter;
    mm.debug = { debug: () => {}, error: () => {} };

    await expect(
      mm.updateModelRoot({ somethingNobodyHandles: [1, 2] }, { id: 'page-1' })
    ).rejects.toThrow(/somethingNobodyHandles/);
  });
});
