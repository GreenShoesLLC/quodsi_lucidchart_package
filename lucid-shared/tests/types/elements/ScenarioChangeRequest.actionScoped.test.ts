import {
    ScenarioPropertyName,
    PROPERTIES_BY_OBJECT_TYPE,
    PROPERTY_DISPLAY_LABELS,
    NUMERIC_PROPERTIES_BY_OBJECT_TYPE,
} from "../../../src/types/elements/ScenarioPropertyName";
import { ScenarioObjectType } from '@quodsi/shared';
import { ScenarioChangeRequest, summarizeChangeRequest } from "../../../src/types/elements/ScenarioChangeRequest";
import { ResourceRequirementModification } from "../../../src/types/elements/ResourceRequirementModification";
import { DurationModification } from "../../../src/types/elements/DurationModification";

describe('Activity action properties wired into the property registry', () => {
    it('Activity includes DURATION and RESOURCE_REQUIREMENT', () => {
        const props = PROPERTIES_BY_OBJECT_TYPE[ScenarioObjectType.ACTIVITY];
        expect(props).toContain(ScenarioPropertyName.DURATION);
        expect(props).toContain(ScenarioPropertyName.RESOURCE_REQUIREMENT);
    });

    it('keeps the existing activity-level numeric properties', () => {
        const props = PROPERTIES_BY_OBJECT_TYPE[ScenarioObjectType.ACTIVITY];
        expect(props).toContain(ScenarioPropertyName.ACTIVITY_CAPACITY);
        expect(props).toContain(ScenarioPropertyName.INBOUND_QUEUE_CAPACITY);
        expect(props).toContain(ScenarioPropertyName.OUTBOUND_QUEUE_CAPACITY);
    });

    it('RESOURCE_REQUIREMENT and DURATION have display labels', () => {
        expect(PROPERTY_DISPLAY_LABELS[ScenarioPropertyName.RESOURCE_REQUIREMENT]).toBeTruthy();
        expect(PROPERTY_DISPLAY_LABELS[ScenarioPropertyName.DURATION]).toBeTruthy();
    });

    it('does NOT add DURATION/RESOURCE_REQUIREMENT to the numeric-factor registry', () => {
        const numeric = NUMERIC_PROPERTIES_BY_OBJECT_TYPE[ScenarioObjectType.ACTIVITY];
        expect(numeric).not.toContain(ScenarioPropertyName.DURATION);
        expect(numeric).not.toContain(ScenarioPropertyName.RESOURCE_REQUIREMENT);
    });
});

describe('ScenarioChangeRequest action-scoped (de)serialization', () => {
    it('round-trips actionId + reference modification', () => {
        const cr = new ScenarioChangeRequest({
            objectType: ScenarioObjectType.ACTIVITY,
            objectMatchCriteria: { name: 'Process' },
            actionId: 'act-1',
            modificationDetails: new ResourceRequirementModification({
                propertyName: ScenarioPropertyName.RESOURCE_REQUIREMENT,
                resourceRequirementId: 'rr-new',
            }),
        });
        const json = cr.toJSON();
        expect(json.actionId).toBe('act-1');
        expect(json.modificationDetails.type).toBe('reference');

        const back = ScenarioChangeRequest.fromJSON(JSON.parse(JSON.stringify(json)));
        expect(back.actionId).toBe('act-1');
        expect(back.modificationDetails).toBeInstanceOf(ResourceRequirementModification);
        expect((back.modificationDetails as ResourceRequirementModification).resourceRequirementId).toBe('rr-new');
    });

    it('round-trips actionId + duration modification (scaleRate)', () => {
        const cr = new ScenarioChangeRequest({
            objectType: ScenarioObjectType.ACTIVITY,
            objectMatchCriteria: { name: 'Process' },
            actionId: 'act-1',
            modificationDetails: new DurationModification({
                propertyName: ScenarioPropertyName.DURATION, mode: 'scaleRate', factor: 1.5,
            }),
        });
        const back = ScenarioChangeRequest.fromJSON(JSON.parse(JSON.stringify(cr.toJSON())));
        expect(back.actionId).toBe('act-1');
        expect(back.modificationDetails).toBeInstanceOf(DurationModification);
    });

    it('omits actionId from JSON when not set', () => {
        const cr = new ScenarioChangeRequest({
            objectType: ScenarioObjectType.RESOURCE,
            objectMatchCriteria: { name: 'Bed' },
            modificationDetails: new ResourceRequirementModification({
                propertyName: ScenarioPropertyName.RESOURCE_REQUIREMENT, resourceRequirementId: 'x',
            }),
        });
        expect(cr.actionId).toBeUndefined();
        expect('actionId' in cr.toJSON()).toBe(false);
    });

    it('summarizes an action duration scale and a resource swap (no "arrival" wording)', () => {
        const dur = new ScenarioChangeRequest({
            objectType: ScenarioObjectType.ACTIVITY, objectMatchCriteria: { name: 'Process' }, actionId: 'a',
            modificationDetails: new DurationModification({ propertyName: ScenarioPropertyName.DURATION, mode: 'scaleRate', factor: 2 }),
        });
        expect(summarizeChangeRequest(dur)).toContain('×2');
        expect(summarizeChangeRequest(dur).toLowerCase()).not.toContain('arrival');

        const ref = new ScenarioChangeRequest({
            objectType: ScenarioObjectType.ACTIVITY, objectMatchCriteria: { name: 'Process' }, actionId: 'a',
            modificationDetails: new ResourceRequirementModification({ propertyName: ScenarioPropertyName.RESOURCE_REQUIREMENT, resourceRequirementId: 'rr-nurse' }),
        });
        expect(summarizeChangeRequest(ref)).toContain('rr-nurse');
    });

    it('still says "Arrival rate" for a GENERATOR inter-arrival duration scale', () => {
        const gen = new ScenarioChangeRequest({
            objectType: ScenarioObjectType.GENERATOR, objectMatchCriteria: { name: 'Generator' },
            modificationDetails: new DurationModification({ propertyName: ScenarioPropertyName.INTERARRIVAL_TIMING, mode: 'scaleRate', factor: 2 }),
        });
        expect(summarizeChangeRequest(gen)).toContain('Arrival rate');
    });
});
