import { EnvelopeBase } from '../envelope/envelope';
import { EnvelopeMessageType } from '../envelope/envelopeMessageTypes';

/**
 * Simulation status enum
 */
export enum SimulationStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  VALIDATING = 'validating',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
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
 * Sent to acknowledge a run request
 */
export interface ModelRunAckMessage extends EnvelopeBase {
  type: EnvelopeMessageType.MODEL_RUN_ACK;
  data: {
    /** Unique job ID assigned by the backend */
    jobId: string;

    /** Timestamp when the job was queued */
    queuedAt: string; // ISO timestamp

    /** Estimated completion time */
    estimatedCompletionTime?: string; // ISO timestamp
  };
}

/**
 * Sent to update on simulation progress
 */
export interface ModelRunStatusMessage extends EnvelopeBase {
  type: EnvelopeMessageType.MODEL_RUN_STATUS;
  data: {
    /** Job ID */
    jobId: string;

    /** Current status */
    status: SimulationStatus;

    /** Progress percentage (0-100) */
    progress: number;

    /** Current step description */
    currentStep?: string;

    /** Error message if status is FAILED */
    error?: string;

    /** Result URL if status is COMPLETED */
    resultUrl?: string;

    /** Additional status details */
    details?: Record<string, unknown>;
  };
}

/** Union type of all simulation messages */
export type SimulationMessage =
  | ModelRunRequestMessage
  | ModelRunAckMessage
  | ModelRunStatusMessage;
