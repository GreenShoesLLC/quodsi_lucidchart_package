import { SchemaDefinition, ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const ActivitySchema: SchemaDefinition = {
    fields: [
        { name: "id", type: ScalarFieldTypeEnum.STRING },
        { name: "name", type: ScalarFieldTypeEnum.STRING },
        { name: "capacity", type: ScalarFieldTypeEnum.NUMBER },
        { name: "inboundQueueCapacity", type: ScalarFieldTypeEnum.NUMBER },
        { name: "outboundQueueCapacity", type: ScalarFieldTypeEnum.NUMBER },
        { name: "type", type: ScalarFieldTypeEnum.STRING }
    ],
    primaryKey: ["id"],
    fieldLabels: {
        id: "ID",
        name: "Name",
        capacity: "Capacity",
        inboundQueueCapacity: "Inbound Queue Capacity",
        outboundQueueCapacity: "Outbound Queue Capacity",
        type: "Type"
    }
};