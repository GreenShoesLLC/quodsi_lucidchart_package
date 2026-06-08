// Platform and core exports
export * from './platform';
export * from './core/logging/QuodsiLogger';
export * from './core/logging/ComponentLogger';

// Constants
export * from './constants/limits';
export * from './constants/version';
export * from './constants/branding';

// Type exports
export * from './types/ActivityRelationships';
export * from './types/BlockAnalysis';
export * from './types/common';
export * from './types/ConversionPreview';
export * from './types/ConversionResult';
export * from './types/EditorReferenceData';
export * from './types/ModelItemData';

export * from './types/PageStatus';
export * from './types/ProcessAnalysisResult';
export * from './types/SelectionState';
export * from './types/SelectionType';
export * from './types/simComponentType';
export * from './types/ElementTypeInfo';

// Element types — sourced from monorepo core (Phase 3 slice 2)
export { RunState } from '@quodsi/shared';
export * from './types/DiagramElementType';
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

// Element types — DEFERRED (stay in lucid)
export * from './types/elements/ModelDefinitionLogger';

// State management types — already covered in named block above

// Action system types (replaces OperationStep)
export * from './types/elements/actions';

// Distribution types
export * from './types/elements/distributions';

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

// Export accordion types
export * from './types/accordion/ModelElement';
export * from './types/accordion/ModelStructure';
export * from './types/accordion/ValidationState';

// Swimlane types
export {
  SwimLaneResourceData,
  SwimLaneLaneMapping,
  SwimLaneQuodsiData,
  SwimLaneContainment,
} from './types/swimlane/SwimLaneQuodsiData';

// Service exports
export * from './services/lucidApi';
export * from './utils/csvUtils';
export * from './utils/uuidUtils';
export * from './utils/NameParser';
export * from './utils/nameUtils';
export * from './utils/nameValidation';
export * from './utils/scenarioUtils';

// Serialization exports
export * from './serialization';

// Validation exports
export * from './validation';
export * from './versioning';

// DevTools types
export * from './types/devtools/DevToolsTypes';

// New Quodsi Messaging Protocol
export * from './quodsi-messaging';

// Embed utilities
export * from './embed/reduceModelToCatalog';

// Config / feature flags
export * from './config/modalSize';
