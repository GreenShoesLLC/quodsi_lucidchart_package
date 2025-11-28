// schemas/scenarioCrossRepSchema.ts
import { SchemaDefinition, ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const ScenarioCrossRepSchema: SchemaDefinition = {
    fields: [
        // Identifiers
        { name: "id", type: ScalarFieldTypeEnum.STRING },
        { name: "scenario_id", type: ScalarFieldTypeEnum.STRING },
        { name: "scenario_name", type: ScalarFieldTypeEnum.STRING },

        // Total Throughput metrics
        { name: "total_throughput_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_throughput_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_throughput_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_throughput_max", type: ScalarFieldTypeEnum.NUMBER },

        // Total Entities Created metrics
        { name: "total_entities_created_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_entities_created_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_entities_created_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_entities_created_max", type: ScalarFieldTypeEnum.NUMBER },

        // Entities In Progress metrics
        { name: "entities_in_progress_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "entities_in_progress_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "entities_in_progress_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "entities_in_progress_max", type: ScalarFieldTypeEnum.NUMBER },

        // Avg Cycle Time metrics
        { name: "avg_cycle_time_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "avg_cycle_time_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "avg_cycle_time_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "avg_cycle_time_max", type: ScalarFieldTypeEnum.NUMBER },

        // Avg Time In System metrics
        { name: "avg_time_in_system_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "avg_time_in_system_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "avg_time_in_system_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "avg_time_in_system_max", type: ScalarFieldTypeEnum.NUMBER },

        // Avg Entities In System metrics
        { name: "avg_entities_in_system_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "avg_entities_in_system_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "avg_entities_in_system_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "avg_entities_in_system_max", type: ScalarFieldTypeEnum.NUMBER },

        // Total Activity Cost metrics
        { name: "total_activity_cost_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_activity_cost_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_activity_cost_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_activity_cost_max", type: ScalarFieldTypeEnum.NUMBER },

        // Total Resource Cost metrics
        { name: "total_resource_cost_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_resource_cost_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_resource_cost_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_resource_cost_max", type: ScalarFieldTypeEnum.NUMBER },

        // Total Cost metrics
        { name: "total_cost_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_cost_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_cost_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "total_cost_max", type: ScalarFieldTypeEnum.NUMBER },

        // Replication count
        { name: "num_replications", type: ScalarFieldTypeEnum.NUMBER }
    ],
    primaryKey: ["id"],
    fieldLabels: {
        'id': 'ID',
        'scenario_id': 'Scenario Id',
        'scenario_name': 'Scenario Name',

        // Total Throughput metrics
        'total_throughput_mean': 'Mean Total Throughput',
        'total_throughput_std_dev': 'Total Throughput Std Dev',
        'total_throughput_min': 'Min Total Throughput',
        'total_throughput_max': 'Max Total Throughput',

        // Total Entities Created metrics
        'total_entities_created_mean': 'Mean Total Entities Created',
        'total_entities_created_std_dev': 'Total Entities Created Std Dev',
        'total_entities_created_min': 'Min Total Entities Created',
        'total_entities_created_max': 'Max Total Entities Created',

        // Entities In Progress metrics
        'entities_in_progress_mean': 'Mean Entities In Progress',
        'entities_in_progress_std_dev': 'Entities In Progress Std Dev',
        'entities_in_progress_min': 'Min Entities In Progress',
        'entities_in_progress_max': 'Max Entities In Progress',

        // Avg Cycle Time metrics
        'avg_cycle_time_mean': 'Mean Avg Cycle Time',
        'avg_cycle_time_std_dev': 'Avg Cycle Time Std Dev',
        'avg_cycle_time_min': 'Min Avg Cycle Time',
        'avg_cycle_time_max': 'Max Avg Cycle Time',

        // Avg Time In System metrics
        'avg_time_in_system_mean': 'Mean Avg Time In System',
        'avg_time_in_system_std_dev': 'Avg Time In System Std Dev',
        'avg_time_in_system_min': 'Min Avg Time In System',
        'avg_time_in_system_max': 'Max Avg Time In System',

        // Avg Entities In System metrics
        'avg_entities_in_system_mean': 'Mean Avg Entities In System',
        'avg_entities_in_system_std_dev': 'Avg Entities In System Std Dev',
        'avg_entities_in_system_min': 'Min Avg Entities In System',
        'avg_entities_in_system_max': 'Max Avg Entities In System',

        // Total Activity Cost metrics
        'total_activity_cost_mean': 'Mean Total Activity Cost',
        'total_activity_cost_std_dev': 'Total Activity Cost Std Dev',
        'total_activity_cost_min': 'Min Total Activity Cost',
        'total_activity_cost_max': 'Max Total Activity Cost',

        // Total Resource Cost metrics
        'total_resource_cost_mean': 'Mean Total Resource Cost',
        'total_resource_cost_std_dev': 'Total Resource Cost Std Dev',
        'total_resource_cost_min': 'Min Total Resource Cost',
        'total_resource_cost_max': 'Max Total Resource Cost',

        // Total Cost metrics
        'total_cost_mean': 'Mean Total Cost',
        'total_cost_std_dev': 'Total Cost Std Dev',
        'total_cost_min': 'Min Total Cost',
        'total_cost_max': 'Max Total Cost',

        // Replication count
        'num_replications': 'Number of Replications'
    }
};
