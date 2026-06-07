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
    currentReplication?: number;
    error?: string;
    errorType?: string;
    errorDetails?: string;
    errorSuggestions?: string[];
    startTime?: string;
    endTime?: string;
    metrics?: Record<string, any>;
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
export interface SimulationRunCancelRequestMessage extends EnvelopeBase {
    type: EnvelopeMessageType.SIMULATION_RUN_CANCEL_REQUEST;
    data: {
        documentId: string;
        pageId: string;
        scenarioId: string;
    };
}
export interface SimulationRunCancelResultMessage extends EnvelopeBase {
    type: EnvelopeMessageType.SIMULATION_RUN_CANCEL_RESULT;
    data: {
        success: boolean;
        documentId: string;
        scenarioId: string;
        error?: string;
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
export type CrossRepDataType = 'scenario' | 'activity' | 'entity' | 'resource' | 'activity-entity' | 'activity-contents-timeseries' | 'state-summary' | 'activity-inbound-queue-timeseries' | 'activity-outbound-queue-timeseries' | 'state-values-timeseries' | 'entity-throughput-timeseries';
export interface CrossRepBatchDataRequestMessage extends EnvelopeBase {
    type: EnvelopeMessageType.CROSS_REP_BATCH_DATA_REQUEST;
    data: {
        documentId: string;
        scenarioId: string;
        dataTypes: CrossRepDataType[];
    };
}
export interface CrossRepBatchDataResultMessage extends EnvelopeBase {
    type: EnvelopeMessageType.CROSS_REP_BATCH_DATA_RESULT;
    data: {
        success: boolean;
        results: Record<string, {
            success: boolean;
            data: any[];
            recordCount: number;
            error?: string;
        }>;
        scenarioId: string;
    };
}
export type SimulationRunMessage = SimulationRunListRequestMessage | SimulationRunListResultMessage | SimulationRunDeleteMessage | SimulationRunDeleteResultMessage | SimulationRunResimulateRequestMessage | SimulationRunCancelRequestMessage | SimulationRunCancelResultMessage | CrossRepDataRequestMessage | CrossRepDataResultMessage | CrossRepBatchDataRequestMessage | CrossRepBatchDataResultMessage;
//# sourceMappingURL=simulationRunMessages.d.ts.map