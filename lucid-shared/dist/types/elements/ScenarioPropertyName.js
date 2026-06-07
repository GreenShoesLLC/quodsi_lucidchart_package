"use strict";
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NUMERIC_PROPERTIES_BY_OBJECT_TYPE = exports.PROPERTY_DISPLAY_LABELS = exports.PROPERTIES_BY_OBJECT_TYPE = exports.ScenarioPropertyName = void 0;
var ScenarioObjectType_1 = require("./ScenarioObjectType");
var ScenarioPropertyName;
(function (ScenarioPropertyName) {
    // Resource properties
    ScenarioPropertyName["CAPACITY"] = "CAPACITY";
    // Activity properties
    ScenarioPropertyName["DURATION"] = "DURATION";
    ScenarioPropertyName["ACTIVITY_CAPACITY"] = "ACTIVITY_CAPACITY";
    ScenarioPropertyName["RESOURCE_REQUIREMENT"] = "RESOURCE_REQUIREMENT";
    ScenarioPropertyName["INBOUND_QUEUE_CAPACITY"] = "INBOUND_QUEUE_CAPACITY";
    ScenarioPropertyName["OUTBOUND_QUEUE_CAPACITY"] = "OUTBOUND_QUEUE_CAPACITY";
    // Connector properties
    ScenarioPropertyName["WEIGHT"] = "WEIGHT";
    // Generator properties
    ScenarioPropertyName["INTERVAL"] = "INTERVAL";
    ScenarioPropertyName["MAX_ENTITIES"] = "MAX_ENTITIES";
    ScenarioPropertyName["ENTITIES_PER_CREATION"] = "ENTITIES_PER_CREATION";
    ScenarioPropertyName["INTERARRIVAL_TIMING"] = "INTERARRIVAL_TIMING";
    // Universal properties
    ScenarioPropertyName["NAME"] = "NAME";
    // Model-level properties
    ScenarioPropertyName["REPS"] = "REPS";
    ScenarioPropertyName["SEED"] = "SEED";
    ScenarioPropertyName["RUN_PERIOD"] = "RUN_PERIOD";
})(ScenarioPropertyName = exports.ScenarioPropertyName || (exports.ScenarioPropertyName = {}));
/**
 * Which ScenarioPropertyName values are valid for each ScenarioObjectType.
 * Drives the cascading Property dropdown in scenario change-request editors.
 *
 * ENTITY has no properties (no entity-level scenario fields exist yet);
 * future phases may add some.
 */
exports.PROPERTIES_BY_OBJECT_TYPE = (_a = {},
    _a[ScenarioObjectType_1.ScenarioObjectType.ENTITY] = [],
    _a[ScenarioObjectType_1.ScenarioObjectType.ACTIVITY] = [
        ScenarioPropertyName.ACTIVITY_CAPACITY,
        ScenarioPropertyName.INBOUND_QUEUE_CAPACITY,
        ScenarioPropertyName.OUTBOUND_QUEUE_CAPACITY,
        ScenarioPropertyName.DURATION,
        ScenarioPropertyName.RESOURCE_REQUIREMENT,
    ],
    _a[ScenarioObjectType_1.ScenarioObjectType.RESOURCE] = [ScenarioPropertyName.CAPACITY],
    _a[ScenarioObjectType_1.ScenarioObjectType.GENERATOR] = [
        ScenarioPropertyName.INTERARRIVAL_TIMING,
        ScenarioPropertyName.MAX_ENTITIES,
        ScenarioPropertyName.ENTITIES_PER_CREATION,
    ],
    _a[ScenarioObjectType_1.ScenarioObjectType.CONNECTOR] = [ScenarioPropertyName.WEIGHT],
    _a[ScenarioObjectType_1.ScenarioObjectType.MODEL] = [
        ScenarioPropertyName.REPS,
        ScenarioPropertyName.SEED,
        ScenarioPropertyName.RUN_PERIOD,
    ],
    _a);
/**
 * Human-readable labels for the property dropdown.
 */
exports.PROPERTY_DISPLAY_LABELS = (_b = {},
    _b[ScenarioPropertyName.CAPACITY] = 'Capacity',
    _b[ScenarioPropertyName.DURATION] = 'Action Duration',
    _b[ScenarioPropertyName.ACTIVITY_CAPACITY] = 'Activity Capacity',
    _b[ScenarioPropertyName.INBOUND_QUEUE_CAPACITY] = 'Inbound Queue Capacity',
    _b[ScenarioPropertyName.OUTBOUND_QUEUE_CAPACITY] = 'Outbound Queue Capacity',
    _b[ScenarioPropertyName.WEIGHT] = 'Weight',
    _b[ScenarioPropertyName.INTERVAL] = 'Interval',
    _b[ScenarioPropertyName.MAX_ENTITIES] = 'Max Entities',
    _b[ScenarioPropertyName.INTERARRIVAL_TIMING] = 'Inter-arrival Timing',
    _b[ScenarioPropertyName.ENTITIES_PER_CREATION] = 'Entities Per Creation',
    _b[ScenarioPropertyName.NAME] = 'Name',
    _b[ScenarioPropertyName.REPS] = 'Replications',
    _b[ScenarioPropertyName.SEED] = 'Random Seed',
    _b[ScenarioPropertyName.RUN_PERIOD] = 'Run Period',
    _b[ScenarioPropertyName.RESOURCE_REQUIREMENT] = 'Action Resource Req.',
    _b);
/**
 * Numeric-only subset of PROPERTIES_BY_OBJECT_TYPE — properties whose modifications
 * are NumericPropertyModification (vs. DurationModification or BooleanPropertyModification).
 *
 * Drives the property dropdown for the numeric Factor target picker.
 * INTERARRIVAL_TIMING is excluded because it's a DurationModification.
 */
exports.NUMERIC_PROPERTIES_BY_OBJECT_TYPE = (_c = {},
    _c[ScenarioObjectType_1.ScenarioObjectType.ENTITY] = [],
    _c[ScenarioObjectType_1.ScenarioObjectType.ACTIVITY] = [
        ScenarioPropertyName.ACTIVITY_CAPACITY,
        ScenarioPropertyName.INBOUND_QUEUE_CAPACITY,
        ScenarioPropertyName.OUTBOUND_QUEUE_CAPACITY,
    ],
    _c[ScenarioObjectType_1.ScenarioObjectType.RESOURCE] = [ScenarioPropertyName.CAPACITY],
    _c[ScenarioObjectType_1.ScenarioObjectType.GENERATOR] = [
        ScenarioPropertyName.MAX_ENTITIES,
        ScenarioPropertyName.ENTITIES_PER_CREATION,
    ],
    _c[ScenarioObjectType_1.ScenarioObjectType.CONNECTOR] = [ScenarioPropertyName.WEIGHT],
    _c[ScenarioObjectType_1.ScenarioObjectType.MODEL] = [
        ScenarioPropertyName.REPS,
        ScenarioPropertyName.SEED,
        ScenarioPropertyName.RUN_PERIOD,
    ],
    _c);
