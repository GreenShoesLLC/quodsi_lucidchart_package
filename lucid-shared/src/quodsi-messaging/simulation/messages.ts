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
