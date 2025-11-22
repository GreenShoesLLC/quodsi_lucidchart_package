/**
 * Serialized representation of a TimeDistributedConfig
 * Matches Python TimeDistributedConfigDef structure for JSON export
 */
export interface ISerializedTimeDistributedConfig {
    unique_id: string;
    name: string;
    time_pattern_id: string;
    total_volume: number;
    volume_period_basis: string; // 'TOTAL' | 'ANNUAL' | 'WEEKLY' | 'DAILY'
    start_date: string;          // ISO 8601: YYYY-MM-DD
    end_date: string;            // ISO 8601: YYYY-MM-DD
}
