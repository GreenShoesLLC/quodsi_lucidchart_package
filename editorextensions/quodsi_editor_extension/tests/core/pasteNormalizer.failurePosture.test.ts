// tests/core/pasteNormalizer.failurePosture.test.ts
//
// Final-review fix A: the never-lose-the-paste posture had two holes OUTSIDE
// any try/catch, both in `normalizePastedItems` itself rather than in a rule:
//
//   1. the grouping loop's `item.getPage?.()` -- a proxy that throws there
//      took the whole gesture down before a single page was looked at;
//   2. the per-page PROLOGUE -- `duplicatedPageEnvelope`, which calls the
//      injected `opts.allPages()` (production: `new DocumentProxy(client)
//      .pages`, a live SDK read that can fail). A throw there escaped the
//      page loop and aborted every REMAINING page of the same gesture, even
//      though each page's inner work is individually guarded.
//
// Both are now logged and stepped over: one bad item is skipped, one bad page
// is skipped, and the rest of the gesture is still normalized. These tests
// pin that, plus that `result.changed` still reports the work that DID happen
// (the caller uses it to decide whether to invalidate the model cache).

import { SimulationObjectType, configureLogger, resetLoggerForTests } from '@quodsi/lucid-shared';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { normalizePastedItems } from '../../src/core/PasteNormalizer';
import { makeFakeBlock, makeFakePage, addBlock } from '../helpers/fakeProxies';

/** Captures every emitted record so "the failure was logged" is assertable. */
function captureLogs(): { records: { level: string; message: string }[] } {
    const records: { level: string; message: string }[] = [];
    configureLogger({
        level: 'error',
        sinks: [{ write: (record: any) => { records.push({ level: record.level, message: record.message }); } }],
    });
    return { records };
}

/** A block on `page` whose q_data was written for a DIFFERENT id: a paste. */
function pastedActivity(sa: StorageAdapter, page: any, newId: string, originalId: string, name: string): any {
    const throwaway = makeFakeBlock(originalId);
    sa.setElementData(throwaway, { id: originalId, name }, SimulationObjectType.Activity, { mappingSource: 'user' });
    const block = addBlock(page, makeFakeBlock(newId));
    block.shapeData.set('q_data', throwaway.shapeData.get('q_data')!);
    return block;
}

describe('PasteNormalizer — a throwing per-page prologue does not abort the rest of the gesture', () => {
    afterEach(() => resetLoggerForTests());

    it('opts.allPages throwing in one page prologue leaves the OTHER page fully normalized', () => {
        const logs = captureLogs();
        const sa = new StorageAdapter();

        // Page A carries a STALE page envelope, so detection reaches the
        // witness check and calls opts.allPages() -- which throws.
        const pageA = makeFakePage('page-a');
        sa.setElementData(pageA, { id: 'page-somewhere-else', name: 'A' } as { id: string }, SimulationObjectType.Model);
        const itemA = pastedActivity(sa, pageA, 'new-a', 'orig-a', 'Alpha');

        // Page B has no page envelope at all: its prologue never calls allPages.
        const pageB = makeFakePage('page-b');
        const itemB = pastedActivity(sa, pageB, 'new-b', 'orig-b', 'Beta');

        const allPages = () => { throw new Error('document read failed'); };

        let result!: ReturnType<typeof normalizePastedItems>;
        expect(() => { result = normalizePastedItems([itemA, itemB], sa, { allPages }); }).not.toThrow();

        // The surviving page's item really was normalized.
        expect(sa.getElementData<{ id: string }>(itemB)!.id).toBe('new-b');
        expect(result.changed).toBe(true);

        // The failed page was skipped, not silently half-done: its item still
        // carries the source envelope id.
        expect(sa.getElementData<{ id: string }>(itemA)!.id).toBe('orig-a');
        expect(logs.records.some((r) => r.level === 'error')).toBe(true);
    });

    it('an item whose getPage throws is skipped; the rest of the batch is still normalized', () => {
        const logs = captureLogs();
        const sa = new StorageAdapter();
        const page = makeFakePage('page-1');
        const good = pastedActivity(sa, page, 'new-good', 'orig-good', 'Good');

        const bad = makeFakeBlock('bad');
        bad.getPage = () => { throw new Error('detached proxy'); };

        let result!: ReturnType<typeof normalizePastedItems>;
        expect(() => { result = normalizePastedItems([bad, good], sa, {}); }).not.toThrow();

        expect(sa.getElementData<{ id: string }>(good)!.id).toBe('new-good');
        expect(result.changed).toBe(true);
        expect(logs.records.some((r) => r.level === 'error')).toBe(true);
    });
});
