"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimePattern = void 0;
var SimulationObjectType_1 = require("./SimulationObjectType");
var Duration_1 = require("./Duration");
/**
 * TimePattern class representing reusable temporal distribution patterns.
 *
 * Used for TIME_DISTRIBUTED generators to define how entity arrivals
 * are distributed across different time scales:
 * - Weekly (52 weeks per year, ISO weeks 1-52)
 * - Day-of-week (7 days, ISO: Monday=1 to Sunday=7)
 * - Hourly per day-of-week (168 total: 7 days × 24 hours)
 * - Minute-level distribution within each hour
 */
var TimePattern = /** @class */ (function () {
    function TimePattern(id, name) {
        this.type = SimulationObjectType_1.SimulationObjectType.None;
        /**
         * Weekly distribution weights (52 values for ISO weeks 1-52)
         * If not provided or empty, defaults to uniform distribution
         */
        this.weeklyWeights = [];
        /**
         * Day-of-week distribution weights (7 values for ISO Monday=1 to Sunday=7)
         * If not provided or empty, defaults to uniform distribution
         */
        this.dayOfWeekWeights = [];
        /**
         * Hourly distribution per day-of-week (168 values: 7 days × 24 hours)
         * Index calculation: (iso_weekday - 1) * 24 + hour
         * If not provided or empty, defaults to uniform distribution
         */
        this.dayOfWeekHourWeights = [];
        this.id = id;
        this.name = name;
        this.minuteDistribution = new Duration_1.Duration();
    }
    /**
     * Note: TimePattern serialization is handled by BaseModelDefinitionSerializer.serializeTimePattern()
     * which calls serializeDuration() for the minuteDistribution field.
     * This class doesn't need toJSON/fromJSON methods because serialization is centralized.
     */
    TimePattern.prototype.toString = function () {
        return "TimePattern(id='".concat(this.id, "', name='").concat(this.name, "')");
    };
    return TimePattern;
}());
exports.TimePattern = TimePattern;
