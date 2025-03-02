import { SchemaDefinition, ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const OperationStepSchema: SchemaDefinition = {
    fields: [
        { name: "id", type: ScalarFieldTypeEnum.STRING },
        { name: "requirementId", type: ScalarFieldTypeEnum.STRING },
        { name: "quantity", type: ScalarFieldTypeEnum.NUMBER },
        { name: "duration", type: ScalarFieldTypeEnum.STRING },
        { name: "activityId", type: ScalarFieldTypeEnum.STRING }
    ],
    primaryKey: ["id"],
    fieldLabels: {
        id: "ID",
        requirementId: "Requirement",
        quantity: "Quantity", 
        duration: "Duration",
        activityId: "Activity"
    }
};