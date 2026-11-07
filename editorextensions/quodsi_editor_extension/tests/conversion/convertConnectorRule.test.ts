// Convert and the live connector rule (connector-lifecycle final review):
// - the rule is suspended while Convert runs, so the dialog's None on a line
//   between two Activities is not overridden mid-Convert, then runs once after;
// - Convert's user None writes the line's opt-out, Convert's Connector clears it;
// Real StorageAdapter + LucidElementFactory + ModelManager over fake proxies.
import { BlockProxy, LineProxy } from 'lucid-extension-sdk';
import { Viewport } from '../__mocks__/lucid-extension-sdk';
import { LucidPageConversionService } from '../../src/services/conversion/LucidPageConversionService';
import { LucidElementFactory } from '../../src/services/LucidElementFactory';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ModelManager } from '../../src/core/ModelManager';
import { router } from '../../src/core/messaging';
import { reconcilePage } from '../../src/core/connectorReconcileWiring';
import { SimulationObjectType } from '@quodsi/lucid-shared';
import { makeFakeBlock, makeFakeLine, makeFakePage, addBlock, addLine } from '../helpers/fakeProxies';

const T = SimulationObjectType;

let currentPage: any = null;
(Viewport.prototype as any).getCurrentPage = () => currentPage;
(Viewport.prototype as any).getSelectedItems = () => [];

beforeAll(() => {
  (ModelManager as any).getClient = () => ({ loadBlockClasses: async () => {} });
});

function harness() {
  const storage = new StorageAdapter();
  const manager = new ModelManager(storage);
  const service = new LucidPageConversionService(manager, new LucidElementFactory(storage), storage);
  const page = makeFakePage('page-1');
  currentPage = page;
  for (const [id, text] of [['A', 'Intake'], ['B', 'Triage'], ['R', 'Nurse']]) {
    const b = addBlock(page, makeFakeBlock(id, { text }));
    Object.setPrototypeOf(b, BlockProxy.prototype);
  }
  const mkLine = (id: string, a: string, b: string, text?: string) => {
    const l = addLine(page, makeFakeLine(id, { endpoint1: { connection: { id: a } }, endpoint2: { connection: { id: b } }, text }));
    Object.setPrototypeOf(l, LineProxy.prototype);
    return l;
  };
  const pushed = jest.spyOn(manager, 'pushNotices');
  const notices = () => pushed.mock.calls.flatMap((c) => c[0]);
  return { storage, manager, service, page, mkLine, notices };
}

const mappings = (lineType: SimulationObjectType | null, extra: Array<[string, SimulationObjectType | null]> = []) =>
  new Map<string, SimulationObjectType | null>([
    ['A', T.Activity],
    ['B', T.Activity],
    ['L1', lineType],
    ...extra,
  ]);

describe('Convert and the connector rule', () => {
  beforeEach(() => {
    jest.spyOn(router, 'send').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it("the user's None on a line between two Activities survives Convert and re-conversion", async () => {
    const { storage, manager, service, page, mkLine } = harness();
    const l1 = mkLine('L1', 'A', 'B');

    await service.convertPageWithMappings(page, mappings(null), new Set(['L1']));

    expect(storage.getElementType(l1)).toBeNull();
    expect(storage.isConnectorOptedOut(l1)).toBe(true);
    expect((await manager.getModelDefinition())!.connectors.get('L1')).toBeUndefined();
    expect(await reconcilePage(page, { storage, modelManager: manager })).toEqual([]);

    // Re-conversion keeps it
    await service.convertPageWithMappings(page, mappings(null), new Set(['L1']));
    expect(storage.getElementType(l1)).toBeNull();
    expect((await manager.getModelDefinition())!.connectors.get('L1')).toBeUndefined();

    // ...and a re-conversion that chooses Connector maps it and clears the opt-out
    await service.convertPageWithMappings(page, mappings(T.Connector), new Set(['L1']));
    expect(storage.getElementType(l1)?.type).toBe(T.Connector);
    expect(storage.isConnectorOptedOut(l1)).toBe(false);
    expect((await manager.getModelDefinition())!.connectors.get('L1')).toMatchObject({ sourceId: 'A', targetId: 'B' });
  });

  it('a None on an already mapped line at re-conversion unmaps it and keeps it unmapped', async () => {
    const { storage, manager, service, page, mkLine } = harness();
    const l1 = mkLine('L1', 'A', 'B');
    await service.convertPageWithMappings(page, mappings(T.Connector));
    expect(storage.getElementType(l1)?.type).toBe(T.Connector);

    await service.convertPageWithMappings(page, mappings(null), new Set(['L1']));
    expect(storage.getElementType(l1)).toBeNull();
    expect(storage.isConnectorOptedOut(l1)).toBe(true);
    expect((await manager.getModelDefinition())!.connectors.get('L1')).toBeUndefined();
  });

  it('the rule runs once after Convert: a line Convert left for it (drawn A -> G) ends G -> A', async () => {
    const { storage, manager, service, page, mkLine } = harness();
    const g = addBlock(page, makeFakeBlock('G', { text: 'Arrivals' }));
    Object.setPrototypeOf(g, BlockProxy.prototype);
    mkLine('L1', 'A', 'G');

    await service.convertPageWithMappings(page, mappings(T.Connector, [['G', T.Generator]]));

    expect((await manager.getModelDefinition())!.connectors.get('L1')).toMatchObject({ sourceId: 'G', targetId: 'A' });
    expect(await reconcilePage(page, { storage, modelManager: manager })).toEqual([]);
  });
});
