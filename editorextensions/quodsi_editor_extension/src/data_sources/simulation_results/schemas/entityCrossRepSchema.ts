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
        
        // Created statistics (entities created)
        { name: "created_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "created_median", type: ScalarFieldTypeEnum.NUMBER },
        { name: "created_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        
        // Completed count statistics
        { name: "completed_count_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "completed_count_median", type: ScalarFieldTypeEnum.NUMBER },
        { name: "completed_count_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        
        // In progress count statistics
        { name: "in_progress_count_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "in_progress_count_median", type: ScalarFieldTypeEnum.NUMBER },
        { name: "in_progress_count_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        
        // Throughput rate statistics
        { name: "throughput_rate_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "throughput_rate_median", type: ScalarFieldTypeEnum.NUMBER },
        { name: "throughput_rate_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "throughput_rate_cv", type: ScalarFieldTypeEnum.NUMBER },
        
        // Interval statistics
        { name: "interval_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "interval_median", type: ScalarFieldTypeEnum.NUMBER },
        { name: "interval_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "interval_cv", type: ScalarFieldTypeEnum.NUMBER },
        
        // Overall interval statistics
        { name: "overall_interval_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "overall_interval_median", type: ScalarFieldTypeEnum.NUMBER },
        { name: "overall_interval_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "overall_interval_cv", type: ScalarFieldTypeEnum.NUMBER },
        
        // First exit statistics
        { name: "first_exit_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "first_exit_median", type: ScalarFieldTypeEnum.NUMBER },
        { name: "first_exit_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        
        // Last exit statistics
        { name: "last_exit_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "last_exit_median", type: ScalarFieldTypeEnum.NUMBER },
        { name: "last_exit_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        
        // Time in system statistics
        { name: "time_in_system_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "time_in_system_median", type: ScalarFieldTypeEnum.NUMBER },
        { name: "time_in_system_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        
        // Time waiting statistics
        { name: "time_resource_wait_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "time_resource_wait_median", type: ScalarFieldTypeEnum.NUMBER },
        { name: "time_resource_wait_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        
        // Time blocked statistics
        { name: "time_queue_wait_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "time_queue_wait_median", type: ScalarFieldTypeEnum.NUMBER },
        { name: "time_queue_wait_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        
        // Time in operation statistics
        { name: "time_in_operation_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "time_in_operation_median", type: ScalarFieldTypeEnum.NUMBER },
        { name: "time_in_operation_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        
        // Time connecting statistics
        { name: "time_connecting_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "time_connecting_median", type: ScalarFieldTypeEnum.NUMBER },
        { name: "time_connecting_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        
        // Percentage metrics
        { name: "percent_resource_wait_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_resource_wait_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_queue_wait_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_queue_wait_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_operation_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_operation_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_connecting_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_connecting_std_dev", type: ScalarFieldTypeEnum.NUMBER }
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
        'created_median': 'Median Created',
        'created_std_dev': 'Created Std Dev',
        
        // Completed count statistics
        'completed_count_mean': 'Mean Completed Count',
        'completed_count_median': 'Median Completed Count',
        'completed_count_std_dev': 'Completed Count Std Dev',
        
        // In progress count statistics
        'in_progress_count_mean': 'Mean In Progress Count',
        'in_progress_count_median': 'Median In Progress Count',
        'in_progress_count_std_dev': 'In Progress Count Std Dev',
        
        // Throughput rate statistics
        'throughput_rate_mean': 'Mean Throughput Rate',
        'throughput_rate_median': 'Median Throughput Rate',
        'throughput_rate_std_dev': 'Throughput Rate Std Dev',
        'throughput_rate_cv': 'Throughput Rate CV',
        
        // Interval statistics
        'interval_mean': 'Mean Interval',
        'interval_median': 'Median Interval',
        'interval_std_dev': 'Interval Std Dev',
        'interval_cv': 'Interval CV',
        
        // Overall interval statistics
        'overall_interval_mean': 'Mean Overall Interval',
        'overall_interval_median': 'Median Overall Interval',
        'overall_interval_std_dev': 'Overall Interval Std Dev',
        'overall_interval_cv': 'Overall Interval CV',
        
        // First exit statistics
        'first_exit_mean': 'Mean First Exit',
        'first_exit_median': 'Median First Exit',
        'first_exit_std_dev': 'First Exit Std Dev',
        
        // Last exit statistics
        'last_exit_mean': 'Mean Last Exit',
        'last_exit_median': 'Median Last Exit',
        'last_exit_std_dev': 'Last Exit Std Dev',
        
        // Time in system statistics
        'time_in_system_mean': 'Mean Time in System',
        'time_in_system_median': 'Median Time in System',
        'time_in_system_std_dev': 'Time in System Std Dev',
        
        // Time waiting statistics
        'time_resource_wait_mean': 'Mean Time Resource Wait',
        'time_resource_wait_median': 'Median Time Resource Wait',
        'time_resource_wait_std_dev': 'Time Resource Wait Std Dev',
        
        // Time blocked statistics
        'time_queue_wait_mean': 'Mean Time Queue Wait',
        'time_queue_wait_median': 'Median Time Queue Wait',
        'time_queue_wait_std_dev': 'Time Queue Wait Std Dev',
        
        // Time in operation statistics
        'time_in_operation_mean': 'Mean Time in Operation',
        'time_in_operation_median': 'Median Time in Operation',
        'time_in_operation_std_dev': 'Time in Operation Std Dev',
        
        // Time connecting statistics
        'time_connecting_mean': 'Mean Time Connecting',
        'time_connecting_median': 'Median Time Connecting',
        'time_connecting_std_dev': 'Time Connecting Std Dev',
        
        // Percentage metrics
        'percent_resource_wait_mean': 'Mean % Resource Wait',
        'percent_resource_wait_std_dev': '% Resource Wait Std Dev',
        'percent_queue_wait_mean': 'Mean % Queue Wait',
        'percent_queue_wait_std_dev': '% Queue Wait Std Dev',
        'percent_operation_mean': 'Mean % in Operation',
        'percent_operation_std_dev': '% in Operation Std Dev',
        'percent_connecting_mean': 'Mean % Connecting',
        'percent_connecting_std_dev': '% Connecting Std Dev'
    }
};