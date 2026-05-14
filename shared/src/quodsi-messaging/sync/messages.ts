import { EnvelopeBase } from '../envelope/envelope';
import { EnvelopeMessageType } from '../envelope/envelopeMessageTypes';
import type { ISerializedScenario } from '../../serialization/interfaces/ISerializedScenario';

/**
 * Request to synchronize all model data (model definition, scenarios, and simulation runs).
 * Sent from React to extension to trigger a full server-side sync operation.
 */
export interface SyncAllRequestData {
  /** Lucid document ID */
  documentId: string;

  /** Lucid page ID */
  pageId: string;

  /** Name of the model being synced */
  modelName: string;

  /** Array of scenario definitions to sync */
  scenarios: ISerializedScenario[];
}

/**
 * Successful sync operation response from extension.
 * Includes counts of synced scenarios and simulation runs, and execution time.
 */
export interface SyncAllSuccessData {
  /** Lucid document ID */
  documentId: string;

  /** Lucid page ID */
  pageId: string;

  /** Number of scenarios synchronized */
  scenariosCount: number;

  /** Number of simulation runs retrieved */
  runsCount: number;

  /** Duration of the entire sync operation in milliseconds */
  durationMs: number;
}

/**
 * Error response from a failed sync operation.
 * Includes the step where the failure occurred and error details.
 */
export interface SyncAllErrorData {
  /** Lucid document ID */
  documentId: string;

  /** Lucid page ID */
  pageId: string;

  /** Step where the error occurred */
  step: 'upsertModel' | 'syncScenarios' | 'listScenarios' | 'listSimulationRuns';

  /** Error message describing the failure */
  error: string;
}

/**
 * SYNC_ALL_REQUEST envelope message
 */
export interface SyncAllRequestMessage extends EnvelopeBase {
  type: EnvelopeMessageType.SYNC_ALL_REQUEST;
  data: SyncAllRequestData;
}

/**
 * SYNC_ALL_SUCCESS envelope message
 */
export interface SyncAllSuccessMessage extends EnvelopeBase {
  type: EnvelopeMessageType.SYNC_ALL_SUCCESS;
  data: SyncAllSuccessData;
}

/**
 * SYNC_ALL_ERROR envelope message
 */
export interface SyncAllErrorMessage extends EnvelopeBase {
  type: EnvelopeMessageType.SYNC_ALL_ERROR;
  data: SyncAllErrorData;
}

/** Union type of all sync messages */
export type SyncMessage = SyncAllRequestMessage | SyncAllSuccessMessage | SyncAllErrorMessage;
