// Review F6 on wire-cleanup Phase B2 Task 9: `serializeModel`'s containment
// guarantee — `replications`/`timeUnit`/`runTime` must always be present on
// the serialized document, even when the Lucid host constructs an
// incomplete `Model` (no `modelFieldDefaults()` spread, unlike drawio/
// Visio). Reached via the concrete `ModelDefinitionSerializerV1`'s
// protected `serializeModel`, `as any`-cast (same pattern as
// queueRanking.serialization.test.ts).

import { ModelDefinitionSerializerV1 } from '../v1/ModelDefinitionSerializerV1';
import { DomainModel as Model, PeriodUnit, ModelDefaults } from '@quodsi/shared';

function makeSerializer(): any {
    return new ModelDefinitionSerializerV1() as any;
}

describe('serializeModel containment (review F6)', () => {
    it('materializes replications/timeUnit/runTime for a Model missing all three', () => {
        // Only id/name/replications are constructor-required; seed/timeUnit/
        // timeMode/warmupTime/runTime are genuinely left undefined here --
        // exactly what a Lucid host reading incomplete stored data produces.
        const model = new Model('model-1', 'Incomplete Model', undefined as unknown as number);
        expect(model.timeUnit).toBeUndefined();
        expect(model.runTime).toBeUndefined();
        expect(model.replications).toBeUndefined();

        const serializer = makeSerializer();
        const out = serializer.serializeModel(model);

        expect(out.replications).toBe(ModelDefaults.DEFAULT_REPS);
        expect(out.timeUnit).toBe(ModelDefaults.DEFAULT_CLOCK_UNIT);
        expect(out.runTime).toEqual({ value: 24, unit: PeriodUnit.HOURS });
    });

    it('leaves a fully-specified Model\'s real values untouched (no accidental override)', () => {
        const model = new Model(
            'model-2',
            'Complete Model',
            42,
            777,
            PeriodUnit.MINUTES,
            undefined,
            undefined,
            { value: 480, unit: PeriodUnit.MINUTES } as any,
        );

        const serializer = makeSerializer();
        const out = serializer.serializeModel(model);

        expect(out.replications).toBe(42);
        expect(out.timeUnit).toBe(PeriodUnit.MINUTES);
        expect(out.runTime).toEqual({ value: 480, unit: PeriodUnit.MINUTES });
    });

    it('omits timeMode at its Clock default rather than force-materializing it (matches the engine\'s own default)', () => {
        const model = new Model('model-3', 'Clock Model', 1);
        const serializer = makeSerializer();
        const out = serializer.serializeModel(model);

        expect('timeMode' in out).toBe(false);
    });
});
