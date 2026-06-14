import { ModelDefinitionSerializerV1 } from '../v1/ModelDefinitionSerializerV1';
import { DurationType, PeriodUnit } from '@quodsi/shared';

// No sibling serializer test exists in lucid-shared, so we instantiate the
// concrete V1 serializer directly and reach the protected serializeAction via
// an `as any` cast (as the plan permits). A minimal Duration-shaped object is
// enough because serializeDuration only reads durationPeriodUnit + distribution.
function makeSerializer(): any {
    return new ModelDefinitionSerializerV1() as any;
}

const minimalDuration = {
    durationPeriodUnit: PeriodUnit.MINUTES,
    durationLength: 1,
    durationType: DurationType.CONSTANT,
    distribution: null,
};

describe('serializeAction carries Action.name', () => {
    it('carries an action name into the serialized action', () => {
        const serializer = makeSerializer();
        const action = { id: 'a1', actionType: 'DELAY', name: 'Triage', duration: minimalDuration } as any;
        const out = serializer.serializeAction(action);
        expect(out.name).toBe('Triage');
        expect(out.id).toBe('a1');
    });

    it('omits name when the action has none', () => {
        const serializer = makeSerializer();
        const action = { id: 'a2', actionType: 'DELAY', duration: minimalDuration } as any;
        const out = serializer.serializeAction(action);
        expect(out.name).toBeUndefined();
    });
});
