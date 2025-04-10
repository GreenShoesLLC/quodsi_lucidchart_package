import { TableConfig } from "../interfaces";

/**
 * Default table configurations
 */
export const DEFAULT_TABLE_CONFIGS: Record<string, TableConfig> = {
    activityUtilization: {
        included: true,
        header: 'Activity Utilization',
        columns: {
            order: [
                'activity_name',
                'scenario_name',
                'utilization_mean',
                'capacity_mean',
                'contents_mean',
                'queue_length_mean',
            ],
            exclude: [
                'id',
                'scenario_id',
                'activity_id',
                'utilization_max',
                'utilization_std_dev',
                'capacity_max',
                'capacity_std_dev',
                'contents_max',
                'contents_std_dev',
                'queue_length_max',
                'queue_length_std_dev'
            ]
        }
    },
    activityRepSummary: {
        included: false,
        header: 'Activity Replication Summary',
        columns: {
            order: [
                'activity_id',
                'activity_name',
                'scenario_name',
                'rep',
                'utilization_percentage',
                'throughput_rate',
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
                'average_time_per_entry',
                'average_queue_length'
            ],
            exclude: ['id', 'scenario_id']
        }
    },
    activityTiming: {
        included: true,
        header: 'Activity States',
        columns: {
            order: [
                'activity_name',
                'scenario_name',
                'cycle_time_mean',
                'service_time_mean',
                'waiting_time_mean',
                'blocked_time_mean',
            ],
            exclude: [
                'id',
                'scenario_id',
                'activity_id',
                'cycle_time_median',
                'cycle_time_std_dev',
                'cycle_time_cv',
                'service_time_median',
                'service_time_std_dev',
                'service_time_cv',
                'waiting_time_median',
                'waiting_time_std_dev',
                'waiting_time_cv',
                'blocked_time_median',
                'blocked_time_std_dev',
                'blocked_time_cv'
            ]
        }
    },
    entityThroughput: {
        included: false,
        header: 'Entity Throughput',
        columns: {
            order: [
                'entity_name',
                'scenario_name',
                'rep',
                'count',
                'completed_count',
                'in_progress_count',
            ],
            exclude: [
                'id',
                'scenario_id',
                'entity_id',
                'throughput_rate'
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
                'average_queue_length',
                'max_queue_length'
            ],
            exclude: ['id', 'scenario_id']
        }
    },
    resourceUtilization: {
        included: true,
        header: 'Resource Utilization',
        columns: {
            order: [
                'resource_name',
                'scenario_name',
                'utilization_mean',
            ],
            exclude: [
                'id',
                'scenario_id',
                'resource_id',
                'utilization_max',
                'utilization_min',
                'utilization_std_dev',
                'bottleneck_frequency'
            ]
        }
    },
    entityState: {
        included: false,
        header: 'Entity State Analysis',
        columns: {
            order: [
                'entity_name',
                'scenario_name',
                'rep',
                'count',
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
            ]
        }
    },
    entityStateCrossRepSummary: {
        included: true,
        header: 'Entity States',
        columns: {
            order: [
                'entity_name',
                'scenario_name',
                // 'count_mean',
                // 'count_median',
                // 'count_std_dev',
                'time_in_system_mean',
                // 'time_in_system_median',
                'time_in_system_std_dev',
                'time_waiting_mean',
                // 'time_waiting_median',
                'time_waiting_std_dev',
                'time_blocked_mean',
                // 'time_blocked_median',
                'time_blocked_std_dev',
                'time_in_operation_mean',
                // 'time_in_operation_median',
                'time_in_operation_std_dev',
                'percent_waiting_mean',
                'percent_waiting_std_dev',
                'percent_blocked_mean',
                'percent_blocked_std_dev',
                'percent_operation_mean',
                'percent_operation_std_dev'
            ],
            exclude: [
                'id',
                'scenario_id',
                'entity_id',
                'time_connecting_mean',
                'time_connecting_median',
                'time_connecting_std_dev',
                'percent_connecting_mean',
                'percent_connecting_std_dev',
                'time_in_system_median',
                'time_waiting_median',
                'time_blocked_median',
                'time_in_operation_median',
                'count_mean',
                'count_median',
                'count_std_dev',
            ]
        }
    },
    entityThroughputCrossRepSummary: {
        included: true,
        header: 'Entity Throughput',
        columns: {
            order: [
                'entity_name',
                'scenario_name',
                'count_mean',
                // 'count_median',
                'count_std_dev',
                'completed_count_mean',
                // 'completed_count_median',
                'completed_count_std_dev',
                'in_progress_count_mean',
                // 'in_progress_count_median',
                'in_progress_count_std_dev',
                'throughput_rate_mean',
                // 'throughput_rate_median',
                'throughput_rate_std_dev',
                'throughput_rate_cv',
                'interval_mean',
                // 'interval_median',
                'interval_std_dev',
                'interval_cv'
            ],
            exclude: [
                'id',
                'scenario_id',
                'entity_id',
                'first_exit_mean',
                'first_exit_median',
                'first_exit_std_dev',
                'last_exit_mean',
                'last_exit_median',
                'last_exit_std_dev',
                'count_median',
                'completed_count_median',
                'in_progress_count_median',
                'throughput_rate_median',
                'interval_median',
            ]
        }
    }
};
