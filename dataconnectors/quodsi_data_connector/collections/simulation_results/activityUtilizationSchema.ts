// schemas/activityUtilization.ts
import { SchemaDefinition, ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const ActivityUtilizationSchema: SchemaDefinition = {
    fields: [
        { name: "Id", type: ScalarFieldTypeEnum.STRING },
        { name: "Name", type: ScalarFieldTypeEnum.STRING },
        { name: "utilization_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "utilization_max", type: ScalarFieldTypeEnum.NUMBER },
        { name: "utilization_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "capacity_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "capacity_max", type: ScalarFieldTypeEnum.NUMBER },
        { name: "capacity_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "contents_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "contents_max", type: ScalarFieldTypeEnum.NUMBER },
        { name: "contents_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "queue_length_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "queue_length_max", type: ScalarFieldTypeEnum.NUMBER },
        { name: "queue_length_std_dev", type: ScalarFieldTypeEnum.NUMBER }
    ],
    primaryKey: ["Id"],
    fieldLabels: {
        'Id': 'ID',
        'Name': 'Activity Name',
        'utilization_mean': 'Mean Utilization',
        'utilization_max': 'Max Utilization',
        'utilization_std_dev': 'Utilization Std Dev',
        'capacity_mean': 'Mean Capacity',
        'capacity_max': 'Max Capacity',
        'capacity_std_dev': 'Capacity Std Dev',
        'contents_mean': 'Mean Contents',
        'contents_max': 'Max Contents',
        'contents_std_dev': 'Contents Std Dev',
        'queue_length_mean': 'Mean Queue Length',
        'queue_length_max': 'Max Queue Length',
        'queue_length_std_dev': 'Queue Length Std Dev'
    }
};