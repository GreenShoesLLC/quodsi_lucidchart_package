// schemas/entityThroughputRepSummary.ts
import { SchemaDefinition, ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const EntityThroughputRepSummarySchema: SchemaDefinition = {
    fields: [
        { name: "rep", type: ScalarFieldTypeEnum.NUMBER },
        { name: "entity_type", type: ScalarFieldTypeEnum.STRING },
        { name: "count", type: ScalarFieldTypeEnum.NUMBER },
        { name: "completed_count", type: ScalarFieldTypeEnum.NUMBER },
        { name: "in_progress_count", type: ScalarFieldTypeEnum.NUMBER },
        { name: "first_exit", type: ScalarFieldTypeEnum.NUMBER },
        { name: "last_exit", type: ScalarFieldTypeEnum.NUMBER },
        { name: "avg_interval", type: ScalarFieldTypeEnum.NUMBER },
        { name: "min_interval", type: ScalarFieldTypeEnum.NUMBER },
        { name: "max_interval", type: ScalarFieldTypeEnum.NUMBER },
        { name: "throughput_rate", type: ScalarFieldTypeEnum.NUMBER }
    ],
    primaryKey: ["rep", "entity_type"],
    fieldLabels: {
        'rep': 'Replication',
        'entity_type': 'Entity Type',
        'count': 'Count',
        'completed_count': 'Completed Count',
        'in_progress_count': 'In Progress Count',
        'first_exit': 'First Exit',
        'last_exit': 'Last Exit',
        'avg_interval': 'Avg Interval',
        'min_interval': 'Min Interval',
        'max_interval': 'Max Interval',
        'throughput_rate': 'Throughput Rate'
    }
};