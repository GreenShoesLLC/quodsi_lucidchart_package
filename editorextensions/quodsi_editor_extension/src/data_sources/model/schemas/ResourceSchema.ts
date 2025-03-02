import { SchemaDefinition, ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const ResourceSchema: SchemaDefinition = {
    fields: [
        { name: "id", type: ScalarFieldTypeEnum.STRING },
        { name: "name", type: ScalarFieldTypeEnum.STRING },
        { name: "capacity", type: ScalarFieldTypeEnum.NUMBER },
        { name: "type", type: ScalarFieldTypeEnum.STRING }
    ],
    primaryKey: ["id"],
    fieldLabels: {
        id: "ID",
        name: "Name", 
        capacity: "Capacity",
        type: "Type"
    }
};