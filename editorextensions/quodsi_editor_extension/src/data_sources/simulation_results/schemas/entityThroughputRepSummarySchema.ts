import { SchemaDefinition, ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const EntityThroughputRepSummarySchema: SchemaDefinition = {
    fields: [
        { name: "id", type: ScalarFieldTypeEnum.STRING }, // Add this new field
        { name: "rep", type: ScalarFieldTypeEnum.NUMBER },
        { name: "entity_type", type: ScalarFieldTypeEnum.STRING },
        { name: "count", type: ScalarFieldTypeEnum.NUMBER },
        { name: "completed_count", type: ScalarFieldTypeEnum.NUMBER },
        { name: "in_progress_count", type: ScalarFieldTypeEnum.NUMBER },
        { name: "throughput_rate", type: ScalarFieldTypeEnum.NUMBER }
    ],
    primaryKey: ["id"], // Use just the single field as primary key
    fieldLabels: {
        'id': 'ID', // Add a label for the new field
        'rep': 'Replication',
        'entity_type': 'Entity Type',
        'count': 'Count',
        'completed_count': 'Completed Count',
        'in_progress_count': 'In Progress Count',
        'throughput_rate': 'Throughput Rate'
    }
};