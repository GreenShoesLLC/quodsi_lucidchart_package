/**
 * ModelSerializer completeness test.
 *
 * Purpose: Ensure that EVERY data field on the Model domain object that has a
 * clean-wire equivalent is carried through by the serializer. If a new field
 * is added to Model but the serializer silently drops it, one of the
 * value-equality assertions below will fail, catching the omission at CI
 * time.
 *
 * Strategy:
 *   - Build a Model with EVERY field set to a distinct, non-default value so no
 *     field can survive silently as the default.
 *   - Derive the expected field list dynamically from Object.keys(model),
 *     excluding fields with NO clean-wire equivalent (see EXCLUDED_FIELDS).
 *   - Assert each expected field appears directly on the serialized document
 *     root (wire-cleanup Phase B2 Task 9: `CleanModelDocument` puts the
 *     model's run parameters FLAT on the document root — there is no nested
 *     `model` sub-object any more; see `ISerializedModel`'s doc comment).
 *   - Assert spot-value checks on key fields (including levers).
 *
 * // Add new Model fields here if the automatic Object.keys check misses them
 */

import { ModelSerializerFactory } from '../../src/serialization/ModelSerializerFactory';
import { Model } from '@quodsi/lucid-shared';
import { ModelDefinition } from '@quodsi/shared';
import { PeriodUnit } from '@quodsi/shared';
import { SimulationTimeType } from '@quodsi/shared';
import { Duration } from '@quodsi/shared';
import { createScenarioLever, ScenarioPropertyName } from '@quodsi/lucid-shared';
import type { ScenarioLever } from '@quodsi/lucid-shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a Model with EVERY field set to a distinct, non-default value. */
function buildCompleteModel(): Model {
    const model = new Model(
        'test-model-completeness-001',                  // id (no clean-wire equivalent)
        'Completeness Test Model',                       // name
        42,                                               // replications (default=1)
        9999,                                             // seed (default=12345)
        PeriodUnit.MINUTES,                               // timeUnit
        SimulationTimeType.CalendarDate,                  // timeMode (default=Clock)
        Duration.constant(7, PeriodUnit.DAYS),             // warmupTime (default=0)
        Duration.constant(480, PeriodUnit.MINUTES),        // runTime (default=24 hours)
        new Date('2025-01-15T08:00:00Z'),                 // warmupDateTime (no clean-wire equivalent)
        new Date('2025-02-01T09:00:00Z'),                 // startDateTime (calendar-mode only)
        new Date('2025-12-31T17:00:00Z')                  // finishDateTime (no clean-wire equivalent)
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
        serializedModel = serialized as unknown as Record<string, unknown>;
    });

    // -----------------------------------------------------------------------
    // Dynamic completeness check: every enumerable key on the Model instance
    // that has a clean-wire equivalent must appear directly on the serialized
    // document root.
    // -----------------------------------------------------------------------

    it('serializes every Model field with a clean-wire equivalent (dynamic Object.keys completeness check)', () => {
        // Exclusion set — fields intentionally NOT present on the wire:
        //   scenarios:       legitimately serialized in the top-level scenarios array
        //   type:            SimulationObjectType enum constant; no clean-wire class-tag
        //   id:               round-trip-only Lucid document id; CleanModelDocument has
        //                     NO field for it at all (dropped, not renamed — see
        //                     Model.toJSON()'s doc comment and root.py's explicit note
        //                     to translators)
        //   warmupDateTime / finishDateTime: host-projection conveniences only; the
        //                     clean wire derives them from runTime/warmupTime/startDateTime
        const EXCLUDED_FIELDS = new Set(['scenarios', 'type', 'id', 'warmupDateTime', 'finishDateTime']);

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

    it('serializes replications correctly', () => {
        expect(serializedModel.replications).toBe(42);
    });

    it('serializes seed correctly', () => {
        expect(serializedModel.seed).toBe(9999);
    });

    it('serializes timeUnit correctly', () => {
        expect(serializedModel.timeUnit).toBe(PeriodUnit.MINUTES);
    });

    it('serializes timeMode correctly', () => {
        expect(serializedModel.timeMode).toBe(SimulationTimeType.CalendarDate);
    });

    it('serializes warmupTime correctly (flat Duration)', () => {
        expect(serializedModel.warmupTime).toEqual({ value: 7, unit: PeriodUnit.DAYS });
    });

    it('serializes runTime correctly (flat Duration)', () => {
        expect(serializedModel.runTime).toEqual({ value: 480, unit: PeriodUnit.MINUTES });
    });

    // startDateTime: the serializer converts Date -> ISO string; only emitted
    // under calendar mode (this model is CalendarDate).
    it('serializes startDateTime as a non-null ISO string', () => {
        const val = serializedModel.startDateTime;
        expect(val).not.toBeNull();
        expect(typeof val).toBe('string');
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
