// schemas/activityTiming.ts
import { SchemaDefinition, ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const ActivityTimingSchema: SchemaDefinition = {
    fields: [
        { name: "id", type: ScalarFieldTypeEnum.STRING }, 
        { name: "scenario_id", type: ScalarFieldTypeEnum.STRING },
        { name: "scenario_name", type: ScalarFieldTypeEnum.STRING },
        { name: "activity_id", type: ScalarFieldTypeEnum.STRING },
        { name: "activity_name", type: ScalarFieldTypeEnum.STRING },
        { name: "cycle_time_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "cycle_time_median", type: ScalarFieldTypeEnum.NUMBER },
        { name: "cycle_time_cv", type: ScalarFieldTypeEnum.NUMBER },
        { name: "cycle_time_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "service_time_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "service_time_median", type: ScalarFieldTypeEnum.NUMBER },
        { name: "service_time_cv", type: ScalarFieldTypeEnum.NUMBER },
        { name: "service_time_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "waiting_time_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "waiting_time_median", type: ScalarFieldTypeEnum.NUMBER },
        { name: "waiting_time_cv", type: ScalarFieldTypeEnum.NUMBER },
        { name: "waiting_time_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "blocked_time_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "blocked_time_median", type: ScalarFieldTypeEnum.NUMBER },
        { name: "blocked_time_cv", type: ScalarFieldTypeEnum.NUMBER },
        { name: "blocked_time_std_dev", type: ScalarFieldTypeEnum.NUMBER }
    ],
    primaryKey: ["id"],
    fieldLabels: {
        'scenario_id': 'Scenario Id',
        'scenario_name': 'Scenario Name',
        'id': 'ID',
        'activity_id': 'Activity ID',
        'naactivity_nameme': 'Activity Name',
        'cycle_time_mean': 'Cycle Time Mean',
        'cycle_time_median': 'Cycle Time Median',
        'cycle_time_cv': 'Cycle Time CV',
        'cycle_time_std_dev': 'Cycle Time Std Dev',
        'service_time_mean': 'Service Time Mean',
        'service_time_median': 'Service Time Median',
        'service_time_cv': 'Service Time CV',
        'service_time_std_dev': 'Service Time Std Dev',
        'waiting_time_mean': 'Waiting Time Mean',
        'waiting_time_median': 'Waiting Time Median',
        'waiting_time_cv': 'Waiting Time CV',
        'waiting_time_std_dev': 'Waiting Time Std Dev',
        'blocked_time_mean': 'Blocked Time Mean',
        'blocked_time_median': 'Blocked Time Median',
        'blocked_time_cv': 'Blocked Time CV',
        'blocked_time_std_dev': 'Blocked Time Std Dev'
    }
};