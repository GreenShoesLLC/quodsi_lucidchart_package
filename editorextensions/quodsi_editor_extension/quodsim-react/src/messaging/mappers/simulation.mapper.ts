import { EnvelopeBase, EnvelopeMessageType, SimulationStatus } from '@quodsi/shared';
import { MessagingAction } from '../reducer';
import { debugService } from '../utils/debugService';

/**
 * Maps simulation-related messages to reducer actions
 * 
 * @param msg The envelope message to map
 * @returns A reducer action or null if not handled
 */
export function mapSimulation(msg: EnvelopeBase): MessagingAction | null {
  // Skip messages that aren't simulation-related
  if (
    msg.type !== EnvelopeMessageType.MODEL_RUN_REQUEST &&
    msg.type !== EnvelopeMessageType.MODEL_RUN_ACK &&
    msg.type !== EnvelopeMessageType.MODEL_RUN_STATUS
  ) {
    return null;
  }

  debugService.debug(`Simulation mapper processing: ${msg.type}`);

  switch (msg.type) {
    case EnvelopeMessageType.MODEL_RUN_ACK:
      // Extract run acknowledgement data
      const ackData = msg.data as {
        jobId: string;
        queuedAt: string;
        estimatedCompletionTime?: string;
      };

      // Multiple actions needed for this message:
      // 1. Start polling
      // 2. Update simulation status
      
      // We can only return one action, so let's return the most important one
      // The polling will need to be handled by a side effect in a component
      return {
        type: 'SIMULATION_STATUS_UPDATE',
        status: SimulationStatus.QUEUED,
        progress: 0,
        jobId: ackData.jobId,
        currentStep: 'Simulation queued'
      };

    case EnvelopeMessageType.MODEL_RUN_STATUS:
      // Extract run status data
      const statusData = msg.data as {
        jobId: string;
        status: SimulationStatus;
        progress: number;
        currentStep?: string;
        error?: string;
        resultUrl?: string;
        details?: Record<string, unknown>;
      };

      // Map to simulation status update action
      return {
        type: 'SIMULATION_STATUS_UPDATE',
        status: statusData.status,
        progress: statusData.progress,
        jobId: statusData.jobId,
        currentStep: statusData.currentStep,
        error: statusData.error,
        resultUrl: statusData.resultUrl
      };

    case EnvelopeMessageType.MODEL_RUN_REQUEST:
      // This message is usually sent from the panel to the host
      // But if we receive it, map it to start a simulation
      const requestData = msg.data as {
        documentId: string;
        scenarioName?: string;
        durationDays?: number;
        repetitions?: number;
        parameters?: Record<string, unknown>;
      };

      // Map to simulation starting state
      return {
        type: 'SIMULATION_STATUS_UPDATE',
        status: SimulationStatus.QUEUED,
        progress: 0,
        currentStep: 'Preparing simulation'
      };

    default:
      return null;
  }
}
