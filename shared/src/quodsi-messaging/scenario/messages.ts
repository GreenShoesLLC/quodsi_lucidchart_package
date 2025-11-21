import { EnvelopeBase } from '../envelope/envelope';
import { EnvelopeMessageType } from '../envelope/envelopeMessageTypes';
import { RunState } from '../../types/elements';

export interface ScenarioListRequestMessage extends EnvelopeBase {
  type: EnvelopeMessageType.SCENARIOS_LIST_REQUEST;
  data: {
    documentId: string;
  };
}

export interface ScenarioDownloadInfo {
  zipUrl: string;
  excelUrl: string;
  fileSizeBytes: number;
  fileSizeMB: string;
  expiresAt: string;
}

export interface ScenarioInfo {
  id: string;
  name: string;
  runState: RunState;
  reps: number;
  runClockPeriod: number;
  runClockPeriodUnit: string;
  simulationTimeType: string;
  completedAt?: string;
  hasResults: boolean;
  downloadInfo?: ScenarioDownloadInfo;
  // Progress tracking
  currentReplication?: number;  // Current replication being executed (1 to reps)
  // Error fields (populated when runState === RanWithErrors)
  error?: string;  // User-friendly error message
  errorType?: string;  // Error category (VALIDATION_ERROR, RUNTIME_ERROR, TIMEOUT_ERROR, etc.)
  errorDetails?: string;  // Technical details/stack trace
  errorSuggestions?: string[];  // Actionable suggestions from Python runner
  // Timing fields (populated by Python runner)
  startTime?: string;  // ISO timestamp when simulation started
  endTime?: string;    // ISO timestamp when simulation completed
  metrics?: Record<string, any>;  // Performance and execution metrics
}

export interface ScenarioListResultMessage extends EnvelopeBase {
  type: EnvelopeMessageType.SCENARIOS_LIST_RESULT;
  data: {
    documentId: string;
    scenarios: ScenarioInfo[];
    generatedAt: string;
  };
}

export interface ScenarioDeleteMessage extends EnvelopeBase {
  type: EnvelopeMessageType.SCENARIO_DELETE;
  data: {
    documentId: string;
    scenarioId: string;
  };
}

export interface ScenarioDeleteResultMessage extends EnvelopeBase {
  type: EnvelopeMessageType.SCENARIO_DELETE_RESULT;
  data: {
    success: boolean;
    documentId: string;
    scenarioId: string;
    error?: string;
  };
}

export interface ScenarioResimulateRequestMessage extends EnvelopeBase {
  type: EnvelopeMessageType.SCENARIO_RESIMULATE_REQUEST;
  data: {
    documentId: string;
    scenarioId: string;
    scenarioName: string;
  };
}

export interface CrossRepDataRequestMessage extends EnvelopeBase {
  type: EnvelopeMessageType.CROSS_REP_DATA_REQUEST;
  data: {
    documentId: string;
    scenarioId: string;
    dataType: 'activity' | 'entity' | 'resource' | 'activity-contents-timeseries' | 'state-summary' | 'activity-input-buffer-timeseries' | 'activity-output-buffer-timeseries';
  };
}

export interface CrossRepDataResultMessage extends EnvelopeBase {
  type: EnvelopeMessageType.CROSS_REP_DATA_RESULT;
  data: {
    success: boolean;
    data: any[];
    recordCount: number;
    dataType: 'activity' | 'entity' | 'resource' | 'activity-contents-timeseries' | 'state-summary' | 'activity-input-buffer-timeseries' | 'activity-output-buffer-timeseries';
    error?: string;
  };
}

export type ScenarioMessage =
  | ScenarioListRequestMessage
  | ScenarioListResultMessage
  | ScenarioDeleteMessage
  | ScenarioDeleteResultMessage
  | ScenarioResimulateRequestMessage
  | CrossRepDataRequestMessage
  | CrossRepDataResultMessage;
