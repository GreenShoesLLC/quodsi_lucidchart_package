import { LineProxy } from 'lucid-extension-sdk';
import { SimulationObjectType } from '@quodsi/lucid-shared';
import type { ReconcileAction } from '@quodsi/shared';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { buildReconcileView, applyReconcileActions } from '../../src/core/connectorReconcile';
import { ConnectorLucid } from '../../src/types/ConnectorLucid';

const T = SimulationObjectType;

function store(initial: Record<string, any> = {}) {
  return new Map<string, any>(Object.entries(initial));
}
function env(type: string, id: string, domain: object = {}) {
  return JSON.stringify({ type, id, domain, platform: {} });
}
function block(id: string, type: string | null, text = '') {
  return {
    id,
    textAreas: new Map([['t', text]]),
    shapeData: store(type ? { q_data: env(type, id, { name: `${id}-name` }) } : {}),
  };
}
function line(id: string, a: string | null, b: string | null, data: Record<string, any> = {}, text = '') {
  return Object.assign(Object.create(LineProxy.prototype), {
    id,
    textAreas: new Map([['t', text]]),
    shapeData: store(data),
    getEndpoint1: () => ({ x: 0, y: 0, connection: a ? { id: a } : undefined }),
    getEndpoint2: () => ({ x: 1, y: 1, connection: b ? { id: b } : undefined }),
  });
}
function page(blocks: any[], lines: any[], skipped?: Record<string, string>) {
  const p: any = {
    id: 'p',
    shapeData: store(skipped ? { q_skipped_elements: JSON.stringify(skipped) } : {}),
    allBlocks: new Map(blocks.map((b) => [b.id, b])),
    allLines: new Map(lines.map((l) => [l.id, l])),
  };
  for (const l of lines) l.getPage = () => p;
  return p;
}

describe('buildReconcileView', () => {
  it('reads shapes, ends, mapped record, stash and opt-out', () => {
    const storage = new StorageAdapter();
    const mappedLine = line('L1', 'A', 'B', { q_data: env(T.Connector, 'L1', { name: 'C1', sourceId: 'A', targetId: 'B' }) });
    const plain = line('L2', 'B', 'A', {}, 'Yes');
    const loose = line('L3', 'A', null, { q_connector_stash: JSON.stringify({ id: 'L3', name: 'old' }) });
    const optedOut = line('L4', 'A', 'B');
    const autoSkipped = line('L5', 'A', 'B');
    const p = page(
      [block('A', T.Activity, 'Act A'), block('B', T.Activity), block('R', T.Resource), block('X', null, 'Plain')],
      [mappedLine, plain, loose, optedOut, autoSkipped],
      { L4: 'user', L5: 'auto' }
    );
    const view = buildReconcileView(p, storage);

    expect(view.shapes.find((s) => s.id === 'A')).toEqual({ id: 'A', flowType: 'Activity', name: 'A-name' });
    expect(view.shapes.find((s) => s.id === 'R')!.flowType).toBe('Other');
    expect(view.shapes.find((s) => s.id === 'X')).toEqual({ id: 'X', flowType: 'Other', name: 'Plain' });
    const byId = (id: string) => view.lines.find((l) => l.id === id)!;
    expect(byId('L1').mapped).toMatchObject({ id: 'L1', name: 'C1' });
    expect(byId('L1').ends).toEqual(['A', 'B']);
    expect(byId('L2').mapped).toBeNull();
    expect(byId('L2').text).toBe('Yes');
    expect(byId('L3').ends).toEqual(['A', null]);
    expect(byId('L3').stash).toEqual({ id: 'L3', name: 'old' });
    expect(byId('L4').optedOut).toBe(true);
    expect(byId('L5').optedOut).toBe(false);
    expect(byId('L2').optedOut).toBe(false);
  });
});

describe('applyReconcileActions', () => {
  function deps() {
    return {
      storage: new StorageAdapter(),
      modelManager: { registerElement: jest.fn(async () => {}), removeElement: jest.fn(async () => {}) } as any,
    };
  }

  it('map with restore writes the stashed record with the new ends and clears the stash', async () => {
    const d = deps();
    const l = line('L1', 'A', 'B', { q_connector_stash: JSON.stringify({ id: 'L1', name: 'old', weight: 3 }) });
    const p = page([block('A', T.Activity), block('B', T.Activity)], [l]);
    const action: ReconcileAction = {
      kind: 'map', lineId: 'L1', sourceId: 'A', targetId: 'B', name: 'n',
      restore: { id: 'L1', name: 'old', weight: 3 },
    };
    const r = await applyReconcileActions(p, [action], d);
    expect(r.applied).toEqual([action]);
    const data = d.storage.getElementData<any>(l as any);
    expect(data).toMatchObject({ name: 'old', weight: 3, sourceId: 'A', targetId: 'B' });
    expect(d.storage.getElementType(l as any)!.type).toBe(T.Connector);
    expect(l.shapeData.has('q_connector_stash')).toBe(false);
  });

  it('map without restore creates a weight-1 Connector with the action name and registers it', async () => {
    const d = deps();
    const l = line('L1', 'A', 'B');
    const p = page([block('A', T.Activity), block('B', T.Activity)], [l]);
    const r = await applyReconcileActions(
      p,
      [{ kind: 'map', lineId: 'L1', sourceId: 'A', targetId: 'B', name: 'A to B', restore: null }],
      d
    );
    expect(r.failed).toEqual([]);
    expect(d.modelManager.registerElement).toHaveBeenCalledTimes(1);
    const [conn, proxy] = d.modelManager.registerElement.mock.calls[0] as any[];
    expect(proxy).toBe(l);
    expect(conn).toMatchObject({ name: 'A to B', sourceId: 'A', targetId: 'B', weight: 1 });
  });

  it('unmap writes the stash, removes the element, and never touches the skip record', async () => {
    const d = deps();
    const l = line('L1', 'A', null, { q_data: env(T.Connector, 'L1') });
    const p = page([block('A', T.Activity)], [l]);
    const stash = { id: 'L1', name: 'C1' };
    const r = await applyReconcileActions(p, [{ kind: 'unmap', lineId: 'L1', reason: 'end_loose', stash }], d);
    expect(r.failed).toEqual([]);
    expect(JSON.parse(l.shapeData.get('q_connector_stash'))).toEqual(stash);
    expect(d.modelManager.removeElement).toHaveBeenCalledWith('L1');
    expect(p.shapeData.has('q_skipped_elements')).toBe(false);
  });

  it('refresh updates just the ends', async () => {
    const d = deps();
    const l = line('L1', 'A', 'C', {
      q_data: env(T.Connector, 'L1', { name: 'C1', sourceId: 'A', targetId: 'B', weight: 2 }),
    });
    const p = page([], [l]);
    await applyReconcileActions(p, [{ kind: 'refresh', lineId: 'L1', sourceId: 'A', targetId: 'C' }], d);
    expect(d.storage.getElementData<any>(l as any)).toMatchObject({ name: 'C1', weight: 2, targetId: 'C' });
  });

  it('a throwing write lands in failed and the next action still applies', async () => {
    const d = deps();
    const bad = line('L1', 'A', 'B', { q_data: env(T.Connector, 'L1') });
    bad.shapeData.set = () => { throw new Error('boom'); };
    const good = line('L2', 'A', 'B', { q_data: env(T.Connector, 'L2', { sourceId: 'A', targetId: 'B' }) });
    const p = page([], [bad, good]);
    const a1: ReconcileAction = { kind: 'refresh', lineId: 'L1', sourceId: 'A', targetId: 'C' };
    const a2: ReconcileAction = { kind: 'refresh', lineId: 'L2', sourceId: 'A', targetId: 'C' };
    const r = await applyReconcileActions(p, [a1, a2], d);
    expect(r.failed).toEqual([a1]);
    expect(r.applied).toEqual([a2]);
    expect(d.storage.getElementData<any>(good as any)!.targetId).toBe('C');
  });
});

describe('ConnectorLucid loose ends', () => {
  it('a detached end reads as empty, not the stored id', () => {
    const storage = new StorageAdapter();
    const l = line('L1', 'A', null, {
      q_data: env(T.Connector, 'L1', { name: 'C1', sourceId: 'A', targetId: 'B' }),
    });
    const sim = new ConnectorLucid(l as any, storage).getSimulationObject() as any;
    expect(sim.sourceId).toBe('A');
    expect(sim.targetId).toBe('');
  });
});
