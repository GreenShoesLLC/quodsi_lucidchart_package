import { DataProxy, JsonSerializable } from "lucid-extension-sdk";
import { QuodsiLogger } from "@quodsi/shared";
export declare const MODEL_COLLECTIONS: {
    readonly MODEL: "model";
    readonly ACTIVITIES: "activities";
    readonly RESOURCES: "resources";
    readonly ENTITIES: "entities";
    readonly GENERATORS: "generators";
    readonly CONNECTORS: "connectors";
    readonly OPERATION_STEPS: "operationSteps";
    readonly RESOURCE_REQUIREMENTS: "resourceRequirements";
    readonly REQUIREMENT_CLAUSES: "requirementClauses";
    readonly RESOURCE_REQUESTS: "resourceRequests";
};
interface CollectionIds {
    [key: string]: string;
}
export declare class ModelDataSource extends QuodsiLogger {
    private data;
    protected readonly LOG_PREFIX = "[ModelDataSource]";
    private collectionIds;
    constructor(data: DataProxy);
    createModelDataSource(modelId: string, config?: {
        [key: string]: JsonSerializable;
    }): {
        source: import("lucid-extension-sdk").DataSourceProxy;
        collectionIds: CollectionIds;
    } | null;
    getModelDataSource(modelId: string): import("lucid-extension-sdk").DataSourceProxy;
    getCollectionId(collectionName: string): string;
}
export {};
//# sourceMappingURL=ModelDataSource.d.ts.map