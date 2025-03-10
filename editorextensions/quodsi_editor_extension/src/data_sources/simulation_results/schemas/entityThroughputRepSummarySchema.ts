import { SchemaDefinition, ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const EntityThroughputRepSummarySchema: SchemaDefinition = {
    fields: [
        { name: "id", type: ScalarFieldTypeEnum.STRING },
        { name: "scenario_id", type: ScalarFieldTypeEnum.STRING },
        { name: "scenario_name", type: ScalarFieldTypeEnum.STRING },
        { name: "entity_id", type: ScalarFieldTypeEnum.STRING },
        { name: "entity_name", type: ScalarFieldTypeEnum.STRING },
        { name: "rep", type: ScalarFieldTypeEnum.NUMBER },
        { name: "count", type: ScalarFieldTypeEnum.NUMBER },
        { name: "completed_count", type: ScalarFieldTypeEnum.NUMBER },
        { name: "in_progress_count", type: ScalarFieldTypeEnum.NUMBER },
        { name: "throughput_rate", type: ScalarFieldTypeEnum.NUMBER }
    ],
    primaryKey: ["id"],
    fieldLabels: {
        'id': 'ID',
        'scenario_id': 'Scenario Id',
        'scenario_name': 'Scenario Name',
        'entity_id': 'Entity Id',
        'entity_name': 'Entity Name',
        'rep': 'Replication',
        'count': 'Count',
        'completed_count': 'Completed Count',
        'in_progress_count': 'In Progress Count',
        'throughput_rate': 'Throughput Rate'
    }
};