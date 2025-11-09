import { EnvelopeBase } from '../envelope/envelope';
import { EnvelopeMessageType } from '../envelope/envelopeMessageTypes';

/**
 * Simulation status enum
 */
export enum SimulationStatus {
  IDLE = 'idle',  // No simulation running
  QUEUED = 'queued',
  PROCESSING = 'processing',
  VALIDATING = 'validating',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ERROR = 'error',  // Alias for FAILED for backward compatibility
  CANCELLED = 'cancelled'
}

/**
 * Represents an active simulation job tracked by the extension
 */
export interface SimulationJob {
  /** Unique job ID */
  jobId: string;

  /** Document ID */
  documentId: string;

  /** Scenario ID */
  scenarioId: string;

  /** Scenario name */
  scenarioName: string;

  /** Current status */
  status: SimulationStatus;

  /** Progress percentage (0-100) */
  progress: number;

  /** ISO timestamp when job started */
  startTime: string;

  /** ISO timestamp of last update */
  lastUpdate: string;

  /** Current step description */
  currentStep?: string;

  /** Error message if failed */
  error?: string;

  /** Result URL if completed */
  resultUrl?: string;

  /** Polling interval handle (extension only, not serialized) */
  pollInterval?: any;
}

/**
 * Sent to request a model simulation run
 */
export interface ModelRunRequestMessage extends EnvelopeBase {
  type: EnvelopeMessageType.MODEL_RUN_REQUEST;
  data: {
    /** Document ID to simulate */
    documentId: string;

    /** Scenario name */
    scenarioName?: string;

    /** Duration in simulation days */
    durationDays?: number;

    /** Number of simulation repetitions */
    repetitions?: number;

    /** Additional simulation parameters */
    parameters?: Record<string, unknown>;
  };
}

/**
 * Sent to update on simulation progress.
 * This message replaces the old MODEL_RUN_ACK - the first status message
 * includes queuedAt to acknowledge the request was received.
 */
export interface ModelRunStatusMessage extends EnvelopeBase {
  type: EnvelopeMessageType.MODEL_RUN_STATUS;
  data: {
    /** Job ID */
    jobId: string;

    /** Document ID */
    documentId: string;

    /** Scenario ID */
    scenarioId: string;

    /** Scenario name */
    scenarioName: string;

    /** Current status */
    status: SimulationStatus;

    /** Progress percentage (0-100) */
    progress: number;

    /** Current step description */
    currentStep?: string;

    /** ISO timestamp of last status check */
    lastChecked: string;

    /** ISO timestamp when job was queued (included in first status message) */
    queuedAt: string;

    /** Error message if status is FAILED */
    error?: string;

    /** Result URL if status is COMPLETED */
    resultUrl?: string;
  };
}

/** Union type of all simulation messages */
export type SimulationMessage =
  | ModelRunRequestMessage
  | ModelRunStatusMessage;
