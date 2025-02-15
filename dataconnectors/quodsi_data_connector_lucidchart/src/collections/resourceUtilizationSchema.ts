// schemas/resourceUtilization.ts
import { SchemaDefinition, ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const ResourceUtilizationSchema: SchemaDefinition = {
    fields: [
        { name: "Id", type: ScalarFieldTypeEnum.STRING },
        { name: "Name", type: ScalarFieldTypeEnum.STRING },
        { name: "utilization_rate_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "utilization_rate_max", type: ScalarFieldTypeEnum.NUMBER },
        { name: "utilization_rate_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "contents_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "contents_max", type: ScalarFieldTypeEnum.NUMBER },
        { name: "contents_std_dev", type: ScalarFieldTypeEnum.NUMBER }
    ],
    primaryKey: ["Id"],
    fieldLabels: {
        'Id': 'ID',
        'Name': 'Resource Name',
        'utilization_rate_mean': 'Mean Utilization Rate',
        'utilization_rate_max': 'Max Utilization Rate',
        'utilization_rate_std_dev': 'Utilization Rate Std Dev',
        'contents_mean': 'Mean Contents',
        'contents_max': 'Max Contents',
        'contents_std_dev': 'Contents Std Dev'
    }
};