/**
 * Interface for State Values Timeseries Cross-Replication Data
 *
 * Represents timeseries data showing how state values change over time,
 * with statistics aggregated across simulation replications.
 */
export interface StateValuesTimeseriesData {
    /** Scenario identifier */
    scenario_id: string;

    /** Scenario name */
    scenario_name: string;

    /** State identifier (e.g., "Model.Model.State2Model", "Model.Model.Throughput") */
    object_id: string;

    /** Type of series (typically "values" for state values) */
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
