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
