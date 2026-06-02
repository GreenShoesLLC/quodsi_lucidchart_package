import { ScenarioObjectType } from './ScenarioObjectType';

export enum ScenarioPropertyName {
    // Resource properties
    CAPACITY = "CAPACITY",

    // Activity properties
    DURATION = "DURATION",
    ACTIVITY_CAPACITY = "ACTIVITY_CAPACITY",
    RESOURCE_REQUIREMENT = "RESOURCE_REQUIREMENT",
    INBOUND_QUEUE_CAPACITY = "INBOUND_QUEUE_CAPACITY",
    OUTBOUND_QUEUE_CAPACITY = "OUTBOUND_QUEUE_CAPACITY",

    // Connector properties
    WEIGHT = "WEIGHT",

    // Generator properties
    INTERVAL = "INTERVAL",
    MAX_ENTITIES = "MAX_ENTITIES",
    ENTITIES_PER_CREATION = "ENTITIES_PER_CREATION",
    INTERARRIVAL_TIMING = "INTERARRIVAL_TIMING",

    // Universal properties
    NAME = "NAME",

    // Model-level properties
    REPS = "REPS",
    SEED = "SEED",
    RUN_PERIOD = "RUN_PERIOD"
}

/**
 * Which ScenarioPropertyName values are valid for each ScenarioObjectType.
 * Drives the cascading Property dropdown in the ChangeRequestEditor.
 *
 * ENTITY has no properties (no entity-level scenario fields exist yet);
 * future phases may add some.
 */
export const PROPERTIES_BY_OBJECT_TYPE: Record<ScenarioObjectType, ScenarioPropertyName[]> = {
    [ScenarioObjectType.ENTITY]: [],
    [ScenarioObjectType.ACTIVITY]: [
        ScenarioPropertyName.ACTIVITY_CAPACITY,
        ScenarioPropertyName.INBOUND_QUEUE_CAPACITY,
        ScenarioPropertyName.OUTBOUND_QUEUE_CAPACITY,
        ScenarioPropertyName.DURATION,
        ScenarioPropertyName.RESOURCE_REQUIREMENT,
    ],
    [ScenarioObjectType.RESOURCE]: [ScenarioPropertyName.CAPACITY],
    [ScenarioObjectType.GENERATOR]: [
        ScenarioPropertyName.INTERARRIVAL_TIMING,
        ScenarioPropertyName.MAX_ENTITIES,
        ScenarioPropertyName.ENTITIES_PER_CREATION,
    ],
    [ScenarioObjectType.CONNECTOR]: [ScenarioPropertyName.WEIGHT],
    [ScenarioObjectType.MODEL]: [
        ScenarioPropertyName.REPS,
        ScenarioPropertyName.SEED,
        ScenarioPropertyName.RUN_PERIOD,
    ],
}

/**
 * Human-readable labels for the property dropdown.
 */
export const PROPERTY_DISPLAY_LABELS: Record<ScenarioPropertyName, string> = {
    [ScenarioPropertyName.CAPACITY]: 'Capacity',
    [ScenarioPropertyName.DURATION]: 'Action Duration',
    [ScenarioPropertyName.ACTIVITY_CAPACITY]: 'Activity Capacity',
    [ScenarioPropertyName.INBOUND_QUEUE_CAPACITY]: 'Inbound Queue Capacity',
    [ScenarioPropertyName.OUTBOUND_QUEUE_CAPACITY]: 'Outbound Queue Capacity',
    [ScenarioPropertyName.WEIGHT]: 'Weight',
    [ScenarioPropertyName.INTERVAL]: 'Interval',
    [ScenarioPropertyName.MAX_ENTITIES]: 'Max Entities',
    [ScenarioPropertyName.INTERARRIVAL_TIMING]: 'Inter-arrival Timing',
    [ScenarioPropertyName.ENTITIES_PER_CREATION]: 'Entities Per Creation',
    [ScenarioPropertyName.NAME]: 'Name',
    [ScenarioPropertyName.REPS]: 'Replications',
    [ScenarioPropertyName.SEED]: 'Random Seed',
    [ScenarioPropertyName.RUN_PERIOD]: 'Run Period',
    [ScenarioPropertyName.RESOURCE_REQUIREMENT]: 'Action Resource Req.',
}

/**
 * Numeric-only subset of PROPERTIES_BY_OBJECT_TYPE — properties whose modifications
 * are NumericPropertyModification (vs. DurationModification or BooleanPropertyModification).
 *
 * Drives the property dropdown for the numeric Factor target picker.
 * INTERARRIVAL_TIMING is excluded because it's a DurationModification.
 */
export const NUMERIC_PROPERTIES_BY_OBJECT_TYPE: Record<ScenarioObjectType, ScenarioPropertyName[]> = {
    [ScenarioObjectType.ENTITY]: [],
    [ScenarioObjectType.ACTIVITY]: [
        ScenarioPropertyName.ACTIVITY_CAPACITY,
        ScenarioPropertyName.INBOUND_QUEUE_CAPACITY,
        ScenarioPropertyName.OUTBOUND_QUEUE_CAPACITY,
    ],
    [ScenarioObjectType.RESOURCE]: [ScenarioPropertyName.CAPACITY],
    [ScenarioObjectType.GENERATOR]: [
        ScenarioPropertyName.MAX_ENTITIES,
        ScenarioPropertyName.ENTITIES_PER_CREATION,
    ],
    [ScenarioObjectType.CONNECTOR]: [ScenarioPropertyName.WEIGHT],
    [ScenarioObjectType.MODEL]: [
        ScenarioPropertyName.REPS,
        ScenarioPropertyName.SEED,
        ScenarioPropertyName.RUN_PERIOD,
    ],
}
