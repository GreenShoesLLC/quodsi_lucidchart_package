import { EnvelopeBase } from '../envelope/envelope';
import { EnvelopeMessageType } from '../envelope/envelopeMessageTypes';
import { RunState } from '../../types/elements';

export interface ScenarioListRequestMessage extends EnvelopeBase {
  type: EnvelopeMessageType.SCENARIOS_LIST_REQUEST;
  data: {
    documentId: string;
  };
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
  downloadInfo?: {
    zipUrl: string;
    fileSizeBytes: number;
    fileSizeMB: string;
    expiresAt: string;
  };
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

export interface CrossRepDataRequestMessage extends EnvelopeBase {
  type: EnvelopeMessageType.CROSS_REP_DATA_REQUEST;
  data: {
    documentId: string;
    scenarioId: string;
    dataType: 'activity' | 'entity' | 'resource' | 'activity-contents-timeseries' | 'state-summary';
  };
}

export interface CrossRepDataResultMessage extends EnvelopeBase {
  type: EnvelopeMessageType.CROSS_REP_DATA_RESULT;
  data: {
    success: boolean;
    data: any[];
    recordCount: number;
    dataType: 'activity' | 'entity' | 'resource' | 'activity-contents-timeseries' | 'state-summary';
    error?: string;
  };
}

export type ScenarioMessage =
  | ScenarioListRequestMessage
  | ScenarioListResultMessage
  | ScenarioDeleteMessage
  | ScenarioDeleteResultMessage
  | CrossRepDataRequestMessage
  | CrossRepDataResultMessage;
