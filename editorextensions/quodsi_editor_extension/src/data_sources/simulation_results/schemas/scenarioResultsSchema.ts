// src/data_sources/simulation_results/schemas/scenarioResultsSchema.ts
import { SchemaDefinition, ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const ScenarioResultsSchema: SchemaDefinition = {
    fields: [
        { name: "id", type: ScalarFieldTypeEnum.STRING },
        { name: "documentId", type: ScalarFieldTypeEnum.STRING },
        { name: "pageId", type: ScalarFieldTypeEnum.STRING },
        { name: "scenarioId", type: ScalarFieldTypeEnum.STRING },
        { name: "modelId", type: ScalarFieldTypeEnum.STRING },
        { name: "name", type: ScalarFieldTypeEnum.STRING },
        { name: "state", type: ScalarFieldTypeEnum.STRING },
        { name: "createdAt", type: ScalarFieldTypeEnum.STRING },
        { name: "updatedAt", type: ScalarFieldTypeEnum.STRING },
        { name: "completedAt", type: ScalarFieldTypeEnum.STRING },
        { name: "blobPath", type: ScalarFieldTypeEnum.STRING },
        { name: "userId", type: ScalarFieldTypeEnum.STRING }
    ],
    primaryKey: ["id"],
    fieldLabels: {
        id: "ID",
        documentId: "Document ID",
        pageId: "Page ID",
        scenarioId: "Scenario ID",
        modelId: "Model ID",
        name: "Scenario Name",
        state: "Status",
        createdAt: "Created At",
        updatedAt: "Last Updated",
        completedAt: "Completed At",
        blobPath: "Results Location",
        userId: "User ID"
    }
};
