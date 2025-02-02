"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceUtilizationSchema = void 0;
// schemas/resourceUtilization.ts
const lucid_extension_sdk_1 = require("lucid-extension-sdk");
exports.ResourceUtilizationSchema = {
    fields: [
        { name: "Id", type: lucid_extension_sdk_1.ScalarFieldTypeEnum.STRING },
        { name: "Name", type: lucid_extension_sdk_1.ScalarFieldTypeEnum.STRING },
        { name: "utilization_rate_mean", type: lucid_extension_sdk_1.ScalarFieldTypeEnum.NUMBER },
        { name: "utilization_rate_max", type: lucid_extension_sdk_1.ScalarFieldTypeEnum.NUMBER },
        { name: "utilization_rate_std_dev", type: lucid_extension_sdk_1.ScalarFieldTypeEnum.NUMBER },
        { name: "contents_mean", type: lucid_extension_sdk_1.ScalarFieldTypeEnum.NUMBER },
        { name: "contents_max", type: lucid_extension_sdk_1.ScalarFieldTypeEnum.NUMBER },
        { name: "contents_std_dev", type: lucid_extension_sdk_1.ScalarFieldTypeEnum.NUMBER }
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
