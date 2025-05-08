import { 
  EnvelopeBase, 
  EnvelopeMessageType, 
  QuodsiUserInfo, 
  SubscriptionTier, 
  SubscriptionStatus, 
  ElementShape, 
  SimulationStatus,
  StorageProvider,
  ConnectionStatus
} from '@quodsi/shared';
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
 * Type for feature flags provided by subscription status
 */
export interface FeatureFlags {
  simulationEnabled: boolean;
  multiScenarioEnabled: boolean;
  customDashboardEnabled: boolean;
  apiAccessEnabled: boolean;
  [key: string]: boolean;
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
 * Interface for validation message
 */
export interface ValidationMessage {
  type: string;
  message: string;
  elementId?: string;
  code?: string;
}

/**
 * Auth state from the useAuthState hook
 */
export interface AuthState {
  isAuthenticated: boolean;
  userInfo?: QuodsiUserInfo;
  silentAuthInProgress: boolean;
  error?: string;
  logout: () => void;
  login: (idToken: string, user: QuodsiUserInfo, isNewUser: boolean) => void;
}

/**
 * Subscription state from the useSubscriptionState hook
 */
export interface SubscriptionState {
  tier?: SubscriptionTier;
  status?: SubscriptionStatus;
  expiresAt?: string;
  featureFlags: Record<string, boolean>;
  isActive: boolean;
  isExpired: boolean;
  isInGracePeriod: boolean;
  isFree: boolean;
  isPro: boolean;
  isEnterprise: boolean;
  hasFeature: (feature: string) => boolean;
  upgradeToPro: (returnUrl?: string) => void;
  upgradeToEnterprise: (returnUrl?: string) => void;
  changeTier: (tier: SubscriptionTier, returnUrl?: string) => void;
}

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
  viewResults: (documentId: string, jobId?: string) => void;
  startPolling: () => void;
  stopPolling: () => void;
}

/**
 * Validation state from the useValidationState hook
 */
export interface ValidationState {
  isValid: boolean;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  messages: ValidationMessage[];
  lastValidated?: number;
  hasIssues: boolean;
  hasErrors: boolean;
  hasWarnings: boolean;
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
  infos: ValidationMessage[];
  getMessagesForElement: (elementId: string) => ValidationMessage[];
  validate: (documentId: string) => void;
}

/**
 * Storage state 
 */
export interface StorageState {
  googleDrive: {
    status: ConnectionStatus;
    user?: string;
  };
  oneDrive: {
    status: ConnectionStatus;
    user?: string;
  };
  connectStorage: (provider: StorageProvider, params?: Record<string, unknown>) => void;
  disconnectStorage: (provider: StorageProvider) => void;
}

/**
 * Combined messaging state from the useMessagingState hook
 */
export interface CombinedMessagingState {
  state: MessagingState;
  dispatch: MessagingDispatch;
}
