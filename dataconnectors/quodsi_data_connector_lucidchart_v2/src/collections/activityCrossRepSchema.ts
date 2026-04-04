// schemas/activityCrossRepSchema.ts
import { SchemaDefinition, ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const ActivityCrossRepSchema: SchemaDefinition = {
    fields: [
        // Identifiers
        { name: "id", type: ScalarFieldTypeEnum.STRING },
        { name: "scenario_id", type: ScalarFieldTypeEnum.STRING },
        { name: "scenario_name", type: ScalarFieldTypeEnum.STRING },
        { name: "activity_id", type: ScalarFieldTypeEnum.STRING },
        { name: "activity_name", type: ScalarFieldTypeEnum.STRING },
        
        // Utilization metrics
        { name: "capacity_utilization_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "capacity_utilization_max", type: ScalarFieldTypeEnum.NUMBER },
        { name: "capacity_utilization_std_dev", type: ScalarFieldTypeEnum.NUMBER },

        // Active time percentage metrics
        { name: "active_time_pct_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "active_time_pct_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "active_time_pct_max", type: ScalarFieldTypeEnum.NUMBER },
        { name: "active_time_pct_std_dev", type: ScalarFieldTypeEnum.NUMBER },

        // Capacity metrics
        { name: "capacity_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "capacity_max", type: ScalarFieldTypeEnum.NUMBER },
        { name: "capacity_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        
        // Avg Number Allocated metrics (formerly contents)
        { name: "avg_number_allocated_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "avg_number_allocated_max", type: ScalarFieldTypeEnum.NUMBER },
        { name: "avg_number_allocated_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        
        // Cycle time metrics
        { name: "cycle_time_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "cycle_time_median", type: ScalarFieldTypeEnum.NUMBER },
        { name: "cycle_time_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "cycle_time_cv", type: ScalarFieldTypeEnum.NUMBER },
        
        // Total Time Waiting for Resource metrics (formerly waiting time)
        { name: "total_time_waiting_for_resource_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_time_waiting_for_resource_median", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_time_waiting_for_resource_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_time_waiting_for_resource_cv", type: ScalarFieldTypeEnum.NUMBER },

        // Total Time Blocked metrics (formerly blocked time)
        { name: "total_time_blocked_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_time_blocked_median", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_time_blocked_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_time_blocked_cv", type: ScalarFieldTypeEnum.NUMBER },

        // Total Time In Failure metrics
        { name: "total_time_in_failure_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_time_in_failure_median", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_time_in_failure_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_time_in_failure_cv", type: ScalarFieldTypeEnum.NUMBER },

        // Flow statistics
        { name: "total_arrivals_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_arrivals_max", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_arrivals_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_allocations_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_allocations_max", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_allocations_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "throughput_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "throughput_max", type: ScalarFieldTypeEnum.NUMBER },
        { name: "throughput_std_dev", type: ScalarFieldTypeEnum.NUMBER },

        // Cost metrics
        { name: "fixed_cost_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "fixed_cost_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "fixed_cost_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "fixed_cost_max", type: ScalarFieldTypeEnum.NUMBER },
        { name: "processing_cost_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "processing_cost_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "processing_cost_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "processing_cost_max", type: ScalarFieldTypeEnum.NUMBER },
        { name: "operational_cost_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "operational_cost_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "operational_cost_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "operational_cost_max", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_cost_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_cost_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_cost_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_cost_max", type: ScalarFieldTypeEnum.NUMBER }
    ],
    primaryKey: ["id"],
    fieldLabels: {
        'id': 'ID',
        'scenario_id': 'Scenario Id',
        'scenario_name': 'Scenario Name',
        'activity_id': 'Activity ID',
        'activity_name': 'Activity Name',
        
        // Utilization metrics
        'capacity_utilization_mean': 'Mean Utilization',
        'capacity_utilization_max': 'Max Utilization',
        'capacity_utilization_std_dev': 'Utilization Std Dev',

        // Active time percentage metrics
        'active_time_pct_mean': 'Active Time % Mean',
        'active_time_pct_min': 'Active Time % Min',
        'active_time_pct_max': 'Active Time % Max',
        'active_time_pct_std_dev': 'Active Time % Std Dev',

        // Capacity metrics
        'capacity_mean': 'Mean Capacity',
        'capacity_max': 'Max Capacity',
        'capacity_std_dev': 'Capacity Std Dev',
        
        // Avg Number Allocated metrics
        'avg_number_allocated_mean': 'Mean Avg Number Allocated',
        'avg_number_allocated_max': 'Max Avg Number Allocated',
        'avg_number_allocated_std_dev': 'Avg Number Allocated Std Dev',

        // Cycle time metrics
        'cycle_time_mean': 'Mean Cycle Time',
        'cycle_time_median': 'Median Cycle Time',
        'cycle_time_std_dev': 'Cycle Time Std Dev',
        'cycle_time_cv': 'Cycle Time CV',
        
        // Total Time Waiting for Resource metrics
        'total_time_waiting_for_resource_mean': 'Mean Total Time Waiting',
        'total_time_waiting_for_resource_median': 'Median Total Time Waiting',
        'total_time_waiting_for_resource_std_dev': 'Total Time Waiting Std Dev',
        'total_time_waiting_for_resource_cv': 'Total Time Waiting CV',

        // Total Time Blocked metrics
        'total_time_blocked_mean': 'Mean Total Time Blocked',
        'total_time_blocked_median': 'Median Total Time Blocked',
        'total_time_blocked_std_dev': 'Total Time Blocked Std Dev',
        'total_time_blocked_cv': 'Total Time Blocked CV',

        // Total Time In Failure metrics
        'total_time_in_failure_mean': 'Mean Total Time In Failure',
        'total_time_in_failure_median': 'Median Total Time In Failure',
        'total_time_in_failure_std_dev': 'Total Time In Failure Std Dev',
        'total_time_in_failure_cv': 'Total Time In Failure CV',

        // Flow statistics
        'total_arrivals_mean': 'Mean Total Arrivals',
        'total_arrivals_max': 'Max Total Arrivals',
        'total_arrivals_std_dev': 'Total Arrivals Std Dev',
        'total_allocations_mean': 'Mean Total Allocations',
        'total_allocations_max': 'Max Total Allocations',
        'total_allocations_std_dev': 'Total Allocations Std Dev',
        'throughput_mean': 'Mean Throughput',
        'throughput_max': 'Max Throughput',
        'throughput_std_dev': 'Throughput Std Dev',

        // Cost metrics
        'fixed_cost_mean': 'Mean Fixed Cost',
        'fixed_cost_std_dev': 'Fixed Cost Std Dev',
        'fixed_cost_min': 'Min Fixed Cost',
        'fixed_cost_max': 'Max Fixed Cost',
        'processing_cost_mean': 'Mean Processing Cost',
        'processing_cost_std_dev': 'Processing Cost Std Dev',
        'processing_cost_min': 'Min Processing Cost',
        'processing_cost_max': 'Max Processing Cost',
        'operational_cost_mean': 'Mean Operational Cost',
        'operational_cost_std_dev': 'Operational Cost Std Dev',
        'operational_cost_min': 'Min Operational Cost',
        'operational_cost_max': 'Max Operational Cost',
        'total_cost_mean': 'Mean Total Cost',
        'total_cost_std_dev': 'Total Cost Std Dev',
        'total_cost_min': 'Min Total Cost',
        'total_cost_max': 'Max Total Cost'
    }
};