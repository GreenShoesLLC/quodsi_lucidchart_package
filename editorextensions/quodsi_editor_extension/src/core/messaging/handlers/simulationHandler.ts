import { EnvelopeBase, EnvelopeMessageType, SimulationStatus } from '@quodsi/shared';
import { router } from '../index';

/**
 * Handler for simulation-related messages
 */
export class SimulationHandler {
  /**
   * Active simulation jobs
   */
  private static activeJobs: Map<string, {
    documentId: string;
    scenarioName?: string;
    status: SimulationStatus;
    progress: number;
    startTime: Date;
    lastUpdate: Date;
  }> = new Map();

  /**
   * Handle messages related to simulations
   * 
   * @param msg The received message
   * @returns Whether the message was handled
   */
  public static handleMessage(msg: EnvelopeBase): boolean {
    switch (msg.type) {
      case EnvelopeMessageType.MODEL_RUN_REQUEST:
        return SimulationHandler.handleRunRequest(msg);
        
      case EnvelopeMessageType.MODEL_RUN_ACK:
        return SimulationHandler.handleRunAck(msg);
        
      case EnvelopeMessageType.MODEL_RUN_STATUS:
        return SimulationHandler.handleRunStatus(msg);
        
      // Not a simulation message
      default:
        return false;
    }
  }
  
  /**
   * Handle simulation run request
   * 
   * @param msg MODEL_RUN_REQUEST message
   * @returns True indicating message was handled
   */
  private static handleRunRequest(msg: EnvelopeBase): boolean {
    const data = msg.data as {
      documentId: string;
      scenarioName?: string;
      durationDays?: number;
      repetitions?: number;
      parameters?: Record<string, unknown>;
    };
    
    console.log('[SimulationHandler] Simulation run requested', {
      documentId: data.documentId,
      scenario: data.scenarioName || 'Default'
    });
    
    // TODO: Submit to simulation service
    // For now, simulate an acknowledgement
    setTimeout(() => {
      const jobId = `job-${Date.now()}`;
      
      // Send ACK message
      router.send('model', {
        id: msg.id, // Use same ID for correlation
        type: EnvelopeMessageType.MODEL_RUN_ACK,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          jobId,
          queuedAt: new Date().toISOString()
        }
      });
      
      // Create job tracking
      SimulationHandler.activeJobs.set(jobId, {
        documentId: data.documentId,
        scenarioName: data.scenarioName,
        status: SimulationStatus.QUEUED,
        progress: 0,
        startTime: new Date(),
        lastUpdate: new Date()
      });
      
      // Mock a simulation run with updates
      SimulationHandler.mockSimulationProgress(jobId);
    }, 500);
    
    return true;
  }
  
  /**
   * Handle run acknowledgement
   * 
   * @param msg MODEL_RUN_ACK message
   * @returns True indicating message was handled
   */
  private static handleRunAck(msg: EnvelopeBase): boolean {
    const data = msg.data as {
      jobId: string;
      queuedAt: string;
      estimatedCompletionTime?: string;
    };
    
    console.log('[SimulationHandler] Simulation run acknowledged', {
      jobId: data.jobId,
      queuedAt: data.queuedAt
    });
    
    // This is usually sent by the backend, not received by the extension
    // But we'll handle it anyway for completeness
    
    return true;
  }
  
  /**
   * Handle run status update
   * 
   * @param msg MODEL_RUN_STATUS message
   * @returns True indicating message was handled
   */
  private static handleRunStatus(msg: EnvelopeBase): boolean {
    const data = msg.data as {
      jobId: string;
      status: SimulationStatus;
      progress: number;
      currentStep?: string;
      error?: string;
      resultUrl?: string;
      details?: Record<string, unknown>;
    };
    
    console.log('[SimulationHandler] Simulation status update', {
      jobId: data.jobId,
      status: data.status,
      progress: data.progress
    });
    
    // Update job tracking
    const job = SimulationHandler.activeJobs.get(data.jobId);
    if (job) {
      job.status = data.status;
      job.progress = data.progress;
      job.lastUpdate = new Date();
    }
    
    // Forward to any services that track simulation state
    // ...
    
    return true;
  }
  
  /**
   * Mock a simulation run with progress updates
   * For development/testing only
   */
  private static mockSimulationProgress(jobId: string) {
    let progress = 0;
    let status = SimulationStatus.QUEUED;
    
    // First update - processing
    setTimeout(() => {
      status = SimulationStatus.PROCESSING;
      progress = 5;
      
      router.send('model', {
        id: '',
        type: EnvelopeMessageType.MODEL_RUN_STATUS,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          jobId,
          status,
          progress,
          currentStep: 'Initializing simulation'
        }
      });
    }, 1000);
    
    // Second update - validating
    setTimeout(() => {
      status = SimulationStatus.VALIDATING;
      progress = 15;
      
      router.send('model', {
        id: '',
        type: EnvelopeMessageType.MODEL_RUN_STATUS,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          jobId,
          status,
          progress,
          currentStep: 'Validating model structure'
        }
      });
    }, 2000);
    
    // Simulation updates
    const interval = setInterval(() => {
      if (progress >= 95) {
        clearInterval(interval);
        
        // Final update - completed
        setTimeout(() => {
          status = SimulationStatus.COMPLETED;
          progress = 100;
          
          router.send('model', {
            id: '',
            type: EnvelopeMessageType.MODEL_RUN_STATUS,
            source: 'host',
            target: 'model-iframe',
            version: '1.0',
            data: {
              jobId,
              status,
              progress,
              currentStep: 'Simulation complete',
              resultUrl: `/results/${jobId}`
            }
          });
          
          // Clean up job tracking after some time
          setTimeout(() => {
            SimulationHandler.activeJobs.delete(jobId);
          }, 60000);
          
        }, 1000);
        
        return;
      }
      
      // Regular updates during simulation
      status = SimulationStatus.RUNNING;
      progress += Math.floor(Math.random() * 10) + 5; // Increment by 5-15%
      progress = Math.min(progress, 95); // Cap at 95% until completion
      
      router.send('model', {
        id: '',
        type: EnvelopeMessageType.MODEL_RUN_STATUS,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          jobId,
          status,
          progress,
          currentStep: `Running simulation (${progress}%)`
        }
      });
      
    }, 2000);
  }
  
  /**
   * Get all active simulation jobs
   */
  public static getActiveJobs() {
    return Array.from(SimulationHandler.activeJobs.entries()).map(([jobId, job]) => ({
      jobId,
      ...job
    }));
  }
  
  /**
   * Get a specific job by ID
   */
  public static getJob(jobId: string) {
    const job = SimulationHandler.activeJobs.get(jobId);
    return job ? { jobId, ...job } : null;
  }
}
