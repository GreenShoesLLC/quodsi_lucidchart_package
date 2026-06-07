import { ISerializedDuration } from "./ISerializedDuration";

/**
 * Serialized representation of a TimePattern
 * Matches Python TimePatternDef structure for JSON export
 */
export interface ISerializedTimePattern {
    unique_id: string;
    name: string;
    weeklyWeights?: number[];           // 52 values for ISO weeks 1-52
    dayOfWeekWeights?: number[];      // 7 values for ISO Monday=1 to Sunday=7
    dayOfWeekHourWeights?: number[]; // 168 values: 7 days × 24 hours
    minuteDistributionDef: ISerializedDuration;
}
