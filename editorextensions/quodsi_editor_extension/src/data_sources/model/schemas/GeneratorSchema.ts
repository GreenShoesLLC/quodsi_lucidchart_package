import { SchemaDefinition, ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const GeneratorSchema: SchemaDefinition = {
    fields: [
        { name: "id", type: ScalarFieldTypeEnum.STRING },
        { name: "name", type: ScalarFieldTypeEnum.STRING },
        { name: "activityKeyId", type: ScalarFieldTypeEnum.STRING },
        { name: "entityId", type: ScalarFieldTypeEnum.STRING },
        { name: "periodicOccurrences", type: ScalarFieldTypeEnum.NUMBER },
        { name: "periodIntervalDuration", type: ScalarFieldTypeEnum.STRING },
        { name: "entitiesPerCreation", type: ScalarFieldTypeEnum.NUMBER },
        { name: "periodicStartDuration", type: ScalarFieldTypeEnum.STRING },
        { name: "maxEntities", type: ScalarFieldTypeEnum.NUMBER },
        { name: "type", type: ScalarFieldTypeEnum.STRING }
    ],
    primaryKey: ["id"],
    fieldLabels: {
        id: "ID",
        name: "Name",
        activityKeyId: "Activity Key",
        entityId: "Entity",
        periodicOccurrences: "Periodic Occurrences",
        periodIntervalDuration: "Period Interval",
        entitiesPerCreation: "Entities Per Creation",
        periodicStartDuration: "Periodic Start Duration",
        maxEntities: "Max Entities",
        type: "Type"
    }
};