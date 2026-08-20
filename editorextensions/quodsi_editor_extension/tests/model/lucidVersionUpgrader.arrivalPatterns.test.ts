// tests/model/lucidVersionUpgrader.arrivalPatterns.test.ts
//
// Task 7 (2026-08-18 lucid-arrival-pattern-editor spec): the page-level
// `q_arrival_patterns` list (Task 4) was never fed through `upgradeElements`
// on document open, so an existing document's stored patterns would keep
// their old shape (`type: 'ArrivalPattern'`, SCREAMING `cycle`/`seasonMode`/
// `countMode`, `subHourDistribution`) forever.
//
// Fixed by giving arrival patterns the same page-level-plain-array treatment
// already established for `q_res_requirements`/`q_states`
// (`lucidVersionUpgrader.pageLevelLists.test.ts` is the precedent this file
// follows for both placement and structure) — folded into the SAME
// `upgradeElements` call as every other element, registry-keyed on the
// HOST-STORED type string `'ArrivalPattern'` (NOT the class's own `type`
// field, which is `SimulationObjectType.None` — see ArrivalPatternTransforms'
// own registry-key note), and included in the upgrade backup/restore block
// so a failed upgrade rolls patterns back with everything else.

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

describe('LucidVersionUpgrader arrival patterns (Task 7)', () => {
    it('leaves a page with no stored arrival patterns untouched (no spurious empty-array write)', async () => {
        const page = makeUpgradePage('page-1');
        setOldShapeModelBlob(page);

        const upgrader = new LucidVersionUpgrader('2026.11.01');
        await (upgrader as any).performUpgrade(page);

        expect(page.shapeData.get('q_arrival_patterns')).toBeUndefined();
    });

    it('upgrades a stored arrival pattern through the core ArrivalPattern transforms', async () => {
        const page = makeUpgradePage('page-2');
        setOldShapeModelBlob(page);

        const oldPattern = {
            type: 'ArrivalPattern',
            id: 'ap-1',
            name: 'P1',
            cycle: 'DAY',
            seasonMode: 'MONTH',
            countMode: 'POISSON',
            subHourDistribution: {
                distribution: {
                    distributionType: 'constant',
                    parameters: { value: 15 },
                },
            },
        };
        page.shapeData.set('q_arrival_patterns', JSON.stringify([oldPattern]));

        const upgrader = new LucidVersionUpgrader('2026.11.01');
        await (upgrader as any).performUpgrade(page);

        const stored = JSON.parse(page.shapeData.get('q_arrival_patterns'));
        expect(stored).toHaveLength(1);
        expect(stored[0]).toMatchObject({
            id: 'ap-1',
            name: 'P1',
            cycle: 'day',
            seasonMode: 'month',
            countMode: 'poisson',
            withinHourOffset: { value: 15 },
        });
        // The clean wire has no `type`/`subHourDistribution` slot for
        // ArrivalPattern -- both must be gone, not just renamed.
        expect('type' in stored[0]).toBe(false);
        expect('subHourDistribution' in stored[0]).toBe(false);
    });

    it('rolls a stored arrival-pattern list back on upgrade failure, same as entities/requirements/states', async () => {
        const page = makeUpgradePage('page-3');
        setOldShapeModelBlob(page);

        const oldPattern = { type: 'ArrivalPattern', id: 'ap-2', name: 'P2', cycle: 'DAY' };
        const originalRaw = JSON.stringify([oldPattern]);
        page.shapeData.set('q_arrival_patterns', originalRaw);

        const upgrader = new LucidVersionUpgrader('2026.11.01');
        await (upgrader as any).beginUpgrade(page);
        // Simulate a mid-upgrade write (what performUpgrade would have done)
        // then roll back, mirroring how the framework calls rollbackUpgrade
        // on a thrown error from performUpgrade.
        page.shapeData.set('q_arrival_patterns', JSON.stringify([{ id: 'ap-2', name: 'P2', cycle: 'day' }]));
        await (upgrader as any).rollbackUpgrade(page);

        expect(page.shapeData.get('q_arrival_patterns')).toBe(originalRaw);
    });
});
