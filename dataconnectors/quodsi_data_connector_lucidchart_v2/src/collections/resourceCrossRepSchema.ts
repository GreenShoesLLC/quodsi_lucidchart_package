// schemas/resourceUtilization.ts
import { SchemaDefinition, ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const ResourceCrossRepSchema: SchemaDefinition = {
    fields: [
        { name: "id", type: ScalarFieldTypeEnum.STRING },
        { name: "scenario_id", type: ScalarFieldTypeEnum.STRING },
        { name: "scenario_name", type: ScalarFieldTypeEnum.STRING },
        { name: "resource_id", type: ScalarFieldTypeEnum.STRING },
        { name: "resource_name", type: ScalarFieldTypeEnum.STRING },
        { name: "capacity_utilization_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "capacity_utilization_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "capacity_utilization_max", type: ScalarFieldTypeEnum.NUMBER },
        { name: "capacity_utilization_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "active_time_pct_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "active_time_pct_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "active_time_pct_max", type: ScalarFieldTypeEnum.NUMBER },
        { name: "active_time_pct_std_dev", type: ScalarFieldTypeEnum.NUMBER },

        // Cost metrics
        { name: "seize_cost_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "seize_cost_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "seize_cost_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "seize_cost_max", type: ScalarFieldTypeEnum.NUMBER },
        { name: "utilization_cost_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "utilization_cost_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "utilization_cost_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "utilization_cost_max", type: ScalarFieldTypeEnum.NUMBER },
        { name: "idle_cost_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "idle_cost_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "idle_cost_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "idle_cost_max", type: ScalarFieldTypeEnum.NUMBER },
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
        'resource_id': 'Resource ID',
        'resource_name': 'Resource Name',
        'capacity_utilization_mean': 'Mean Utilization',
        'capacity_utilization_min': 'Min Utilization',
        'capacity_utilization_max': 'Max Utilization',
        'capacity_utilization_std_dev': 'Utilization Std Dev',
        'active_time_pct_mean': 'Active Time % Mean',
        'active_time_pct_min': 'Active Time % Min',
        'active_time_pct_max': 'Active Time % Max',
        'active_time_pct_std_dev': 'Active Time % Std Dev',

        // Cost metrics
        'seize_cost_mean': 'Mean Seize Cost',
        'seize_cost_std_dev': 'Seize Cost Std Dev',
        'seize_cost_min': 'Min Seize Cost',
        'seize_cost_max': 'Max Seize Cost',
        'utilization_cost_mean': 'Mean Utilization Cost',
        'utilization_cost_std_dev': 'Utilization Cost Std Dev',
        'utilization_cost_min': 'Min Utilization Cost',
        'utilization_cost_max': 'Max Utilization Cost',
        'idle_cost_mean': 'Mean Idle Cost',
        'idle_cost_std_dev': 'Idle Cost Std Dev',
        'idle_cost_min': 'Min Idle Cost',
        'idle_cost_max': 'Max Idle Cost',
        'total_cost_mean': 'Mean Total Cost',
        'total_cost_std_dev': 'Total Cost Std Dev',
        'total_cost_min': 'Min Total Cost',
        'total_cost_max': 'Max Total Cost'
    }
};