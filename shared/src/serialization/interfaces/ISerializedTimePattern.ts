import { ISerializedDuration } from "./ISerializedDuration";

/**
 * Serialized representation of a TimePattern
 * Matches Python TimePatternDef structure for JSON export
 */
export interface ISerializedTimePattern {
    unique_id: string;
    name: string;
    weekly_weights?: number[];           // 52 values for ISO weeks 1-52
    day_of_week_weights?: number[];      // 7 values for ISO Monday=1 to Sunday=7
    day_of_week_hour_weights?: number[]; // 168 values: 7 days × 24 hours
    minute_distribution_def: ISerializedDuration;
}
