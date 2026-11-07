// The connector rule wired into Lucid (connector-lifecycle Task 5): the hooks,
// the pre-build run in ensureModelDefinition, the user's None on a line, and the
// block type-conversion path all run reconcilePage against a REAL ModelManager.
import * as fs from 'fs';
import * as path from 'path';
import { BlockProxy, LineProxy } from 'lucid-extension-sdk';
import { Viewport } from '../__mocks__/lucid-extension-sdk';
import { SimulationObjectType, ValidationSeverity } from '@quodsi/lucid-shared';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ModelManager } from '../../src/core/ModelManager';
import { router } from '../../src/core/messaging';
import { makeFakeBlock, makeFakeLine, makeFakePage, addBlock, addLine } from '../helpers/fakeProxies';

const handleLucidSelectionEventMock = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/core/messaging/handlers/selection/SelectionHandler', () => ({
  SelectionHandler: {
    handleLucidSelectionEvent: (...args: unknown[]) => handleLucidSelectionEventMock(...args),
  },
}));

import { reconcilePage, onDiagramChanged } from '../../src/core/connectorReconcileWiring';
import * as connectorReconcile from '../../src/core/connectorReconcile';

const T = SimulationObjectType;

let viewedPage: any;
(Viewport.prototype as any).getCurrentPage = () => viewedPage;
(Viewport.prototype as any).getSelectedItems = () => [];

function block(page: any, id: string, type: SimulationObjectType | null, storage: StorageAdapter) {
  const b = addBlock(page, makeFakeBlock(id, { text: id }));
  Object.setPrototypeOf(b, BlockProxy.prototype);
  if (type) storage.setElementData(b, { id, name: `Act ${id}` }, type);
  return b;
}

function line(page: any, id: string, a: string | null, b: string | null) {
  const l = addLine(
    page,
    makeFakeLine(id, {
      endpoint1: a ? { connection: { id: a } } : {},
      endpoint2: b ? { connection: { id: b } } : {},
    })
  );
  Object.setPrototypeOf(l, LineProxy.prototype);
  return l;
}

async function setup() {
  const storage = new StorageAdapter();
  const page = makeFakePage('page-1');
  storage.setElementData(page, { id: 'm1', name: 'M', version: 1 } as any, T.Model);
  block(page, 'A', T.Activity, storage);
  block(page, 'B', T.Activity, storage);
  const manager = new ModelManager(storage);
  (manager as any).versionCheckedPageId = page.id; // skip the once-per-page upgrade
  manager.setCurrentPage(page);
  await manager.getModelDefinition();
  viewedPage = page;
  const pushed = jest.spyOn(manager, 'pushNotices');
  const notices = () => pushed.mock.calls.flatMap((c) => c[0]);
  const deps = { storage, modelManager: manager };
  return { storage, page, manager, deps, notices };
}

describe('reconcilePage wiring', () => {
  beforeEach(() => {
    jest.spyOn(router, 'send').mockImplementation(() => {});
    handleLucidSelectionEventMock.mockClear();
  });
  afterEach(() => jest.restoreAllMocks());

  it('draw after map: the create hook maps a new line between two Activities, with one INFO notice', async () => {
    const { storage, page, manager, notices } = await setup();
    const l1 = line(page, 'L1', 'A', 'B');

    const applied = await onDiagramChanged({ storageAdapter: storage, modelManager: manager, client: {} as any });

    expect(applied.map((a) => a.kind)).toEqual(['map']);
    expect(storage.getElementType(l1)?.type).toBe(T.Connector);
    expect(storage.getElementData<any>(l1)).toMatchObject({ sourceId: 'A', targetId: 'B' });
    const info = notices().filter((n) => n.code === 'connector_auto_mapped');
    expect(info).toHaveLength(1);
    expect(info[0].severity).toBe(ValidationSeverity.INFO);
    expect(handleLucidSelectionEventMock).toHaveBeenCalledTimes(1);
    // our own writes fire the hooks again: the second run finds nothing to do
    expect(await onDiagramChanged({ storageAdapter: storage, modelManager: manager, client: {} as any })).toEqual([]);
    expect(handleLucidSelectionEventMock).toHaveBeenCalledTimes(1);
  });

  it('unmapping an Activity unmaps its line with a stash; re-mapping it restores the same id and weight', async () => {
    const { storage, page, manager, deps, notices } = await setup();
    const l1 = line(page, 'L1', 'A', 'B');
    await reconcilePage(page, deps);
    storage.setElementData(l1, { ...storage.getElementData<any>(l1), weight: 3 }, T.Connector);
    manager.invalidateModelCache();

    await manager.saveElementData(page.allBlocks.get('B'), {}, T.None, page);
    await reconcilePage(page, deps);

    expect(storage.getElementType(l1)).toBeNull();
    expect(storage.getConnectorStash(l1)).toMatchObject({ id: 'L1', weight: 3 });
    const unmapped = notices().filter((n) => n.code === 'connector_auto_unmapped');
    expect(unmapped).toHaveLength(1);
    expect(unmapped[0].message).toContain('no longer connects an Activity or Generator to an Activity');
    expect((await manager.getModelDefinition())!.connectors.get('L1')).toBeUndefined();

    await manager.saveElementData(page.allBlocks.get('B'), {}, T.Activity, page);

    expect(storage.getElementType(l1)?.type).toBe(T.Connector);
    expect(storage.getElementData<any>(l1)).toMatchObject({ id: 'L1', weight: 3, sourceId: 'A', targetId: 'B' });
    expect(storage.getConnectorStash(l1)).toBeNull();
    expect((await manager.getModelDefinition())!.connectors.get('L1')).toMatchObject({ weight: 3 });
  });

  it("the user's None on a line opts it out: skip 'user', stash cleared, and the rule maps nothing", async () => {
    const { storage, page, manager, deps } = await setup();
    const l1 = line(page, 'L1', 'A', 'B');
    await reconcilePage(page, deps);
    storage.setConnectorStash(l1, { id: 'L1', name: 'old' });

    await manager.saveElementData(l1, {}, T.None, page);

    expect(storage.getSkippedElements(page)).toEqual({ L1: 'user' });
    expect(storage.getConnectorStash(l1)).toBeNull();
    expect(storage.getElementType(l1)).toBeNull();
    expect(await reconcilePage(page, deps)).toEqual([]);
    expect(storage.getElementType(l1)).toBeNull();

    // choosing Connector again deletes the skip entry
    await manager.saveElementData(l1, {}, T.Connector, page);
    expect(storage.getSkippedElements(page)).toEqual({});
    expect(storage.getElementType(l1)?.type).toBe(T.Connector);
  });

  it('re-entrancy: reconcilePage called from inside an apply is skipped, and nothing recurses', async () => {
    const { storage, page, manager, deps } = await setup();
    line(page, 'L1', 'A', 'B');
    // Inner calls before any write (the line is still unmapped, so an
    // unguarded run would map it again) and from inside a write.
    const inner: unknown[] = [];
    const defer = manager.withValidationDeferred.bind(manager);
    jest.spyOn(manager, 'withValidationDeferred').mockImplementation(async (fn) => {
      inner.push(await reconcilePage(page, deps));
      return defer(fn);
    });
    const register = manager.registerElement.bind(manager);
    jest.spyOn(manager, 'registerElement').mockImplementation(async (el, proxy) => {
      inner.push(await reconcilePage(page, deps));
      return register(el, proxy);
    });

    const applied = await reconcilePage(page, deps);

    expect(applied.map((a) => a.kind)).toEqual(['map']);
    expect(inner).toEqual([[], []]);
    expect(storage.getElementType(page.allLines.get('L1'))?.type).toBe(T.Connector);
  });

  it('a validation run that rebuilds a dirty page with an unmapped valid pair maps it, without deadlocking', async () => {
    const { storage, page, manager } = await setup();
    line(page, 'L1', 'A', 'B');
    manager.invalidateModelCache();

    const result = await manager.validateModelNow();
    const model = await manager.getModelDefinition();

    expect(model!.connectors.get('L1')).toMatchObject({ sourceId: 'A', targetId: 'B' });
    expect(storage.getElementType(page.allLines.get('L1'))?.type).toBe(T.Connector);
    // the map's INFO notice is drained by that same run
    expect(result.issues.some((i) => i.code === 'connector_auto_mapped')).toBe(true);
  });

  it('ensureModelDefinition on a dirty page builds a model containing the newly mapped connector', async () => {
    const { page, manager } = await setup();
    line(page, 'L1', 'A', 'B');
    manager.invalidateModelCache();

    const model = await manager.getModelDefinition();

    expect(model!.connectors.get('L1')).toMatchObject({ sourceId: 'A', targetId: 'B', weight: 1 });
  });

  it('a failed map pushes unmapped_flow_line (WARNING) with the shape names', async () => {
    const { page, manager, deps, notices } = await setup();
    line(page, 'L1', 'A', 'B');
    jest.spyOn(manager, 'registerElement').mockRejectedValue(new Error('boom'));

    expect(await reconcilePage(page, deps)).toEqual([]);

    const warn = notices().filter((n) => n.code === 'unmapped_flow_line');
    expect(warn).toHaveLength(1);
    expect(warn[0]).toMatchObject({ severity: ValidationSeverity.WARNING, elementId: 'L1' });
    expect(warn[0].message).toContain('Act A');
    expect(warn[0].message).toContain('Act B');
  });

  it('converting a block to an Activity maps the lines the rule now accepts (replaces autoConvertConnectedLines)', async () => {
    const { storage, page, manager } = await setup();
    block(page, 'C', null, storage);
    const l1 = line(page, 'L1', 'A', 'C');

    await manager.saveElementData(page.allBlocks.get('C'), {}, T.Activity, page);

    expect(storage.getElementType(l1)?.type).toBe(T.Connector);
    expect(storage.getElementData<any>(l1)).toMatchObject({ sourceId: 'A', targetId: 'C', weight: 1 });
  });

  // The rule is a convenience step: a throw inside it must never fail the build
  // or the save it runs ahead of, and must release the in-flight entry.
  describe('a throwing view builder or rule', () => {
    const throwingView = () =>
      jest.spyOn(connectorReconcile, 'buildReconcileView').mockImplementation(() => {
        throw new Error('view boom');
      });
    // a malformed view makes the shared rule itself throw
    const throwingRule = () =>
      jest.spyOn(connectorReconcile, 'buildReconcileView').mockReturnValue({ shapes: [], lines: null } as any);

    it.each([
      ['view builder', throwingView],
      ['rule', throwingRule],
    ])('%s: getModelDefinition still builds the model', async (_label, makeThrow) => {
      const { page, manager, deps } = await setup();
      line(page, 'L1', 'A', 'B');
      const spy = makeThrow();
      manager.invalidateModelCache();

      const model = await manager.getModelDefinition();

      expect(model!.activities.get('A')).toBeDefined();
      expect(model!.activities.get('B')).toBeDefined();
      expect(await manager.validateModelNow()).toBeDefined();
      // the in-flight entry was released: with the rule working again, it runs
      spy.mockRestore();
      expect((await reconcilePage(page, deps)).map((a) => a.kind)).toEqual(['map']);
    });

    it.each([
      ['view builder', throwingView],
      ['rule', throwingRule],
    ])('%s: a block type conversion still succeeds', async (_label, makeThrow) => {
      const { storage, page, manager } = await setup();
      block(page, 'C', null, storage);
      makeThrow();

      await expect(manager.saveElementData(page.allBlocks.get('C'), {}, T.Activity, page)).resolves.toBeUndefined();

      expect(storage.getElementType(page.allBlocks.get('C'))?.type).toBe(T.Activity);
      expect((await manager.getModelDefinition())!.activities.get('C')).toBeDefined();
    });
  });

  it('does nothing on a page that is not a Quodsi model', async () => {
    const storage = new StorageAdapter();
    const page = makeFakePage('plain');
    block(page, 'A', T.Activity, storage);
    block(page, 'B', T.Activity, storage);
    const l1 = line(page, 'L1', 'A', 'B');
    const manager = new ModelManager(storage);

    expect(await reconcilePage(page, { storage, modelManager: manager })).toEqual([]);
    expect(storage.getElementType(l1)).toBeNull();
  });
});

describe('extension.ts registers the connector hooks', () => {
  it('wires create, delete and all-changes hooks to onDiagramChanged', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../src/extension.ts'), 'utf8');
    expect(src).toMatch(/hookDeleteItems\(/);
    expect(src).toMatch(/hookAllChanges\(/);
    expect(src).toMatch(/connectorReconcileWiring/);
    expect((src.match(/onDiagramChanged\(/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('ModelManager no longer has its own line auto-convert', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../src/core/ModelManager.ts'), 'utf8');
    expect(src).not.toMatch(/autoConvertConnectedLines/);
  });
});
