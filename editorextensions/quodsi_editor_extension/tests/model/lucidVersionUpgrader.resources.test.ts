// tests/model/lucidVersionUpgrader.resources.test.ts
//
// Plan 2b polish P1: `q_resources` (Lucid storage format 2 -- the page-level
// `StoredResourceRecord[]` list) was NOT in the version-upgrade envelope.
// `LucidVersionUpgrader` backed up and transformed every OTHER page-level
// list (`q_entities`, `q_res_requirements`, `q_states`,
// `q_arrival_patterns`, `q_arrival_schedules`) but not this one -- and since
// Plan 2b a Resource BLOCK's `q_data` is only a pointer (`{ resourceId }`),
// so a future `ResourceTransforms` entry could never reach a resource record
// through a block again: it would silently no-op on every migrated document.
//
// Fixed by giving `q_resources` the same page-level-plain-array treatment
// already established for the four lists above (the direct precedents this
// file follows are `lucidVersionUpgrader.pageLevelLists.test.ts` and
// `lucidVersionUpgrader.arrivalSchedules.test.ts`): a backup slot in
// `beginUpgrade`, a restore in `rollbackUpgrade`, a `readPageArray` +
// synthetic `type: 'Resource'` tag folded into the SAME `upgradeElements`
// call, and an always-write-back-when-non-empty write.
//
// Appending this segment after `q_arrival_schedules` moves the slice
// boundary the schedules segment relied on (previously last, so its
// `slice(start)` was unbounded and safe only because nothing came after it)
// -- pinned by the cross-contamination test below, not assumed.

import { LucidVersionUpgrader } from '../../src/versioning/LucidVersionUpgrader';
import { makeFakePage } from '../helpers/fakeProxies';
import { MODEL_SCHEMA_VERSION } from '@quodsi/lucid-shared';

function makeUpgradePage(id: string): any {
    const page = makeFakePage(id);
    page.blocks = new Map();
    page.lines = new Map();
    page.getTitle = () => 'Test Page';
    return page;
}

/** An old-era Model page blob stamped at `version`, which is what the
 *  upgrader resolves as sourceVersion (LucidPreflightChecker.getPageVersion
 *  reads `q_data.version`). */
function setOldShapeModelBlob(page: any, version: string): void {
    page.shapeData.set('q_data', JSON.stringify({
        type: 'Model',
        id: page.id,
        version,
        name: 'M',
        reps: 1,
        oneClockUnit: 'MINUTES',
        simulationTimeType: 'Clock',
        runClockPeriod: 24,
        runClockPeriodUnit: 'HOURS',
    }));
}

describe('LucidVersionUpgrader q_resources (Plan 2b polish P1)', () => {
    it('carries stored resource records through a full upgrade and stamps the page version', async () => {
        // Source version 2026.02.03 so the EXISTING ResourceTransforms entry
        // (2026.02.03 -> 2026.02.07, "description defaults to ''") actually
        // fires -- an observable proof that the records reached
        // `upgradeElements` at all, not merely that they survived.
        const page = makeUpgradePage('page-1');
        setOldShapeModelBlob(page, '2026.02.03');

        page.shapeData.set('q_resources', JSON.stringify([
            { id: 'res-1', name: 'Nurse', capacity: 2 },
        ]));

        const upgrader = new LucidVersionUpgrader(MODEL_SCHEMA_VERSION);
        await upgrader.upgrade(page);

        const stored = JSON.parse(page.shapeData.get('q_resources'));
        expect(stored).toHaveLength(1);
        expect(stored[0]).toMatchObject({ id: 'res-1', name: 'Nurse', capacity: 2 });
        // The Resource transform ran: a record with no description gains one.
        expect(stored[0].description).toBe('');
        // StoredResourceRecord has no `type` slot -- flattenArrayItem must not
        // re-attach the synthetic registry key.
        expect('type' in stored[0]).toBe(false);

        // The page came out stamped at the current version.
        expect(JSON.parse(page.shapeData.get('q_data')).version).toBe(MODEL_SCHEMA_VERSION);
    });

    it('restores q_resources byte-identically when a later upgrade step throws', async () => {
        const page = makeUpgradePage('page-2');
        setOldShapeModelBlob(page, '2026.02.03');

        const originalRaw = JSON.stringify([{ id: 'res-2', name: 'Tech', capacity: 1 }]);
        page.shapeData.set('q_resources', originalRaw);

        const upgrader = new LucidVersionUpgrader(MODEL_SCHEMA_VERSION);
        // Fail AFTER performUpgrade has already rewritten q_resources.
        // q_resources is the LAST write performUpgrade makes, so the only
        // genuinely-later step is finalizeUpgrade -- overridden here rather
        // than faked with a hand-rolled mid-upgrade write, so the real
        // begin -> perform -> rollback path runs end to end.
        (upgrader as any).finalizeUpgrade = async (): Promise<void> => {
            throw new Error('boom');
        };

        await expect(upgrader.upgrade(page)).rejects.toThrow('boom');

        expect(page.shapeData.get('q_resources')).toBe(originalRaw);
    });

    it('leaves a page with no stored resources untouched (no spurious empty-array write)', async () => {
        const page = makeUpgradePage('page-3');
        setOldShapeModelBlob(page, '2026.10.11');

        const upgrader = new LucidVersionUpgrader(MODEL_SCHEMA_VERSION);
        await upgrader.upgrade(page);

        expect(page.shapeData.get('q_resources')).toBeUndefined();
    });

    it('does not fold resource envelopes into the arrival-schedules results (the schedules slice is now upper-bounded)', async () => {
        // Trap 2 from the arrival-schedules task, one rung further up the
        // ladder: `arrivalScheduleResults` used an UNBOUNDED slice(start)
        // because schedules were last. Appending resources after them makes
        // that slice read the resource envelopes too.
        const page = makeUpgradePage('page-4');
        setOldShapeModelBlob(page, '2026.10.11');

        page.shapeData.set('q_arrival_schedules', JSON.stringify([{
            type: 'ArrivalSchedule', id: 'sched-1', name: 'Schedule1',
            timeUnit: 'MINUTES', arrivals: [{ time: 5, quantity: 1, entityId: 'entity-b' }],
        }]));
        page.shapeData.set('q_resources', JSON.stringify([
            { id: 'res-1', name: 'Nurse', capacity: 2, description: '' },
        ]));

        const upgrader = new LucidVersionUpgrader(MODEL_SCHEMA_VERSION);
        await upgrader.upgrade(page);

        const storedSchedules = JSON.parse(page.shapeData.get('q_arrival_schedules'));
        expect(storedSchedules).toHaveLength(1);
        expect(storedSchedules[0].id).toBe('sched-1');
        expect(storedSchedules[0].timeUnit).toBe('minutes');
        expect(storedSchedules[0]).not.toHaveProperty('capacity');

        const storedResources = JSON.parse(page.shapeData.get('q_resources'));
        expect(storedResources).toHaveLength(1);
        expect(storedResources[0]).toMatchObject({ id: 'res-1', name: 'Nurse', capacity: 2 });
        expect(storedResources[0]).not.toHaveProperty('timeUnit');
        expect(storedResources[0]).not.toHaveProperty('arrivals');
    });
});
