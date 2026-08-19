// tests/model/lucidVersionUpgrader.arrivalSchedules.test.ts
//
// Task 4 (2026-08-19 lucid-arrival-schedules-persistence spec): the
// page-level `q_arrival_schedules` list (Task 2) was never fed through
// `upgradeElements` on document open, so an existing document's stored
// schedules would keep their old shape (`type: 'ArrivalSchedule'`,
// `source: {kind: 'inline'}` wrapper, upper-case `timeUnit`) forever.
//
// Fixed by giving arrival schedules the same page-level-plain-array
// treatment already established for `q_res_requirements`/`q_states`/
// `q_arrival_patterns` (`lucidVersionUpgrader.arrivalPatterns.test.ts` is
// the direct precedent this file follows for both placement and
// structure) -- folded into the SAME `upgradeElements` call as every other
// element, registry-keyed on the HOST-STORED type string `'ArrivalSchedule'`
// (NOT the class's own `type` field, which is `SimulationObjectType.None`
// -- see ArrivalScheduleTransforms' own registry-key note), and included in
// the upgrade backup/restore block so a failed upgrade rolls schedules back
// with everything else.
//
// Appending this segment after `q_arrival_patterns` moves the slice
// boundary the arrival-patterns segment relied on (previously last, so its
// `slice(start)` was unbounded and safe only because nothing came after
// it) -- verified bounded as part of this task, not assumed.

import { LucidVersionUpgrader } from '../../src/versioning/LucidVersionUpgrader';
import { makeFakePage } from '../helpers/fakeProxies';

function makeUpgradePage(id: string): any {
    const page = makeFakePage(id);
    page.blocks = new Map();
    page.lines = new Map();
    page.getTitle = () => 'Test Page';
    return page;
}

/** An old-era Model page blob, stamped at the pre-clean version so the
 *  upgrader's sourceVersion resolves to it (LucidPreflightChecker.
 *  getPageVersion reads `q_data.version`). */
function setOldShapeModelBlob(page: any): void {
    page.shapeData.set('q_data', JSON.stringify({
        type: 'Model',
        id: page.id,
        version: '2026.10.11',
        name: 'M',
        reps: 1,
        oneClockUnit: 'MINUTES',
        simulationTimeType: 'Clock',
        runClockPeriod: 24,
        runClockPeriodUnit: 'HOURS',
    }));
}

describe('LucidVersionUpgrader arrival schedules (Task 4)', () => {
    it('leaves a page with no stored arrival schedules untouched (no spurious empty-array write)', async () => {
        const page = makeUpgradePage('page-1');
        setOldShapeModelBlob(page);

        const upgrader = new LucidVersionUpgrader('2026.11.01');
        await (upgrader as any).performUpgrade(page);

        expect(page.shapeData.get('q_arrival_schedules')).toBeUndefined();
    });

    it('upgrades a stored arrival schedule through the core ArrivalSchedule transforms', async () => {
        const page = makeUpgradePage('page-2');
        setOldShapeModelBlob(page);

        const oldSchedule = {
            type: 'ArrivalSchedule',
            id: 'sched-1',
            name: 'Schedule1',
            timeUnit: 'MINUTES',
            source: { kind: 'inline' },
            arrivals: [{ time: 5, quantity: 1, entityId: 'entity-b' }],
        };
        page.shapeData.set('q_arrival_schedules', JSON.stringify([oldSchedule]));

        const upgrader = new LucidVersionUpgrader('2026.11.01');
        await (upgrader as any).performUpgrade(page);

        const stored = JSON.parse(page.shapeData.get('q_arrival_schedules'));
        expect(stored).toHaveLength(1);
        expect(stored[0]).toMatchObject({
            id: 'sched-1',
            name: 'Schedule1',
            timeUnit: 'minutes',
            arrivals: [{ time: 5, quantity: 1, entityId: 'entity-b' }],
        });
        // The clean wire has no `type`/`source` slot for ArrivalSchedule --
        // both must be gone, not just renamed.
        expect('type' in stored[0]).toBe(false);
        expect('source' in stored[0]).toBe(false);
    });

    it('does not fold arrival-schedule envelopes into the arrival-patterns results (slice bounds stay correct with both lists present)', async () => {
        const page = makeUpgradePage('page-2b');
        setOldShapeModelBlob(page);

        const oldPattern = { type: 'ArrivalPattern', id: 'ap-1', name: 'P1', cycle: 'DAY' };
        page.shapeData.set('q_arrival_patterns', JSON.stringify([oldPattern]));

        const oldSchedule = {
            type: 'ArrivalSchedule', id: 'sched-1', name: 'Schedule1',
            timeUnit: 'MINUTES', arrivals: [{ time: 5, quantity: 1, entityId: 'entity-b' }],
        };
        page.shapeData.set('q_arrival_schedules', JSON.stringify([oldSchedule]));

        const upgrader = new LucidVersionUpgrader('2026.11.01');
        await (upgrader as any).performUpgrade(page);

        const storedPatterns = JSON.parse(page.shapeData.get('q_arrival_patterns'));
        const storedSchedules = JSON.parse(page.shapeData.get('q_arrival_schedules'));

        expect(storedPatterns).toHaveLength(1);
        expect(storedPatterns[0].id).toBe('ap-1');
        // The pattern list must not have picked up the schedule's fields
        // (proves the arrivalPatternResults slice is now upper-bounded,
        // not still reading through to the end of `result.elements`).
        expect(storedPatterns[0]).not.toHaveProperty('timeUnit');
        expect(storedPatterns[0]).not.toHaveProperty('arrivals');

        expect(storedSchedules).toHaveLength(1);
        expect(storedSchedules[0].id).toBe('sched-1');
    });

    it('rolls a stored arrival-schedule list back on upgrade failure, same as entities/requirements/states/patterns', async () => {
        const page = makeUpgradePage('page-3');
        setOldShapeModelBlob(page);

        const oldSchedule = { type: 'ArrivalSchedule', id: 'sched-2', name: 'Schedule2', timeUnit: 'MINUTES' };
        const originalRaw = JSON.stringify([oldSchedule]);
        page.shapeData.set('q_arrival_schedules', originalRaw);

        const upgrader = new LucidVersionUpgrader('2026.11.01');
        await (upgrader as any).beginUpgrade(page);
        // Simulate a mid-upgrade write (what performUpgrade would have done)
        // then roll back, mirroring how the framework calls rollbackUpgrade
        // on a thrown error from performUpgrade.
        page.shapeData.set('q_arrival_schedules', JSON.stringify([{ id: 'sched-2', name: 'Schedule2', timeUnit: 'minutes' }]));
        await (upgrader as any).rollbackUpgrade(page);

        expect(page.shapeData.get('q_arrival_schedules')).toBe(originalRaw);
    });
});
