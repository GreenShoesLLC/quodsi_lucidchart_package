import { ModelDefinition } from "./ModelDefinition";
export declare class ModelDefinitionLogger {
    static log(modelDefinition: ModelDefinition): void;
    static logActivities(modelDefinition: ModelDefinition): void;
    static logConnectors(modelDefinition: ModelDefinition): void;
    static logResources(modelDefinition: ModelDefinition): void;
    static logGenerators(modelDefinition: ModelDefinition): void;
    static logEntities(modelDefinition: ModelDefinition): void;
    private static safeExecute;
    private static logActivity;
    private static logConnector;
    private static logResource;
    private static logGenerator;
    private static logEntity;
}
//# sourceMappingURL=ModelDefinitionLogger.d.ts.map