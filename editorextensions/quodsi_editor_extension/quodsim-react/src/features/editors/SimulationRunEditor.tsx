import React, { useState, useEffect, useCallback, useRef } from "react";
import { PlaySquare, RefreshCw, Loader, FileQuestion, XCircle, CloudUpload } from "lucide-react";
import { consumePendingSubmission, clearPendingSubmission } from "../../utils/pendingSubmission";
import SimulationRunCard from "./SimulationRunCard";
import { RunState, EnvelopeMessageType, MAX_SIMULATION_RUNS, SimulationRunDownloadInfo } from "@quodsi/shared";
import { useSimulationRunSender } from "../../messaging/senders/simulationRunSender";
import { useSimulationRuns, useMessagingDispatch } from "../../messaging/MessageProvider";
import { selectSimulationRuns, selectSimulationRunsLoading, selectSimulationRunsError } from "../../messaging/state/simulationRunSlice";

/**
 * Maps SimulationStatus string values to RunState enum values
 * Note: SimulationStatus enum values are lowercase
 * QUEUED is now a distinct state (job submitted, Python not yet started)
 * RUNNING indicates Python is actively executing
 */
function mapStatusToRunState(status: string): RunState {
  switch (status.toLowerCase()) {
    case 'queued':
      return RunState.Queued;
    case 'processing':
    case 'validating':
    case 'running':
      return RunState.Running;
    case 'completed':
      return RunState.RanSuccessfully;
    case 'failed':
    case 'error':
      return RunState.RanWithErrors;
    default:
      return RunState.NotRun;
  }
}

interface SimulationRun {
  id: string;
  name: string;
  runState: RunState;
  reps: number;
  runClockPeriod: number;
  runClockPeriodUnit: string;
  simulationTimeType: string;
  completedAt?: string;
  hasResults: boolean;
  downloadInfo?: SimulationRunDownloadInfo;
}

interface SimulationRunEditorProps {
  documentId?: string;
  onAnalyze?: (simulationRunId: string) => void;
}

type AutoRefreshMode = 'off' | 'smart' | 'on';

const SimulationRunEditor: React.FC<SimulationRunEditorProps> = ({ documentId, onAnalyze }) => {
  // Redux state
  const simulationRunState = useSimulationRuns();
  const simulationRuns = selectSimulationRuns({ simulationRuns: simulationRunState });
  const loading = selectSimulationRunsLoading({ simulationRuns: simulationRunState });
  const error = selectSimulationRunsError({ simulationRuns: simulationRunState });
  const dispatch = useMessagingDispatch();

  // Local state (not in Redux)
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [deletingRuns, setDeletingRuns] = useState<Set<string>>(new Set());
  const [autoRefreshMode, setAutoRefreshMode] = useState<AutoRefreshMode>('off');
  const [submittingRunName, setSubmittingRunName] = useState<string | null>(null);
  const { listSimulationRuns, deleteSimulationRun } = useSimulationRunSender();

  // Ref to track current simulation runs without causing dependency cycles
  const simulationRunsRef = useRef(simulationRuns);
  simulationRunsRef.current = simulationRuns;

  // On mount, check if there's a pending submission (set by ModelPanel before tab switch)
  useEffect(() => {
    const pending = consumePendingSubmission();
    if (pending) {
      setSubmittingRunName(pending);

      // Safety timeout: clear placeholder after 15 seconds.
      // By then, a MODEL_RUN_STATUS should have arrived and created
      // an optimistic SimulationRunCard, or the submission failed.
      const timeout = setTimeout(() => {
        setSubmittingRunName(null);
      }, 15000);

      return () => clearTimeout(timeout);
    }
  }, []);

  // Clear placeholder when a real simulation run card appears for the submission
  useEffect(() => {
    if (submittingRunName && simulationRuns.length > 0) {
      const hasActiveRun = simulationRuns.some(
        s => s.runState === RunState.Queued || s.runState === RunState.Running
      );
      if (hasActiveRun) {
        setSubmittingRunName(null);
      }
    }
  }, [simulationRuns, submittingRunName]);

  // Helper function to check if run name is in datetime format (YY-MM-DD HH:mm:ss)
  const isDatetimeFormat = useCallback((name: string): boolean => {
    return /^\d{2}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(name);
  }, []);

  // Helper function to sort simulation runs by name (most recent datetime first)
  const sortSimulationRuns = useCallback((runList: SimulationRun[]): SimulationRun[] => {
    return [...runList].sort((a, b) => {
      const aIsDatetime = isDatetimeFormat(a.name);
      const bIsDatetime = isDatetimeFormat(b.name);

      // If both are datetime format, sort descending (most recent first)
      if (aIsDatetime && bIsDatetime) {
        return b.name.localeCompare(a.name);
      }

      // If only one is datetime, datetime comes first
      if (aIsDatetime) return -1;
      if (bIsDatetime) return 1;

      // If neither is datetime, maintain original order
      return 0;
    });
  }, [isDatetimeFormat]);

  // Load simulation runs function
  // forceRefresh: when true, always fetches from server; when false, uses smart skip logic
  const loadSimulationRuns = useCallback((forceRefresh: boolean = true) => {
    if (!documentId) {
      dispatch({ type: 'SIMULATION_RUNS_ERROR', error: "No document ID available" });
      return;
    }

    // Smart skip logic: if not forcing refresh, we have cached runs, and none are active (queued/running)
    const currentRuns = simulationRunsRef.current;
    if (!forceRefresh && currentRuns.length > 0) {
      const hasActive = currentRuns.some(s =>
        s.runState === RunState.Running || s.runState === RunState.Queued
      );
      if (!hasActive) {
        console.log('[SimulationRunEditor] Using cached runs (none active), skipping fetch');
        return;
      }
    }

    dispatch({ type: 'SIMULATION_RUNS_LOADING' });

    try {
      // Use the proper sender hook
      listSimulationRuns(documentId);
      // Response will be handled in the message listener below
    } catch (err) {
      dispatch({
        type: 'SIMULATION_RUNS_ERROR',
        error: err instanceof Error ? err.message : "Failed to load runs"
      });
    }
  }, [documentId, listSimulationRuns, dispatch]);

  // Handle messages from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      // Check for envelope-formatted messages
      if (message.type === EnvelopeMessageType.SIMULATION_RUNS_LIST_RESULT) {
        const unsortedRuns: SimulationRun[] = message.data?.scenarios || [];

        // Preserve optimistic names: if Azure returns a UUID-like name but we
        // already have a human-readable name from the optimistic card, keep ours.
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const currentRuns = simulationRunsRef.current;
        const merged = unsortedRuns.map((incoming: SimulationRun) => {
          const existing = currentRuns.find(s => s.id === incoming.id);
          if (existing && uuidPattern.test(incoming.name) && !uuidPattern.test(existing.name)) {
            return { ...incoming, name: existing.name };
          }
          return incoming;
        });

        // Preserve optimistic runs that haven't appeared in Azure yet
        // (QUEUED/RUNNING runs that exist locally but not in the incoming list)
        const incomingIds = new Set(unsortedRuns.map(s => s.id));
        const optimisticRuns = currentRuns.filter(s =>
          !incomingIds.has(s.id) &&
          (s.runState === RunState.Queued || s.runState === RunState.Running)
        );

        dispatch({
          type: 'SIMULATION_RUNS_SUCCESS',
          simulationRuns: sortSimulationRuns([...optimisticRuns, ...merged])
        });
      } else if (message.type === "ERROR" && message.data?.relatedTo === EnvelopeMessageType.SIMULATION_RUNS_LIST_REQUEST) {
        dispatch({
          type: 'SIMULATION_RUNS_ERROR',
          error: message.data?.message || "Failed to load runs"
        });
      } else if (message.type === EnvelopeMessageType.SIMULATION_RUN_DELETE_RESULT) {
        const result = message.data;
        if (result?.success) {
          console.log('[SimulationRunEditor] Run deleted successfully');
          // Remove from deleting set
          setDeletingRuns(prev => {
            const updated = new Set(prev);
            updated.delete(result.simulationRunId);
            return updated;
          });
          // Refresh the list to confirm server state
          loadSimulationRuns();
        } else {
          console.error('[SimulationRunEditor] Failed to delete run:', result?.error);
          // Remove from deleting set and restore run by refreshing
          setDeletingRuns(prev => {
            const updated = new Set(prev);
            updated.delete(result.simulationRunId);
            return updated;
          });
          dispatch({
            type: 'SIMULATION_RUNS_ERROR',
            error: result?.error || "Failed to delete run"
          });
          // Refresh to restore the run in the list
          loadSimulationRuns();
        }
      } else if (message.type === EnvelopeMessageType.MODEL_RUN_STATUS) {
        const statusData = message.data;

        if (statusData && statusData.scenarioId) {
          console.log('[SimulationRunEditor] Received MODEL_RUN_STATUS:', {
            scenarioId: statusData.scenarioId,
            scenarioName: statusData.scenarioName,
            status: statusData.status
          });

          // Special handling for error runs
          if (statusData.scenarioId === 'error' && statusData.status === 'failed') {
            console.error('[SimulationRunEditor] Simulation failed:', statusData.error);
            setSubmittingRunName(null);
            dispatch({
              type: 'SIMULATION_RUNS_ERROR',
              error: statusData.error || 'Simulation failed to start'
            });
            return; // Don't try to create/update run card
          }

          // Check if run exists in current state
          const currentRuns = simulationRunsRef.current;
          const existingRun = currentRuns.find(s => s.id === statusData.scenarioId);

          if (existingRun) {
            // UPDATE existing run via Redux
            console.log('[SimulationRunEditor] Updating existing run in Redux:', statusData.scenarioName);
            dispatch({
              type: 'SIMULATION_RUN_UPDATE_STATUS',
              simulationRunId: statusData.scenarioId,
              runState: mapStatusToRunState(statusData.status),
              hasResults: statusData.status === 'completed' || statusData.hasResults || false
            });
          } else {
            // CREATE new run optimistically (only for initial statuses)
            if (statusData.status === 'queued' || statusData.status === 'processing') {
              console.log('[SimulationRunEditor] Creating new optimistic run:', statusData.scenarioName);
              const newRun: SimulationRun = {
                id: statusData.scenarioId,
                name: statusData.scenarioName || 'New Simulation',
                runState: mapStatusToRunState(statusData.status),
                reps: statusData.reps || 0,
                runClockPeriod: statusData.runClockPeriod || 0,
                runClockPeriodUnit: statusData.runClockPeriodUnit || 'Minutes',
                simulationTimeType: statusData.simulationTimeType || 'Clock',
                completedAt: statusData.queuedAt,
                hasResults: false
              };
              // Add to existing runs
              dispatch({
                type: 'SIMULATION_RUNS_SUCCESS',
                simulationRuns: sortSimulationRuns([newRun, ...currentRuns])
              });
              // Clear the submitting placeholder now that we have a real card
              setSubmittingRunName(null);
              // Auto-enable refresh when simulation starts (only upgrade from 'off')
              setAutoRefreshMode(prev => {
                if (prev === 'off') {
                  console.log('[SimulationRunEditor] Auto-refresh upgraded from OFF to SMART');
                  return 'smart';
                }
                console.log('[SimulationRunEditor] Auto-refresh kept at', prev);
                return prev;
              });
            } else {
              // Status came for unknown run that's not in initial state - ignore
              console.warn('[SimulationRunEditor] Received status for unknown run (not QUEUED/PROCESSING):', statusData.scenarioId);
            }
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [documentId, loadSimulationRuns, sortSimulationRuns, dispatch]);

  // Load simulation runs on mount (or when tab switching causes remount)
  // Uses smart skip: won't refetch if we have cached runs and none are running
  useEffect(() => {
    if (documentId) {
      loadSimulationRuns(false); // Don't force refresh - use cache if appropriate
    }
  }, [documentId, loadSimulationRuns]);

  // Detect when tab/window becomes visible
  useEffect(() => {
    const handleVisibility = () => {
      const visible = document.visibilityState === 'visible';
      setIsTabVisible(visible);

      // Refresh immediately when tab becomes visible
      if (visible && documentId) {
        console.log('[SimulationRunEditor] Tab became visible, refreshing runs');
        loadSimulationRuns();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [documentId, loadSimulationRuns]);

  // Auto-refresh based on mode: off, smart, or on
  useEffect(() => {
    // Off mode: never auto-refresh
    if (autoRefreshMode === 'off') {
      console.log('[SimulationRunEditor] Auto-refresh OFF');
      return;
    }

    if (!isTabVisible) {
      console.log('[SimulationRunEditor] Tab not visible, skipping auto-refresh');
      return;
    }

    // Smart mode: only refresh when runs are active (queued or running)
    if (autoRefreshMode === 'smart') {
      const hasActive = simulationRuns.some(s =>
        s.runState === RunState.Running || s.runState === RunState.Queued
      );
      if (!hasActive) {
        console.log('[SimulationRunEditor] Smart mode: No active runs, skipping auto-refresh');
        return;
      }
    }

    // On mode OR (Smart mode + hasRunning): set up interval
    console.log(`[SimulationRunEditor] Auto-refresh active (${autoRefreshMode} mode)`);
    const interval = setInterval(() => {
      console.log('[SimulationRunEditor] Auto-refreshing runs');
      loadSimulationRuns();
    }, 10000); // 10 seconds

    return () => {
      console.log('[SimulationRunEditor] Clearing auto-refresh interval');
      clearInterval(interval);
    };
  }, [autoRefreshMode, simulationRuns, isTabVisible, documentId, loadSimulationRuns]);

  const handleDeleteRun = useCallback((runId: string) => {
    if (!documentId) {
      console.error('[SimulationRunEditor] Cannot delete run: missing documentId');
      return;
    }

    console.log('[SimulationRunEditor] Deleting run:', runId);

    // Optimistic update: immediately add to deleting set and remove from list
    setDeletingRuns(prev => new Set(prev).add(runId));
    dispatch({
      type: 'SIMULATION_RUNS_SUCCESS',
      simulationRuns: simulationRunsRef.current.filter(s => s.id !== runId)
    });

    // Send delete request
    deleteSimulationRun(documentId, runId);
    // Result will be handled in the message listener
  }, [documentId, deleteSimulationRun, dispatch]);

  // Helper to get badge color based on run count
  const getBadgeColor = () => {
    if (simulationRuns.length >= MAX_SIMULATION_RUNS) return "bg-red-100 text-red-800 border-red-300";
    if (simulationRuns.length === MAX_SIMULATION_RUNS - 1) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-green-100 text-green-800 border-green-300";
  };

  return (
    <div className="simulation-run-editor p-2">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div className={`px-2 py-1 text-xs font-medium border rounded ${getBadgeColor()}`}>
          Runs: {simulationRuns.length}/{MAX_SIMULATION_RUNS}
        </div>
        <div className="flex items-center gap-1">
          {/* Auto-refresh dropdown */}
          <select
            value={autoRefreshMode}
            onChange={(e) => setAutoRefreshMode(e.target.value as AutoRefreshMode)}
            className="text-xs border border-gray-300 rounded px-1 py-1 bg-white"
            title="Auto-refresh mode"
          >
            <option value="off">Auto: Off</option>
            <option value="smart">Auto: Smart</option>
            <option value="on">Auto: On</option>
          </select>
          {/* Manual refresh button */}
          <button
            onClick={() => loadSimulationRuns()}
            disabled={loading}
            className="p-1 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh runs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-600 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center p-8">
          <Loader className="w-6 h-6 animate-spin text-blue-600 mb-2" />
          <p className="text-xs text-gray-500">Loading runs...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error Loading Runs</h3>
              <p className="text-xs text-red-700 mt-1">{error}</p>
              <button
                onClick={() => loadSimulationRuns()}
                className="mt-2 text-xs text-red-600 hover:text-red-700 underline"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && simulationRuns.length === 0 && (
        <div className="text-center p-8">
          <FileQuestion className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-sm font-medium text-gray-700">No runs found</p>
          <p className="text-xs text-gray-500 mt-1">
            Run a simulation to get started
          </p>
        </div>
      )}

      {/* Submitting Placeholder */}
      {submittingRunName && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg animate-pulse">
          <div className="flex items-center gap-2">
            <CloudUpload className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-blue-800">{submittingRunName}</span>
          </div>
          <p className="text-xs text-blue-600 mt-1">Submitting to Azure...</p>
        </div>
      )}

      {/* Simulation Run List */}
      {!loading && !error && simulationRuns.length > 0 && (
        <div className="space-y-3">
          {simulationRuns.map((simulationRun) => (
            <SimulationRunCard
              key={simulationRun.id}
              simulationRun={simulationRun}
              documentId={documentId || ""}
              onDelete={handleDeleteRun}
              onAnalyze={onAnalyze}
            />
          ))}
        </div>
      )}

      {/* Info Footer */}
      {!loading && !error && simulationRuns.length > 0 && (
        <>
          {simulationRuns.length >= MAX_SIMULATION_RUNS && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-800">
                <strong>Run Limit Reached:</strong> You have reached the maximum of {MAX_SIMULATION_RUNS} runs.
                Delete a run to run a new simulation.
              </p>
            </div>
          )}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Tip:</strong> Use the Auto dropdown to control refresh behavior.
              Off = manual only, Smart = auto when running, On = always auto-refresh.
              Running a simulation automatically enables auto-refresh.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default SimulationRunEditor;
