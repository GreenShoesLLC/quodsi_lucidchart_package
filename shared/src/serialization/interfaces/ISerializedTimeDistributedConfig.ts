/**
 * Serialized representation of a TimeDistributedConfig
 * Matches Python TimeDistributedConfigDef structure for JSON export
 */
export interface ISerializedTimeDistributedConfig {
    unique_id: string;
    name: string;
    timePatternId: string;
    totalVolume: number;
    volumePeriodBasis: string; // 'TOTAL' | 'ANNUAL' | 'WEEKLY' | 'DAILY'
    startDate: string;          // ISO 8601: YYYY-MM-DD
    endDate: string;            // ISO 8601: YYYY-MM-DD
}
