// schemas/entityCrossRepSchema.ts
import { SchemaDefinition, ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const EntityCrossRepSchema: SchemaDefinition = {
    fields: [
        // Identifiers
        { name: "id", type: ScalarFieldTypeEnum.STRING },
        { name: "scenario_id", type: ScalarFieldTypeEnum.STRING },
        { name: "scenario_name", type: ScalarFieldTypeEnum.STRING },
        { name: "entity_id", type: ScalarFieldTypeEnum.STRING },
        { name: "entity_name", type: ScalarFieldTypeEnum.STRING },

        // Created statistics
        { name: "created_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "created_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "created_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "created_max", type: ScalarFieldTypeEnum.NUMBER },

        // Completed count statistics
        { name: "completed_count_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "completed_count_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "completed_count_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "completed_count_max", type: ScalarFieldTypeEnum.NUMBER },

        // In progress count statistics
        { name: "in_progress_count_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "in_progress_count_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "in_progress_count_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "in_progress_count_max", type: ScalarFieldTypeEnum.NUMBER },

        // Interval statistics
        { name: "interval_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "interval_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "interval_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "interval_max", type: ScalarFieldTypeEnum.NUMBER },

        // Throughput rate statistics
        { name: "throughput_rate_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "throughput_rate_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "throughput_rate_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "throughput_rate_max", type: ScalarFieldTypeEnum.NUMBER },

        // Overall interval statistics
        { name: "overall_interval_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "overall_interval_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "overall_interval_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "overall_interval_max", type: ScalarFieldTypeEnum.NUMBER },

        // Time in system statistics
        { name: "time_in_system_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "time_in_system_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "time_in_system_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "time_in_system_max", type: ScalarFieldTypeEnum.NUMBER },

        // Time waiting statistics
        { name: "time_resource_wait_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "time_resource_wait_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "time_resource_wait_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "time_resource_wait_max", type: ScalarFieldTypeEnum.NUMBER },

        // Time blocked statistics
        { name: "time_queue_wait_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "time_queue_wait_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "time_queue_wait_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "time_queue_wait_max", type: ScalarFieldTypeEnum.NUMBER },

        // Time in operation statistics
        { name: "time_in_operation_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "time_in_operation_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "time_in_operation_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "time_in_operation_max", type: ScalarFieldTypeEnum.NUMBER },

        // Time connecting statistics
        { name: "time_connecting_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "time_connecting_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "time_connecting_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "time_connecting_max", type: ScalarFieldTypeEnum.NUMBER },

        // Percentage metrics
        { name: "percent_resource_wait_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_resource_wait_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_resource_wait_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_resource_wait_max", type: ScalarFieldTypeEnum.NUMBER },

        { name: "percent_queue_wait_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_queue_wait_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_queue_wait_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_queue_wait_max", type: ScalarFieldTypeEnum.NUMBER },

        { name: "percent_operation_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_operation_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_operation_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_operation_max", type: ScalarFieldTypeEnum.NUMBER },

        { name: "percent_connecting_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_connecting_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_connecting_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_connecting_max", type: ScalarFieldTypeEnum.NUMBER },

        // WIP statistics
        { name: "trough_wip_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "trough_wip_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "trough_wip_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "trough_wip_max", type: ScalarFieldTypeEnum.NUMBER },

        { name: "peak_wip_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "peak_wip_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "peak_wip_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "peak_wip_max", type: ScalarFieldTypeEnum.NUMBER },

        { name: "avg_wip_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "avg_wip_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "avg_wip_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "avg_wip_max", type: ScalarFieldTypeEnum.NUMBER },

        // Replication count
        { name: "num_replications", type: ScalarFieldTypeEnum.NUMBER }
    ],
    primaryKey: ["id"],
    fieldLabels: {
        'id': 'ID',
        'scenario_id': 'Scenario Id',
        'scenario_name': 'Scenario Name',
        'entity_id': 'Entity ID',
        'entity_name': 'Entity Name',

        // Created statistics
        'created_mean': 'Mean Created',
        'created_std_dev': 'Created Std Dev',
        'created_min': 'Min Created',
        'created_max': 'Max Created',

        // Completed count statistics
        'completed_count_mean': 'Mean Completed Count',
        'completed_count_std_dev': 'Completed Count Std Dev',
        'completed_count_min': 'Min Completed Count',
        'completed_count_max': 'Max Completed Count',

        // In progress count statistics
        'in_progress_count_mean': 'Mean In Progress Count',
        'in_progress_count_std_dev': 'In Progress Count Std Dev',
        'in_progress_count_min': 'Min In Progress Count',
        'in_progress_count_max': 'Max In Progress Count',

        // Interval statistics
        'interval_mean': 'Mean Interval',
        'interval_std_dev': 'Interval Std Dev',
        'interval_min': 'Min Interval',
        'interval_max': 'Max Interval',

        // Throughput rate statistics
        'throughput_rate_mean': 'Mean Throughput Rate',
        'throughput_rate_std_dev': 'Throughput Rate Std Dev',
        'throughput_rate_min': 'Min Throughput Rate',
        'throughput_rate_max': 'Max Throughput Rate',

        // Overall interval statistics
        'overall_interval_mean': 'Mean Overall Interval',
        'overall_interval_std_dev': 'Overall Interval Std Dev',
        'overall_interval_min': 'Min Overall Interval',
        'overall_interval_max': 'Max Overall Interval',

        // Time in system statistics
        'time_in_system_mean': 'Mean Time in System',
        'time_in_system_std_dev': 'Time in System Std Dev',
        'time_in_system_min': 'Min Time in System',
        'time_in_system_max': 'Max Time in System',

        // Time waiting statistics
        'time_resource_wait_mean': 'Mean Time Resource Wait',
        'time_resource_wait_std_dev': 'Time Resource Wait Std Dev',
        'time_resource_wait_min': 'Min Time Resource Wait',
        'time_resource_wait_max': 'Max Time Resource Wait',

        // Time blocked statistics
        'time_queue_wait_mean': 'Mean Time Queue Wait',
        'time_queue_wait_std_dev': 'Time Queue Wait Std Dev',
        'time_queue_wait_min': 'Min Time Queue Wait',
        'time_queue_wait_max': 'Max Time Queue Wait',

        // Time in operation statistics
        'time_in_operation_mean': 'Mean Time in Operation',
        'time_in_operation_std_dev': 'Time in Operation Std Dev',
        'time_in_operation_min': 'Min Time in Operation',
        'time_in_operation_max': 'Max Time in Operation',

        // Time connecting statistics
        'time_connecting_mean': 'Mean Time Connecting',
        'time_connecting_std_dev': 'Time Connecting Std Dev',
        'time_connecting_min': 'Min Time Connecting',
        'time_connecting_max': 'Max Time Connecting',

        // Percentage metrics
        'percent_resource_wait_mean': 'Mean % Resource Wait',
        'percent_resource_wait_std_dev': '% Resource Wait Std Dev',
        'percent_resource_wait_min': 'Min % Resource Wait',
        'percent_resource_wait_max': 'Max % Resource Wait',

        'percent_queue_wait_mean': 'Mean % Queue Wait',
        'percent_queue_wait_std_dev': '% Queue Wait Std Dev',
        'percent_queue_wait_min': 'Min % Queue Wait',
        'percent_queue_wait_max': 'Max % Queue Wait',

        'percent_operation_mean': 'Mean % in Operation',
        'percent_operation_std_dev': '% in Operation Std Dev',
        'percent_operation_min': 'Min % in Operation',
        'percent_operation_max': 'Max % in Operation',

        'percent_connecting_mean': 'Mean % Connecting',
        'percent_connecting_std_dev': '% Connecting Std Dev',
        'percent_connecting_min': 'Min % Connecting',
        'percent_connecting_max': 'Max % Connecting',

        // WIP statistics
        'trough_wip_mean': 'Mean Trough WIP',
        'trough_wip_std_dev': 'Trough WIP Std Dev',
        'trough_wip_min': 'Min Trough WIP',
        'trough_wip_max': 'Max Trough WIP',

        'peak_wip_mean': 'Mean Peak WIP',
        'peak_wip_std_dev': 'Peak WIP Std Dev',
        'peak_wip_min': 'Min Peak WIP',
        'peak_wip_max': 'Max Peak WIP',

        'avg_wip_mean': 'Mean Avg WIP',
        'avg_wip_std_dev': 'Avg WIP Std Dev',
        'avg_wip_min': 'Min Avg WIP',
        'avg_wip_max': 'Max Avg WIP',

        // Replication count
        'num_replications': 'Num Replications'
    }
};
