import { AuthErrorMessage, AuthLoginSuccessMessage, AuthLogoutMessage, AuthMessage, AuthPasswordResetMessage, AuthRequiredMessage, AuthStatusMessage } from './auth/messages';
import { isEnvelope } from './envelope/envelope';
import { EnvelopeMessageType } from './envelope/envelopeMessageTypes';
import { ErrorMessage, FrameworkMessage, LogMessage, ReactAppReadyMessage } from './framework/messages';
import { ModelConversionResultMessage, ModelConvertMessage, ModelOpsMessage, ModelRemoveMessage, ModelRemoveResultMessage, ModelValidateMessage, ModelValidationResultMessage, ModelJsonRequestMessage, ModelJsonResponseMessage, ResultsPageCreateMessage, ResultsPageCreateResultMessage } from './modelOps/messages';
import { ElementConvertMessage, ElementConvertResultMessage, ElementOpsMessage, ElementUpdateMessage, ElementUpdateResultMessage, StatesUpdateMessage, StatesUpdateResultMessage, ResourceRequirementsUpdateMessage, ResourceRequirementsUpdateResultMessage } from './elementOps/messages';
import { ModelContextMessage, SelectionChangedMessage, SelectionMessage } from './selection/messages';
import { ModelRunRequestMessage, ModelRunStatusMessage, SimulationMessage, SimulationJob } from './simulation/messages';
import { StorageConnectRequestMessage, StorageConnectResultMessage, StorageDisconnectMessage, StorageMessage, StorageStatusMessage } from './storage/messages';
import { SubscriptionChangeRequestMessage, SubscriptionChangeResultMessage, SubscriptionErrorMessage, SubscriptionMessage, SubscriptionStatusMessage } from './subscription/messages';
import { ScenarioListRequestMessage, ScenarioListResultMessage, ScenarioDeleteMessage, ScenarioDeleteResultMessage, ScenarioMessage, ScenarioInfo } from './scenario/messages';

// Export message types enum
export { EnvelopeMessageType } from './envelope/envelopeMessageTypes';

// Export envelope base
export {
  EnvelopeBase,
  MessageSource,
  MessageTarget,
  isEnvelope
} from './envelope/envelope';

// Export guard utilities
export {
  createMessageTypeGuard,
  isFromSource,
  isForTarget,
  hasRequiredDataFields
} from './envelope/guards';

// Export framework messages
export {
  ReactAppReadyMessage,
  ErrorMessage,
  LogMessage,
  FrameworkMessage
} from './framework/messages';

// Export auth messages
export {
  QuodsiUserInfo,
  AuthLoginSuccessMessage,
  AuthLogoutMessage,
  AuthPasswordResetMessage,
  AuthStatusMessage,
  AuthRequiredMessage,
  AuthErrorMessage,
  AuthMessage
} from './auth/messages';

// Export subscription messages
export {
  SubscriptionTier,
  SubscriptionStatus,
  SubscriptionStatusMessage,
  SubscriptionChangeRequestMessage,
  SubscriptionChangeResultMessage,
  SubscriptionErrorMessage,
  SubscriptionMessage
} from './subscription/messages';

// Export selection messages
export {
  ElementShape,
  ModelContextMessage,
  SelectionChangedMessage,
  SelectionMessage
} from './selection/messages';

// Export simulation messages
export {
  SimulationStatus,
  SimulationJob,
  ModelRunRequestMessage,
  ModelRunStatusMessage,
  SimulationMessage
} from './simulation/messages';

// Export model operations messages
export {
  ValidationSeverity,
  ValidationIssue,
  ModelValidateMessage,
  ModelValidationResultMessage,
  ModelConvertMessage,
  ModelConversionResultMessage,
  ModelRemoveMessage,
  ModelRemoveResultMessage,
  ModelJsonRequestMessage,
  ModelJsonResponseMessage,
  ResultsPageCreateMessage,
  ResultsPageCreateResultMessage,
  ModelOpsMessage
} from './modelOps/messages';

// Export element operations messages
export {
  ElementUpdateMessage,
  ElementUpdateResultMessage,
  ElementConvertMessage,
  ElementConvertResultMessage,
  StatesUpdateMessage,
  StatesUpdateResultMessage,
  ResourceRequirementsUpdateMessage,
  ResourceRequirementsUpdateResultMessage,
  ElementOpsMessage
} from './elementOps/messages';

// Export storage messages
export {
  StorageProvider,
  ConnectionStatus,
  StorageConnectRequestMessage,
  StorageConnectResultMessage,
  StorageDisconnectMessage,
  StorageStatusMessage,
  StorageMessage
} from './storage/messages';

// Export scenario messages
export {
  ScenarioInfo,
  ScenarioListRequestMessage,
  ScenarioListResultMessage,
  ScenarioDeleteMessage,
  ScenarioDeleteResultMessage,
  ScenarioMessage
} from './scenario/messages';

// Define the union type of all possible messages
export type QuodsiMessage =
  | FrameworkMessage
  | AuthMessage
  | SubscriptionMessage
  | SelectionMessage
  | SimulationMessage
  | ModelOpsMessage
  | ElementOpsMessage
  | StorageMessage
  | ScenarioMessage;

// Define payload type mapping
export interface EnvelopMessagePayloads {
  [EnvelopeMessageType.REACT_APP_READY]: ReactAppReadyMessage['data'];
  [EnvelopeMessageType.ERROR]: ErrorMessage['data'];
  [EnvelopeMessageType.LOG]: LogMessage['data'];

  [EnvelopeMessageType.AUTH_LOGIN_SUCCESS]: AuthLoginSuccessMessage['data'];
  [EnvelopeMessageType.AUTH_LOGOUT]: AuthLogoutMessage['data'];
  [EnvelopeMessageType.AUTH_PASSWORD_RESET]: AuthPasswordResetMessage['data'];
  [EnvelopeMessageType.AUTH_STATUS]: AuthStatusMessage['data'];
  [EnvelopeMessageType.AUTH_REQUIRED]: AuthRequiredMessage['data'];
  [EnvelopeMessageType.AUTH_ERROR]: AuthErrorMessage['data'];
  [EnvelopeMessageType.REQUEST_AUTH_STATUS]: {}; // Empty object as payload

  [EnvelopeMessageType.SUBSCRIPTION_STATUS]: SubscriptionStatusMessage['data'];
  [EnvelopeMessageType.SUBSCRIPTION_CHANGE_REQUEST]: SubscriptionChangeRequestMessage['data'];
  [EnvelopeMessageType.SUBSCRIPTION_CHANGE_RESULT]: SubscriptionChangeResultMessage['data'];
  [EnvelopeMessageType.SUBSCRIPTION_ERROR]: SubscriptionErrorMessage['data'];

  [EnvelopeMessageType.MODEL_CONTEXT]: ModelContextMessage['data'];
  [EnvelopeMessageType.SELECTION_CHANGED]: SelectionChangedMessage['data'];

  [EnvelopeMessageType.MODEL_RUN_REQUEST]: ModelRunRequestMessage['data'];
  [EnvelopeMessageType.MODEL_RUN_STATUS]: ModelRunStatusMessage['data'];

  [EnvelopeMessageType.MODEL_VALIDATE]: ModelValidateMessage['data'];
  [EnvelopeMessageType.MODEL_VALIDATION_RESULT]: ModelValidationResultMessage['data'];
  [EnvelopeMessageType.MODEL_CONVERT]: ModelConvertMessage['data'];
  [EnvelopeMessageType.MODEL_CONVERSION_RESULT]: ModelConversionResultMessage['data'];
  [EnvelopeMessageType.MODEL_REMOVE]: ModelRemoveMessage['data'];
  [EnvelopeMessageType.MODEL_REMOVE_RESULT]: ModelRemoveResultMessage['data'];
  [EnvelopeMessageType.MODEL_JSON_REQUEST]: ModelJsonRequestMessage['data'];
  [EnvelopeMessageType.MODEL_JSON_RESPONSE]: ModelJsonResponseMessage['data'];
  [EnvelopeMessageType.RESULTS_PAGE_CREATE]: ResultsPageCreateMessage['data'];
  [EnvelopeMessageType.RESULTS_PAGE_CREATE_RESULT]: ResultsPageCreateResultMessage['data'];

  [EnvelopeMessageType.ELEMENT_UPDATE]: ElementUpdateMessage['data'];
  [EnvelopeMessageType.ELEMENT_UPDATE_RESULT]: ElementUpdateResultMessage['data'];
  [EnvelopeMessageType.ELEMENT_CONVERT]: ElementConvertMessage['data'];
  [EnvelopeMessageType.ELEMENT_CONVERT_RESULT]: ElementConvertResultMessage['data'];
  [EnvelopeMessageType.STATES_UPDATE]: StatesUpdateMessage['data'];
  [EnvelopeMessageType.STATES_UPDATE_RESULT]: StatesUpdateResultMessage['data'];
  [EnvelopeMessageType.RESOURCE_REQUIREMENTS_UPDATE]: ResourceRequirementsUpdateMessage['data'];
  [EnvelopeMessageType.RESOURCE_REQUIREMENTS_UPDATE_RESULT]: ResourceRequirementsUpdateResultMessage['data'];

  [EnvelopeMessageType.STORAGE_CONNECT_REQUEST]: StorageConnectRequestMessage['data'];
  [EnvelopeMessageType.STORAGE_CONNECT_RESULT]: StorageConnectResultMessage['data'];
  [EnvelopeMessageType.STORAGE_DISCONNECT]: StorageDisconnectMessage['data'];
  [EnvelopeMessageType.STORAGE_STATUS]: StorageStatusMessage['data'];

  [EnvelopeMessageType.SCENARIOS_LIST_REQUEST]: ScenarioListRequestMessage['data'];
  [EnvelopeMessageType.SCENARIOS_LIST_RESULT]: ScenarioListResultMessage['data'];
  [EnvelopeMessageType.SCENARIO_DELETE]: ScenarioDeleteMessage['data'];
  [EnvelopeMessageType.SCENARIO_DELETE_RESULT]: ScenarioDeleteResultMessage['data'];
}

/**
 * Type guard to check if a message is a valid Quodsi message
 */
export function isValidEnvelopMsg(value: unknown): value is QuodsiMessage {
  return isEnvelope(value);
}
