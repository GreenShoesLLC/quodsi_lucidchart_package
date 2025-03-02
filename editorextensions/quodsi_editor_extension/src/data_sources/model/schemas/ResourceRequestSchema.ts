import { SchemaDefinition, ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const ResourceRequestSchema: SchemaDefinition = {
    fields: [
        { name: "id", type: ScalarFieldTypeEnum.STRING },
        { name: "resourceId", type: ScalarFieldTypeEnum.STRING },
        { name: "quantity", type: ScalarFieldTypeEnum.NUMBER },
        { name: "priority", type: ScalarFieldTypeEnum.NUMBER },
        { name: "keepResource", type: ScalarFieldTypeEnum.BOOLEAN },
        { name: "clauseId", type: ScalarFieldTypeEnum.STRING }  // Foreign key to RequirementClause
    ],
    primaryKey: ["id"],
    fieldLabels: {
        id: "ID",
        resourceId: "Resource",
        quantity: "Quantity",
        priority: "Priority",
        keepResource: "Keep Resource",
        clauseId: "Requirement Clause"
    }
};