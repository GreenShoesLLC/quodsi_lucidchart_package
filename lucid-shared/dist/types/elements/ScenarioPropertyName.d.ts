import { ScenarioObjectType } from './ScenarioObjectType';
export declare enum ScenarioPropertyName {
    CAPACITY = "CAPACITY",
    DURATION = "DURATION",
    ACTIVITY_CAPACITY = "ACTIVITY_CAPACITY",
    RESOURCE_REQUIREMENT = "RESOURCE_REQUIREMENT",
    INBOUND_QUEUE_CAPACITY = "INBOUND_QUEUE_CAPACITY",
    OUTBOUND_QUEUE_CAPACITY = "OUTBOUND_QUEUE_CAPACITY",
    WEIGHT = "WEIGHT",
    INTERVAL = "INTERVAL",
    MAX_ENTITIES = "MAX_ENTITIES",
    ENTITIES_PER_CREATION = "ENTITIES_PER_CREATION",
    INTERARRIVAL_TIMING = "INTERARRIVAL_TIMING",
    NAME = "NAME",
    REPS = "REPS",
    SEED = "SEED",
    RUN_PERIOD = "RUN_PERIOD"
}
/**
 * Which ScenarioPropertyName values are valid for each ScenarioObjectType.
 * Drives the cascading Property dropdown in scenario change-request editors.
 *
 * ENTITY has no properties (no entity-level scenario fields exist yet);
 * future phases may add some.
 */
export declare const PROPERTIES_BY_OBJECT_TYPE: Record<ScenarioObjectType, ScenarioPropertyName[]>;
/**
 * Human-readable labels for the property dropdown.
 */
export declare const PROPERTY_DISPLAY_LABELS: Record<ScenarioPropertyName, string>;
/**
 * Numeric-only subset of PROPERTIES_BY_OBJECT_TYPE — properties whose modifications
 * are NumericPropertyModification (vs. DurationModification or BooleanPropertyModification).
 *
 * Drives the property dropdown for the numeric Factor target picker.
 * INTERARRIVAL_TIMING is excluded because it's a DurationModification.
 */
export declare const NUMERIC_PROPERTIES_BY_OBJECT_TYPE: Record<ScenarioObjectType, ScenarioPropertyName[]>;
//# sourceMappingURL=ScenarioPropertyName.d.ts.map