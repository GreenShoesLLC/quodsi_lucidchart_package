import {
  EnvelopeBase,
  EnvelopeMessageType,
  QuodsiUserInfo,
  ElementShape,
  SimulationStatus,
  ValidationIssue,
  ValidationSeverity
} from '@quodsi/lucid-shared';
import { MessagingAction } from './state/types';
import { MessagingState } from './state/rootReducer';


/**
 * Type for a function that maps an envelope message to an action
 */
export type MessageMapper<T extends EnvelopeMessageType> = (
  msg: EnvelopeBase & { type: T }
) => MessagingAction | null;

/**
 * Type for correlation between requests and responses
 */
export interface PendingRequest {
  id: string;
  type: EnvelopeMessageType;
  timestamp: number;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timeout: NodeJS.Timeout;
}

/**
 * Type for a message error
 */
export interface MessageError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

/**
 * Utility type for extracting specific properties from message payloads
 */
export type ExtractPayload<T extends EnvelopeMessageType> =
  EnvelopeBase & { type: T } extends { data: infer D } ? D : never;

/**
 * Type for the messaging context value provided to components
 */
export interface MessagingContextValue extends MessagingState {
  sendMessage: <T extends EnvelopeMessageType>(type: T, data?: any) => void;
}

/**
 * Type for the messaging dispatch function
 */
export type MessagingDispatch = React.Dispatch<MessagingAction>;

/**
 * Selection state from the useSelectionState hook
 */
export interface SelectionState {
  documentId?: string;
  pageId?: string;
  isQuodsiModel: boolean;
  selectedElements: ElementShape[];
  selectionCount: number;
  totalElementCount: number;
  diagramElementType?: string;
  hasSelection: boolean;
  selectedElementIds: string[];
  selectedElement?: ElementShape;
  updateElement: (elementId: string, type: string, data: any) => void;
  convertElementToType: (elementId: string, type: string) => void;
  convertCurrentPage: () => void;
}

/**
 * Simulation state from the useSimulationState hook
 */
export interface SimulationState {
  status?: SimulationStatus;
  progress: number;
  jobId?: string;
  currentStep?: string;
  error?: string;
  resultUrl?: string;
  isPolling: boolean;
  isRunning: boolean;
  isComplete: boolean;
  isFailed: boolean;
  isCancelled: boolean;
  progressPercent: number;
  runSimulation: (
    documentId: string,
    scenarioName?: string,
    durationDays?: number,
    repetitions?: number
  ) => void;
  startPolling: () => void;
  stopPolling: () => void;
}

/**
 * Validation state from the useValidationState hook
 */
export interface ValidationState {
  isValid: boolean;
  issues: ValidationIssue[];
  summary: {
    errorCount: number;
    warningCount: number;
    infoCount: number;
  };
  lastValidated?: number;
  hasIssues: boolean;
  hasErrors: boolean;
  hasWarnings: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  infos: ValidationIssue[];
  getIssuesForElement: (elementId: string) => ValidationIssue[];
  validate: (documentId: string) => void;
}

/**
 * Combined messaging state from the useMessagingState hook
 */
export interface CombinedMessagingState {
  state: MessagingState;
  dispatch: MessagingDispatch;
}
