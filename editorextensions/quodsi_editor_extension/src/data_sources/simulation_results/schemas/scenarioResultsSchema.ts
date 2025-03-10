import { SchemaDefinition, ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const ScenarioResultsSchema: SchemaDefinition = {
    fields: [
        { name: "id", type: ScalarFieldTypeEnum.STRING }
    ],
    primaryKey: ["id"],
    fieldLabels: {
        id: "ID"
    }
};