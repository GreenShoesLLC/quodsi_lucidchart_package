import { SchemaDefinition, ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const ActivitySchema: SchemaDefinition = {
    fields: [
        { name: "id", type: ScalarFieldTypeEnum.STRING },
        { name: "name", type: ScalarFieldTypeEnum.STRING },
        { name: "capacity", type: ScalarFieldTypeEnum.NUMBER },
        { name: "inputBufferCapacity", type: ScalarFieldTypeEnum.NUMBER },
        { name: "outputBufferCapacity", type: ScalarFieldTypeEnum.NUMBER },
        { name: "type", type: ScalarFieldTypeEnum.STRING }
    ],
    primaryKey: ["id"],
    fieldLabels: {
        id: "ID",
        name: "Name",
        capacity: "Capacity", 
        inputBufferCapacity: "Input Buffer Capacity",
        outputBufferCapacity: "Output Buffer Capacity",
        type: "Type"
    }
};