import { EnvelopeBase, EnvelopeMessageType } from '@quodsi/shared';
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

      // Map to simulation start action
      return {
        type: 'SIMULATION_START',
        jobId: ackData.jobId
      };

    case EnvelopeMessageType.MODEL_RUN_STATUS:
      // Extract run status data
      const statusData = msg.data as {
        jobId: string;
        status: string;
        progress: number;
        currentStep?: string;
        error?: string;
        resultUrl?: string;
        details?: Record<string, unknown>;
      };

      // Map to different simulation actions based on status
      if (statusData.status === 'error' || statusData.error) {
        return {
          type: 'SIMULATION_ERROR',
          error: statusData.error || 'Unknown simulation error'
        };
      } else if (statusData.status === 'completed') {
        // Create a results object with all relevant data
        const results = {
          jobId: statusData.jobId,
          resultUrl: statusData.resultUrl,
          currentStep: statusData.currentStep,
          details: statusData.details,
          // Include any other result data you want to capture
        };
        
        return {
          type: 'SIMULATION_COMPLETE',
          results
        };
      } else if (statusData.status === 'running' || statusData.status === 'processing') {
        return {
          type: 'SIMULATION_PROGRESS',
          progress: statusData.progress || 0
        };
      }
      
      // For other statuses, we don't have an explicit action,
      // so we'll use progress with 0 as a fallback
      return {
        type: 'SIMULATION_PROGRESS',
        progress: 0
      };

    case EnvelopeMessageType.MODEL_RUN_REQUEST:
      // This message is usually sent from the panel to the host
      // But if we receive it, we can treat it as a simulation start
      // Note: Since we don't have a jobId yet, we'll generate a temporary one
      return {
        type: 'SIMULATION_START',
        jobId: `pending-${Date.now()}`
      };

    default:
      return null;
  }
}
