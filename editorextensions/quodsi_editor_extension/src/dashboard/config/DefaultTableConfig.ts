import { TableConfig } from "../interfaces";

/**
 * Default table configurations
 */
export const DEFAULT_TABLE_CONFIGS: Record<string, TableConfig> = {
    activityRepSummary: {
        included: false,
        header: 'Activity Replication Summary',
        columns: {
            order: [
                'activity_id',
                'activity_name',
                'scenario_name',
                'rep',
                'utilization_0_to_1',
                'capacity',
                'total_available_clock',
                'total_arrivals',
                'total_requests',
                'total_captures',
                'total_releases',
                'total_time_in_capture',
                'total_time_blocked',
                'total_time_waiting',
                'average_contents',
                'maximum_contents',
                'current_contents',
                'average_time_per_entry'
            ],
            exclude: ['id', 'scenario_id']
        }
    },
    activityCrossRep: {
        included: true,
        header: 'Activity Cross Replication',
        columns: {
            order: [
                'activity_name',
                'scenario_name',
                'utilization_mean',
                'utilization_max',
                'utilization_std_dev',
                'capacity_mean',
                'capacity_max',
                'avg_number_allocated_mean',
                'avg_number_allocated_max',
                'cycle_time_mean',
                'total_time_waiting_for_resource_mean',
                'total_time_blocked_mean',
                'total_arrivals_mean',
                'total_allocations_mean',
                'throughput_mean',
                'total_cost_mean'
            ],
            exclude: [
                'id',
                'scenario_id',
                'activity_id',
                'capacity_std_dev',
                'avg_number_allocated_std_dev',
                'cycle_time_median',
                'cycle_time_std_dev',
                'cycle_time_cv',
                'total_time_waiting_for_resource_median',
                'total_time_waiting_for_resource_std_dev',
                'total_time_waiting_for_resource_cv',
                'total_time_blocked_median',
                'total_time_blocked_std_dev',
                'total_time_blocked_cv',
                'total_arrivals_max',
                'total_arrivals_std_dev',
                'total_allocations_max',
                'total_allocations_std_dev',
                'throughput_max',
                'throughput_std_dev',
                'fixed_cost_mean',
                'fixed_cost_std_dev',
                'fixed_cost_min',
                'fixed_cost_max',
                'processing_cost_mean',
                'processing_cost_std_dev',
                'processing_cost_min',
                'processing_cost_max',
                'operational_cost_mean',
                'operational_cost_std_dev',
                'operational_cost_min',
                'operational_cost_max',
                'total_cost_std_dev',
                'total_cost_min',
                'total_cost_max'
            ]
        }
    },
    entityRep: {
        included: false,
        header: 'Entity Replication',
        columns: {
            order: [
                'entity_name',
                'scenario_name',
                'rep',
                'entity_count',
                'completed_count',
                'in_progress_count',
                'throughput_rate',
                'first_exit',
                'last_exit',
                'avg_time_in_system',
                'avg_time_waiting',
                'avg_time_blocked',
                'avg_time_in_operation',
                'avg_time_connecting',
                'percent_waiting',
                'percent_blocked',
                'percent_operation',
                'percent_connecting'
            ],
            exclude: [
                'id',
                'scenario_id',
                'entity_id',
                'avg_interval',
                'min_interval',
                'max_interval'
            ]
        }
    },
    entityCrossRep: {
        included: true,
        header: 'Entity Cross Replication',
        columns: {
            order: [
                'entity_name',
                'scenario_name',
                'created_mean',
                'created_std_dev',
                'completed_count_mean',
                'completed_count_std_dev',
                'in_progress_count_mean',
                'in_progress_count_std_dev',
                'throughput_rate_mean',
                'throughput_rate_std_dev',
                'throughput_rate_cv',
                'time_in_system_mean',
                'time_in_system_std_dev',
                'time_waiting_mean',
                'time_waiting_std_dev',
                'time_blocked_mean',
                'time_blocked_std_dev',
                'time_in_operation_mean',
                'time_in_operation_std_dev',
                'percent_waiting_mean',
                'percent_blocked_mean',
                'percent_operation_mean'
            ],
            exclude: [
                'id',
                'scenario_id',
                'entity_id',
                'created_median',
                'completed_count_median',
                'in_progress_count_median',
                'throughput_rate_median',
                'interval_mean',
                'interval_median',
                'interval_std_dev',
                'interval_cv',
                'overall_interval_mean',
                'overall_interval_median',
                'overall_interval_std_dev',
                'overall_interval_cv',
                'first_exit_mean',
                'first_exit_median',
                'first_exit_std_dev',
                'last_exit_mean',
                'last_exit_median',
                'last_exit_std_dev',
                'time_in_system_median',
                'time_waiting_median',
                'time_blocked_median',
                'time_in_operation_median',
                'time_connecting_mean',
                'time_connecting_median',
                'time_connecting_std_dev',
                'percent_waiting_std_dev',
                'percent_blocked_std_dev',
                'percent_operation_std_dev',
                'percent_connecting_mean',
                'percent_connecting_std_dev'
            ]
        }
    },
    resourceRepSummary: {
        included: false,
        header: 'Resource Replication Summary',
        columns: {
            order: [
                'resource_name',
                'scenario_name',
                'resource_id',
                'rep',
                'capacity',
                'total_requests',
                'times_acquired',
                'times_released',
                'average_utilization',
                'peak_utilization',
                'average_wait_time',
                'max_wait_time',
                'average_entities',
                'max_queue_length'
            ],
            exclude: ['id', 'scenario_id']
        }
    },
    resourceCrossRep: {
        included: true,
        header: 'Resource Cross Replication',
        columns: {
            order: [
                'resource_name',
                'scenario_name',
                'utilization_mean',
                'utilization_min',
                'utilization_max',
                'utilization_std_dev',
                'bottleneck_frequency',
                'total_cost_mean'
            ],
            exclude: [
                'id',
                'scenario_id',
                'resource_id',
                'seize_cost_mean',
                'seize_cost_std_dev',
                'seize_cost_min',
                'seize_cost_max',
                'utilization_cost_mean',
                'utilization_cost_std_dev',
                'utilization_cost_min',
                'utilization_cost_max',
                'idle_cost_mean',
                'idle_cost_std_dev',
                'idle_cost_min',
                'idle_cost_max',
                'total_cost_std_dev',
                'total_cost_min',
                'total_cost_max'
            ]
        }
    }
};
