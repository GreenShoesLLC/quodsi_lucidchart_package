import { SimulationObject } from './SimulationObject';
import { SimulationObjectType } from './SimulationObjectType';
import { Duration } from './Duration';
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
export declare class TimePattern implements SimulationObject {
    type: SimulationObjectType;
    /**
     * Unique identifier for this time pattern
     */
    id: string;
    /**
     * Human-readable name
     */
    name: string;
    /**
     * Weekly distribution weights (52 values for ISO weeks 1-52)
     * If not provided or empty, defaults to uniform distribution
     */
    weeklyWeights: number[];
    /**
     * Day-of-week distribution weights (7 values for ISO Monday=1 to Sunday=7)
     * If not provided or empty, defaults to uniform distribution
     */
    dayOfWeekWeights: number[];
    /**
     * Hourly distribution per day-of-week (168 values: 7 days × 24 hours)
     * Index calculation: (iso_weekday - 1) * 24 + hour
     * If not provided or empty, defaults to uniform distribution
     */
    dayOfWeekHourWeights: number[];
    /**
     * Minute-level arrival distribution within each hour
     * Defaults to Uniform(0, 60)
     */
    minuteDistribution: Duration;
    constructor(id: string, name: string);
    /**
     * Note: TimePattern serialization is handled by BaseModelDefinitionSerializer.serializeTimePattern()
     * which calls serializeDuration() for the minuteDistribution field.
     * This class doesn't need toJSON/fromJSON methods because serialization is centralized.
     */
    toString(): string;
}
//# sourceMappingURL=TimePattern.d.ts.map