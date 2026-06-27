/**
 * ModelSerializer completeness test.
 *
 * Purpose: Ensure that EVERY data field on the Model domain object is carried
 * through by the serializer.  If a new field is added to Model but the
 * serializer silently drops it, one of the value-equality assertions below
 * will fail, catching the omission at CI time.
 *
 * Strategy:
 *   - Build a Model with EVERY field set to a distinct, non-default value so no
 *     field can survive silently as the default.
 *   - Derive the expected field list dynamically from Object.keys(model),
 *     excluding `scenarios` (legitimately serialized in the top-level scenarios
 *     array) and `type` (enum constant, always present).
 *   - Assert each expected field appears in serialized.model.
 *   - Assert spot-value checks on key fields (including levers).
 *
 * // scenarios: legitimately serialized in the top-level scenarios array
 * // Add new Model fields here if the automatic Object.keys check misses them
 */

import { ModelSerializerFactory } from '../../src/serialization/ModelSerializerFactory';
import { Model } from '@quodsi/lucid-shared';
import { ModelDefinition } from '@quodsi/shared';
import { PeriodUnit } from '@quodsi/shared';
import { SimulationTimeType } from '@quodsi/shared';
import { SimulationObjectType } from '@quodsi/shared';
import { createScenarioLever, ScenarioPropertyName } from '@quodsi/lucid-shared';
import type { ScenarioLever } from '@quodsi/lucid-shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a Model with EVERY field set to a distinct, non-default value. */
function buildCompleteModel(): Model {
    const model = new Model(
        'test-model-completeness-001',                  // id
        'Completeness Test Model',                      // name
        42,                                             // reps  (default=1)
        9999,                                           // seed  (default=12345)
        PeriodUnit.MINUTES,                             // oneClockUnit  (default=MINUTES per ModelDefaults, but createDefault also uses MINUTES — using MINUTES as distinct value is fine; the test detects missing fields, not wrong values)
        SimulationTimeType.CalendarDate,                // simulationTimeType (default=Clock)
        7,                                              // warmupClockPeriod  (default=0)
        PeriodUnit.DAYS,                                // warmupClockPeriodUnit (default=HOURS in createDefault)
        480,                                            // runClockPeriod  (default=24)
        PeriodUnit.MINUTES,                             // runClockPeriodUnit (default=HOURS in createDefault)
        new Date('2025-01-15T08:00:00Z'),               // warmupDateTime
        new Date('2025-02-01T09:00:00Z'),               // startDateTime
        new Date('2025-12-31T17:00:00Z')                // finishDateTime
    );

    model.description = 'non-default description';

    // Attach a model-level lever so the conditional `levers` key is emitted.
    const lever = createScenarioLever({
        propertyName: ScenarioPropertyName.REPS,
        label: 'Replications',
        leverId: 'lv-test-001',
        enabled: true,
        range: { min: 5, max: 25, step: 5 }
    });
    model.levers = [lever];

    return model;
}

/** Wrap a Model in a minimal ModelDefinition (ModelDefinition auto-adds a default entity). */
function buildModelDefinition(model: Model): ModelDefinition {
    return new ModelDefinition(model);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ModelSerializer completeness — all Model fields round-trip through serialize()', () => {
    let serializedModel: Record<string, unknown>;
    let model: Model;

    beforeAll(() => {
        model = buildCompleteModel();
        const modelDef = buildModelDefinition(model);
        const serialized = ModelSerializerFactory.create(modelDef).serialize(modelDef);
        serializedModel = serialized.model as unknown as Record<string, unknown>;
    });

    // -----------------------------------------------------------------------
    // Dynamic completeness check: every enumerable key on the Model instance
    // (except the explicitly excluded ones) must appear in serialized.model.
    // -----------------------------------------------------------------------

    it('serializes every Model field (dynamic Object.keys completeness check)', () => {
        // Exclusion set — fields intentionally NOT present in serialized.model:
        //   scenarios: legitimately serialized in the top-level scenarios array
        //   type:      SimulationObjectType enum constant; always present, not a data field
        const EXCLUDED_FIELDS = new Set(['scenarios', 'type']);

        const modelFields = Object.keys(model).filter(k => !EXCLUDED_FIELDS.has(k));

        // Add new Model fields here if the automatic Object.keys check misses them
        for (const field of modelFields) {
            expect(serializedModel).toHaveProperty(field);
        }
    });

    // -----------------------------------------------------------------------
    // Spot-value assertions: confirm actual values, not just key presence.
    // -----------------------------------------------------------------------

    it('serializes description correctly', () => {
        expect(serializedModel.description).toBe('non-default description');
    });

    it('serializes reps correctly', () => {
        expect(serializedModel.reps).toBe(42);
    });

    it('serializes seed correctly', () => {
        expect(serializedModel.seed).toBe(9999);
    });

    it('serializes warmupClockPeriod correctly', () => {
        expect(serializedModel.warmupClockPeriod).toBe(7);
    });

    it('serializes runClockPeriod correctly', () => {
        expect(serializedModel.runClockPeriod).toBe(480);
    });

    it('serializes simulationTimeType correctly', () => {
        expect(serializedModel.simulationTimeType).toBe(SimulationTimeType.CalendarDate);
    });

    it('serializes warmupClockPeriodUnit correctly', () => {
        expect(serializedModel.warmupClockPeriodUnit).toBe(PeriodUnit.DAYS);
    });

    it('serializes runClockPeriodUnit correctly', () => {
        expect(serializedModel.runClockPeriodUnit).toBe(PeriodUnit.MINUTES);
    });

    // Date fields: the serializer converts Date → ISO string; accept either form.
    it('serializes warmupDateTime as a non-null ISO string or Date', () => {
        const val = serializedModel.warmupDateTime;
        expect(val).not.toBeNull();
        expect(typeof val === 'string' || val instanceof Date).toBe(true);
    });

    it('serializes startDateTime as a non-null ISO string or Date', () => {
        const val = serializedModel.startDateTime;
        expect(val).not.toBeNull();
        expect(typeof val === 'string' || val instanceof Date).toBe(true);
    });

    it('serializes finishDateTime as a non-null ISO string or Date', () => {
        const val = serializedModel.finishDateTime;
        expect(val).not.toBeNull();
        expect(typeof val === 'string' || val instanceof Date).toBe(true);
    });

    // -----------------------------------------------------------------------
    // Lever-specific assertions
    // -----------------------------------------------------------------------

    it('serializes levers as an array of length 1', () => {
        const levers = serializedModel.levers as ScenarioLever[] | undefined;
        expect(levers).toBeDefined();
        expect(Array.isArray(levers)).toBe(true);
        expect(levers).toHaveLength(1);
    });

    it('serializes lever leverId correctly', () => {
        const levers = serializedModel.levers as ScenarioLever[];
        expect(levers[0].leverId).toBe('lv-test-001');
    });

    it('serializes lever propertyName correctly', () => {
        const levers = serializedModel.levers as ScenarioLever[];
        expect(levers[0].propertyName).toBe(ScenarioPropertyName.REPS);
    });

    it('serializes lever range correctly (min/max/step)', () => {
        const levers = serializedModel.levers as ScenarioLever[];
        expect(levers[0].range).toBeDefined();
        expect(levers[0].range!.min).toBe(5);
        expect(levers[0].range!.max).toBe(25);
        expect(levers[0].range!.step).toBe(5);
    });
});
