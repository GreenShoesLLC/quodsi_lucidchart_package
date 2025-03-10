// schemas/resourceRepSummary.ts
import { SchemaDefinition, ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const ResourceRepSummarySchema: SchemaDefinition = {
    fields: [
        { name: "scenario_id", type: ScalarFieldTypeEnum.STRING },
        { name: "scenario_name", type: ScalarFieldTypeEnum.STRING },
        { name: "id", type: ScalarFieldTypeEnum.STRING }, 
        { name: "resource_id", type: ScalarFieldTypeEnum.STRING },
        { name: "resource_name", type: ScalarFieldTypeEnum.STRING },
        { name: "rep", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_requests", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_captures", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_releases", type: ScalarFieldTypeEnum.NUMBER },
        { name: "avg_capture_time", type: ScalarFieldTypeEnum.NUMBER },
        { name: "utilization_rate", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_time_waiting", type: ScalarFieldTypeEnum.NUMBER },
        { name: "avg_queue_time", type: ScalarFieldTypeEnum.NUMBER },
        { name: "max_queue_length", type: ScalarFieldTypeEnum.NUMBER },
        { name: "avg_contents", type: ScalarFieldTypeEnum.NUMBER }
    ],
    primaryKey: ["id"],
    fieldLabels: {
        'scenario_id': 'Scenario Id',
        'scenario_name': 'Scenario Name',
        'id': 'ID', 
        'resource_id': 'Resource ID',
        'resource_name': 'Resource Name',
        'rep': 'Replication',
        'total_requests': 'Total Requests',
        'total_captures': 'Total Captures',
        'total_releases': 'Total Releases',
        'avg_capture_time': 'Avg Capture Time',
        'utilization_rate': 'Utilization Rate',
        'total_time_waiting': 'Total Time Waiting',
        'avg_queue_time': 'Avg Queue Time',
        'max_queue_length': 'Max Queue Length',
        'avg_contents': 'Avg Contents'
    }
};