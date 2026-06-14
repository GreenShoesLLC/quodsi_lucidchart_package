import {
  EnvelopeBase,
  EnvelopeMessageType,
  SimulationStatus,
  SimulationJob,
  ModelSerializerFactory,
  Model,
  generateUUID,
  QUODSIM_VERSION,
  parsePageTranslate,
  offsetSerializedModelCoordinates,
} from '@quodsi/lucid-shared';
import { SwimLaneResourceInjector } from '../../../services/SwimLaneResourceInjector';
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
import { StorageAdapter } from '../../StorageAdapter';
import { upsertModelAndSeedScenariosIfEmpty, canonicalModelName } from '../../sync/scenarioSync';

export interface RunSubmitOutcome {
  accepted: boolean;
  error?: string;
}

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
   * Turn a 402 entitlement-exceeded response into a friendly user message.
   * Falls back to a generic HTTP-status message for other errors.
   */
  private static describeGateError(response: { status?: number; json?: any }): string {
    const detail = response?.json?.detail ?? response?.json;
    const code = detail?.code;
    const feature = detail?.feature;
    if (response?.status === 402 && code === 'entitlement_exceeded') {
      if (feature === 'simulations_per_month') {
        const limit = detail?.limit;
        return limit
          ? `Monthly simulation quota reached (${limit} runs). Upgrade your plan to run more this month.`
          : 'Monthly simulation quota reached. Upgrade your plan to run more this month.';
      }
      if (feature === 'scenarios_per_model') {
        const limit = detail?.limit;
        return limit
          ? `This model has reached its plan's run cap (${limit} distinct ${limit === 1 ? 'scenario' : 'scenarios'} per model). Re-runs are free, but to run a new scenario you'll need to delete an existing one or upgrade your plan.`
          : 'This model has reached its plan\'s run cap. Re-runs are free, but to run a new scenario you\'ll need to delete an existing one or upgrade your plan.';
      }
      return 'This action requires a paid plan. Upgrade to continue.';
    }
    const detailText =
      typeof detail === 'string' ? detail : detail?.message ?? JSON.stringify(response?.json);
    return `Simulation request failed (HTTP ${response?.status ?? 'unknown'}): ${detailText}`;
  }

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
  public static async handleRunRequest(msg: EnvelopeBase): Promise<RunSubmitOutcome> {
    const data = msg.data as {
      documentId: string;
      scenarioName?: string;
      durationDays?: number;
      repetitions?: number;
      parameters?: Record<string, unknown>;
      scenarioDefinitionId?: string;
      enableAnimation?: boolean;
      // Embed-originated runs (Studio runner via RUN_SCENARIO delegation) manage
      // their own lifecycle (backend + Studio 10s poll) and must NOT use the legacy
      // in-memory activeJobs concurrency tracker: it's never terminalized in the embed
      // flow (the quodsim-react ScenarioEditor reconciliation is hidden), which would
      // otherwise wedge runs to "once per page refresh".
      fromEmbed?: boolean;
    };
    const fromEmbed = !!data.fromEmbed;

    console.log('[SimulationHandler] Simulation run requested', {
      documentId: data.documentId,
      scenario: data.scenarioName || 'Default'
    });

    // DEFENSIVE CLEANUP: Remove any stale COMPLETED/FAILED jobs for this document
    // This prevents race conditions where a job completes but hasn't been cleaned up yet
    for (const [jobId, job] of SimulationHandler.activeJobs.entries()) {
      if (job.documentId === data.documentId &&
          (job.status === SimulationStatus.COMPLETED ||
           job.status === SimulationStatus.FAILED)) {
        SimulationHandler.activeJobs.delete(jobId);
        console.log('[SimulationHandler] Cleaned up stale job during defensive cleanup', jobId);
      }
    }

    // FAST FAIL: Check for active simulation BEFORE expensive operations
    // Only check for truly active states (not COMPLETED or FAILED)
    const existingJob = Array.from(SimulationHandler.activeJobs.values())
      .find(job => job.documentId === data.documentId &&
                   (job.status === SimulationStatus.RUNNING ||
                    job.status === SimulationStatus.PROCESSING ||
                    job.status === SimulationStatus.VALIDATING ||
                    job.status === SimulationStatus.QUEUED));

    if (existingJob && !fromEmbed) {
      console.warn('[SimulationHandler] Simulation already running for this document');
      router.send('model', {
        id: msg.id,
        type: EnvelopeMessageType.MODEL_RUN_STATUS,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          jobId: `error-${Date.now()}`,
          documentId: data.documentId,
          scenarioId: data.scenarioDefinitionId || 'baseline',
          scenarioName: data.scenarioName || 'Error',
          status: SimulationStatus.FAILED,
          progress: 0,
          lastChecked: new Date().toISOString(),
          queuedAt: new Date().toISOString(),
          error: 'Simulation already running for this document. Please wait for it to complete.'
        }
      });
      return { accepted: false, error: 'Simulation already running for this document. Please wait for it to complete.' };
    }

    // Outcome locals — set below in success/error paths, returned after try/catch.
    let runAccepted = false;
    let runError: string | undefined;

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
              jobId: `error-${Date.now()}`,
              documentId: data.documentId,
              scenarioId: data.scenarioDefinitionId || 'baseline',
              scenarioName: data.scenarioName || 'Error',
              status: SimulationStatus.FAILED,
              progress: 0,
              lastChecked: new Date().toISOString(),
              queuedAt: new Date().toISOString(),
              error: 'Editor client not initialized. Please try again.'
            }
          });

          return { accepted: false, error: 'Editor client not initialized. Please try again.' };
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
            jobId: `error-${Date.now()}`,
            documentId: data.documentId,
            scenarioId: data.scenarioDefinitionId || 'baseline',
            scenarioName: data.scenarioName || 'Error',
            status: SimulationStatus.FAILED,
            progress: 0,
            lastChecked: new Date().toISOString(),
            queuedAt: new Date().toISOString(),
            error: 'No active page found'
          }
        });

        return { accepted: false, error: 'No active page found' };
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
                jobId: `error-${Date.now()}`,
                documentId: data.documentId,
                scenarioId: data.scenarioDefinitionId || 'baseline',
                scenarioName: data.scenarioName || 'Error',
                status: SimulationStatus.FAILED,
                progress: 0,
                lastChecked: new Date().toISOString(),
                queuedAt: new Date().toISOString(),
                error: 'Current page is not a Quodsi model. Please convert it first.'
              }
            });

            return { accepted: false, error: 'Current page is not a Quodsi model. Please convert it first.' };
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
            jobId: `error-${Date.now()}`,
            documentId: data.documentId,
            scenarioId: data.scenarioDefinitionId || 'baseline',
            scenarioName: data.scenarioName || 'Error',
            status: SimulationStatus.FAILED,
            progress: 0,
            lastChecked: new Date().toISOString(),
            queuedAt: new Date().toISOString(),
            error: 'No model definition found. Please ensure the page contains Quodsi model elements.'
          }
        });

        return { accepted: false, error: 'No model definition found. Please ensure the page contains Quodsi model elements.' };
      }

      // Serialize the model
      console.log('[SimulationHandler] Serializing model...');
      const serializer = ModelSerializerFactory.create(modelDefinition);
      const serializedModel = serializer.serialize(modelDefinition);

      // Inject runtime-derived swimlane resource requirements (Seize/Release brackets)
      SwimLaneResourceInjector.inject(serializedModel, activePageProxy);

      console.log('[SimulationHandler] Model serialized successfully');

      // Use scenario definition ID as blob folder name (or generate UUID for baseline)
      let scenarioId = data.scenarioDefinitionId || generateUUID();

      // Get SVG representation of the current page
      console.log('[SimulationHandler] Getting SVG for the current page...');
      const diagramSvg = await activePageProxy.getSvg(undefined, true);
      console.log('[SimulationHandler] SVG obtained successfully');

      // getSvg() wraps the page in a translate() to normalize negative
      // coordinates into a positive viewBox. layout.json uses the raw model
      // coordinates, so align the serialized model into the SVG's frame by
      // applying the same page-translate. Keeps the SVG and skeleton/entities
      // in one coordinate space; a {0,0} translate is a no-op.
      const pageTranslate = parsePageTranslate(diagramSvg);
      if (pageTranslate.x !== 0 || pageTranslate.y !== 0) {
        offsetSerializedModelCoordinates(serializedModel, pageTranslate.x, pageTranslate.y);
        console.log('[SimulationHandler] Aligned model coords to SVG page-translate', pageTranslate);
      }
      const timestamp = new Date();
      const queuedAt = timestamp.toISOString();
      const scenarioName = data.scenarioName || `Simulation ${timestamp.toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
      const jobId = `job-${documentProxy.id}-${Date.now()}`;

      // Extract scenario config from model for the optimistic card
      const reps = modelDefinition.model.reps || 0;
      const runClockPeriod = modelDefinition.model.runClockPeriod || 0;
      const runClockPeriodUnit = modelDefinition.model.runClockPeriodUnit || 'Minutes';

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
          queuedAt: queuedAt,
          reps,
          runClockPeriod,
          runClockPeriodUnit
        }
      });

      // Create job tracking. Skipped for embed runs (see fromEmbed): they're tracked
      // server-side + by the Studio poll, so registering here only leaves a stale
      // QUEUED entry that would block the next run until a page refresh.
      if (!fromEmbed) SimulationHandler.activeJobs.set(jobId, {
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
      
      // Guarantee the scenario row exists in quodsi_api before submitting.
      // On a brand-new model the auto-created Baseline may not have synced yet;
      // SaveAndSubmitSimulation only looks the scenario up (404 if missing).
      // SyncScenarios is replace-all (idempotent), so this is safe to run every time.
      try {
        const storageAdapter = new StorageAdapter();
        const scenarios = storageAdapter.getScenarios(activePageProxy);
        const sync = upsertModelAndSeedScenariosIfEmpty;
        const { substitutions } = await sync(client, {
          documentId: documentProxy.id,
          pageId: activePageProxy.id,
          modelName: await canonicalModelName(modelManager),
          scenarios,
        });
        // If the server rewrote the Baseline id, persist it and re-target the run.
        if (substitutions.size > 0) {
          const updated = scenarios.map(s =>
            substitutions.has(s.id) ? { ...s, id: substitutions.get(s.id)! } : s
          );
          await modelManager.updateScenarios(updated, activePageProxy);
          if (substitutions.has(scenarioId)) {
            scenarioId = substitutions.get(scenarioId)!;
            // Keep the optimistic job's scenarioId in sync with the re-targeted
            // id, or reconcileWithScenarioList (which matches on job.scenarioId)
            // would fail to find the run in the server list and silently drop it.
            const job = SimulationHandler.activeJobs.get(jobId);
            if (job) { job.scenarioId = scenarioId; }
          }
        }
      } catch (syncErr) {
        console.error('[SimulationHandler] Pre-run sync failed:', syncErr);
        const job = SimulationHandler.activeJobs.get(jobId);
        if (job) { job.status = SimulationStatus.FAILED; job.lastUpdate = new Date(); }
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
            queuedAt,
            error: "Couldn't sync the model before running. Check your sign-in / connection and try again.",
          },
        });
        return { accepted: false, error: "Couldn't sync the model before running. Check your sign-in / connection and try again." }; // do not submit into a downstream 404
      }

      // Submit to data connector
      console.log('[SimulationHandler] Submitting simulation to data connector...');

      try {
        const submitResult = await LucidDataActionUtility.performDataAction(client, {
          dataConnectorName: 'quodsi_api_data_connector',
          actionName: 'SaveAndSubmitSimulation',
          actionData: {
            documentId: documentProxy.id,
            pageId: activePageProxy.id,
            scenarioId,
            model: serializedModel,
            scenarioName,
            diagramSvg: diagramSvg,
            appVersion: QUODSIM_VERSION,
            // Opt-in animation (default off). Backend reads action_data.enableAnimation
            // (lucid_router); engine generates animation for replication 1 only.
            enableAnimation: data.enableAnimation ?? false
          },
          asynchronous: false
        }) as { status?: number; json?: any };

        // Lucid's performDataAction returns { status, json } rather than
        // throwing on 4xx. Detect the entitlement gate explicitly so the
        // user sees a clear "quota reached" message instead of a silent
        // failure or a generic network error.
        if (submitResult?.status && submitResult.status >= 400) {
          const err: any = new Error(
            SimulationHandler.describeGateError(submitResult)
          );
          err.status = submitResult.status;
          err.detail = submitResult.json?.detail ?? submitResult.json;
          throw err;
        }

        // Broadcast updated entitlements so the React PlanBadge reflects
        // the bumped `used` counter without a separate fetch.
        const refreshed = submitResult?.json?.entitlements;
        if (refreshed) {
          router.send('broadcast', {
            id: `ent-${Date.now()}`,
            type: EnvelopeMessageType.ENTITLEMENTS_STATUS,
            source: 'host',
            target: 'broadcast',
            version: '1.0',
            data: refreshed,
          });
        }

        console.log('[SimulationHandler] Simulation submitted successfully');

        // Update job status - keep as QUEUED (not PROCESSING) since status.json says QUEUED
        const job = SimulationHandler.activeJobs.get(jobId);
        if (job) {
          job.status = SimulationStatus.QUEUED;
          job.lastUpdate = new Date();
        }

        // Send queued status (matches status.json which has QUEUED)
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
            status: SimulationStatus.QUEUED,
            progress: 5,
            currentStep: 'Simulation queued - waiting for compute',
            lastChecked: new Date().toISOString(),
            queuedAt: queuedAt,
            reps,
            runClockPeriod,
            runClockPeriodUnit
          }
        });

        runAccepted = true;

        // NOTE: Pre-flight checks in SaveAndSubmitSimulation catch infrastructure errors immediately
        // (missing app package, pool not configured, etc.)
        // Status updates will come from ListScenarios reconciliation (called by ScenarioEditor every 10s)
        // ListScenarios has 3-minute stale detection as a fallback for runtime failures

      } catch (submitError) {
        console.error('[SimulationHandler] Error submitting simulation:', submitError);

        // Update job status
        const job = SimulationHandler.activeJobs.get(jobId);
        if (job) {
          job.status = SimulationStatus.FAILED;
          job.lastUpdate = new Date();
        }

        // If the error carries a 402 detail (either from our own throw above
        // or from the Lucid SDK when it decides to throw on 4xx), prefer the
        // friendly entitlement message over a generic "Failed to submit".
        const errAny = submitError as any;
        const wrappedStatus = errAny?.status ?? errAny?.response?.status;
        const wrappedJson = errAny?.detail
          ? { detail: errAny.detail }
          : errAny?.response?.json;
        const friendly =
          wrappedStatus && wrappedStatus >= 400
            ? SimulationHandler.describeGateError({
                status: wrappedStatus,
                json: wrappedJson,
              })
            : null;
        const errorMessage = friendly
          ?? `Failed to submit simulation: ${submitError instanceof Error ? submitError.message : String(submitError)}`;

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
            error: errorMessage,
            errorType: wrappedStatus === 402 ? 'ENTITLEMENT_EXCEEDED' : undefined,
          }
        });
        runError = errorMessage;
      }

    } catch (error) {
      console.error('[SimulationHandler] Error handling simulation request:', error);

      const errorScenarioId = data.scenarioDefinitionId || 'baseline';

      // Send general error response
      router.send('model', {
        id: msg.id,
        type: EnvelopeMessageType.MODEL_RUN_STATUS,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          jobId: `error-${Date.now()}`,
          documentId: data.documentId,
          scenarioId: errorScenarioId,
          scenarioName: data.scenarioName || 'Error',
          status: SimulationStatus.FAILED,
          progress: 0,
          lastChecked: new Date().toISOString(),
          queuedAt: new Date().toISOString(),
          error: `Failed to start simulation: ${error instanceof Error ? error.message : String(error)}`,
          errorType: 'SERIALIZATION_ERROR',
          errorDetails: error instanceof Error ? error.stack : undefined
        }
      });
      runError = `Failed to start simulation: ${error instanceof Error ? error.message : String(error)}`;
    }

    return { accepted: runAccepted, error: runError };
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
   * Stop polling for a specific scenario by scenarioId
   * Called when a scenario is deleted
   */
  public static stopPollingForScenario(scenarioId: string): void {
    console.log('[SimulationHandler] Stopping polling for scenario', scenarioId);

    // Find and stop all jobs for this scenario
    for (const [jobId, job] of SimulationHandler.activeJobs.entries()) {
      if (job.scenarioId === scenarioId) {
        // Stop polling if active
        if (job.pollInterval) {
          clearInterval(job.pollInterval);
          job.pollInterval = undefined;
        }

        // Remove from active jobs
        SimulationHandler.activeJobs.delete(jobId);
        console.log('[SimulationHandler] Cleaned up job for deleted scenario', jobId);
      }
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
   * Reconcile active simulation jobs with scenario list from Azure
   * Called whenever ListScenarios returns data (every 10s during auto-refresh)
   * This eliminates need for separate GetDocumentStatus polling
   *
   * @param documentId Document ID to reconcile jobs for
   * @param scenarios Array of scenarios from ListScenarios action
   */
  public static reconcileWithScenarioList(
    documentId: string,
    scenarios: Array<{
      id: string;
      name: string;
      runState: string;  // RunState enum values: 'NOT_RUN', 'RUNNING', 'RAN_SUCCESSFULLY', 'RAN_WITH_ERRORS'
      hasResults: boolean;
      completedAt?: string;
    }>
  ): void {
    console.log('[SimulationHandler] Reconciling active jobs with scenario list', {
      documentId,
      scenarioCount: scenarios.length,
      activeJobCount: SimulationHandler.activeJobs.size
    });

    // Helper function to map Azure RunState to SimulationStatus
    const mapRunStateToStatus = (runState: string): SimulationStatus => {
      switch (runState) {
        case 'RAN_SUCCESSFULLY':
          return SimulationStatus.COMPLETED;
        case 'RAN_WITH_ERRORS':
          return SimulationStatus.FAILED;
        case 'RUNNING':
          return SimulationStatus.RUNNING;
        case 'QUEUED':
          return SimulationStatus.QUEUED;
        case 'CANCELLED':
          return SimulationStatus.CANCELLED;
        case 'NOT_RUN':
        default:
          return SimulationStatus.QUEUED;
      }
    };

    // Reconcile each active job with Azure state
    for (const [jobId, job] of SimulationHandler.activeJobs.entries()) {
      // Only process jobs for this document
      if (job.documentId !== documentId) continue;

      // Find matching scenario in Azure
      const scenario = scenarios.find(s => s.id === job.scenarioId);

      if (!scenario) {
        // Scenario was deleted in Azure, clean up
        console.log('[SimulationHandler] Scenario deleted in Azure, cleaning up job', {
          jobId,
          scenarioId: job.scenarioId
        });

        if (job.pollInterval) {
          clearInterval(job.pollInterval);
          job.pollInterval = undefined;
        }

        SimulationHandler.activeJobs.delete(jobId);
        continue;
      }

      // Map Azure RunState to SimulationStatus
      const newStatus = mapRunStateToStatus(scenario.runState);

      // Check if status changed
      if (job.status !== newStatus) {
        console.log('[SimulationHandler] Status changed for job', {
          jobId,
          scenarioId: job.scenarioId,
          oldStatus: job.status,
          newStatus,
          runState: scenario.runState
        });

        // Update job status
        job.status = newStatus;
        job.lastUpdate = new Date();

        // Calculate progress based on status
        const progress = newStatus === SimulationStatus.COMPLETED ? 100 :
                        newStatus === SimulationStatus.RUNNING ? 70 :
                        newStatus === SimulationStatus.FAILED ? 0 : 10;

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
            scenarioId: job.scenarioId,
            scenarioName: scenario.name,
            status: newStatus,
            progress,
            currentStep: newStatus === SimulationStatus.COMPLETED ? 'Simulation complete' :
                        newStatus === SimulationStatus.RUNNING ? 'Running simulation' :
                        newStatus === SimulationStatus.FAILED ? 'Simulation failed' :
                        'Simulation queued',
            lastChecked: new Date().toISOString(),
            queuedAt: job.startTime.toISOString(),
            hasResults: scenario.hasResults
          }
        });

        // Stop polling and clean up if terminal state
        if (newStatus === SimulationStatus.COMPLETED || newStatus === SimulationStatus.FAILED) {
          console.log('[SimulationHandler] Terminal state reached, cleaning up job', jobId);

          if (job.pollInterval) {
            clearInterval(job.pollInterval);
            job.pollInterval = undefined;
          }

          SimulationHandler.activeJobs.delete(jobId);
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
