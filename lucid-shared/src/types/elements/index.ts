// Export element-specific types
export { RunState } from '@quodsi/shared';

// types/elements now sourced from the monorepo core (Phase 3 slice 2)
export {
  Activity,
  ActivityFinancialProperties,
  ActivityListManager,
  BooleanPropertyModification,
  ComponentListManager,
  ComponentType,
  ConnectType,
  ConnectTypeUtils,
  Connector,
  ConnectorListManager,
  Distribution,
  DistributionParameters,
  DistributionType,
  Duration,
  DurationType,
  Entity,
  EntityListManager,
  EntitySourceConfig,
  FailureClockMode,
  FailureProperties,
  FlowNode,
  Generator,
  GeneratorListManager,
  ModelDefaults,
  ModelDefinition,
  NumericPropertyModification,
  PeriodUnit,
  PositionedSimulationObject,
  RequirementClause,
  RequirementMode,
  Resource,
  ResourceFinancialProperties,
  ResourceListManager,
  ResourceRequest,
  ResourceRequirement,
  ResourceRequirementListManager,
  ScenarioListManager,
  ScenarioObjectType,
  SimulationObject,
  SimulationObjectType,
  SimulationTimeType,
  State,
  StateComparison,
  StateCondition,
  StateListManager,
  StateModification,
  StateOperation,
  StateType,
  TimeDistributedConfig,
  TimeDistributedConfigListManager,
  TimePattern,
  TimePatternListManager,
  applyOperation,
  createAssignModification,
  createBooleanState,
  createCategoryState,
  createDefaultEntitySourceConfig,
  createEqualCondition,
  createGreaterEqualCondition,
  createGreaterThanCondition,
  createIncrementModification,
  createLessEqualCondition,
  createLessThanCondition,
  createModelCounterIncrement,
  createNumberState,
  createSampleModification,
  createStringState,
  createTimeDistributedEntitySourceConfig,
  evaluateComparison,
  getComparisonDescription,
  getComparisonSymbol,
  getDistributionDisplayName,
  getOperationDescription,
  getOperationSymbol,
  getScalingPattern,
  getSupportedComparisonsForType,
  getSupportedOperations,
  getSupportedOperationsForType,
  getTypicalUseCases,
  isArithmeticOperation,
  isArithmeticSupported,
  isDistributionTypeSupported,
  isNumericComparison,
  validateComparisonForType,
  validateOperationForType,
  validateValueType,
} from '@quodsi/shared';

export { GeneratorType } from '@quodsi/shared';
export { VolumePeriodBasis } from '@quodsi/shared';
export { SimulationRun } from '@quodsi/shared';

// DEFERRED — stay in lucid
export * from './ModelUtils';
export * from './ModelDefinitionLogger';

// Export distributions
export * from './distributions';

// Scenario cluster — now sourced from the core (Phase 3 slice 3)
export {
  DomainModel as Model,
} from '@quodsi/shared';
export {
  DomainScenario as Scenario,
  LEGACY_BASELINE_SCENARIO_ID,
  ScenarioChangeRequest,
  ObjectMatchCriteria,
  summarizeChangeRequest,
  DurationModification,
  DurationModificationMode,
  SerializedDuration,
  ResourceRequirementModification,
  ScenarioPropertyName,
  PROPERTIES_BY_OBJECT_TYPE,
  PROPERTY_DISPLAY_LABELS,
  NUMERIC_PROPERTIES_BY_OBJECT_TYPE,
  ScenarioSetterType,
} from '@quodsi/shared';
export type {
  ModificationType,
  ModificationDetails,
} from '@quodsi/shared';

// Export action system
export * from './actions';
