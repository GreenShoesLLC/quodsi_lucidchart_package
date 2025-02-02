"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelSchema = void 0;
// collections/simulation_results/modelSchema.ts
const lucid_extension_sdk_1 = require("lucid-extension-sdk");
exports.ModelSchema = {
    fields: [
        { name: 'documentId', type: lucid_extension_sdk_1.ScalarFieldTypeEnum.STRING },
        { name: 'pageId', type: lucid_extension_sdk_1.ScalarFieldTypeEnum.STRING },
        { name: 'userId', type: lucid_extension_sdk_1.ScalarFieldTypeEnum.STRING }
    ],
    primaryKey: ['pageId']
};
