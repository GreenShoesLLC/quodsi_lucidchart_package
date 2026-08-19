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

    it('lands every page-level list and the shape target in its own key, pinning the whole segment ladder (requirements -> states -> patterns -> schedules)', async () => {
        // Task 4 review fix: the earlier slice-bounds test only ever pinned
        // the patterns->schedules boundary (R = S = 0 there). Trap 2 has now
        // bitten twice on this branch -- this test stores ALL FOUR
        // page-level lists plus a real shape target at once, so the next
        // person appending a fifth list gets a failing test on cross-
        // contamination at ANY boundary, not just the last one.
        const page = makeUpgradePage('page-ladder');
        setOldShapeModelBlob(page);

        const activityBlock = { id: 'activity-1', shapeData: (() => {
            const m = new Map<string, string>();
            return { get: (k: string) => m.get(k), set: (k: string, v: string) => { m.set(k, v); }, delete: (k: string) => { m.delete(k); } };
        })() } as any;
        activityBlock.shapeData.set('q_data', JSON.stringify({
            type: 'Activity',
            id: 'activity-1',
            version: '2026.10.11',
            name: 'Triage',
            capacity: 1,
            connectType: 'Probability',
            inboundQueueCapacity: 999999,
            outboundQueueCapacity: 999999,
        }));
        page.allBlocks.set('activity-1', activityBlock);

        const oldRequirement = {
            id: 'rr-1',
            name: 'RR1',
            rootClauses: [
                {
                    clauseId: 'clause-1',
                    mode: 'REQUIRE_ALL',
                    requests: [{ resourceId: 'r1', quantity: 1, priority: 1, keepResource: false }],
                    subClauses: [],
                },
            ],
        };
        page.shapeData.set('q_res_requirements', JSON.stringify([oldRequirement]));

        const oldState = {
            id: 'state-1',
            name: 'priority',
            componentType: 'ENTITY',
            dataType: 'NUMBER',
            initialValue: 0,
            collectStatistics: true,
        };
        page.shapeData.set('q_states', JSON.stringify([oldState]));

        const oldPattern = {
            type: 'ArrivalPattern', id: 'ap-1', name: 'P1', cycle: 'DAY',
        };
        page.shapeData.set('q_arrival_patterns', JSON.stringify([oldPattern]));

        const oldSchedule = {
            type: 'ArrivalSchedule', id: 'sched-1', name: 'Schedule1',
            timeUnit: 'MINUTES', arrivals: [{ time: 5, quantity: 1, entityId: 'entity-b' }],
        };
        page.shapeData.set('q_arrival_schedules', JSON.stringify([oldSchedule]));

        const upgrader = new LucidVersionUpgrader('2026.11.01');
        await (upgrader as any).performUpgrade(page);

        // The shape target (index 0 in the combined call, alongside the
        // page itself) upgraded on its own -- no requirement/state/pattern/
        // schedule fields leaked onto it.
        const upgradedActivity = JSON.parse(activityBlock.shapeData.get('q_data'));
        const activityDomain = upgradedActivity.domain ?? upgradedActivity;
        expect(activityDomain.routing).toBe('probability');
        expect(activityDomain).not.toHaveProperty('rootClause');
        expect(activityDomain).not.toHaveProperty('cycle');
        expect(activityDomain).not.toHaveProperty('timeUnit');

        const storedRequirements = JSON.parse(page.shapeData.get('q_res_requirements'));
        expect(storedRequirements).toHaveLength(1);
        expect(storedRequirements[0].id).toBe('rr-1');
        expect(storedRequirements[0]).not.toHaveProperty('componentType');
        expect(storedRequirements[0]).not.toHaveProperty('cycle');
        expect(storedRequirements[0]).not.toHaveProperty('timeUnit');

        const storedStates = JSON.parse(page.shapeData.get('q_states'));
        expect(storedStates).toHaveLength(1);
        expect(storedStates[0].id).toBe('state-1');
        expect(storedStates[0]).not.toHaveProperty('rootClause');
        expect(storedStates[0]).not.toHaveProperty('cycle');
        expect(storedStates[0]).not.toHaveProperty('timeUnit');

        const storedPatterns = JSON.parse(page.shapeData.get('q_arrival_patterns'));
        expect(storedPatterns).toHaveLength(1);
        expect(storedPatterns[0].id).toBe('ap-1');
        expect(storedPatterns[0].cycle).toBe('day');
        expect(storedPatterns[0]).not.toHaveProperty('componentType');
        expect(storedPatterns[0]).not.toHaveProperty('timeUnit');
        expect(storedPatterns[0]).not.toHaveProperty('arrivals');

        const storedSchedules = JSON.parse(page.shapeData.get('q_arrival_schedules'));
        expect(storedSchedules).toHaveLength(1);
        expect(storedSchedules[0].id).toBe('sched-1');
        expect(storedSchedules[0].timeUnit).toBe('minutes');
        expect(storedSchedules[0]).not.toHaveProperty('componentType');
        expect(storedSchedules[0]).not.toHaveProperty('cycle');
        expect(storedSchedules[0]).not.toHaveProperty('rootClause');
    });
});
