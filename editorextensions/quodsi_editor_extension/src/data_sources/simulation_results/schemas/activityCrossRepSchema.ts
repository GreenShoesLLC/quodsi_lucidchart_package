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
        { name: "utilization_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "utilization_max", type: ScalarFieldTypeEnum.NUMBER },
        { name: "utilization_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        
        // Capacity metrics
        { name: "capacity_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "capacity_max", type: ScalarFieldTypeEnum.NUMBER },
        { name: "capacity_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        
        // Contents metrics
        { name: "contents_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "contents_max", type: ScalarFieldTypeEnum.NUMBER },
        { name: "contents_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        
        // Queue metrics
        { name: "queue_length_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "queue_length_max", type: ScalarFieldTypeEnum.NUMBER },
        { name: "queue_length_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        
        // Cycle time metrics
        { name: "cycle_time_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "cycle_time_median", type: ScalarFieldTypeEnum.NUMBER },
        { name: "cycle_time_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "cycle_time_cv", type: ScalarFieldTypeEnum.NUMBER },
        
        // Waiting time metrics
        { name: "waiting_time_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "waiting_time_median", type: ScalarFieldTypeEnum.NUMBER },
        { name: "waiting_time_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "waiting_time_cv", type: ScalarFieldTypeEnum.NUMBER },
        
        // Blocked time metrics
        { name: "blocked_time_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "blocked_time_median", type: ScalarFieldTypeEnum.NUMBER },
        { name: "blocked_time_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "blocked_time_cv", type: ScalarFieldTypeEnum.NUMBER },
        
        // Flow statistics
        { name: "arrivals_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "arrivals_max", type: ScalarFieldTypeEnum.NUMBER },
        { name: "arrivals_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "captures_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "captures_max", type: ScalarFieldTypeEnum.NUMBER },
        { name: "captures_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "releases_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "releases_max", type: ScalarFieldTypeEnum.NUMBER },
        { name: "releases_std_dev", type: ScalarFieldTypeEnum.NUMBER }
    ],
    primaryKey: ["id"],
    fieldLabels: {
        'id': 'ID',
        'scenario_id': 'Scenario Id',
        'scenario_name': 'Scenario Name',
        'activity_id': 'Activity ID',
        'activity_name': 'Activity Name',
        
        // Utilization metrics
        'utilization_mean': 'Mean Utilization',
        'utilization_max': 'Max Utilization',
        'utilization_std_dev': 'Utilization Std Dev',
        
        // Capacity metrics
        'capacity_mean': 'Mean Capacity',
        'capacity_max': 'Max Capacity',
        'capacity_std_dev': 'Capacity Std Dev',
        
        // Contents metrics
        'contents_mean': 'Mean Contents',
        'contents_max': 'Max Contents',
        'contents_std_dev': 'Contents Std Dev',
        
        // Queue metrics
        'queue_length_mean': 'Mean Queue Length',
        'queue_length_max': 'Max Queue Length',
        'queue_length_std_dev': 'Queue Length Std Dev',
        
        // Cycle time metrics
        'cycle_time_mean': 'Mean Cycle Time',
        'cycle_time_median': 'Median Cycle Time',
        'cycle_time_std_dev': 'Cycle Time Std Dev',
        'cycle_time_cv': 'Cycle Time CV',
        
        // Waiting time metrics
        'waiting_time_mean': 'Mean Waiting Time',
        'waiting_time_median': 'Median Waiting Time',
        'waiting_time_std_dev': 'Waiting Time Std Dev',
        'waiting_time_cv': 'Waiting Time CV',
        
        // Blocked time metrics
        'blocked_time_mean': 'Mean Blocked Time',
        'blocked_time_median': 'Median Blocked Time',
        'blocked_time_std_dev': 'Blocked Time Std Dev',
        'blocked_time_cv': 'Blocked Time CV',
        
        // Flow statistics
        'arrivals_mean': 'Mean Arrivals',
        'arrivals_max': 'Max Arrivals',
        'arrivals_std_dev': 'Arrivals Std Dev',
        'captures_mean': 'Mean Captures',
        'captures_max': 'Max Captures',
        'captures_std_dev': 'Captures Std Dev',
        'releases_mean': 'Mean Releases',
        'releases_max': 'Max Releases',
        'releases_std_dev': 'Releases Std Dev'
    }
};