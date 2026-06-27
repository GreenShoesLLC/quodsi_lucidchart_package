// tests/model/modelLucid.completeness.test.ts
//
// Completeness round-trip test for ModelLucid.
// Verifies that every field survives the write (updateFromPlatform) →
// read (createSimObject via constructor) cycle using the existing fake-page
// helpers and a real StorageAdapter in-memory.

import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ModelLucid } from '../../src/types/ModelLucid';
import {
    SimulationObjectType,
    PeriodUnit,
    SimulationTimeType,
    createScenarioLever,
    ScenarioPropertyName,
} from '@quodsi/lucid-shared';
import { makeFakePage } from '../helpers/fakeProxies';

// ─── helpers ────────────────────────────────────────────────────────────────

/** Extend makeFakePage with the getTitle() method that ModelLucid calls. */
function makeFakePageWithTitle(id: string, title: string): any {
    const page = makeFakePage(id);
    page.getTitle = () => title;
    return page;
}

// ─── fixture data ────────────────────────────────────────────────────────────

const WARMUP_DATE  = new Date('2025-03-01T06:00:00Z');
const START_DATE   = new Date('2025-04-01T08:00:00Z');
const FINISH_DATE  = new Date('2025-11-30T18:00:00Z');

const LEVER = createScenarioLever({
    propertyName: ScenarioPropertyName.REPS,
    label: 'Replications',
    leverId: 'lv-lucid-001',
    enabled: true,
    range: { min: 5, max: 25, step: 5 },
});

/** Full model data — every optional field set to a distinct non-default value. */
const FULL_MODEL_DATA = {
    id:                   'completeness-model-002',
    name:                 'ModelLucid Completeness',
    description:          'lucid round-trip description',
    reps:                 77,
    seed:                 8888,
    oneClockUnit:         PeriodUnit.MINUTES,
    simulationTimeType:   SimulationTimeType.CalendarDate,
    warmupClockPeriod:    3,
    warmupClockPeriodUnit: PeriodUnit.DAYS,
    runClockPeriod:       360,
    runClockPeriodUnit:   PeriodUnit.MINUTES,
    warmupDateTime:       WARMUP_DATE,
    startDateTime:        START_DATE,
    finishDateTime:       FINISH_DATE,
    levers:               [LEVER],
};

// ─── test ────────────────────────────────────────────────────────────────────

describe('ModelLucid completeness round-trip', () => {
    it('survives updateFromPlatform → createSimObject with every field intact', () => {
        // ── 1. Set up fake infrastructure ────────────────────────────────────
        const fakePage = makeFakePageWithTitle('page-001', 'ModelLucid Completeness');
        const storageAdapter = new StorageAdapter();

        // ── 2. Seed storage so createSimObject() has data to read ─────────────
        // setElementData strips identity fields and stores the rest in domain.
        storageAdapter.setElementData(
            fakePage,
            FULL_MODEL_DATA,
            SimulationObjectType.Model,
        );

        // ── 3. First ModelLucid: reads storage in its constructor ─────────────
        const modelLucid = new ModelLucid(fakePage, storageAdapter);

        // ── 4. Write back — this is the path production code walks ────────────
        modelLucid.updateFromPlatform();

        // ── 5. Second ModelLucid: fresh read from the written storage ─────────
        const modelLucid2 = new ModelLucid(fakePage, storageAdapter);
        const loaded = modelLucid2.getSimulationObject();

        // ── 6. Assert every field ─────────────────────────────────────────────

        // Scalar identity / basic fields
        // Note: ModelLucid always uses the page's element ID as the model ID
        // (this.platformElementId in createSimObject), not the stored ID field.
        expect(loaded.id).toBe('page-001');
        expect(loaded.name).toBe('ModelLucid Completeness');
        expect(loaded.description).toBe('lucid round-trip description');

        // Numeric simulation parameters
        expect(loaded.reps).toBe(77);
        expect(loaded.seed).toBe(8888);

        // Enum fields
        expect(loaded.oneClockUnit).toBe(PeriodUnit.MINUTES);
        expect(loaded.simulationTimeType).toBe(SimulationTimeType.CalendarDate);

        // Clock-period fields
        expect(loaded.warmupClockPeriod).toBe(3);
        expect(loaded.warmupClockPeriodUnit).toBe(PeriodUnit.DAYS);
        expect(loaded.runClockPeriod).toBe(360);
        expect(loaded.runClockPeriodUnit).toBe(PeriodUnit.MINUTES);

        // Date fields — stored as ISO strings through JSON, so non-null is the key check
        expect(loaded.warmupDateTime).not.toBeNull();
        expect(loaded.startDateTime).not.toBeNull();
        expect(loaded.finishDateTime).not.toBeNull();

        // Levers
        expect(loaded.levers).toHaveLength(1);
        const lv = loaded.levers[0];
        expect(lv.leverId).toBe('lv-lucid-001');
        expect(lv.propertyName).toBe(ScenarioPropertyName.REPS);
        expect(lv.label).toBe('Replications');
        expect(lv.enabled).toBe(true);
        expect(lv.range).toBeDefined();
        expect(lv.range!.min).toBe(5);
        expect(lv.range!.max).toBe(25);
        expect(lv.range!.step).toBe(5);
    });
});
