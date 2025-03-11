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
                'Name',
                'utilization_mean',
                'utilization_max',
                'capacity_mean',
                'capacity_max',
                'contents_mean',
                'contents_max',
                'queue_length_mean',
                'queue_length_max',
                'busy_percentage',
                'idle_percentage',
                'blocked_percentage'
            ],
            exclude: ['Id', 'id', 'scenario_id']
        }
    },
    activityRepSummary: {
        included: true,
        header: 'Activity Replication Summary',
        columns: {
            order: [
                'activity_id',
                'activity_name',
                'rep',
                'utilization_percentage',
                'throughput_rate',
                'throughput_count',
                'capacity',
                'contents_mean',
                'contents_max',
                'queue_length_mean',
                'queue_length_max',
                'busy_time',
                'idle_time',
                'blocked_time',
                'total_time'
            ],
            exclude: ['id', 'scenario_id']
        }
    },
    activityTiming: {
        included: true,
        header: 'Activity Timing Analysis',
        columns: {
            order: [
                'Name',
                'cycle_time_mean',
                'cycle_time_min',
                'cycle_time_max',
                'service_time_mean',
                'service_time_min',
                'service_time_max',
                'waiting_time_mean',
                'waiting_time_min',
                'waiting_time_max',
                'blocked_time_mean',
                'blocked_time_min',
                'blocked_time_max',
                'total_entities_processed'
            ],
            exclude: ['Id', 'id', 'scenario_id']
        }
    },
    entityThroughput: {
        included: true,
        header: 'Entity Throughput',
        columns: {
            order: [
                'entity_type',
                'entity_name',
                'throughput_count',
                'throughput_rate',
                'cycle_time_mean',
                'cycle_time_min',
                'cycle_time_max',
                'time_in_system_mean',
                'time_in_system_min',
                'time_in_system_max',
                'rep'
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
                'rep',
                'utilization_rate',
                'available_time',
                'busy_time',
                'down_time',
                'capacity',
                'contents_mean',
                'contents_min',
                'contents_max',
                'units_seized',
                'units_released'
            ],
            exclude: ['id', 'scenario_id']
        }
    },
    resourceUtilization: {
        included: true,
        header: 'Resource Utilization',
        columns: {
            order: [
                'Name',
                'utilization_rate_mean',
                'utilization_rate_min',
                'utilization_rate_max',
                'capacity_mean',
                'capacity_min',
                'capacity_max',
                'contents_mean',
                'contents_min',
                'contents_max',
                'available_time_mean',
                'busy_time_mean',
                'down_time_mean',
                'units_seized_mean',
                'units_released_mean'
            ],
            exclude: ['Id', 'id', 'scenario_id']
        }
    },
    entityState: {
        included: true,
        header: 'Entity State Analysis',
        columns: {
            order: [
                'entity_type',
                'entity_name',
                'state',
                'percentage',
                'count_mean',
                'count_min',
                'count_max',
                'time_mean',
                'time_min',
                'time_max',
                'rep'
            ],
            exclude: ['id', 'scenario_id']
        }
    }
};
