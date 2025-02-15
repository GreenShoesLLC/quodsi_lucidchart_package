// collections/simulation_results/modelSchema.ts
import { ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const ModelSchema = {
    fields: [
        { name: 'documentId', type: ScalarFieldTypeEnum.STRING },
        { name: 'pageId', type: ScalarFieldTypeEnum.STRING },
        { name: 'userId', type: ScalarFieldTypeEnum.STRING }
    ],
    primaryKey: ['pageId']
};