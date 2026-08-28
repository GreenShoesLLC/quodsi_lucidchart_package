// tests/model/lucidVersionUpgrader.workSchedules.test.ts
//
// Work schedules (spec 2026-08-27): the page-level `q_work_schedules` list
// must join the upgrade's backup/restore block, so a failed upgrade rolls
// work schedules back with everything else instead of leaving a TORN document
// (schedules from the new attempt sitting beside everything else reverted).
//
// DELIBERATELY NOT folded into the `upgradeElements` call the way
// `q_arrival_schedules` / `q_arrival_patterns` / `q_resources` are. Those
// lists predate the clean-wire migration and have real transforms to run;
// `workSchedules` is born in the clean era, so there is no version of it to
// upgrade FROM and no registry entry to key on. Folding it in anyway would
// stamp the synthetic registry `type` back onto every stored record -- the
// exact leak StorageAdapter.setWorkSchedules strips, and the one the engine's
// extra="forbid" parser rejects a document for. When a real WorkSchedule
// transform is ever registered, add the segment then (and mind the slice
// bounds: the resources segment is currently last).

import { LucidVersionUpgrader } from '../../src/versioning/LucidVersionUpgrader';
import { makeFakePage } from '../helpers/fakeProxies';

function makeUpgradePage(id: string): any {
    const page = makeFakePage(id);
    page.blocks = new Map();
    page.lines = new Map();
    page.getTitle = () => 'Test Page';
    return page;
}

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

const STORED_SCHEDULE = {
    id: 'ws-1',
    name: 'Nursing team',
    pattern: [{ days: ['mon'], start: '07:00', end: '15:00', capacity: 3 }],
};

describe('LucidVersionUpgrader work schedules', () => {
    it('leaves a stored work-schedule list byte-identical through a successful upgrade', async () => {
        const page = makeUpgradePage('page-1');
        setOldShapeModelBlob(page);
        const originalRaw = JSON.stringify([STORED_SCHEDULE]);
        page.shapeData.set('q_work_schedules', originalRaw);

        const upgrader = new LucidVersionUpgrader('2026.12.01');
        await (upgrader as any).performUpgrade(page);

        expect(page.shapeData.get('q_work_schedules')).toBe(originalRaw);
    });

    it('leaves a page with no stored work schedules untouched (no spurious empty-array write)', async () => {
        const page = makeUpgradePage('page-2');
        setOldShapeModelBlob(page);

        const upgrader = new LucidVersionUpgrader('2026.12.01');
        await (upgrader as any).performUpgrade(page);

        expect(page.shapeData.get('q_work_schedules')).toBeUndefined();
    });

    it('rolls a stored work-schedule list back on upgrade failure, same as the other page-level lists', async () => {
        const page = makeUpgradePage('page-3');
        setOldShapeModelBlob(page);
        const originalRaw = JSON.stringify([STORED_SCHEDULE]);
        page.shapeData.set('q_work_schedules', originalRaw);

        const upgrader = new LucidVersionUpgrader('2026.12.01');
        await (upgrader as any).beginUpgrade(page);
        // Simulate a mid-upgrade write, then roll back -- mirroring how the
        // framework calls rollbackUpgrade on a throw from performUpgrade.
        page.shapeData.set('q_work_schedules', JSON.stringify([{ id: 'ws-1', name: 'Clobbered' }]));
        await (upgrader as any).rollbackUpgrade(page);

        expect(page.shapeData.get('q_work_schedules')).toBe(originalRaw);
    });

    it('deletes a work-schedule list that did not exist before a rolled-back upgrade', async () => {
        const page = makeUpgradePage('page-4');
        setOldShapeModelBlob(page);

        const upgrader = new LucidVersionUpgrader('2026.12.01');
        await (upgrader as any).beginUpgrade(page);
        page.shapeData.set('q_work_schedules', JSON.stringify([STORED_SCHEDULE]));
        await (upgrader as any).rollbackUpgrade(page);

        expect(page.shapeData.get('q_work_schedules')).toBeUndefined();
    });
});
