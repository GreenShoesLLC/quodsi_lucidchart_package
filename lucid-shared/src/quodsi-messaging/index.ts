// Message type enum
export { EnvelopeMessageType } from './envelope/envelopeMessageTypes';

// Envelope base
export {
  EnvelopeBase,
  MessageSource,
  MessageTarget,
  isEnvelope
} from './envelope/envelope';

// Auth payload pieces
export {
  QuodsiUserInfo,
  ExtensionConfig
} from './auth/messages';

// Selection payload pieces
export { ElementShape } from './selection/messages';

// Simulation job tracking
export {
  SimulationStatus,
  SimulationJob
} from './simulation/messages';

// Validation types (declared in @quodsi/shared, see validation/types.ts)
export { ValidationSeverity } from './validation/types';
export type { ValidationIssue, ValidationResult } from './validation/types';

// Entitlement payload pieces
export {
  EntitlementSubjectType,
  EntitlementPlanSource,
  EntitlementPlanStatus,
  EntitlementMeteredFeature
} from './entitlements/messages';

// Analytics messages
export {
  ClientAnalyticsEvent
} from './analytics/messages';

// Page conversion message payloads (blank-slate card)
export type {
  PageCountsData,
  PageConversionCounts,
  AutoConvertPageResultData,
} from './pageConversion/messages';
