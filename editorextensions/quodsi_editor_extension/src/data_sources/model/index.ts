// Export the ModelDataSource and ModelReader classes
export { ModelDataSource } from './ModelDataSource';
export { ModelReader } from './readers/ModelReader';

// Export repositories
export { ModelDefinitionRepository } from './repositories';
export type { ModelDefinition } from './repositories';

// Export data types from ModelReader
export type {
  ModelData,
  ActivityData,
  ResourceData,
  EntityData,
  GeneratorData,
  ConnectorData,
  OperationStepData,
  ResourceRequirementData,
  RequirementClauseData,
  ResourceRequestData
} from './readers/ModelReader';

// Export schemas and collection names
export * from './schemas';