// TableConfig.ts

/**
 * Configuration for an individual table in the dashboard
 */
export interface TableConfig {
    /** Whether this table type is included in the dashboard */
    included?: boolean;
    
    /** Display header for this table */
    header?: string;
    
    /** Column configuration */
    columns?: {
        /** Column display order */
        order?: string[];
        
        /** Columns to exclude */
        exclude?: string[];
    };
}

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
                'activity_id',
                'utilization_mean',
                'utilization_max',
                'utilization_std_dev',
                'capacity_mean',
                'capacity_max',
                'capacity_std_dev',
                'contents_mean',
                'contents_max',
                'contents_std_dev',
                'queue_length_mean',
                'queue_length_max',
                'queue_length_std_dev'
            ],
            exclude: ['id', 'scenario_id']
        }
    },
    activityRepSummary: {
        included: true,
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
        header: 'Activity Timing Analysis',
        columns: {
            order: [
                'activity_name',
                'scenario_name',
                'cycle_time_mean',
                'cycle_time_median',
                'cycle_time_std_dev',
                'cycle_time_cv',
                'service_time_mean',
                'service_time_median',
                'service_time_std_dev',
                'service_time_cv',
                'waiting_time_mean',
                'waiting_time_median',
                'waiting_time_std_dev',
                'waiting_time_cv',
                'blocked_time_mean',
                'blocked_time_median',
                'blocked_time_std_dev',
                'blocked_time_cv'
            ],
            exclude: ['id', 'scenario_id', 'activity_id']
        }
    },
    entityThroughput: {
        included: true,
        header: 'Entity Throughput',
        columns: {
            order: [
                'entity_name',
                'scenario_name',
                'entity_id',
                'rep',
                'count',
                'completed_count',
                'in_progress_count',
                'throughput_rate'
            ],
            exclude: ['id', 'scenario_id']
        }
    },
    resourceRepSummary: {
        included: true,
        header: 'Resource Replication Summary',
        columns: {
            order: [
                'resource_id',
                'resource_name',
                'scenario_name',
                'rep',
                'total_requests',
                'total_captures',
                'total_releases',
                'avg_capture_time',
                'utilization_rate',
                'total_time_waiting',
                'avg_queue_time',
                'max_queue_length',
                'avg_contents'
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
                'resource_id',
                'utilization_rate_mean',
                'utilization_rate_max',
                'utilization_rate_std_dev',
                'contents_mean',
                'contents_max',
                'contents_std_dev'
            ],
            exclude: ['id', 'scenario_id']
        }
    },
    entityState: {
        included: true,
        header: 'Entity State Analysis',
        columns: {
            order: [
                'entity_name',
                'scenario_name',
                'entity_id',
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
            exclude: ['id', 'scenario_id']
        }
    }
};
