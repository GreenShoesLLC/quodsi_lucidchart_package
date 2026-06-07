/**
 * Serialized representation of a TimeDistributedConfig
 * Matches Python TimeDistributedConfigDef structure for JSON export
 */
export interface ISerializedTimeDistributedConfig {
    unique_id: string;
    name: string;
    timePatternId: string;
    totalVolume: number;
    volumePeriodBasis: string;
    startDate: string;
    endDate: string;
}
//# sourceMappingURL=ISerializedTimeDistributedConfig.d.ts.map