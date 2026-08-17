// tests/model/modelLucid.upgradePath.test.ts
//
// Review F1 (BLOCKER) on wire-cleanup Phase B2 Task 9: LucidVersionUpgrader.ts
// feeds the page's q_data (type "Model") through the shared `upgradeElements()`
// core engine, and the now-live clean-era ModelTransforms hop drops the old
// field names (`reps`/`oneClockUnit`/`simulationTimeType`/
// `warmupClockPeriod(+Unit)`/`runClockPeriod(+Unit)`) and writes
// `replications`/`timeUnit`/`timeMode`/`runTime`/`warmupTime` in their place.
// ModelLucid.createSimObject must read BOTH shapes correctly:
//   - a page that already went through the upgrade (clean names present)
//   - a page that hasn't yet (old names only, upgrade didn't run this session)
// Losing either path silently reverts every existing document's run
// parameters to defaults (1 rep / 24h / clock) on next open.

import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ModelLucid } from '../../src/types/ModelLucid';
import { upgradeElements, PeriodUnit, SimulationTimeType, SimulationObjectType } from '@quodsi/lucid-shared';
import { makeFakePage } from '../helpers/fakeProxies';

function makeFakePageWithTitle(id: string, title: string): any {
    const page = makeFakePage(id);
    page.getTitle = () => title;
    return page;
}

/**
 * The old-era flat page blob a pre-clean document actually stored.
 *
 * `warmupDateTime`/`finishDateTime` (review R2): HOST-LOCAL fields with no
 * clean-wire slot, but the upgrade transform must PRESERVE them in the
 * upgraded domain document regardless (`ModelTransforms.ts`'s clean-era
 * hop no longer `dropKeys`s either) — an earlier version silently lost
 * both on every host's first upgrade-on-open, which then tripped
 * `missing_finish_datetime` for a previously-valid calendar-mode document.
 */
const OLD_SHAPE_BLOB = {
    type: 'Model',
    id: 'page-upgrade-001',
    name: 'Legacy Model',
    reps: 77,
    seed: 9999,
    oneClockUnit: 'MINUTES',
    simulationTimeType: 'CalendarDate',
    warmupClockPeriod: 3,
    warmupClockPeriodUnit: 'DAYS',
    runClockPeriod: 30,
    runClockPeriodUnit: 'DAYS',
    warmupDateTime: '2025-03-01T06:00:00.000Z',
    startDateTime: '2025-04-01T08:00:00.000Z',
    finishDateTime: '2025-11-30T18:00:00.000Z',
};

describe('ModelLucid survives the clean-era upgrade hop (review F1)', () => {
    it('reads real values (not defaults) from a page the upgrader already migrated', () => {
        // Run the SAME pure core engine LucidVersionUpgrader.ts delegates to,
        // against the exact old-shape blob a real document would carry.
        const result = upgradeElements([OLD_SHAPE_BLOB], '2026.10.11');
        const upgraded = result.elements[0];

        // Mirror LucidVersionUpgrader.handleUpgrade's own write path
        // (LucidVersionUpgrader.ts: `t.element.shapeData.set(DATA_KEY,
        // JSON.stringify(upgraded))`, plus the page version-gate marker).
        const fakePage = makeFakePageWithTitle('page-upgrade-001', 'Legacy Model');
        (upgraded as any).version = result.toVersion;
        fakePage.shapeData.set('q_data', JSON.stringify(upgraded));

        const storageAdapter = new StorageAdapter();
        const modelLucid = new ModelLucid(fakePage, storageAdapter);
        const model = modelLucid.getSimulationObject();

        // The real values, not ModelDefaults' 1 rep / 24h / clock.
        expect(model.replications).toBe(77);
        expect(model.seed).toBe(9999);
        expect(model.timeUnit).toBe(PeriodUnit.MINUTES);
        expect(model.timeMode).toBe(SimulationTimeType.CalendarDate);
        expect(model.runTime?.value).toBe(30);
        expect(model.runTime?.unit).toBe(PeriodUnit.DAYS);
        expect(model.warmupTime?.value).toBe(3);
        expect(model.warmupTime?.unit).toBe(PeriodUnit.DAYS);
        expect(model.startDateTime).not.toBeNull();

        // Review R2: HOST-LOCAL dates survive the upgrade hop intact, and
        // ModelLucid's own date coercion (review R1 fallout) turns them
        // into real Date instances, not the raw ISO strings the upgraded
        // blob actually carries.
        expect(model.warmupDateTime).toBeInstanceOf(Date);
        expect(model.warmupDateTime?.toISOString()).toBe('2025-03-01T06:00:00.000Z');
        expect(model.startDateTime).toBeInstanceOf(Date);
        expect(model.startDateTime?.toISOString()).toBe('2025-04-01T08:00:00.000Z');
        expect(model.finishDateTime).toBeInstanceOf(Date);
        expect(model.finishDateTime?.toISOString()).toBe('2025-11-30T18:00:00.000Z');
    });

    it('a re-save (updateFromPlatform) after the upgrade persists CLEAN names, not the old ones', () => {
        const result = upgradeElements([OLD_SHAPE_BLOB], '2026.10.11');
        const upgraded = result.elements[0];
        (upgraded as any).version = result.toVersion;

        const fakePage = makeFakePageWithTitle('page-upgrade-001', 'Legacy Model');
        fakePage.shapeData.set('q_data', JSON.stringify(upgraded));

        const storageAdapter = new StorageAdapter();
        const modelLucid = new ModelLucid(fakePage, storageAdapter);
        modelLucid.updateFromPlatform();

        const reread = storageAdapter.getElementData<any>(fakePage);
        expect(reread.replications).toBe(77);
        expect(reread.runTime).toEqual({ value: 30, unit: PeriodUnit.DAYS });

        // Reading it back through a fresh ModelLucid still gets the real values.
        const modelLucid2 = new ModelLucid(fakePage, storageAdapter);
        expect(modelLucid2.getSimulationObject().replications).toBe(77);
        expect(modelLucid2.getSimulationObject().runTime?.value).toBe(30);
    });

    it('falls back to OLD names directly when the upgrade never ran this session', () => {
        // No upgradeElements() call at all — simulates a page whose q_data is
        // still the pre-clean flat shape (e.g. the upgrade gate hasn't fired
        // yet for this open).
        const fakePage = makeFakePageWithTitle('page-old-001', 'Legacy Model');
        const storageAdapter = new StorageAdapter();
        storageAdapter.setElementData(fakePage, OLD_SHAPE_BLOB, SimulationObjectType.Model);

        const modelLucid = new ModelLucid(fakePage, storageAdapter);
        const model = modelLucid.getSimulationObject();

        expect(model.replications).toBe(77);
        expect(model.seed).toBe(9999);
        expect(model.timeUnit).toBe('MINUTES');
        expect(model.timeMode).toBe('CalendarDate');
        expect(model.runTime?.value).toBe(30);
        expect(model.runTime?.unit).toBe('DAYS');
        expect(model.warmupTime?.value).toBe(3);
        expect(model.warmupTime?.unit).toBe('DAYS');
    });
});
