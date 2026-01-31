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
        { name: "time_waiting_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "time_waiting_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "time_waiting_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "time_waiting_max", type: ScalarFieldTypeEnum.NUMBER },

        // Time blocked statistics
        { name: "time_blocked_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "time_blocked_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "time_blocked_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "time_blocked_max", type: ScalarFieldTypeEnum.NUMBER },

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
        { name: "percent_waiting_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_waiting_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_waiting_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_waiting_max", type: ScalarFieldTypeEnum.NUMBER },

        { name: "percent_blocked_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_blocked_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_blocked_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_blocked_max", type: ScalarFieldTypeEnum.NUMBER },

        { name: "percent_operation_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_operation_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_operation_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_operation_max", type: ScalarFieldTypeEnum.NUMBER },

        { name: "percent_connecting_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_connecting_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_connecting_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_connecting_max", type: ScalarFieldTypeEnum.NUMBER },

        // WIP statistics
        { name: "min_wip_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "min_wip_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "min_wip_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "min_wip_max", type: ScalarFieldTypeEnum.NUMBER },

        { name: "max_wip_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "max_wip_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "max_wip_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "max_wip_max", type: ScalarFieldTypeEnum.NUMBER },

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
        'time_waiting_mean': 'Mean Time Waiting',
        'time_waiting_std_dev': 'Time Waiting Std Dev',
        'time_waiting_min': 'Min Time Waiting',
        'time_waiting_max': 'Max Time Waiting',

        // Time blocked statistics
        'time_blocked_mean': 'Mean Time Blocked',
        'time_blocked_std_dev': 'Time Blocked Std Dev',
        'time_blocked_min': 'Min Time Blocked',
        'time_blocked_max': 'Max Time Blocked',

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
        'percent_waiting_mean': 'Mean % Waiting',
        'percent_waiting_std_dev': '% Waiting Std Dev',
        'percent_waiting_min': 'Min % Waiting',
        'percent_waiting_max': 'Max % Waiting',

        'percent_blocked_mean': 'Mean % Blocked',
        'percent_blocked_std_dev': '% Blocked Std Dev',
        'percent_blocked_min': 'Min % Blocked',
        'percent_blocked_max': 'Max % Blocked',

        'percent_operation_mean': 'Mean % in Operation',
        'percent_operation_std_dev': '% in Operation Std Dev',
        'percent_operation_min': 'Min % in Operation',
        'percent_operation_max': 'Max % in Operation',

        'percent_connecting_mean': 'Mean % Connecting',
        'percent_connecting_std_dev': '% Connecting Std Dev',
        'percent_connecting_min': 'Min % Connecting',
        'percent_connecting_max': 'Max % Connecting',

        // WIP statistics
        'min_wip_mean': 'Mean Min WIP',
        'min_wip_std_dev': 'Min WIP Std Dev',
        'min_wip_min': 'Min Min WIP',
        'min_wip_max': 'Max Min WIP',

        'max_wip_mean': 'Mean Max WIP',
        'max_wip_std_dev': 'Max WIP Std Dev',
        'max_wip_min': 'Min Max WIP',
        'max_wip_max': 'Max Max WIP',

        'avg_wip_mean': 'Mean Avg WIP',
        'avg_wip_std_dev': 'Avg WIP Std Dev',
        'avg_wip_min': 'Min Avg WIP',
        'avg_wip_max': 'Max Avg WIP',

        // Replication count
        'num_replications': 'Num Replications'
    }
};
