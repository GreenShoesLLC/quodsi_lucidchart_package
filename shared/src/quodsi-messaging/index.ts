import { AuthErrorMessage, AuthLoginSuccessMessage, AuthLogoutMessage, AuthMessage, AuthRequiredMessage, AuthStatusMessage } from './auth/messages';
import { isEnvelope } from './envelope/envelope';
import { EnvelopeMessageType } from './envelope/envelopeMessageTypes';
import { ErrorMessage, FrameworkMessage, LogMessage, ReactAppReadyMessage } from './framework/messages';
import { ModelConversionResultMessage, ModelConvertMessage, ModelOpsMessage, ModelRemoveMessage, ModelRemoveResultMessage, ModelValidateMessage, ModelValidationResultMessage, ModelJsonRequestMessage, ModelJsonResponseMessage, ResultsPageCreateMessage, ResultsPageCreateResultMessage } from './modelOps/messages';
import { ElementSelectMessage, ElementConvertMessage, ElementConvertResultMessage, ElementOpsMessage, ElementUpdateMessage, ElementUpdateResultMessage, StatesUpdateMessage, StatesUpdateResultMessage, ResourceRequirementsUpdateMessage, ResourceRequirementsUpdateResultMessage, TimePatternsUpdateMessage, TimePatternsUpdateResultMessage, TimeDistributedConfigsUpdateMessage, TimeDistributedConfigsUpdateResultMessage } from './elementOps/messages';
import { ModelContextMessage, SelectionChangedMessage, SelectionMessage } from './selection/messages';
import { ModelRunRequestMessage, ModelRunStatusMessage, SimulationMessage, SimulationJob } from './simulation/messages';
import { StorageConnectRequestMessage, StorageConnectResultMessage, StorageDisconnectMessage, StorageMessage, StorageStatusMessage } from './storage/messages';
import { SimulationRunListRequestMessage, SimulationRunListResultMessage, SimulationRunDeleteMessage, SimulationRunDeleteResultMessage, SimulationRunResimulateRequestMessage, CrossRepDataRequestMessage, CrossRepDataResultMessage, SimulationRunMessage, SimulationRunInfo, SimulationRunDownloadInfo } from './simulationRun/simulationRunMessages';
import { ConversionPreviewRequestMessage, ConversionPreviewResultMessage, ConversionApplyMessage, ConversionApplyResultMessage, ConversionPreviewMessage } from './conversionPreview/messages';

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
  AuthStatusMessage,
  AuthRequiredMessage,
  AuthErrorMessage,
  AuthMessage
} from './auth/messages';

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
  ValidationResult,
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
  ElementSelectMessage,
  ElementUpdateMessage,
  ElementUpdateResultMessage,
  ElementConvertMessage,
  ElementConvertResultMessage,
  StatesUpdateMessage,
  StatesUpdateResultMessage,
  ResourceRequirementsUpdateMessage,
  ResourceRequirementsUpdateResultMessage,
  TimePatternsUpdateMessage,
  TimePatternsUpdateResultMessage,
  TimeDistributedConfigsUpdateMessage,
  TimeDistributedConfigsUpdateResultMessage,
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

// Export simulation run messages
export {
  SimulationRunInfo,
  SimulationRunDownloadInfo,
  SimulationRunListRequestMessage,
  SimulationRunListResultMessage,
  SimulationRunDeleteMessage,
  SimulationRunDeleteResultMessage,
  SimulationRunResimulateRequestMessage,
  CrossRepDataRequestMessage,
  CrossRepDataResultMessage,
  SimulationRunMessage
} from './simulationRun/simulationRunMessages';

// Export conversion preview messages
export {
  ConversionPreviewRequestMessage,
  ConversionPreviewResultMessage,
  ConversionApplyMessage,
  ConversionApplyResultMessage,
  ConversionPreviewMessage
} from './conversionPreview/messages';

// Define the union type of all possible messages
export type QuodsiMessage =
  | FrameworkMessage
  | AuthMessage
  | SelectionMessage
  | SimulationMessage
  | ModelOpsMessage
  | ElementOpsMessage
  | StorageMessage
  | SimulationRunMessage
  | ConversionPreviewMessage;

// Define payload type mapping
export interface EnvelopMessagePayloads {
  [EnvelopeMessageType.REACT_APP_READY]: ReactAppReadyMessage['data'];
  [EnvelopeMessageType.ERROR]: ErrorMessage['data'];
  [EnvelopeMessageType.LOG]: LogMessage['data'];

  [EnvelopeMessageType.AUTH_LOGIN_SUCCESS]: AuthLoginSuccessMessage['data'];
  [EnvelopeMessageType.AUTH_LOGOUT]: AuthLogoutMessage['data'];
  [EnvelopeMessageType.AUTH_STATUS]: AuthStatusMessage['data'];
  [EnvelopeMessageType.AUTH_REQUIRED]: AuthRequiredMessage['data'];
  [EnvelopeMessageType.AUTH_ERROR]: AuthErrorMessage['data'];

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

  [EnvelopeMessageType.ELEMENT_SELECT]: ElementSelectMessage['data'];
  [EnvelopeMessageType.ELEMENT_UPDATE]: ElementUpdateMessage['data'];
  [EnvelopeMessageType.ELEMENT_UPDATE_RESULT]: ElementUpdateResultMessage['data'];
  [EnvelopeMessageType.ELEMENT_CONVERT]: ElementConvertMessage['data'];
  [EnvelopeMessageType.ELEMENT_CONVERT_RESULT]: ElementConvertResultMessage['data'];
  [EnvelopeMessageType.STATES_UPDATE]: StatesUpdateMessage['data'];
  [EnvelopeMessageType.STATES_UPDATE_RESULT]: StatesUpdateResultMessage['data'];
  [EnvelopeMessageType.RESOURCE_REQUIREMENTS_UPDATE]: ResourceRequirementsUpdateMessage['data'];
  [EnvelopeMessageType.RESOURCE_REQUIREMENTS_UPDATE_RESULT]: ResourceRequirementsUpdateResultMessage['data'];
  [EnvelopeMessageType.TIME_PATTERNS_UPDATE]: TimePatternsUpdateMessage['data'];
  [EnvelopeMessageType.TIME_PATTERNS_UPDATE_RESULT]: TimePatternsUpdateResultMessage['data'];
  [EnvelopeMessageType.TIME_DISTRIBUTED_CONFIGS_UPDATE]: TimeDistributedConfigsUpdateMessage['data'];
  [EnvelopeMessageType.TIME_DISTRIBUTED_CONFIGS_UPDATE_RESULT]: TimeDistributedConfigsUpdateResultMessage['data'];

  [EnvelopeMessageType.STORAGE_CONNECT_REQUEST]: StorageConnectRequestMessage['data'];
  [EnvelopeMessageType.STORAGE_CONNECT_RESULT]: StorageConnectResultMessage['data'];
  [EnvelopeMessageType.STORAGE_DISCONNECT]: StorageDisconnectMessage['data'];
  [EnvelopeMessageType.STORAGE_STATUS]: StorageStatusMessage['data'];

  [EnvelopeMessageType.SIMULATION_RUNS_LIST_REQUEST]: SimulationRunListRequestMessage['data'];
  [EnvelopeMessageType.SIMULATION_RUNS_LIST_RESULT]: SimulationRunListResultMessage['data'];
  [EnvelopeMessageType.SIMULATION_RUN_DELETE]: SimulationRunDeleteMessage['data'];
  [EnvelopeMessageType.SIMULATION_RUN_DELETE_RESULT]: SimulationRunDeleteResultMessage['data'];
  [EnvelopeMessageType.SIMULATION_RUN_RESIMULATE_REQUEST]: SimulationRunResimulateRequestMessage['data'];
  [EnvelopeMessageType.CROSS_REP_DATA_REQUEST]: CrossRepDataRequestMessage['data'];
  [EnvelopeMessageType.CROSS_REP_DATA_RESULT]: CrossRepDataResultMessage['data'];

  [EnvelopeMessageType.CONVERSION_PREVIEW_REQUEST]: ConversionPreviewRequestMessage['data'];
  [EnvelopeMessageType.CONVERSION_PREVIEW_RESULT]: ConversionPreviewResultMessage['data'];
  [EnvelopeMessageType.CONVERSION_APPLY]: ConversionApplyMessage['data'];
  [EnvelopeMessageType.CONVERSION_APPLY_RESULT]: ConversionApplyResultMessage['data'];

  [EnvelopeMessageType.SCENARIOS_DEFINITION_UPDATE]: { scenarios: any[] };
  [EnvelopeMessageType.SCENARIOS_DEFINITION_RESULT]: { success: boolean; errorMessage?: string };

  [EnvelopeMessageType.OPEN_RESULTS_MODAL]: { scenarioId: string; documentId: string };

  [EnvelopeMessageType.DEVTOOLS_SWIMLANE_SCAN_REQUEST]: Record<string, never>;
  [EnvelopeMessageType.DEVTOOLS_SWIMLANE_SCAN_RESULT]: import('../types/devtools/DevToolsTypes').SwimLaneScanResult;

  [EnvelopeMessageType.SWIMLANE_UPDATE]: { swimlaneBlockId: string; swimlaneData: import('../types/swimlane/SwimLaneQuodsiData').SwimLaneQuodsiData };
  [EnvelopeMessageType.SWIMLANE_UPDATE_RESULT]: { success: boolean; errorMessage?: string };
  [EnvelopeMessageType.SWIMLANE_CONVERT_LANE]: { swimlaneBlockId: string; laneIndex: number; resourceName: string };
  [EnvelopeMessageType.SWIMLANE_CONVERT_LANE_RESULT]: { success: boolean; swimlaneBlockId: string; swimlaneData?: import('../types/swimlane/SwimLaneQuodsiData').SwimLaneQuodsiData; error?: string };
}

/**
 * Type guard to check if a message is a valid Quodsi message
 */
export function isValidEnvelopMsg(value: unknown): value is QuodsiMessage {
  return isEnvelope(value);
}
