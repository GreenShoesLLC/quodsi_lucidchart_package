// tests/model/storageAdapter.arrivalPatterns.test.ts
//
// Task 4 (lucid-arrival-pattern-editor): page-level storage for the
// arrival-pattern list, mirroring q_entities. Placed alongside the other
// StorageAdapter-exercising tests (modelManager.cascadeCleanup.test.ts,
// lucidVersionUpgrader.pageLevelLists.test.ts) rather than under a new
// tests/core/ directory — this package's tests/ is organized by domain
// (conversion, messaging, model, relay), not mirrored 1:1 from src/, and
// the page-level-list tests already live in tests/model.

import { StorageAdapter } from '../../src/core/StorageAdapter';
import { makeFakePage } from '../helpers/fakeProxies';

describe('StorageAdapter arrival patterns', () => {
    it('returns an empty array when nothing is stored', () => {
        const adapter = new StorageAdapter();
        expect(adapter.getArrivalPatterns(makeFakePage('page-1'))).toEqual([]);
    });

    it('round-trips a stored list', () => {
        const adapter = new StorageAdapter();
        const page = makeFakePage('page-1');
        adapter.setArrivalPatterns(page, [{ id: 'ap-1', name: 'P1', seasonWeights: [1, 2] } as any]);
        const out = adapter.getArrivalPatterns(page);
        expect(out).toEqual([{ id: 'ap-1', name: 'P1', seasonWeights: [1, 2] }]);
    });

    it('stores under the q_arrival_patterns key', () => {
        const adapter = new StorageAdapter();
        const page = makeFakePage('page-1');
        adapter.setArrivalPatterns(page, [{ id: 'ap-1', name: 'P1' } as any]);
        expect(page.shapeData.get('q_arrival_patterns')).toBeDefined();
    });

    it('clears the list', () => {
        const adapter = new StorageAdapter();
        const page = makeFakePage('page-1');
        adapter.setArrivalPatterns(page, [{ id: 'ap-1', name: 'P1' } as any]);
        adapter.clearArrivalPatterns(page);
        expect(adapter.getArrivalPatterns(page)).toEqual([]);
    });

    it('returns an empty array rather than throwing on corrupt JSON', () => {
        const adapter = new StorageAdapter();
        const page = makeFakePage('page-1');
        page.shapeData.set('q_arrival_patterns', '{not json');
        expect(adapter.getArrivalPatterns(page)).toEqual([]);
    });
});
