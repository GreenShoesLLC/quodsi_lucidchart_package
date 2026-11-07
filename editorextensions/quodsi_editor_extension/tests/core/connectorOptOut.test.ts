// A line's opt-out from the connector rule lives on the LINE (shape data key
// q_connector_opt_out, ruling 11), so it travels with the line when Lucid copies
// shapeData: on paste (new line id) and on page duplicate (the page skip record
// is cleared). Pages written before the key read an old skip-record 'user'
// entry as opted out too. Real ModelManager and real rule throughout.
import { BlockProxy, LineProxy } from 'lucid-extension-sdk';
import { SimulationObjectType } from '@quodsi/lucid-shared';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ModelManager } from '../../src/core/ModelManager';
import { router } from '../../src/core/messaging';
import { reconcilePage } from '../../src/core/connectorReconcileWiring';
import { buildReconcileView } from '../../src/core/connectorReconcile';
import { normalizePastedItems } from '../../src/core/PasteNormalizer';
import { makeFakeBlock, makeFakeLine, makeFakePage, addBlock, addLine } from '../helpers/fakeProxies';

const T = SimulationObjectType;
const OPT_OUT = 'q_connector_opt_out';
/** The keys a page/shape here can carry; Lucid copies them all on paste/duplicate. */
const KEYS = ['q_data', 'q_skipped_elements', OPT_OUT, 'q_connector_stash'];

function copyShapeData(from: any, to: any): void {
  for (const k of KEYS) {
    const v = from.shapeData.get(k);
    if (v !== undefined) to.shapeData.set(k, v);
  }
}

function block(page: any, id: string, type: SimulationObjectType | null, storage: StorageAdapter) {
  const b = addBlock(page, makeFakeBlock(id, { text: id }));
  Object.setPrototypeOf(b, BlockProxy.prototype);
  if (type) storage.setElementData(b, { id, name: `Act ${id}` }, type);
  return b;
}

function line(page: any, id: string, a: string, b: string) {
  const l = addLine(page, makeFakeLine(id, { endpoint1: { connection: { id: a } }, endpoint2: { connection: { id: b } } }));
  Object.setPrototypeOf(l, LineProxy.prototype);
  return l;
}

async function setup() {
  const storage = new StorageAdapter();
  const page = makeFakePage('page-1');
  storage.setElementData(page, { id: 'page-1', name: 'M', version: 1 } as any, T.Model);
  block(page, 'A', T.Activity, storage);
  block(page, 'B', T.Activity, storage);
  const manager = new ModelManager(storage);
  (manager as any).versionCheckedPageId = page.id; // skip the once-per-page upgrade
  manager.setCurrentPage(page);
  await manager.getModelDefinition();
  const deps = { storage, modelManager: manager };
  return { storage, page, manager, deps };
}

/** A line between A and B the user set to None. */
async function optedOutLine() {
  const env = await setup();
  const l1 = line(env.page, 'L1', 'A', 'B');
  await reconcilePage(env.page, env.deps);
  expect(env.storage.getElementType(l1)?.type).toBe(T.Connector);
  await env.manager.saveElementData(l1, {}, T.None, env.page);
  expect(env.storage.getElementType(l1)).toBeNull();
  return { ...env, l1 };
}

describe('connector opt-out on the line', () => {
  beforeEach(() => {
    jest.spyOn(router, 'send').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it("the user's None writes the line key, not the page skip record, and clears the stash", async () => {
    const { storage, page, deps, l1 } = await optedOutLine();
    expect(l1.shapeData.get(OPT_OUT)).toBeDefined();
    expect(storage.isConnectorOptedOut(l1)).toBe(true);
    expect(storage.getSkippedElements(page)).toEqual({});
    expect(storage.getConnectorStash(l1)).toBeNull();
    expect(await reconcilePage(page, deps)).toEqual([]);
    expect(storage.getElementType(l1)).toBeNull();
  });

  it('choosing Connector clears the key', async () => {
    const { storage, page, manager, l1 } = await optedOutLine();
    await manager.saveElementData(l1, {}, T.Connector, page);
    expect(storage.isConnectorOptedOut(l1)).toBe(false);
    expect(l1.shapeData.get(OPT_OUT)).toBeUndefined();
    expect(storage.getElementType(l1)?.type).toBe(T.Connector);
  });

  it("a page written before the key: a skip-record 'user' entry still opts the line out, and Connector clears it", async () => {
    const { storage, page, manager, deps } = await setup();
    storage.setSkippedElements(page, { L1: 'user' });
    const l1 = line(page, 'L1', 'A', 'B');
    expect(buildReconcileView(page, storage).lines[0].optedOut).toBe(true);
    expect(await reconcilePage(page, deps)).toEqual([]);

    await manager.saveElementData(l1, {}, T.Connector, page);
    expect(storage.getSkippedElements(page)).toEqual({});
    expect(buildReconcileView(page, storage).lines[0].optedOut).toBe(false);
  });

  it('Remove model clears the key', async () => {
    const { storage, page, l1 } = await optedOutLine();
    storage.clearAllModelData(page);
    expect(l1.shapeData.get(OPT_OUT)).toBeUndefined();
    expect(storage.isConnectorOptedOut(l1)).toBe(false);
  });

  it('a pasted copy of an opted-out line (new id) stays opted out', async () => {
    const { storage, page, deps, l1 } = await optedOutLine();
    // Lucid's paste: new blocks and line, shapeData copied byte for byte.
    const a2 = block(page, 'A2', null, storage);
    const b2 = block(page, 'B2', null, storage);
    copyShapeData(page.allBlocks.get('A'), a2);
    copyShapeData(page.allBlocks.get('B'), b2);
    const l2 = line(page, 'L2', 'A2', 'B2');
    copyShapeData(l1, l2);

    normalizePastedItems([a2, b2, l2], storage);
    expect(storage.getElementType(a2)?.type).toBe(T.Activity);
    expect(l2.shapeData.get(OPT_OUT)).toBeDefined(); // the normalizer keeps it

    expect(await reconcilePage(page, deps)).toEqual([]);
    expect(storage.getElementType(l2)).toBeNull();
    expect(storage.getElementType(l1)).toBeNull();
  });

  it('a duplicated page keeps its lines opted out', async () => {
    const { storage, page, l1 } = await optedOutLine();
    // An old-format skip entry too: duplication clears the page record.
    storage.setSkippedElements(page, { L1: 'user' });

    const copy = makeFakePage('page-2');
    copyShapeData(page, copy);
    const a2 = block(copy, 'A2', null, storage);
    const b2 = block(copy, 'B2', null, storage);
    copyShapeData(page.allBlocks.get('A'), a2);
    copyShapeData(page.allBlocks.get('B'), b2);
    const l2 = line(copy, 'L2', 'A2', 'B2');
    copyShapeData(l1, l2);

    normalizePastedItems([a2, b2, l2], storage, { allPages: () => [page, copy] });
    expect(storage.getSkippedElements(copy)).toEqual({}); // page mode ran
    expect(l2.shapeData.get(OPT_OUT)).toBeDefined();

    const manager2 = new ModelManager(storage);
    (manager2 as any).versionCheckedPageId = copy.id;
    manager2.setCurrentPage(copy);
    expect(await reconcilePage(copy, { storage, modelManager: manager2 })).toEqual([]);
    expect(storage.getElementType(l2)).toBeNull();
  });
});
