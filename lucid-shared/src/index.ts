// Platform and core exports
export * from './platform';
export * from './core/logging/QuodsiLogger';
export * from './core/logging/ComponentLogger';

// Constants
export { MODEL_SCHEMA_VERSION, ENGINE_VERSION, EXPECTED_OUTPUT_SCHEMA_VERSION, parseVersion, compareVersions, isValidVersion } from '@quodsi/shared';
export { configureLogger, getLogger, consoleSink, installDebugGlobal, resetLoggerForTests } from '@quodsi/shared';
export type { LogLevel, Logger, LogRecord, Sink, LoggerConfig } from '@quodsi/shared';
export { LUCID_MIN_MODEL_SCHEMA_VERSION, assertPackagedSchemaVersion } from './constants/schemaFloor';
export type { VersionInfo } from '@quodsi/shared';
export * from './constants/branding';
export * from './constants/clearedFields';

// Type exports
export * from './types/ActivityRelationships';
export * from './types/BlockAnalysis';
export * from './types/common';
export * from './types/ConversionPreview';
export * from './types/ConversionResult';
export * from './types/EditorReferenceData';
export * from './types/ModelItemData';
export * from './types/ModelRootProjection';

export * from './types/PageStatus';
export * from './types/ProcessAnalysisResult';
export * from './types/SelectionState';
export * from './types/SelectionType';
export * from './types/simComponentType';
export * from './types/ElementTypeInfo';
export * from './types/StoredResourceRecord';

// Element types — sourced from monorepo core (Phase 3 slice 2)
export { RunState } from '@quodsi/shared';
export * from './types/DiagramElementType';
export {
  Activity,
  ActivityFinancialProperties,
  ActivityListManager,
  ArrivalPattern,
  ArrivalPatternListManager,
  ArrivalSchedule,
  ArrivalScheduleListManager,
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
  SourceConfig,
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
  SeasonMode,
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
  UnitlessSample,
  applyOperation,
  createAssignModification,
  createBooleanState,
  createCategoryState,
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
export { SimulationRun } from '@quodsi/shared';

// Calendar-window derivation. The clean wire carries ONE calendar anchor
// (`startDateTime`) plus two LENGTHS (`warmupTime`/`runTime`); the warmup and
// finish instants are arithmetic the engine redoes itself in
// `_translate_model_block`. Anything that renders or decides on those two
// instants must derive them here rather than read the host-local
// `warmupDateTime`/`finishDateTime` fields, which the serializer drops.
export { resolveCalendarWindow, isCalendarMode, warmupLengthMs, runLengthMs } from '@quodsi/shared';
export type { CalendarWindow, CalendarWindowModelLike } from '@quodsi/shared';

// The coarsest-unit inverse of the above: turn a picked date's distance from
// the anchor back into a `Duration` for the wire. Shared with Studio's
// `WarmupDateField`/Finish-date write path so both hosts turn the same pick
// into the same stored length.
export { msToCoarsestDuration } from '@quodsi/shared';

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
  ScriptAction,
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
  createScriptAction,
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

// Per-pass conversion name bookkeeping — shared by conversion and its preview
// so the mapping screen shows the names conversion will actually assign.
export { ConversionNamer } from '@quodsi/shared';

// Auto-created-resource planning ("| resource: Nurse") — re-exported from
// @quodsi/shared so every host plans the same way; only shape creation differs.
export { planAutoResources } from '@quodsi/shared';
export type {
  ActivityResourceRef,
  AutoResourcePlacement,
  AutoResourceLayout,
  PlannedAutoResource,
} from '@quodsi/shared';

// Resource claim resolution + auto-requirement reconciliation — re-exported
// from @quodsi/shared so drawio, Visio and Lucid resolve a shape/lane claim
// on a model-level Resource, and derive the implicit one-per-resource
// requirement, with ONE implementation. Lucid reaches them through
// ModelDefinitionPageBuilder (Plan 2b, storage format 2).
export { resolveResourceLinks, stripTransientResourceMarkers } from '@quodsi/shared';
export type {
  ResourceClaim,
  ResourceClaimantKind,
  ResourceLaneRef,
  ResourceLinkRejection,
  ResourceLinkResolution,
} from '@quodsi/shared';
export { deriveAutoResourceRequirements, reconcileAutoRequirements } from '@quodsi/shared';
// Validation copy for pointers resolveResourceLinks refused (dangling /
// duplicate). Not a ValidationRule -- a dangling pointer is by definition
// absent from the model, so hosts append these at model-build time. Lucid's
// ModelManager.validateModel() appends them from the page builder's
// getLastResourceLinkRejections().
export { resourceLinkIssues } from '@quodsi/shared';
export type { AutoRequirementResourceLike } from '@quodsi/shared';

// Topology classification rule — re-exported from @quodsi/shared. The SAME
// rule drawio and Visio reach through PageAnalyzer; LucidPageAnalyzer used to
// re-implement it privately.
export { classifyByTopology } from '@quodsi/shared';
export type { TopologyClass, TopologyInput } from '@quodsi/shared';

// Shape → element naming policy — re-exported from @quodsi/shared. The SAME
// policy drawio and Visio use; the extension adapts its SDK proxies to
// NameableShape (see types/nameableShape.ts) instead of forking the rules.
export {
  pickName,
  pickConnectorName,
  isDefaultLikeName,
} from '@quodsi/shared';
export type {
  NameableShape,
  NameSelectionOptions,
  ConnectorNameOptions,
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
  eligibleRankingStates,
  setRankingState,
  setRankingOrder,
  QUEUE_RANKING_COPY,
} from '@quodsi/shared';
export type { ScenarioLever, LeverRange } from '@quodsi/shared';
export type { QueueRanking, QueueRankingOrder } from '@quodsi/shared';

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
export { generateUUID } from '@quodsi/shared';
// Structured shape-name parsing — moved to @quodsi/shared (conversion/nameParser)
// so drawio and Visio can use it too; re-exported here so existing
// `@quodsi/lucid-shared` consumers keep working unchanged.
export {
  parseStructuredName,
  extractActivityFields,
  extractGeneratorFields,
  extractResourceFields,
  extractEntityFields,
  extractSimulationType,
} from '@quodsi/shared';
export type {
  ParsedNameData,
  ActivityParsedFields,
  GeneratorParsedFields,
  ResourceParsedFields,
  EntityParsedFields,
  SimulationTypeName,
} from '@quodsi/shared';
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

// State-expression operand language — parser, state-name collection, static
// type inference, arity checking. Backs the literal/expression toggle in
// StateModificationFormDialog. Re-exported (not `export *`) to keep this
// file's curated-surface convention; see quodsi_shared/src/expression for
// the implementation.
export { parseExpression, collectStateNames, inferExpressionType, findArityError, expressionHint, expressionFunctionList } from '@quodsi/shared';

// Delete-time expression-reference detection — shared by every host's States delete
// dialog (Studio, drawio, Lucid) so "references this state inside a formula" stays
// one implementation. Actual removal of direct (non-expression) references is
// Lucid-extension-side (ModelManager.cleanupStateReferences, on save), so only the
// read-only detector is re-exported here. Re-exported (not `export *`) per this
// file's curated-surface convention; see quodsi_shared/src/conversion/stateReferences.ts
// for the implementation.
export { findExpressionsReferencingState } from '@quodsi/shared';
export type { ExpressionStateReference, StateReferenceScope } from '@quodsi/shared';
