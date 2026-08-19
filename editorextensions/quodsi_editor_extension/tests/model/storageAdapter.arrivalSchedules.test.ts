// tests/model/storageAdapter.arrivalSchedules.test.ts
//
// Task 2 (lucid-arrival-schedules-persistence): page-level storage for the
// arrival-schedule list, mirroring storageAdapter.arrivalPatterns.test.ts /
// q_arrival_patterns. Placed alongside the other StorageAdapter-exercising
// tests in tests/model/ for the same reason as the pattern test — this
// package's tests/ is organized by domain, not mirrored 1:1 from src/, and
// the page-level-list tests already live here.

import { StorageAdapter } from '../../src/core/StorageAdapter';
import { makeFakePage } from '../helpers/fakeProxies';

describe('StorageAdapter arrival schedules', () => {
    it('returns an empty array when nothing is stored', () => {
        const adapter = new StorageAdapter();
        expect(adapter.getArrivalSchedules(makeFakePage('page-1'))).toEqual([]);
    });

    it('round-trips a stored list', () => {
        const adapter = new StorageAdapter();
        const page = makeFakePage('page-1');
        adapter.setArrivalSchedules(page, [{ id: 'as-1', name: 'S1', arrivals: [{ time: 5 }] } as any]);
        const out = adapter.getArrivalSchedules(page);
        expect(out).toEqual([{ id: 'as-1', name: 'S1', arrivals: [{ time: 5 }] }]);
    });

    it('stores under the q_arrival_schedules key', () => {
        const adapter = new StorageAdapter();
        const page = makeFakePage('page-1');
        adapter.setArrivalSchedules(page, [{ id: 'as-1', name: 'S1' } as any]);
        expect(page.shapeData.get('q_arrival_schedules')).toBeDefined();
    });

    it('clears the list', () => {
        const adapter = new StorageAdapter();
        const page = makeFakePage('page-1');
        adapter.setArrivalSchedules(page, [{ id: 'as-1', name: 'S1' } as any]);
        adapter.clearArrivalSchedules(page);
        expect(adapter.getArrivalSchedules(page)).toEqual([]);
    });

    it('returns an empty array rather than throwing on corrupt JSON', () => {
        const adapter = new StorageAdapter();
        const page = makeFakePage('page-1');
        page.shapeData.set('q_arrival_schedules', '{not json');
        expect(adapter.getArrivalSchedules(page)).toEqual([]);
    });
});
