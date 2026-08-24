// tests/core/pasteNormalizer.detection.test.ts
//
// Task 1 of the LucidChart Paste Normalizer plan: skeleton behavior only —
// paste detection by envelope-id mismatch, per-page batching, generic
// envelope re-stamp, and the never-throw failure posture. Typed per-element
// rules land in later tasks (the `default:` branch in normalizeOne is the
// only case exercised here).
//
// A "pasted" item is fabricated the one legitimate way: write q_data through
// the real StorageAdapter on a throwaway fake with the ORIGINAL id, then copy
// the raw q_data STRING onto the new-id item. That is byte-for-byte what
// Lucid paste does (the shape gets a new id; its shapeData, including q_data,
// is copied verbatim) — never hand-build an envelope.

import { SimulationObjectType } from '@quodsi/lucid-shared';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { isPastedItem, normalizePastedItems } from '../../src/core/PasteNormalizer';
import { makeFakeBlock, makeFakePage, addBlock } from '../helpers/fakeProxies';

/**
 * Builds a detached (not yet on any page) block whose q_data was written for
 * a different id — i.e. it looks exactly like the result of a Lucid paste.
 */
function makePastedBlock(
    sa: StorageAdapter,
    newId: string,
    originalId: string,
    opts: {
        type?: SimulationObjectType;
        domain?: Record<string, unknown>;
        mappingSource?: 'auto' | 'user';
    } = {}
): any {
    const type = opts.type ?? SimulationObjectType.Activity;
    const domain = opts.domain ?? { name: 'Original Activity' };
    const throwaway = makeFakeBlock(originalId);
    sa.setElementData(
        throwaway,
        { id: originalId, ...domain } as { id: string },
        type,
        opts.mappingSource ? { mappingSource: opts.mappingSource } : {}
    );
    const rawQData = throwaway.shapeData.get('q_data');
    const block = makeFakeBlock(newId);
    block.shapeData.set('q_data', rawQData!);
    return block;
}

describe('PasteNormalizer — skeleton (Task 1)', () => {
    it('detects a pasted item by envelope id mismatch', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');

        const pastedBlock = addBlock(page, makePastedBlock(sa, 'new-id', 'old-id'));
        expect(isPastedItem(pastedBlock, sa)).toBe(true);

        const normalBlock = addBlock(page, makeFakeBlock('normal-id'));
        sa.setElementData(normalBlock, { id: 'normal-id', name: 'Normal Activity' }, SimulationObjectType.Activity);
        expect(isPastedItem(normalBlock, sa)).toBe(false);
    });

    it('re-stamps the envelope id and is idempotent', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');
        const pastedBlock = addBlock(page, makePastedBlock(sa, 'new-id', 'old-id', { mappingSource: 'user' }));

        const first = normalizePastedItems([pastedBlock], sa);
        expect(first.changed).toBe(true);

        expect(sa.getElementData<{ id: string }>(pastedBlock)!.id).toBe(pastedBlock.id);
        expect(sa.getElementType(pastedBlock)!.type).toBe(SimulationObjectType.Activity);
        expect(sa.getElementType(pastedBlock)!.mappingSource).toBe('user');

        const qDataAfterFirst = pastedBlock.shapeData.get('q_data');

        const second = normalizePastedItems([pastedBlock], sa);
        expect(second.changed).toBe(false);
        expect(pastedBlock.shapeData.get('q_data')).toBe(qDataAfterFirst);
    });

    it('skips items with no q_data and never throws on one bad item', () => {
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');

        const plainBlock = addBlock(page, makeFakeBlock('plain-id'));
        const corruptBlock = addBlock(page, makeFakeBlock('corrupt-id'));
        corruptBlock.shapeData.set('q_data', '{nope');
        const pastedActivity = addBlock(page, makePastedBlock(sa, 'new-id', 'old-id'));

        let result;
        expect(() => {
            result = normalizePastedItems([plainBlock, corruptBlock, pastedActivity], sa);
        }).not.toThrow();

        expect(result!.changed).toBe(true);
        expect(sa.getElementData<{ id: string }>(pastedActivity)!.id).toBe(pastedActivity.id);
    });

    it('groups by page: items from two pages are each normalized against their own page', () => {
        const sa = new StorageAdapter();
        const pageA = makeFakePage('page-a');
        const pageB = makeFakePage('page-b');

        const pastedOnA = addBlock(pageA, makePastedBlock(sa, 'new-id-a', 'old-id-a'));
        const pastedOnB = addBlock(pageB, makePastedBlock(sa, 'new-id-b', 'old-id-b'));

        const result = normalizePastedItems([pastedOnA, pastedOnB], sa);

        expect(result.changed).toBe(true);
        expect(sa.getElementData<{ id: string }>(pastedOnA)!.id).toBe(pastedOnA.id);
        expect(sa.getElementData<{ id: string }>(pastedOnB)!.id).toBe(pastedOnB.id);
    });
});
