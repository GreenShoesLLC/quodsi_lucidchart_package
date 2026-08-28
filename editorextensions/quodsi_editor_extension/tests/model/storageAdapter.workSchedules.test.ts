// tests/model/storageAdapter.workSchedules.test.ts
//
// Work schedules (spec 2026-08-27 §3.1): page-level storage for the
// `workSchedules` list under `q_work_schedules`, mirroring
// storageAdapter.arrivalSchedules.test.ts / q_arrival_schedules exactly.
//
// The one deliberate DIFFERENCE from every sibling list is pinned here: a
// stored record must never carry the class `type` tag. WorkSchedule.type is
// SimulationObjectType.None (the same quirk State/ArrivalPattern/
// ArrivalSchedule carry) and the engine's CleanWorkScheduleDoc is an
// `extra="forbid"` parser with no slot for it, so a leaked `type` is a
// document the engine rejects wholesale. drawio leaks it today; Lucid must
// not repeat that.

import { StorageAdapter } from '../../src/core/StorageAdapter';
import { makeFakePage } from '../helpers/fakeProxies';

const NT = {
    id: 'ws-1',
    name: 'Nursing team',
    pattern: [{ days: ['mon', 'tue', 'wed', 'thu', 'fri'], start: '07:00', end: '15:00', capacity: 3 }],
};

describe('StorageAdapter work schedules', () => {
    it('returns an empty array when nothing is stored', () => {
        const adapter = new StorageAdapter();
        expect(adapter.getWorkSchedules(makeFakePage('page-1'))).toEqual([]);
    });

    it('round-trips a stored list', () => {
        const adapter = new StorageAdapter();
        const page = makeFakePage('page-1');
        adapter.setWorkSchedules(page, [NT as any]);
        expect(adapter.getWorkSchedules(page)).toEqual([NT]);
    });

    it('stores under the q_work_schedules key', () => {
        const adapter = new StorageAdapter();
        const page = makeFakePage('page-1');
        adapter.setWorkSchedules(page, [NT as any]);
        expect(page.shapeData.get('q_work_schedules')).toBeDefined();
    });

    it('strips the class `type` tag before storing', () => {
        const adapter = new StorageAdapter();
        const page = makeFakePage('page-1');
        adapter.setWorkSchedules(page, [{ ...NT, type: 'None' } as any]);
        const stored = JSON.parse(page.shapeData.get('q_work_schedules') as string);
        expect('type' in stored[0]).toBe(false);
        expect(stored[0].id).toBe('ws-1');
        expect(stored[0].pattern).toEqual(NT.pattern);
    });

    it('clears the list', () => {
        const adapter = new StorageAdapter();
        const page = makeFakePage('page-1');
        adapter.setWorkSchedules(page, [NT as any]);
        adapter.clearWorkSchedules(page);
        expect(adapter.getWorkSchedules(page)).toEqual([]);
    });

    it('returns an empty array rather than throwing on corrupt JSON', () => {
        const adapter = new StorageAdapter();
        const page = makeFakePage('page-1');
        page.shapeData.set('q_work_schedules', '{not json');
        expect(adapter.getWorkSchedules(page)).toEqual([]);
    });
});
