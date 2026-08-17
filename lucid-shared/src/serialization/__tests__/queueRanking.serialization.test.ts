import { ModelDefinitionSerializerV1 } from '../v1/ModelDefinitionSerializerV1';
import { Activity, QueueRanking } from '@quodsi/shared';

// Instantiate the concrete V1 serializer and reach the protected
// serializeActivity via an `as any` cast.
//
// Wire-cleanup Phase B2 Task 9: `serializeActivity` now delegates to
// `Activity.toJSON()` (the shared class's own sparse, clean-shaped
// serialization) rather than hand-mapping fields — it requires a REAL
// `Activity` instance (not a duck-typed plain object literal, which has no
// `.toJSON()` method), matching what `ModelDefinition.activities.getAll()`
// actually returns in production.
function makeSerializer(): any {
    return new ModelDefinitionSerializerV1() as any;
}

function makeActivity(overrides?: (a: Activity) => void): Activity {
    const activity = Activity.createDefault('a1');
    activity.name = 'Triage';
    overrides?.(activity);
    return activity;
}

describe('serializeActivity carries queueRanking (86e2qd9np)', () => {
    it('serializes a ranked activity — a re-save must not drop the setting', () => {
        const serializer = makeSerializer();
        const queueRanking: QueueRanking = { stateId: 'acuity', order: 'ascending' };
        const activity = makeActivity((a) => { a.queueRanking = queueRanking; });

        const out = serializer.serializeActivity(activity);

        expect(out.queueRanking).toBeDefined();
        expect(out.queueRanking.stateId).toBe('acuity');
        expect(out.queueRanking.order).toBe('ascending');
    });

    it('omits queueRanking when absent (conditional inclusion — unranked models stay byte-identical)', () => {
        const serializer = makeSerializer();
        const activity = makeActivity();

        const out = serializer.serializeActivity(activity);

        expect(out.queueRanking).toBeUndefined();
        expect('queueRanking' in out).toBe(false);
    });
});
