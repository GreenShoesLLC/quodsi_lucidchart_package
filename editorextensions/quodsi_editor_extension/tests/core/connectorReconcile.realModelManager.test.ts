// applyReconcileActions against a REAL ModelManager (and the real model builder):
// the cached ModelDefinition must reflect each action immediately, not after the
// 10 s cache timeout.
import { BlockProxy, LineProxy } from 'lucid-extension-sdk';
import { SimulationObjectType } from '@quodsi/lucid-shared';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ModelManager } from '../../src/core/ModelManager';
import { applyReconcileActions, buildReconcileView } from '../../src/core/connectorReconcile';
import { reconcilePage } from '../../src/core/connectorReconcileWiring';
import { reconcileConnectors } from '@quodsi/shared';
import { router } from '../../src/core/messaging';
import { makeFakeBlock, makeFakeLine, makeFakePage, addBlock, addLine } from '../helpers/fakeProxies';

const T = SimulationObjectType;

async function setup() {
  const storage = new StorageAdapter();
  const page = makeFakePage('page-1');
  storage.setElementData(page, { id: 'm1', name: 'M', version: 1 } as any, T.Model);
  for (const id of ['A', 'B', 'C']) {
    const b = addBlock(page, makeFakeBlock(id, { text: id }));
    Object.setPrototypeOf(b, BlockProxy.prototype);
    storage.setElementData(b, { id, name: `Act ${id}` }, T.Activity);
  }
  const g = addBlock(page, makeFakeBlock('G', { text: 'G' }));
  Object.setPrototypeOf(g, BlockProxy.prototype);
  storage.setElementData(g, { id: 'G', name: 'Gen G' }, T.Generator);
  const mkLine = (id: string, a: string, b: string) => {
    const l = addLine(page, makeFakeLine(id, { endpoint1: { connection: { id: a } }, endpoint2: { connection: { id: b } } }));
    Object.setPrototypeOf(l, LineProxy.prototype);
    return l;
  };
  const manager = new ModelManager(storage);
  (manager as any).versionCheckedPageId = page.id; // skip the once-per-page upgrade
  manager.setCurrentPage(page);
  await manager.getModelDefinition(); // build and cache: no connectors yet
  return { storage, page, manager, mkLine };
}

describe('applyReconcileActions with a real ModelManager', () => {
  beforeEach(() => {
    jest.spyOn(router, 'send').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('default map leaves the connector in the built model', async () => {
    const { storage, page, manager, mkLine } = await setup();
    mkLine('L1', 'A', 'B');
    const r = await applyReconcileActions(page, [
      { kind: 'map', lineId: 'L1', sourceId: 'A', targetId: 'B', name: 'A to B', restore: null },
    ], { storage, modelManager: manager });
    expect(r.failed).toEqual([]);
    const c = (await manager.getModelDefinition())!.connectors.get('L1')!;
    expect(c).toMatchObject({ name: 'A to B', sourceId: 'A', targetId: 'B', weight: 1 });
  });

  it('map with restore brings back the stashed id and settings', async () => {
    const { storage, page, manager, mkLine } = await setup();
    mkLine('L1', 'A', 'B');
    const restore = { id: 'L1', name: 'Old name', weight: 4, priority: 2 };
    storage.setConnectorStash(page.allLines.get('L1'), restore);
    const r = await applyReconcileActions(page, [
      { kind: 'map', lineId: 'L1', sourceId: 'A', targetId: 'B', name: 'ignored', restore },
    ], { storage, modelManager: manager });
    expect(r.failed).toEqual([]);
    const c = (await manager.getModelDefinition())!.connectors.get('L1')!;
    expect(c).toMatchObject({ id: 'L1', name: 'Old name', weight: 4, priority: 2, sourceId: 'A', targetId: 'B' });
    expect(storage.getConnectorStash(page.allLines.get('L1'))).toBeNull();
  });

  it('refresh puts the new ends in the built model', async () => {
    const { storage, page, manager, mkLine } = await setup();
    mkLine('L1', 'A', 'B');
    await applyReconcileActions(page, [
      { kind: 'map', lineId: 'L1', sourceId: 'A', targetId: 'B', name: 'A to B', restore: null },
    ], { storage, modelManager: manager });
    // the user re-attaches the target to C
    const line = page.allLines.get('L1');
    line.getEndpoint2 = () => ({ x: 0, y: 0, connection: { id: 'C' } });
    const r = await applyReconcileActions(page, [{ kind: 'refresh', lineId: 'L1', sourceId: 'A', targetId: 'C' }], {
      storage,
      modelManager: manager,
    });
    expect(r.failed).toEqual([]);
    const c = (await manager.getModelDefinition())!.connectors.get('L1')!;
    expect(c).toMatchObject({ sourceId: 'A', targetId: 'C', name: 'A to B' });
  });

  it('unmap clears q_data, drops the connector from the model and keeps the stash', async () => {
    const { storage, page, manager, mkLine } = await setup();
    mkLine('L1', 'A', 'B');
    await applyReconcileActions(page, [
      { kind: 'map', lineId: 'L1', sourceId: 'A', targetId: 'B', name: 'A to B', restore: null },
    ], { storage, modelManager: manager });
    const line = page.allLines.get('L1');
    // the user detaches the target end: the cause the action names. (With
    // both ends still on a valid pair, the rule -- which runs before every
    // rebuild -- would map the line straight back.)
    line.getEndpoint2 = () => ({ x: 0, y: 0, connection: undefined });
    const stash = { id: 'L1', name: 'A to B', weight: 1 };
    const r = await applyReconcileActions(page, [{ kind: 'unmap', lineId: 'L1', reason: 'end_loose', stash }], {
      storage,
      modelManager: manager,
    });
    expect(r.failed).toEqual([]);
    expect(storage.getElementType(line)).toBeNull();
    expect(storage.getConnectorStash(line)).toEqual(stash);
    expect((await manager.getModelDefinition())!.connectors.get('L1')).toBeUndefined();
  });

  it('an unmap that removeElement silently skips is failed and the prior stash is restored', async () => {
    const { storage, page, manager, mkLine } = await setup();
    mkLine('L1', 'A', 'B');
    await applyReconcileActions(page, [
      { kind: 'map', lineId: 'L1', sourceId: 'A', targetId: 'B', name: 'A to B', restore: null },
    ], { storage, modelManager: manager });
    const line = page.allLines.get('L1');
    const prior = { id: 'L1', name: 'earlier' };
    storage.setConnectorStash(line, prior);
    jest.spyOn(manager, 'removeElement').mockResolvedValue(undefined); // the silent early return
    const action = { kind: 'unmap' as const, lineId: 'L1', reason: 'end_loose' as const, stash: { id: 'L1', name: 'new' } };
    const r = await applyReconcileActions(page, [action], { storage, modelManager: manager });
    expect(r.failed).toEqual([action]);
    expect(r.applied).toEqual([]);
    expect(storage.getConnectorStash(line)).toEqual(prior);
  });

  // O8: the rule maps a line drawn Activity -> Generator as Generator -> Activity;
  // the Lucid write path and the model builder must keep that direction.
  it('a line drawn A -> G is G -> A in the built model, and a second run does nothing', async () => {
    const { storage, page, manager, mkLine } = await setup();
    mkLine('L1', 'A', 'G');
    const applied = await reconcilePage(page, { storage, modelManager: manager });
    expect(applied).toEqual([expect.objectContaining({ kind: 'map', lineId: 'L1', sourceId: 'G', targetId: 'A' })]);

    const c = (await manager.getModelDefinition())!.connectors.get('L1')!;
    expect(c).toMatchObject({ sourceId: 'G', targetId: 'A' });
    expect(storage.getElementData<{ sourceId: string; targetId: string }>(page.allLines.get('L1'))).toMatchObject({
      sourceId: 'G',
      targetId: 'A',
    });

    expect(reconcileConnectors(buildReconcileView(page, storage))).toEqual([]);
    expect(await reconcilePage(page, { storage, modelManager: manager })).toEqual([]);
  });

  it('a restored stash on a line drawn A -> G is G -> A in the built model', async () => {
    const { storage, page, manager, mkLine } = await setup();
    const line = mkLine('L1', 'A', 'G');
    storage.setConnectorStash(line, { id: 'L1', name: 'Kept', weight: 5, sourceId: 'G', targetId: 'A' });
    await reconcilePage(page, { storage, modelManager: manager });
    const c = (await manager.getModelDefinition())!.connectors.get('L1')!;
    expect(c).toMatchObject({ name: 'Kept', weight: 5, sourceId: 'G', targetId: 'A' });
    expect(await reconcilePage(page, { storage, modelManager: manager })).toEqual([]);
  });

  it('a refresh to G -> A on a line drawn A -> G sticks', async () => {
    const { storage, page, manager, mkLine } = await setup();
    const line = mkLine('L1', 'A', 'G');
    // an older build stored the drawn order
    storage.setElementData(line, { id: 'L1', name: 'Old', sourceId: 'A', targetId: 'G', weight: 1 } as any, T.Connector);
    manager.invalidateModelCache();
    const applied = await reconcilePage(page, { storage, modelManager: manager });
    expect(applied).toEqual([{ kind: 'refresh', lineId: 'L1', sourceId: 'G', targetId: 'A' }]);
    const c = (await manager.getModelDefinition())!.connectors.get('L1')!;
    expect(c).toMatchObject({ sourceId: 'G', targetId: 'A' });
    expect(await reconcilePage(page, { storage, modelManager: manager })).toEqual([]);
  });
});
