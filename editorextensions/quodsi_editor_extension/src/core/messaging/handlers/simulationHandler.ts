import { 
  EnvelopeBase, 
  EnvelopeMessageType, 
  SimulationStatus,
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
import { router } from '../index';
import { ModelManager } from '../../ModelManager';
import { LucidDataActionUtility } from '../../../utils/LucidDataActionUtility';

const BASELINE_SCENARIO_ID = '00000000-0000-0000-0000-000000000000';

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
        // Handle async method - fire and forget, return true immediately
        SimulationHandler.handleRunRequest(msg).catch(error => {
          console.error('[SimulationHandler] Error in handleRunRequest:', error);
        });
        return true;
        
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
            status: SimulationStatus.FAILED,
            progress: 0,
            error: 'No model definition found. Please ensure the page contains Quodsi model elements.'
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
      
      // Generate job ID
      const jobId = `job-${documentProxy.id}-${Date.now()}`;
      
      // Send acknowledgement first
      router.send('model', {
        id: msg.id,
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
      
      // Submit to data connector
      console.log('[SimulationHandler] Submitting simulation to data connector...');
      
      try {
        await LucidDataActionUtility.performDataAction(client, {
          dataConnectorName: 'quodsi_data_connector',
          actionName: 'SaveAndSubmitSimulation',
          actionData: {
            documentId: documentProxy.id,
            scenarioId: BASELINE_SCENARIO_ID,
            model: serializedModel,
            scenarioName: data.scenarioName || 'New Scenario',
            diagramSvg: diagramSvg,
            appVersion: '1.0'
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
            status: SimulationStatus.PROCESSING,
            progress: 10,
            currentStep: 'Simulation submitted to backend'
          }
        });
        
        // Start polling for real status (or continue with mock for now)
        // In production, you would poll the backend for actual status
        SimulationHandler.mockSimulationProgress(jobId);
        
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
            status: SimulationStatus.FAILED,
            progress: 0,
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
          status: SimulationStatus.FAILED,
          progress: 0,
          error: `Failed to start simulation: ${error instanceof Error ? error.message : String(error)}`
        }
      });
    }
    
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
