import { SchemaDefinition, ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const EntityStateRepSummarySchema: SchemaDefinition = {
    fields: [
        { name: "id", type: ScalarFieldTypeEnum.STRING }, 
        { name: "scenario_id", type: ScalarFieldTypeEnum.STRING },
        { name: "scenario_name", type: ScalarFieldTypeEnum.STRING },
        { name: "entity_id", type: ScalarFieldTypeEnum.STRING },
        { name: "entity_name", type: ScalarFieldTypeEnum.STRING },
        { name: "rep", type: ScalarFieldTypeEnum.NUMBER },
        { name: "count", type: ScalarFieldTypeEnum.NUMBER },
        { name: "avg_time_in_system", type: ScalarFieldTypeEnum.NUMBER },
        { name: "avg_time_waiting", type: ScalarFieldTypeEnum.NUMBER },
        { name: "avg_time_blocked", type: ScalarFieldTypeEnum.NUMBER },
        { name: "avg_time_in_operation", type: ScalarFieldTypeEnum.NUMBER },
        { name: "avg_time_connecting", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_waiting", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_blocked", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_operation", type: ScalarFieldTypeEnum.NUMBER },
        { name: "percent_connecting", type: ScalarFieldTypeEnum.NUMBER }
    ],
    primaryKey: ["id"],
    fieldLabels: {
        'id': 'ID',
        'scenario_id': 'Scenario Id',
        'scenario_name': 'Scenario Name',
        'entity_id' : 'Entity Id',
        'entity_name': 'Entity Name',
        'rep': 'Replication',
        'count': 'Count',
        'avg_time_in_system': 'Avg Time in System',
        'avg_time_waiting': 'Avg Time Waiting',
        'avg_time_blocked': 'Avg Time Blocked',
        'avg_time_in_operation': 'Avg Time in Operation',
        'avg_time_connecting': 'Avg Time Connecting',
        'percent_waiting': 'Percent Waiting',
        'percent_blocked': 'Percent Blocked',
        'percent_operation': 'Percent Operation',
        'percent_connecting': 'Percent Connecting'
    }
};