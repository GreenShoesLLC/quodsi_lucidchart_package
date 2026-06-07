import { ISerializedDuration } from "./ISerializedDuration";
/**
 * Serialized representation of a TimePattern
 * Matches Python TimePatternDef structure for JSON export
 */
export interface ISerializedTimePattern {
    unique_id: string;
    name: string;
    weeklyWeights?: number[];
    dayOfWeekWeights?: number[];
    dayOfWeekHourWeights?: number[];
    minuteDistributionDef: ISerializedDuration;
}
//# sourceMappingURL=ISerializedTimePattern.d.ts.map