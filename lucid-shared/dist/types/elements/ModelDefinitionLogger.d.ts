import { ModelDefinition } from "./ModelDefinition";
import { QuodsiLogger } from "../../core/logging/QuodsiLogger";
export declare class ModelDefinitionLogger extends QuodsiLogger {
    protected readonly LOG_PREFIX = "[ModelDefinitionLogger]";
    static logModelDefinition(modelDefinition: ModelDefinition): void;
    private logDefinition;
    private logActivities;
    private logConnectors;
    private logResources;
    private logResourceRequirements;
    private logGenerators;
    private logEntities;
    private safeExecute;
    private logActivity;
    private logConnector;
    private logResource;
    private logResourceRequirement;
    private logGenerator;
    private logEntity;
}
//# sourceMappingURL=ModelDefinitionLogger.d.ts.map