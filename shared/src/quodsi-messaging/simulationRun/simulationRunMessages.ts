import { EnvelopeBase } from '../envelope/envelope';
import { EnvelopeMessageType } from '../envelope/envelopeMessageTypes';
import { RunState } from '../../types/elements';

export interface SimulationRunListRequestMessage extends EnvelopeBase {
  type: EnvelopeMessageType.SIMULATION_RUNS_LIST_REQUEST;
  data: {
    documentId: string;
  };
}

export interface SimulationRunDownloadInfo {
  zipUrl: string;
  excelUrl: string;
  fileSizeBytes: number;
  fileSizeMB: string;
  expiresAt: string;
}

export interface SimulationRunInfo {
  id: string;
  name: string;
  runState: RunState;
  reps: number;
  runClockPeriod: number;
  runClockPeriodUnit: string;
  simulationTimeType: string;
  completedAt?: string;
  hasResults: boolean;
  downloadInfo?: SimulationRunDownloadInfo;
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

export interface SimulationRunListResultMessage extends EnvelopeBase {
  type: EnvelopeMessageType.SIMULATION_RUNS_LIST_RESULT;
  data: {
    documentId: string;
    simulationRuns: SimulationRunInfo[];
    generatedAt: string;
  };
}

export interface SimulationRunDeleteMessage extends EnvelopeBase {
  type: EnvelopeMessageType.SIMULATION_RUN_DELETE;
  data: {
    documentId: string;
    simulationRunId: string;
  };
}

export interface SimulationRunDeleteResultMessage extends EnvelopeBase {
  type: EnvelopeMessageType.SIMULATION_RUN_DELETE_RESULT;
  data: {
    success: boolean;
    documentId: string;
    simulationRunId: string;
    error?: string;
  };
}

export interface SimulationRunResimulateRequestMessage extends EnvelopeBase {
  type: EnvelopeMessageType.SIMULATION_RUN_RESIMULATE_REQUEST;
  data: {
    documentId: string;
    simulationRunId: string;
    simulationRunName: string;
  };
}

export interface CrossRepDataRequestMessage extends EnvelopeBase {
  type: EnvelopeMessageType.CROSS_REP_DATA_REQUEST;
  data: {
    documentId: string;
    scenarioId: string;
    dataType: 'activity' | 'entity' | 'resource' | 'activity-entity' | 'activity-contents-timeseries' | 'state-summary' | 'activity-inbound-queue-timeseries' | 'activity-outbound-queue-timeseries' | 'entity-throughput-timeseries';
  };
}

export interface CrossRepDataResultMessage extends EnvelopeBase {
  type: EnvelopeMessageType.CROSS_REP_DATA_RESULT;
  data: {
    success: boolean;
    data: any[];
    recordCount: number;
    dataType: 'activity' | 'entity' | 'resource' | 'activity-entity' | 'activity-contents-timeseries' | 'state-summary' | 'activity-inbound-queue-timeseries' | 'activity-outbound-queue-timeseries' | 'entity-throughput-timeseries';
    scenarioId: string;
    error?: string;
  };
}

export type SimulationRunMessage =
  | SimulationRunListRequestMessage
  | SimulationRunListResultMessage
  | SimulationRunDeleteMessage
  | SimulationRunDeleteResultMessage
  | SimulationRunResimulateRequestMessage
  | CrossRepDataRequestMessage
  | CrossRepDataResultMessage;
