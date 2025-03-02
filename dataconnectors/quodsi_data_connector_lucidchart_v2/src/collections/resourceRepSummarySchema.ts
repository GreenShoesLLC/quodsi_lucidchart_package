// schemas/resourceRepSummary.ts
import { SchemaDefinition, ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const ResourceRepSummarySchema: SchemaDefinition = {
    fields: [
        { name: "rep", type: ScalarFieldTypeEnum.NUMBER },
        { name: "resource_id", type: ScalarFieldTypeEnum.STRING },
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
    primaryKey: ["rep", "resource_id"],
    fieldLabels: {
        'rep': 'Replication',
        'resource_id': 'Resource ID',
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