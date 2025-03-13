// schemas/resourceUtilization.ts
import { SchemaDefinition, ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const ResourceUtilizationSchema: SchemaDefinition = {
    fields: [
        { name: "id", type: ScalarFieldTypeEnum.STRING },
        { name: "scenario_id", type: ScalarFieldTypeEnum.STRING },
        { name: "scenario_name", type: ScalarFieldTypeEnum.STRING },
        { name: "resource_id", type: ScalarFieldTypeEnum.STRING },
        { name: "resource_name", type: ScalarFieldTypeEnum.STRING },
        { name: "utilization_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "utilization_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "utilization_max", type: ScalarFieldTypeEnum.NUMBER },
        { name: "utilization_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "bottleneck_frequency", type: ScalarFieldTypeEnum.NUMBER }
    ],
    primaryKey: ["id"],
    fieldLabels: {
        'id': 'ID',
        'scenario_id': 'Scenario Id',
        'scenario_name': 'Scenario Name',
        'resource_id': 'Resource ID',
        'resource_name': 'Resource Name',
        'utilization_mean': 'Mean Utilization',
        'utilization_min': 'Min Utilization',
        'utilization_max': 'Max Utilization',
        'utilization_std_dev': 'Utilization Std Dev',
        'bottleneck_frequency': 'Bottleneck Frequency'
    }
};