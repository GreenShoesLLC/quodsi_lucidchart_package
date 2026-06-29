import { RunState } from '../../types/elements';

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
  /**
   * True when the run is for the model's baseline scenario. Used by the
   * UI to surface the baseline run's status on the page-level Simulate
   * button. Replaces the legacy convention of detecting baselines by
   * id === '00000000-0000-0000-0000-000000000000'.
   */
  isBaseline?: boolean;
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
  /** Output CSV schema version stamped by the engine into status.json. Null for legacy runs. */
  outputSchemaVersion: string | null;
  /** Engine __version__ at run time. Diagnostic. Null for legacy runs. */
  engineVersion: string | null;
  /**
   * Org_code of the user/org that submitted this run. Used by the UI to
   * show provenance (this run was produced by a different org) and to
   * gate per-run actions (delete) on the requesting user's org match.
   * Null only for legacy runs that pre-date the field.
   */
  orgCode: string | null;
}

