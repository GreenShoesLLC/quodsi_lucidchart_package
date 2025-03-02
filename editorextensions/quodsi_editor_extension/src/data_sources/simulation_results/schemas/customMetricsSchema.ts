// schemas/customMetrics.ts
import { SchemaDefinition, ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const CustomMetricsSchema: SchemaDefinition = {
    fields: [
        { name: "Id", type: ScalarFieldTypeEnum.STRING },
        { name: "Name", type: ScalarFieldTypeEnum.STRING },
        { name: "utilization_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "utilization_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "throughput_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "throughput_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "bottleneck_frequency", type: ScalarFieldTypeEnum.NUMBER }
    ],
    primaryKey: ["Id"],
    fieldLabels: {
        'Id': 'ID',
        'Name': 'Activity Name',
        'utilization_mean': 'Mean Utilization',
        'utilization_std_dev': 'Utilization Std Dev',
        'throughput_mean': 'Mean Throughput',
        'throughput_std_dev': 'Throughput Std Dev',
        'bottleneck_frequency': 'Bottleneck Frequency'
    }
};