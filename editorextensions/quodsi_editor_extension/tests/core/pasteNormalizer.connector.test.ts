// tests/core/pasteNormalizer.connector.test.ts
//
// Task 7 of the LucidChart Paste Normalizer plan: the Connector (line) rule.
// A pasted line's `q_data` domain carries the ORIGINAL line's
// `sourceId`/`targetId`/`name` verbatim (byte-for-byte -- that is what
// Lucid's copy/paste leaves on shapeData). The pasted LINE itself is
// attached to fresh blocks though, so the stored pointers name the wrong
// blocks until this rule overlays what the line is ACTUALLY attached to
// now:
//
//   - a live, ATTACHED endpoint always wins over the stored id -- same
//     "live line wins" rule `ConnectorLucid.refreshEndpointIds` applies,
//     reused here via the exported `liveEndpointIds` helper so the two call
//     sites can never drift.
//   - a DETACHED endpoint (no live connection) keeps the stored id -- the
//     canvas has no answer there.
//   - the stored `name` is regenerated to the "A → B" form ONLY when BOTH
//     endpoints (after the overlay) resolve to a block on this page whose
//     OWN stored `q_data` carries a `name`. Anything short of that leaves
//     the inherited name untouched.
//
// Fabrication pattern (same as the Activity/Resource/Generator suites):
// write q_data through the real StorageAdapter on a throwaway fake carrying
// the ORIGINAL id, then copy the raw q_data STRING onto a new-id fake. That
// is byte-for-byte what a Lucid paste leaves behind.

import { SimulationObjectType } from '@quodsi/lucid-shared';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { normalizePastedItems } from '../../src/core/PasteNormalizer';
import { makeFakeBlock, makeFakeLine, makeFakePage, addBlock, addLine } from '../helpers/fakeProxies';

/** A detached line whose q_data was written for a DIFFERENT id: a paste. */
function makePastedConnectorLine(
    sa: StorageAdapter,
    newId: string,
    originalId: string,
    domain: Record<string, unknown>,
    opts: Parameters<typeof makeFakeLine>[1] = {}
): any {
    const throwaway = makeFakeLine(originalId);
    sa.setElementData(throwaway, { id: originalId, ...domain } as { id: string }, SimulationObjectType.Connector, {
        mappingSource: 'user',
    });
    const rawQData = throwaway.shapeData.get('q_data');
    const line = makeFakeLine(newId, opts);
    line.shapeData.set('q_data', rawQData!);
    return line;
}

/** A block on `page` with a stored Activity name -- an endpoint the connector can name itself after. */
function addNamedBlock(sa: StorageAdapter, page: any, blockId: string, name: string): any {
    const block = addBlock(page, makeFakeBlock(blockId));
    sa.setElementData(block, { id: blockId, name }, SimulationObjectType.Activity, { mappingSource: 'user' });
    return block;
}

describe('PasteNormalizer — Connector lines (Task 7)', () => {
    it('both endpoints attached to NAMED blocks: stored ids AND name follow the live line', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');
        addNamedBlock(sa, page, 'block-C', 'Check-in');
        addNamedBlock(sa, page, 'block-D', 'Triage');
        const pasted = addLine(
            page,
            makePastedConnectorLine(
                sa,
                'line-new',
                'line-orig',
                { name: 'Original A → Original B', sourceId: 'block-A', targetId: 'block-B', weight: 1 },
                { endpoint1: { x: 1, y: 2, connection: { id: 'block-C' } }, endpoint2: { x: 3, y: 4, connection: { id: 'block-D' } } }
            )
        );

        const result = normalizePastedItems([pasted], sa);

        const data = sa.getElementData<{ sourceId: string; targetId: string; name: string }>(pasted)!;
        expect(data.sourceId).toBe('block-C');
        expect(data.targetId).toBe('block-D');
        expect(data.name).toBe('Check-in → Triage');
        expect(result.changed).toBe(true);
    });

    it('one DETACHED endpoint: stored endpoint kept there, live wins on the attached end, name left untouched', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');
        addNamedBlock(sa, page, 'block-D', 'Triage');
        const pasted = addLine(
            page,
            makePastedConnectorLine(
                sa,
                'line-new',
                'line-orig',
                { name: 'Original A → Original B', sourceId: 'block-A', targetId: 'block-B', weight: 1 },
                { endpoint1: { x: 1, y: 2 }, endpoint2: { x: 3, y: 4, connection: { id: 'block-D' } } } // source dragged loose
            )
        );

        const result = normalizePastedItems([pasted], sa);

        const data = sa.getElementData<{ sourceId: string; targetId: string; name: string }>(pasted)!;
        expect(data.sourceId).toBe('block-A');       // stored kept -- no live answer
        expect(data.targetId).toBe('block-D');        // live wins
        expect(data.name).toBe('Original A → Original B');  // NOT regenerated: only one named endpoint resolves
        expect(result.changed).toBe(true);
    });

    it('an attached endpoint block with no stored name at all: endpoints follow the line, name untouched', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');
        // block-C exists on the page but was never converted -- no q_data, so no stored name.
        addBlock(page, makeFakeBlock('block-C'));
        addNamedBlock(sa, page, 'block-D', 'Triage');
        const pasted = addLine(
            page,
            makePastedConnectorLine(
                sa,
                'line-new',
                'line-orig',
                { name: 'Original A → Original B', sourceId: 'block-A', targetId: 'block-B', weight: 1 },
                { endpoint1: { x: 1, y: 2, connection: { id: 'block-C' } }, endpoint2: { x: 3, y: 4, connection: { id: 'block-D' } } }
            )
        );

        const result = normalizePastedItems([pasted], sa);

        const data = sa.getElementData<{ sourceId: string; targetId: string; name: string }>(pasted)!;
        expect(data.sourceId).toBe('block-C');
        expect(data.targetId).toBe('block-D');
        expect(data.name).toBe('Original A → Original B');
        expect(result.changed).toBe(true);
    });

    it('is idempotent: a second pass writes nothing', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');
        addNamedBlock(sa, page, 'block-C', 'Check-in');
        addNamedBlock(sa, page, 'block-D', 'Triage');
        const pasted = addLine(
            page,
            makePastedConnectorLine(
                sa,
                'line-new',
                'line-orig',
                { name: 'Original A → Original B', sourceId: 'block-A', targetId: 'block-B', weight: 1 },
                { endpoint1: { x: 1, y: 2, connection: { id: 'block-C' } }, endpoint2: { x: 3, y: 4, connection: { id: 'block-D' } } }
            )
        );

        normalizePastedItems([pasted], sa);
        const qDataAfterFirst = pasted.shapeData.get('q_data');

        const second = normalizePastedItems([pasted], sa);

        expect(second.changed).toBe(false);
        expect(second.notices).toEqual([]);
        expect(pasted.shapeData.get('q_data')).toBe(qDataAfterFirst);
    });
});

// Final-review fix B: BLOCKS before LINES within one page's batch.
//
// A pasted connector names itself after its endpoints' STORED names, and a
// pasted Activity's stored name is deduped by its own rule. Whichever runs
// first wins, and Lucid hands `hookCreateItems` its items in no guaranteed
// order -- so processing the batch in delivery order let a line that happened
// to arrive first bake in the endpoint's PRE-rename name, permanently
// disagreeing with the block it points at. Partitioning the batch (blocks
// first, then lines) makes the connector's name derive from names that are
// already final, whatever order Lucid delivered.
describe('PasteNormalizer — blocks are normalized before lines in the same batch (fix B)', () => {
    it('a connector delivered BEFORE its pasted endpoint still names itself after the RENAMED endpoint', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');
        // The original the paste collides with, plus the far endpoint.
        addNamedBlock(sa, page, 'block-triage', 'Triage');
        addNamedBlock(sa, page, 'block-exit', 'Exit');

        // A pasted Activity whose stored name collides -> renamed to 'Triage_2'.
        const throwaway = makeFakeBlock('act-orig');
        sa.setElementData(throwaway, { id: 'act-orig', name: 'Triage' }, SimulationObjectType.Activity, { mappingSource: 'user' });
        const pastedActivity = addBlock(page, makeFakeBlock('act-new'));
        pastedActivity.shapeData.set('q_data', throwaway.shapeData.get('q_data')!);

        const pastedLine = addLine(
            page,
            makePastedConnectorLine(
                sa,
                'line-new',
                'line-orig',
                { name: 'Triage → Exit', sourceId: 'act-orig', targetId: 'block-exit', weight: 1 },
                { endpoint1: { connection: { id: 'act-new' } }, endpoint2: { connection: { id: 'block-exit' } } }
            )
        );

        // REVERSE delivery order: the line arrives first in the array.
        normalizePastedItems([pastedLine, pastedActivity], sa);

        expect(sa.getElementData<{ name: string }>(pastedActivity)!.name).toBe('Triage_2');
        const connector = sa.getElementData<{ name: string; sourceId: string; targetId: string }>(pastedLine)!;
        expect(connector.sourceId).toBe('act-new');
        expect(connector.targetId).toBe('block-exit');
        expect(connector.name).toBe('Triage_2 → Exit');
    });
});
