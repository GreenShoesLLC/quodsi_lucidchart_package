/**
 * Interface for State Summary Cross-Replication Data
 *
 * Represents state variable statistics aggregated across simulation replications.
 * Supports both numerical states (NUMBER) and categorical states (CATEGORY).
 */
export interface StateSummaryData {
    /** Scenario identifier */
    scenario_id: string;

    /** Scenario name */
    scenario_name: string;

    /** Composite state key (e.g., "Model.Model.Throughput") */
    state_key: string;

    /** Component type owning the state (Model, Activity, Entity, Generator, Resource) */
    component_type: string;

    /** Component name */
    component_name: string;

    /** State variable name */
    state_name: string;

    /** State type: NUMBER or CATEGORY */
    state_type: string;

    /** Number of replications */
    num_replications: number;

    /** Mean number of state changes */
    mean_change_count: number;

    /** Lower bound of change count confidence interval */
    change_count_ci_lower: number;

    /** Upper bound of change count confidence interval */
    change_count_ci_upper: number;

    /** Mean final value (NUMBER states only) */
    mean_final_value: number;

    /** Lower bound of final value confidence interval */
    final_value_ci_lower: number;

    /** Upper bound of final value confidence interval */
    final_value_ci_upper: number;

    /** Standard deviation of final value */
    final_value_std_dev: number;

    /** Mean time-weighted average value */
    mean_time_weighted_avg: number;

    /** Lower bound of time-weighted avg confidence interval */
    time_weighted_avg_ci_lower: number;

    /** Upper bound of time-weighted avg confidence interval */
    time_weighted_avg_ci_upper: number;

    /** Mean minimum value observed */
    mean_min_value: number;

    /** Overall minimum value across all replications */
    overall_min_value: number;

    /** Mean maximum value observed */
    mean_max_value: number;

    /** Overall maximum value across all replications */
    overall_max_value: number;

    /** Most common category value (CATEGORY states only) */
    most_common_category: string;

    /** Mean percentage of time state was true (boolean states) */
    mean_percent_time_true: number;

    /** Lower bound of percent time true confidence interval */
    percent_time_true_ci_lower: number;

    /** Upper bound of percent time true confidence interval */
    percent_time_true_ci_upper: number;
}
