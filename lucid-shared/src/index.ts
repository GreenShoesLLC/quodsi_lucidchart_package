// @quodsi/lucid-shared -- the Lucid-only layer shared by the editor extension
// and its panel. Local modules are exported whole; names from @quodsi/shared
// are re-exported by name, and only those the extension or panel actually
// import from here (trimmed 2026-09-17). A consumer may also import from
// @quodsi/shared directly -- add a re-export below only when a Lucid consumer
// needs it. Never `export *` from @quodsi/shared: its names collide with ours.

// ---------------------------------------------------------------------------
// Local modules
// ---------------------------------------------------------------------------

export * from './platform';
export * from './core/logging/QuodsiLogger';
export * from './core/logging/ComponentLogger';

export * from './types/BlockAnalysis';
export * from './types/common';
export * from './types/ConversionPreview';
export * from './types/ConversionResult';
export * from './types/DiagramElementType';
export * from './types/EditorReferenceData';
export * from './types/ElementTypeInfo';
export * from './types/ModelItemData';
export * from './types/ModelRootProjection';
export * from './types/PageStatus';
export * from './types/ProcessAnalysisResult';
export * from './types/SelectionState';
export * from './types/SelectionType';
export * from './types/StoredResourceRecord';
export * from './types/devtools/DevToolsTypes';
export {
  SwimLaneResourceData,
  SwimLaneLaneMapping,
  SwimLaneQuodsiData,
  SwimLaneContainment,
} from './types/swimlane/SwimLaneQuodsiData';

export * from './utils/nameUtils';
export * from './utils/resolveModelName';
export * from './utils/scenarioUtils';

export * from './serialization';
export * from './validation';
export * from './quodsi-messaging';
export * from './embed/buildRelayConnectors';
export * from './config/modalSize';

// ---------------------------------------------------------------------------
// Re-exports from @quodsi/shared
// ---------------------------------------------------------------------------

// Versions and logging
export { MODEL_SCHEMA_VERSION, ENGINE_VERSION } from '@quodsi/shared';
export { configureLogger, getLogger, consoleSink, installDebugGlobal, resetLoggerForTests } from '@quodsi/shared';
export type { LogLevel } from '@quodsi/shared';
export { QUODSI_ICON_BASE64 } from '@quodsi/shared';

// Domain model
export {
  Activity,
  ActivityFinancialProperties,
  ActivityListManager,
  ArrivalPattern,
  ArrivalSchedule,
  ComponentType,
  ConnectType,
  Connector,
  Duration,
  Entity,
  FailureProperties,
  Generator,
  GeneratorType,
  ModelDefaults,
  ModelDefinition,
  PeriodUnit,
  RequirementClause,
  RequirementMode,
  Resource,
  ResourceFinancialProperties,
  ResourceRequest,
  ResourceRequirement,
  SeasonMode,
  SimulationObject,
  SimulationObjectType,
  SimulationTimeType,
  State,
  StateCondition,
  StateModification,
  StateType,
  UnitlessSample,
  WorkSchedule,
  ConstantDistribution,
  createAssignModification,
  generateUUID,
} from '@quodsi/shared';
// The core's DOMAIN Model/Scenario; its plain Model/Scenario are the thin
// SaaS-side shapes.
export { DomainModel as Model, DomainScenario as Scenario } from '@quodsi/shared';
export type { QueueRanking } from '@quodsi/shared';

// Actions
export {
  ActionType,
  Action,
  createAssignAction,
  createSeizeAction,
  createReleaseAction,
  createDelayAction,
} from '@quodsi/shared';

// Case-insensitive SimulationObjectType parse (spec 2026-09-15 §1), used by
// the extension's element handlers and the panel's type detection.
export { parseSimulationObjectType } from '@quodsi/shared';

// Model field roster -- the model-root snapshot and the Model editor's
// settings patch are both built from it (spec 2026-09-12).
export { MODEL_FIELD_KEYS, MODEL_DATE_FIELD_KEYS } from '@quodsi/shared';

// Scenario levers
export {
  createScenarioLever,
  ScenarioPropertyName,
  toggleLever,
  actionDurationLeverLabel,
  leverForAction,
  toggleActionLever,
  patchActionLever,
  patchActionRange,
} from '@quodsi/shared';
export type { ScenarioLever } from '@quodsi/shared';

// Page conversion: topology rule, naming policy, structured-name parsing and
// per-pass name bookkeeping -- the same rules drawio and Visio use; the
// extension adapts its SDK proxies to NameableShape.
export { classifyByTopology, pickName, pickConnectorName, ConversionNamer } from '@quodsi/shared';
export type { NameableShape } from '@quodsi/shared';
export {
  parseStructuredName,
  extractActivityFields,
  extractGeneratorFields,
  extractResourceFields,
  extractSimulationType,
} from '@quodsi/shared';

// Resources (storage format 2): auto-resource planning, claim resolution,
// auto-requirement reconciliation, and the validation copy for refused
// claims, which ModelManager.validateModel() appends at build time.
export { planAutoResources, resolveResourceLinks, stripTransientResourceMarkers } from '@quodsi/shared';
export { reconcileAutoRequirements, isPlainAutoRequirement, resourceLinkIssues } from '@quodsi/shared';
export type { ActivityResourceRef, ResourceClaim, ResourceLaneRef, ResourceLinkRejection } from '@quodsi/shared';

// Delete rules (spec 2026-09-11): ModelManager runs the same pure rules over
// stored shape data that drawio, Visio and Studio run in the browser.
export {
  removeEntityReferences,
  pickFallbackEntityId,
  removeStateReferences,
  findExpressionsReferencingState,
  removeRequirementReferences,
  removeResourceReferences,
} from '@quodsi/shared';
export type { StateReferenceScope, ReferenceCleanupOptions, SeizeReleaseDisposition } from '@quodsi/shared';

// Version upgrade: framework, pure engine and element-envelope helpers. The
// Lucid glue lives in the extension's src/versioning. isEnvelope is not
// re-exported: it would collide with the messaging one.
export {
  BaseVersionUpgrader,
  VersionManager,
  VersionUpgraderFactory,
  UpgradeIssueSeverity,
  upgradeElements,
  flattenEnvelope,
  makeEnvelope,
} from '@quodsi/shared';
export type { UpgradeOptions, VersionManagerOptions, UpgradeIssue, RawElement } from '@quodsi/shared';
