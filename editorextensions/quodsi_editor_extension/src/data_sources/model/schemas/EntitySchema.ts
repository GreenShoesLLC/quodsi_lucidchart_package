import { SchemaDefinition, ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const EntitySchema: SchemaDefinition = {
    fields: [
        { name: "id", type: ScalarFieldTypeEnum.STRING },
        { name: "name", type: ScalarFieldTypeEnum.STRING },
        { name: "type", type: ScalarFieldTypeEnum.STRING }
    ],
    primaryKey: ["id"],
    fieldLabels: {
        id: "ID",
        name: "Name",
        type: "Type"
    }
};