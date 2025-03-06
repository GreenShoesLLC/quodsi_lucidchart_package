// Export all schema definitions
export { ActivitySchema } from './ActivitySchema';
export { ConnectorSchema } from './ConnectorSchema';
export { EntitySchema } from './EntitySchema';
export { GeneratorSchema } from './GeneratorSchema';
export { ModelSchema } from './ModelSchema';
export { ModelDefinitionSchema } from './ModelDefinitionSchema';
export { OperationStepSchema } from './OperationStepSchema';
export { RequirementClauseSchema } from './RequirementClauseSchema';
export { ResourceRequestSchema } from './ResourceRequestSchema';
export { ResourceRequirementSchema } from './ResourceRequirementSchema';
export { ResourceSchema } from './ResourceSchema';

// Export collection names as a constant for use in both ModelDataSource and ModelReader
export const MODEL_COLLECTIONS = {
    MODEL: "model",
    ACTIVITIES: "activities",
    RESOURCES: "resources",
    ENTITIES: "entities", 
    GENERATORS: "generators",
    CONNECTORS: "connectors",
    OPERATION_STEPS: "operationSteps",
    RESOURCE_REQUIREMENTS: "resourceRequirements",
    REQUIREMENT_CLAUSES: "requirementClauses",
    RESOURCE_REQUESTS: "resourceRequests"
} as const;
