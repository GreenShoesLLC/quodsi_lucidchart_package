/**
 * Interface for Entity Throughput Timeseries Cross-Replication Data
 *
 * Represents timeseries data showing how entity throughput
 * changes over time, with statistics aggregated across simulation replications.
 */
export interface EntityThroughputTimeseriesData {
    /** Scenario identifier */
    scenario_id: string;

    /** Scenario name */
    scenario_name: string;

    /** Entity type identifier (e.g., "ESI_1_Patient", "ESI_2_Patient") */
    object_id: string;

    /** Type of series (typically "throughput" for entity throughput) */
    series_type: string;

    /** Start time of the period (simulation clock time) */
    period_start_clock: number;

    /** Mean value across replications for this time period */
    mean: number;

    /** Standard deviation across replications */
    std: number;

    /** Minimum value across replications */
    min: number;

    /** Maximum value across replications */
    max: number;

    /** Number of replications sampled */
    sample_size: number;
}
