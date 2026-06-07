import { EnvelopeBase, EnvelopeMessageType, SimulationStatus } from '@quodsi/lucid-shared';
import { MessagingAction } from '../state/types';
import { debugService } from '../utils/debugService';

/**
 * Maps simulation-related messages to reducer actions
 *
 * @param msg The envelope message to map
 * @returns A reducer action or null if not handled
 */
export function mapSimulation(msg: EnvelopeBase): MessagingAction | null {
  // Skip messages that aren't simulation-related
  if (msg.type !== EnvelopeMessageType.MODEL_RUN_STATUS) {
    return null;
  }

  debugService.debug(`Simulation mapper processing: ${msg.type}`);

  switch (msg.type) {
    case EnvelopeMessageType.MODEL_RUN_STATUS:
      // Extract run status data (now with all enhanced fields)
      const statusData = msg.data as {
        jobId: string;
        documentId: string;
        scenarioId: string;
        scenarioName: string;
        status: SimulationStatus;
        progress: number;
        currentStep?: string;
        lastChecked: string;
        queuedAt: string;
        error?: string;
        resultUrl?: string;
      };

      // Map to different simulation actions based on status
      if (statusData.status === SimulationStatus.FAILED || statusData.error) {
        return {
          type: 'SIMULATION_ERROR',
          jobId: statusData.jobId,
          error: statusData.error || 'Unknown simulation error'
        };
      } else if (statusData.status === SimulationStatus.COMPLETED) {
        // Simulation completed successfully
        return {
          type: 'SIMULATION_COMPLETE',
          jobId: statusData.jobId,
          documentId: statusData.documentId,
          scenarioId: statusData.scenarioId,
          resultUrl: statusData.resultUrl,
          results: {
            jobId: statusData.jobId,
            resultUrl: statusData.resultUrl,
            currentStep: statusData.currentStep
          }
        };
      } else {
        // All other statuses (QUEUED, PROCESSING, VALIDATING, RUNNING, CANCELLED) use PROGRESS
        // Status is already the correct type from @quodsi/lucid-shared

        return {
          type: 'SIMULATION_PROGRESS',
          jobId: statusData.jobId,
          documentId: statusData.documentId,
          scenarioId: statusData.scenarioId,
          scenarioName: statusData.scenarioName,
          status: statusData.status,
          progress: statusData.progress,
          currentStep: statusData.currentStep,
          lastChecked: statusData.lastChecked,
          queuedAt: statusData.queuedAt
        };
      }

    default:
      return null;
  }
}
