"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeDistributedConfig = void 0;
var SimulationObjectType_1 = require("./SimulationObjectType");
var VolumePeriodBasis_1 = require("./VolumePeriodBasis");
/**
 * TimeDistributedConfig combines a TimePattern with volume and date range
 * to define specific entity generation behavior for TIME_DISTRIBUTED generators.
 *
 * A single TimePattern can be reused by multiple configs with different
 * volumes and time periods.
 */
var TimeDistributedConfig = /** @class */ (function () {
    function TimeDistributedConfig(id, name) {
        this.type = SimulationObjectType_1.SimulationObjectType.None;
        /**
         * Reference to TimePattern (by unique_id)
         */
        this.timePatternId = '';
        /**
         * Total volume to distribute
         * Interpretation depends on volumePeriodBasis
         */
        this.totalVolume = 0;
        /**
         * What does totalVolume represent?
         * - TOTAL: Total across entire date range (divided by years)
         * - ANNUAL: Volume per year (used directly)
         * - WEEKLY: Volume per week (skips weekly pattern layer)
         * - DAILY: Volume per day (skips weekly and day-of-week layers)
         */
        this.volumePeriodBasis = VolumePeriodBasis_1.VolumePeriodBasis.TOTAL;
        /**
         * Start date for rate calculation (ISO 8601: YYYY-MM-DD)
         */
        this.startDate = '';
        /**
         * End date for rate calculation (ISO 8601: YYYY-MM-DD)
         * Must be > startDate
         */
        this.endDate = '';
        this.id = id;
        this.name = name;
    }
    /**
     * Note: TimeDistributedConfig serialization is handled by BaseModelDefinitionSerializer.serializeTimeDistributedConfig()
     * This class doesn't need toJSON/fromJSON methods because serialization is centralized.
     */
    TimeDistributedConfig.prototype.toString = function () {
        return "TimeDistributedConfig(id='".concat(this.id, "', name='").concat(this.name, "', volume=").concat(this.totalVolume, " ").concat(this.volumePeriodBasis, ")");
    };
    return TimeDistributedConfig;
}());
exports.TimeDistributedConfig = TimeDistributedConfig;
