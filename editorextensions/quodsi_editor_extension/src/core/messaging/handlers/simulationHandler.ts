import {
  EnvelopeBase,
  EnvelopeMessageType,
  SimulationStatus,
  SimulationJob,
  ModelSerializerFactory,
  Model
} from '@quodsi/shared';
import {
  DocumentProxy,
  PageProxy,
  UserProxy,
  Viewport,
  EditorClient
} from 'lucid-extension-sdk';
import { v4 as uuidv4 } from 'uuid';
import { router } from '../index';
import { ModelManager } from '../../ModelManager';
import { LucidDataActionUtility } from '../../../utils/LucidDataActionUtility';

/**
 * Handler for simulation-related messages
 */
export class SimulationHandler {
  /**
   * Active simulation jobs
   * Note: Uses Omit to exclude string-based timestamps and replace with Date objects for internal tracking
   */
  private static activeJobs: Map<string, Omit<SimulationJob, 'startTime' | 'lastUpdate'> & {
    startTime: Date;
    lastUpdate: Date;
    pollInterval?: any;
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
        // Handle async method - fire and forget, return true immediately
        SimulationHandler.handleRunRequest(msg).catch(error => {
          console.error('[SimulationHandler] Error in handleRunRequest:', error);
        });
        return true;

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
  private static async handleRunRequest(msg: EnvelopeBase): Promise<boolean> {
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
    
    try {
      // Get necessary instances
      const modelManager = ModelManager.getInstance();
      let client: EditorClient;
      
      try {
        client = ModelManager.getClient();
        console.log('[SimulationHandler] Successfully retrieved EditorClient');
      } catch (error) {
        console.error('[SimulationHandler] EditorClient not initialized:', error);
        console.error('[SimulationHandler] ModelManager instance exists:', !!modelManager);
        
        // Try to re-initialize if possible
        if ((globalThis as any).lucidEditorClient) {
          console.log('[SimulationHandler] Found global editor client, attempting to use it');
          client = (globalThis as any).lucidEditorClient;
        } else {
          // Send error response
          router.send('model', {
            id: msg.id,
            type: EnvelopeMessageType.MODEL_RUN_STATUS,
            source: 'host',
            target: 'model-iframe',
            version: '1.0',
            data: {
              jobId: 'error',
              status: SimulationStatus.FAILED,
              progress: 0,
              error: 'Editor client not initialized. Please try again.'
            }
          });
          
          return true;
        }
      }
      
      const viewport = new Viewport(client);
      const documentProxy = new DocumentProxy(client);
      const userProxy = new UserProxy(client);
      const activePageProxy = viewport.getCurrentPage();
      
      // Verify we have an active page
      if (!activePageProxy) {
        console.error('[SimulationHandler] No active page found');
        
        // Send error response
        router.send('model', {
          id: msg.id,
          type: EnvelopeMessageType.MODEL_RUN_STATUS,
          source: 'host',
          target: 'model-iframe',
          version: '1.0',
          data: {
            jobId: 'error',
            status: SimulationStatus.FAILED,
            progress: 0,
            error: 'No active page found'
          }
        });
        
        return true;
      }
      
      // Ensure the model is loaded for the current page
      console.log('[SimulationHandler] Ensuring model is loaded for current page...');
      try {
        // Check if current page is set in ModelManager
        const currentModelDef = await modelManager.getModelDefinition();
        if (!currentModelDef) {
          // Try to initialize/reload the model for the current page
          console.log('[SimulationHandler] No current model definition, attempting to initialize...');
          
          // Check if this is a Quodsi model page
          const isQuodsiModel = modelManager.isQuodsiModel(activePageProxy);
          if (!isQuodsiModel) {
            console.error('[SimulationHandler] Current page is not a Quodsi model');
            
            // Send error response
            router.send('model', {
              id: msg.id,
              type: EnvelopeMessageType.MODEL_RUN_STATUS,
              source: 'host',
              target: 'model-iframe',
              version: '1.0',
              data: {
                jobId: 'error',
                status: SimulationStatus.FAILED,
                progress: 0,
                error: 'Current page is not a Quodsi model. Please convert it first.'
              }
            });
            
            return true;
          }
          
          // Try to initialize the model for the current page
          console.log('[SimulationHandler] Initializing model for current page...');
          const basicModel = Model.createDefault(documentProxy.id);
          await modelManager.initializeModel(basicModel, activePageProxy);
        }
      } catch (error) {
        console.error('[SimulationHandler] Error during model initialization:', error);
      }
      
      // Get model definition
      const modelDefinition = await modelManager.getModelDefinition();
      if (!modelDefinition) {
        console.error('[SimulationHandler] No model definition found after initialization attempt');
        
        // Send error response
        router.send('model', {
          id: msg.id,
          type: EnvelopeMessageType.MODEL_RUN_STATUS,
          source: 'host',
          target: 'model-iframe',
          version: '1.0',
          data: {
            jobId: 'error',
            documentId: data.documentId,
            scenarioId: 'error',
            scenarioName: data.scenarioName || 'Error',
            status: SimulationStatus.FAILED,
            progress: 0,
            lastChecked: new Date().toISOString(),
            queuedAt: new Date().toISOString(),
            error: 'No model definition found. Please ensure the page contains Quodsi model elements.'
          }
        });

        return true;
      }

      // Check for existing simulation for this document
      const existingJob = Array.from(SimulationHandler.activeJobs.values())
        .find(job => job.documentId === documentProxy.id &&
                     (job.status === SimulationStatus.RUNNING ||
                      job.status === SimulationStatus.PROCESSING ||
                      job.status === SimulationStatus.QUEUED));

      if (existingJob) {
        console.warn('[SimulationHandler] Simulation already running for this document');
        router.send('model', {
          id: msg.id,
          type: EnvelopeMessageType.MODEL_RUN_STATUS,
          source: 'host',
          target: 'model-iframe',
          version: '1.0',
          data: {
            jobId: 'error',
            documentId: documentProxy.id,
            scenarioId: 'error',
            scenarioName: data.scenarioName || 'Error',
            status: SimulationStatus.FAILED,
            progress: 0,
            lastChecked: new Date().toISOString(),
            queuedAt: new Date().toISOString(),
            error: 'Simulation already running for this document. Please wait for it to complete.'
          }
        });
        return true;
      }

      // Serialize the model
      console.log('[SimulationHandler] Serializing model...');
      const serializer = ModelSerializerFactory.create(modelDefinition);
      const serializedModel = serializer.serialize(modelDefinition);
      console.log('[SimulationHandler] Model serialized successfully');
      
      // Get SVG representation of the current page
      console.log('[SimulationHandler] Getting SVG for the current page...');
      const diagramSvg = await activePageProxy.getSvg(undefined, true);
      console.log('[SimulationHandler] SVG obtained successfully');
      
      // Generate unique scenario ID and job ID
      const scenarioId = uuidv4();
      const timestamp = new Date();
      const queuedAt = timestamp.toISOString();
      const scenarioName = data.scenarioName || `Simulation ${timestamp.toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
      const jobId = `job-${documentProxy.id}-${Date.now()}`;

      // Send initial status (replaces old MODEL_RUN_ACK)
      router.send('model', {
        id: msg.id,
        type: EnvelopeMessageType.MODEL_RUN_STATUS,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          jobId,
          documentId: data.documentId,
          scenarioId,
          scenarioName,
          status: SimulationStatus.QUEUED,
          progress: 0,
          currentStep: 'Submitting simulation to Azure',
          lastChecked: queuedAt,
          queuedAt: queuedAt
        }
      });

      // Create job tracking
      SimulationHandler.activeJobs.set(jobId, {
        jobId,
        documentId: data.documentId,
        scenarioId,
        scenarioName,
        status: SimulationStatus.QUEUED,
        progress: 0,
        startTime: timestamp,
        lastUpdate: timestamp,
        currentStep: 'Submitting simulation to Azure'
      });
      
      // Submit to data connector
      console.log('[SimulationHandler] Submitting simulation to data connector...');
      
      try {
        await LucidDataActionUtility.performDataAction(client, {
          dataConnectorName: 'quodsi_data_connector',
          actionName: 'SaveAndSubmitSimulation',
          actionData: {
            documentId: documentProxy.id,
            scenarioId,
            model: serializedModel,
            scenarioName,
            diagramSvg: diagramSvg,
            appVersion: '2.0'
          },
          asynchronous: true
        });
        
        console.log('[SimulationHandler] Simulation submitted successfully');
        
        // Update job status
        const job = SimulationHandler.activeJobs.get(jobId);
        if (job) {
          job.status = SimulationStatus.PROCESSING;
          job.lastUpdate = new Date();
        }
        
        // Send processing status
        router.send('model', {
          id: '',
          type: EnvelopeMessageType.MODEL_RUN_STATUS,
          source: 'host',
          target: 'model-iframe',
          version: '1.0',
          data: {
            jobId,
            documentId: data.documentId,
            scenarioId,
            scenarioName,
            status: SimulationStatus.PROCESSING,
            progress: 10,
            currentStep: 'Simulation submitted to backend',
            lastChecked: new Date().toISOString(),
            queuedAt: queuedAt
          }
        });
        
        // Start polling for real status
        SimulationHandler.pollDocumentStatus(documentProxy.id, scenarioId, jobId);
        
      } catch (submitError) {
        console.error('[SimulationHandler] Error submitting simulation:', submitError);
        
        // Update job status
        const job = SimulationHandler.activeJobs.get(jobId);
        if (job) {
          job.status = SimulationStatus.FAILED;
          job.lastUpdate = new Date();
        }
        
        // Send error status
        router.send('model', {
          id: '',
          type: EnvelopeMessageType.MODEL_RUN_STATUS,
          source: 'host',
          target: 'model-iframe',
          version: '1.0',
          data: {
            jobId,
            documentId: data.documentId,
            scenarioId,
            scenarioName,
            status: SimulationStatus.FAILED,
            progress: 0,
            lastChecked: new Date().toISOString(),
            queuedAt: queuedAt,
            error: `Failed to submit simulation: ${submitError instanceof Error ? submitError.message : String(submitError)}`
          }
        });
      }

    } catch (error) {
      console.error('[SimulationHandler] Error handling simulation request:', error);

      // Send general error response
      router.send('model', {
        id: msg.id,
        type: EnvelopeMessageType.MODEL_RUN_STATUS,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          jobId: 'error',
          documentId: data.documentId,
          scenarioId: 'error',
          scenarioName: data.scenarioName || 'Error',
          status: SimulationStatus.FAILED,
          progress: 0,
          lastChecked: new Date().toISOString(),
          queuedAt: new Date().toISOString(),
          error: `Failed to start simulation: ${error instanceof Error ? error.message : String(error)}`
        }
      });
    }
    
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
   * Poll for real simulation status from data connector
   */
  private static async pollDocumentStatus(
    documentId: string,
    scenarioId: string,
    jobId: string
  ): Promise<void> {
    console.log('[SimulationHandler] Starting status polling', { documentId, scenarioId, jobId });

    const client = ModelManager.getClient();

    const pollInterval = setInterval(async () => {
      try {
        console.log('[SimulationHandler] Polling for status...');

        // Call GetDocumentStatus data action
        const result = await LucidDataActionUtility.performDataAction(client, {
          dataConnectorName: 'quodsi_data_connector',
          actionName: 'GetDocumentStatus',
          actionData: { documentId, scenarioId },
          asynchronous: false
        });

        if (!result.success) {
          console.error('[SimulationHandler] Status check failed:', result.error);
          return;
        }

        // Get scenario from result
        const scenario = result.scenario;

        if (!scenario) {
          console.log('[SimulationHandler] No scenario status available yet');
          return;
        }

        console.log('[SimulationHandler] Scenario status:', scenario.runState);

        // Map RunState to SimulationStatus
        let status: SimulationStatus;
        let progress: number;
        let currentStep: string;

        switch (scenario.runState) {
          case 'NOT_RUN':
            status = SimulationStatus.QUEUED;
            progress = 0;
            currentStep = 'Queued';
            break;
          case 'RUNNING':
            status = SimulationStatus.RUNNING;
            progress = 50;
            currentStep = 'Running simulation';
            break;
          case 'RAN_SUCCESSFULLY':
            status = SimulationStatus.COMPLETED;
            progress = 100;
            currentStep = 'Complete - Results ready';
            break;
          case 'RAN_WITH_ERRORS':
            status = SimulationStatus.FAILED;
            progress = 0;
            currentStep = 'Failed with errors';
            break;
          default:
            status = SimulationStatus.PROCESSING;
            progress = 25;
            currentStep = 'Processing';
        }

        // Update job tracking
        const job = SimulationHandler.activeJobs.get(jobId);
        if (job) {
          job.status = status;
          job.progress = progress;
          job.lastUpdate = new Date();
        }

        // Get job data for queuedAt and scenarioName
        const queuedAt = job?.startTime?.toISOString() || new Date().toISOString();
        const scenarioName = job?.scenarioName || 'New Scenario';

        // Send status update to React
        router.send('model', {
          id: '',
          type: EnvelopeMessageType.MODEL_RUN_STATUS,
          source: 'host',
          target: 'model-iframe',
          version: '1.0',
          data: {
            jobId,
            documentId,
            scenarioId,
            scenarioName,
            status,
            progress,
            currentStep,
            lastChecked: new Date().toISOString(),
            queuedAt,
            resultUrl: status === SimulationStatus.COMPLETED
              ? `/results/${documentId}/${scenario.id}`
              : undefined
          }
        });

        // Stop polling on terminal states
        if (status === SimulationStatus.COMPLETED ||
            status === SimulationStatus.FAILED) {
          console.log('[SimulationHandler] Simulation finished, stopping polling');
          clearInterval(pollInterval);

          // Clean up job tracking after 60s
          setTimeout(() => {
            SimulationHandler.activeJobs.delete(jobId);
          }, 60000);
        }

      } catch (error) {
        console.error('[SimulationHandler] Polling error:', error);

        // Get job for additional fields
        const job = SimulationHandler.activeJobs.get(jobId);
        const queuedAt = job?.startTime?.toISOString() || new Date().toISOString();
        const scenarioName = job?.scenarioName || 'New Scenario';

        // Send error status
        router.send('model', {
          id: '',
          type: EnvelopeMessageType.MODEL_RUN_STATUS,
          source: 'host',
          target: 'model-iframe',
          version: '1.0',
          data: {
            jobId,
            documentId,
            scenarioId,
            scenarioName,
            status: SimulationStatus.FAILED,
            progress: 0,
            error: `Status polling failed: ${error.message}`,
            lastChecked: new Date().toISOString(),
            queuedAt
          }
        });

        clearInterval(pollInterval);

        // Clean up job tracking
        if (job) {
          job.status = SimulationStatus.FAILED;
        }
      }
    }, 10000); // Poll every 10 seconds

    // Store interval for potential cleanup
    const job = SimulationHandler.activeJobs.get(jobId);
    if (job) {
      job.pollInterval = pollInterval;
    }
  }

  /**
   * Stop polling for a job
   */
  public static stopPolling(jobId: string): void {
    const job = SimulationHandler.activeJobs.get(jobId);
    if (job?.pollInterval) {
      clearInterval(job.pollInterval);
      job.pollInterval = undefined;
      console.log('[SimulationHandler] Stopped polling for job', jobId);
    }
  }

  /**
   * Stop all polling for a specific document
   */
  public static stopAllPollingForDocument(documentId: string): void {
    console.log('[SimulationHandler] Stopping all polling for document', documentId);

    SimulationHandler.activeJobs.forEach((job, jobId) => {
      if (job.documentId === documentId) {
        SimulationHandler.stopPolling(jobId);
        SimulationHandler.activeJobs.delete(jobId);
        console.log('[SimulationHandler] Cleaned up job', jobId);
      }
    });
  }

  /**
   * Check if there are active simulations and resume polling if needed
   * Called when panel is reopened
   */
  public static resumePollingIfNeeded(documentId: string): void {
    console.log('[SimulationHandler] Checking for active simulations...');

    // Find jobs for this document that are still running
    for (const [jobId, job] of SimulationHandler.activeJobs.entries()) {
      if (job.documentId === documentId) {
        const isRunning =
          job.status === SimulationStatus.QUEUED ||
          job.status === SimulationStatus.PROCESSING ||
          job.status === SimulationStatus.RUNNING ||
          job.status === SimulationStatus.VALIDATING;

        if (isRunning && !job.pollInterval) {
          console.log('[SimulationHandler] Resuming polling for job', jobId);
          const scenarioId = job.scenarioId || 'unknown';
          SimulationHandler.pollDocumentStatus(documentId, scenarioId, jobId);
        }
      }
    }
  }
  
  /**
   * Get all active simulation jobs
   */
  public static getActiveJobs() {
    return Array.from(SimulationHandler.activeJobs.entries()).map(([id, job]) => ({
      ...job,
      jobId: id
    }));
  }
  
  /**
   * Get a specific job by ID
   */
  public static getJob(jobId: string) {
    const job = SimulationHandler.activeJobs.get(jobId);
    return job ? { ...job, jobId } : null;
  }
}
