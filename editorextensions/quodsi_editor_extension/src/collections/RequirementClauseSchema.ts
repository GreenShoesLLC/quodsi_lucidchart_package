import { SchemaDefinition, ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const RequirementClauseSchema: SchemaDefinition = {
    fields: [
        { name: "id", type: ScalarFieldTypeEnum.STRING },
        { name: "mode", type: ScalarFieldTypeEnum.STRING },
        { name: "parentClauseId", type: ScalarFieldTypeEnum.STRING },
        { name: "requirementId", type: ScalarFieldTypeEnum.STRING }  // Foreign key to ResourceRequirement
    ],
    primaryKey: ["id"],
    fieldLabels: {
        id: "ID",
        mode: "Mode",
        parentClauseId: "Parent Clause",
        requirementId: "Resource Requirement"
    }
};