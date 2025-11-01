import { EnvelopeBase, EnvelopeMessageType, SimulationStatus as SharedSimulationStatus } from '@quodsi/shared';
import { MessagingAction } from '../state/types';
import { SimulationStatus } from '../state/types';
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
        status: SharedSimulationStatus;
        progress: number;
        currentStep?: string;
        lastChecked: string;
        queuedAt: string;
        error?: string;
        resultUrl?: string;
      };

      // Map to different simulation actions based on status
      if (statusData.status === SharedSimulationStatus.FAILED || statusData.error) {
        return {
          type: 'SIMULATION_ERROR',
          jobId: statusData.jobId,
          error: statusData.error || 'Unknown simulation error'
        };
      } else if (statusData.status === SharedSimulationStatus.COMPLETED) {
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
        // Map SharedSimulationStatus to local SimulationStatus enum
        let mappedStatus: SimulationStatus;
        switch (statusData.status) {
          case SharedSimulationStatus.QUEUED:
            mappedStatus = SimulationStatus.QUEUED;
            break;
          case SharedSimulationStatus.PROCESSING:
            mappedStatus = SimulationStatus.PROCESSING;
            break;
          case SharedSimulationStatus.VALIDATING:
            mappedStatus = SimulationStatus.VALIDATING;
            break;
          case SharedSimulationStatus.RUNNING:
            mappedStatus = SimulationStatus.RUNNING;
            break;
          case SharedSimulationStatus.CANCELLED:
            mappedStatus = SimulationStatus.CANCELLED;
            break;
          default:
            // Fallback for any unknown status
            mappedStatus = SimulationStatus.PROCESSING;
        }

        return {
          type: 'SIMULATION_PROGRESS',
          jobId: statusData.jobId,
          documentId: statusData.documentId,
          scenarioId: statusData.scenarioId,
          scenarioName: statusData.scenarioName,
          status: mappedStatus,
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
