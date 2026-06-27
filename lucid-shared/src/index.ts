// Platform and core exports
export * from './platform';
export * from './core/logging/QuodsiLogger';
export * from './core/logging/ComponentLogger';

// Constants
export { QUODSI_VERSION, QUODSIM_VERSION, EXPECTED_OUTPUT_SCHEMA_VERSION, parseVersion, compareVersions, isValidVersion } from '@quodsi/shared';
export type { VersionInfo } from '@quodsi/shared';
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

// State management types — already covered in named block above

// Action system types — now sourced from the core (Phase 3 slice 4)
export {
  ActionType,
  Action,
  AssignAction,
  SeizeAction,
  ReleaseAction,
  DelayAction,
  DelayWithResourceAction,
  SplitAction,
  CreateAction,
  DisposeAction,
  JoinAction,
  LoopAction,
  BranchAction,
  createDefaultAction,
  createAssignAction,
  createSeizeAction,
  createReleaseAction,
  createDelayAction,
  createDelayWithResourceAction,
  createSplitAction,
  createCreateAction,
  createDisposeAction,
  createJoinAction,
  createLoopAction,
  createBranchAction,
  isAssignAction,
  isSeizeAction,
  isReleaseAction,
  isDelayAction,
  isDelayWithResourceAction,
  isSplitAction,
  isCreateAction,
  isDisposeAction,
  isJoinAction,
  isLoopAction,
  isBranchAction,
} from '@quodsi/shared';

// Distribution types — now sourced from the core (Phase 3 slice 4)
export type {
  ParameterMetadata,
  BernoulliParameters,
  BetaParameters,
  BinomialParameters,
  ChiSquareParameters,
  ConstantParameters,
  DiscreteParameters,
  ExponentialParameters,
  FDistributionParameters,
  GammaParameters,
  GeometricParameters,
  HypergeometricParameters,
  LaplaceParameters,
  LogisticParameters,
  LognormalParameters,
  LogSeriesParameters,
  MultinomialParameters,
  NegativeBinomialParameters,
  NormalParameters,
  ParetoParameters,
  PoissonParameters,
  RayleighParameters,
  TDistributionParameters,
  TriangularParameters,
  UniformParameters,
  VonMisesParameters,
  WaldParameters,
  WeibullParameters,
  ZipfParameters,
} from '@quodsi/shared';
export {
  BernoulliDistribution,
  DEFAULT_BERNOULLI_PARAMETERS,
  BERNOULLI_PARAMETER_METADATA,
  BetaDistribution,
  DEFAULT_BETA_PARAMETERS,
  BETA_PARAMETER_METADATA,
  BinomialDistribution,
  DEFAULT_BINOMIAL_PARAMETERS,
  BINOMIAL_PARAMETER_METADATA,
  ChiSquareDistribution,
  DEFAULT_CHI_SQUARE_PARAMETERS,
  CHI_SQUARE_PARAMETER_METADATA,
  ConstantDistribution,
  DEFAULT_CONSTANT_PARAMETERS,
  CONSTANT_PARAMETER_METADATA,
  DiscreteDistribution,
  DEFAULT_DISCRETE_PARAMETERS,
  DISCRETE_PARAMETER_METADATA,
  ExponentialDistribution,
  DEFAULT_EXPONENTIAL_PARAMETERS,
  EXPONENTIAL_PARAMETER_METADATA,
  FDistribution,
  DEFAULT_F_DISTRIBUTION_PARAMETERS,
  F_DISTRIBUTION_PARAMETER_METADATA,
  GammaDistribution,
  DEFAULT_GAMMA_PARAMETERS,
  GAMMA_PARAMETER_METADATA,
  GeometricDistribution,
  DEFAULT_GEOMETRIC_PARAMETERS,
  GEOMETRIC_PARAMETER_METADATA,
  HypergeometricDistribution,
  DEFAULT_HYPERGEOMETRIC_PARAMETERS,
  HYPERGEOMETRIC_PARAMETER_METADATA,
  LaplaceDistribution,
  DEFAULT_LAPLACE_PARAMETERS,
  LAPLACE_PARAMETER_METADATA,
  LogisticDistribution,
  DEFAULT_LOGISTIC_PARAMETERS,
  LOGISTIC_PARAMETER_METADATA,
  LognormalDistribution,
  DEFAULT_LOGNORMAL_PARAMETERS,
  LOGNORMAL_PARAMETER_METADATA,
  LogSeriesDistribution,
  DEFAULT_LOG_SERIES_PARAMETERS,
  LOG_SERIES_PARAMETER_METADATA,
  MultinomialDistribution,
  DEFAULT_MULTINOMIAL_PARAMETERS,
  MULTINOMIAL_PARAMETER_METADATA,
  NegativeBinomialDistribution,
  DEFAULT_NEGATIVE_BINOMIAL_PARAMETERS,
  NEGATIVE_BINOMIAL_PARAMETER_METADATA,
  NormalDistribution,
  DEFAULT_NORMAL_PARAMETERS,
  NORMAL_PARAMETER_METADATA,
  ParetoDistribution,
  DEFAULT_PARETO_PARAMETERS,
  PARETO_PARAMETER_METADATA,
  PoissonDistribution,
  DEFAULT_POISSON_PARAMETERS,
  POISSON_PARAMETER_METADATA,
  RayleighDistribution,
  DEFAULT_RAYLEIGH_PARAMETERS,
  RAYLEIGH_PARAMETER_METADATA,
  TDistribution,
  DEFAULT_T_DISTRIBUTION_PARAMETERS,
  T_DISTRIBUTION_PARAMETER_METADATA,
  TriangularDistribution,
  DEFAULT_TRIANGULAR_PARAMETERS,
  TRIANGULAR_PARAMETER_METADATA,
  UniformDistribution,
  DEFAULT_UNIFORM_PARAMETERS,
  UNIFORM_PARAMETER_METADATA,
  VonMisesDistribution,
  DEFAULT_VON_MISES_PARAMETERS,
  VON_MISES_PARAMETER_METADATA,
  WaldDistribution,
  DEFAULT_WALD_PARAMETERS,
  WALD_PARAMETER_METADATA,
  WeibullDistribution,
  DEFAULT_WEIBULL_PARAMETERS,
  WEIBULL_PARAMETER_METADATA,
  ZipfDistribution,
  DEFAULT_ZIPF_PARAMETERS,
  ZIPF_PARAMETER_METADATA,
  createDefaultDistribution,
  getDistributionEffectiveValue,
  validateDistributionParameters,
  distributionTypeToBackendString,
  backendStringToDistributionType,
  CORE_NUMERIC_DISTRIBUTIONS,
  isCoreNumericDistribution,
} from '@quodsi/shared';

// Scenario levers (Phase 1 authoring) — re-exported from @quodsi/shared.
// NOTE: ScenarioObjectType is already re-exported in the element-types block above.
export {
  createScenarioLever,
  defaultRangeForProperty,
  isRangeableProperty,
  isRateScaleProperty,
  isLeverableProperty,
  enumerateLeverValues,
  PROPERTY_DISPLAY_LABELS,
  NUMERIC_PROPERTIES_BY_OBJECT_TYPE,
  PROPERTIES_BY_OBJECT_TYPE,
  ScenarioPropertyName,
  leverFor,
  toggleLever,
  patchLever,
  patchRange,
  actionDurationLeverLabel,
  leverForAction,
  toggleActionLever,
  patchActionLever,
  patchActionRange,
} from '@quodsi/shared';
export type { ScenarioLever, LeverRange } from '@quodsi/shared';

// Scenario cluster — now sourced from the core (Phase 3 slice 3)
export {
  DomainModel as Model,
} from '@quodsi/shared';
export {
  DomainScenario as Scenario,
  LEGACY_BASELINE_SCENARIO_ID,
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
export { generateUUID } from '@quodsi/shared';
export * from './utils/NameParser';
export * from './utils/nameUtils';
export * from './utils/nameValidation';
export * from './utils/resolveModelName';
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
export * from './embed/buildRelayConnectors';

// Config / feature flags
export * from './config/modalSize';
