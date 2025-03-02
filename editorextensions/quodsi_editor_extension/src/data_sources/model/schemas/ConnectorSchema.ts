import { SchemaDefinition, ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const ConnectorSchema: SchemaDefinition = {
    fields: [
        { name: "id", type: ScalarFieldTypeEnum.STRING },
        { name: "name", type: ScalarFieldTypeEnum.STRING },
        { name: "sourceId", type: ScalarFieldTypeEnum.STRING },
        { name: "targetId", type: ScalarFieldTypeEnum.STRING },
        { name: "probability", type: ScalarFieldTypeEnum.NUMBER },
        { name: "connectType", type: ScalarFieldTypeEnum.STRING },
        { name: "type", type: ScalarFieldTypeEnum.STRING }
    ],
    primaryKey: ["id"],
    fieldLabels: {
        id: "ID",
        name: "Name",
        sourceId: "Source",
        targetId: "Target",
        probability: "Probability",
        connectType: "Connection Type",
        type: "Type"
    }
};