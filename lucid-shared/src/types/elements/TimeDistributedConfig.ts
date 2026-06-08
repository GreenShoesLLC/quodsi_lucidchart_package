import { SimulationObject } from './SimulationObject';
import { SimulationObjectType } from './SimulationObjectType';
import { VolumePeriodBasis } from '@quodsi/shared';

/**
 * TimeDistributedConfig combines a TimePattern with volume and date range
 * to define specific entity generation behavior for TIME_DISTRIBUTED generators.
 *
 * A single TimePattern can be reused by multiple configs with different
 * volumes and time periods.
 */
export class TimeDistributedConfig implements SimulationObject {
    type: SimulationObjectType = SimulationObjectType.None;

    /**
     * Unique identifier for this config
     */
    id: string;

    /**
     * Human-readable name
     */
    name: string;

    /**
     * Reference to TimePattern (by unique_id)
     */
    timePatternId: string = '';

    /**
     * Total volume to distribute
     * Interpretation depends on volumePeriodBasis
     */
    totalVolume: number = 0;

    /**
     * What does totalVolume represent?
     * - TOTAL: Total across entire date range (divided by years)
     * - ANNUAL: Volume per year (used directly)
     * - WEEKLY: Volume per week (skips weekly pattern layer)
     * - DAILY: Volume per day (skips weekly and day-of-week layers)
     */
    volumePeriodBasis: VolumePeriodBasis = VolumePeriodBasis.TOTAL;

    /**
     * Start date for rate calculation (ISO 8601: YYYY-MM-DD)
     */
    startDate: string = '';

    /**
     * End date for rate calculation (ISO 8601: YYYY-MM-DD)
     * Must be > startDate
     */
    endDate: string = '';

    constructor(id: string, name: string) {
        this.id = id;
        this.name = name;
    }

    /**
     * Note: TimeDistributedConfig serialization is handled by BaseModelDefinitionSerializer.serializeTimeDistributedConfig()
     * This class doesn't need toJSON/fromJSON methods because serialization is centralized.
     */

    toString(): string {
        return `TimeDistributedConfig(id='${this.id}', name='${this.name}', volume=${this.totalVolume} ${this.volumePeriodBasis})`;
    }
}
