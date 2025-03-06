import { SchemaDefinition, ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const ModelDefinitionSchema: SchemaDefinition = {
    fields: [
        { name: "id", type: ScalarFieldTypeEnum.STRING },
        { name: "documentId", type: ScalarFieldTypeEnum.STRING },
        { name: "pageId", type: ScalarFieldTypeEnum.STRING },
        { name: "name", type: ScalarFieldTypeEnum.STRING },
        { name: "createdAt", type: ScalarFieldTypeEnum.STRING },
        { name: "updatedAt", type: ScalarFieldTypeEnum.STRING },
        { name: "version", type: ScalarFieldTypeEnum.STRING }
    ],
    primaryKey: ["id"],
    fieldLabels: {
        id: "ID",
        documentId: "Document ID",
        pageId: "Page ID",
        name: "Model Name",
        createdAt: "Created At",
        updatedAt: "Updated At",
        version: "Version"
    }
};