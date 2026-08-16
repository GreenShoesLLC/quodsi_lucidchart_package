import { ModelDefinitionSerializerV1 } from '../v1/ModelDefinitionSerializerV1';
import { Activity, Duration, PeriodUnit, createDelayAction } from '@quodsi/shared';

// Wire-cleanup Phase B2 Task 9: `serializeAction` (a hand-rolled per-type
// switch) is GONE — `Activity.toJSON()`/`Connector.toJSON()` now delegate
// action serialization to the shared `sparsifyAction()` helper internally.
// Exercised here via the still-protected `serializeActivity`, reached with
// an `as any` cast, using a REAL `Activity`/`DelayAction` (not a duck-typed
// literal — `Activity.toJSON()` requires an actual class instance).
function makeSerializer(): any {
    return new ModelDefinitionSerializerV1() as any;
}

function makeActivityWithAction(name?: string): Activity {
    const duration = Duration.constant(1, PeriodUnit.MINUTES);
    const action = createDelayAction(duration, null, 'a1');
    if (name !== undefined) {
        (action as { name?: string }).name = name;
    }
    const activity = Activity.createDefault('activity-1');
    activity.actions = [action];
    return activity;
}

describe('serializeActivity carries Action.name', () => {
    it('carries an action name into the serialized action', () => {
        const serializer = makeSerializer();
        const activity = makeActivityWithAction('Triage');

        const out = serializer.serializeActivity(activity);

        expect(out.actions[0].name).toBe('Triage');
        expect(out.actions[0].id).toBe('a1');
    });

    it('omits name when the action has none', () => {
        const serializer = makeSerializer();
        const activity = makeActivityWithAction();

        const out = serializer.serializeActivity(activity);

        expect(out.actions[0].name).toBeUndefined();
    });
});
