/**
 * Interface for Activity Contents Timeseries Cross-Replication Data
 *
 * Represents timeseries data showing how activity contents (queue size)
 * changes over time, with statistics aggregated across simulation replications.
 */
export interface ActivityContentsTimeseriesData {
    /** Scenario identifier */
    scenario_id: string;

    /** Scenario name */
    scenario_name: string;

    /** Activity/object identifier (e.g., "End", "Data", "Process") */
    object_id: string;

    /** Type of series (typically "contents" for queue size) */
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
