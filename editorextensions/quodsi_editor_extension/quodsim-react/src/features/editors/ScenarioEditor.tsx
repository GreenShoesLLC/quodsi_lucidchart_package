import React, { useState, useEffect, useCallback } from "react";
import { PlaySquare, RefreshCw, Loader, FileQuestion, XCircle } from "lucide-react";
import ScenarioCard from "./ScenarioCard";
import { RunState, EnvelopeMessageType, MAX_SCENARIOS, ScenarioDownloadInfo } from "@quodsi/shared";
import { useScenarioSender } from "../../messaging/senders/scenarioSender";
import { useScenarios, useMessagingDispatch } from "../../messaging/MessageProvider";
import { selectScenarios, selectScenariosLoading, selectScenariosError } from "../../messaging/state/scenarioSlice";

/**
 * Maps SimulationStatus string values to RunState enum values
 * Note: SimulationStatus enum values are lowercase
 * Active statuses (queued, processing, validating, running) are all treated as Running
 * to ensure the UI shows the pulsing icon and auto-refresh polling activates
 */
function mapStatusToRunState(status: string): RunState {
  switch (status.toLowerCase()) {
    case 'queued':
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

interface Scenario {
  id: string;
  name: string;
  runState: RunState;
  reps: number;
  runClockPeriod: number;
  runClockPeriodUnit: string;
  simulationTimeType: string;
  completedAt?: string;
  hasResults: boolean;
  downloadInfo?: ScenarioDownloadInfo;
}

interface ScenarioEditorProps {
  documentId?: string;
  onAnalyze?: (scenarioId: string) => void;
}

type AutoRefreshMode = 'off' | 'smart' | 'on';

const ScenarioEditor: React.FC<ScenarioEditorProps> = ({ documentId, onAnalyze }) => {
  // Redux state
  const scenarioState = useScenarios();
  const scenarios = selectScenarios({ scenarios: scenarioState });
  const loading = selectScenariosLoading({ scenarios: scenarioState });
  const error = selectScenariosError({ scenarios: scenarioState });
  const dispatch = useMessagingDispatch();

  // Local state (not in Redux)
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [deletingScenarios, setDeletingScenarios] = useState<Set<string>>(new Set());
  const [autoRefreshMode, setAutoRefreshMode] = useState<AutoRefreshMode>('off');
  const { listScenarios, deleteScenario } = useScenarioSender();

  // Helper function to check if scenario name is in datetime format (YY-MM-DD HH:mm:ss)
  const isDatetimeFormat = useCallback((name: string): boolean => {
    return /^\d{2}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(name);
  }, []);

  // Helper function to sort scenarios by name (most recent datetime first)
  const sortScenarios = useCallback((scenarioList: Scenario[]): Scenario[] => {
    return [...scenarioList].sort((a, b) => {
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

  // Load scenarios function
  // forceRefresh: when true, always fetches from server; when false, uses smart skip logic
  const loadScenarios = useCallback((forceRefresh: boolean = true) => {
    if (!documentId) {
      dispatch({ type: 'SCENARIOS_ERROR', error: "No document ID available" });
      return;
    }

    // Smart skip logic: if not forcing refresh, we have cached scenarios, and none are running
    if (!forceRefresh && scenarios.length > 0) {
      const hasRunning = scenarios.some(s => s.runState === RunState.Running);
      if (!hasRunning) {
        console.log('[ScenarioEditor] Using cached scenarios (none running), skipping fetch');
        return;
      }
    }

    dispatch({ type: 'SCENARIOS_LOADING' });

    try {
      // Use the proper sender hook
      listScenarios(documentId);
      // Response will be handled in the message listener below
    } catch (err) {
      dispatch({
        type: 'SCENARIOS_ERROR',
        error: err instanceof Error ? err.message : "Failed to load scenarios"
      });
    }
  }, [documentId, listScenarios, dispatch, scenarios]);

  // Handle messages from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      // Check for envelope-formatted messages
      if (message.type === EnvelopeMessageType.SCENARIOS_LIST_RESULT) {
        const unsortedScenarios = message.data?.scenarios || [];
        dispatch({
          type: 'SCENARIOS_SUCCESS',
          scenarios: sortScenarios(unsortedScenarios)
        });
      } else if (message.type === "ERROR" && message.data?.relatedTo === EnvelopeMessageType.SCENARIOS_LIST_REQUEST) {
        dispatch({
          type: 'SCENARIOS_ERROR',
          error: message.data?.message || "Failed to load scenarios"
        });
      } else if (message.type === EnvelopeMessageType.SCENARIO_DELETE_RESULT) {
        const result = message.data;
        if (result?.success) {
          console.log('[ScenarioEditor] Scenario deleted successfully');
          // Remove from deleting set
          setDeletingScenarios(prev => {
            const updated = new Set(prev);
            updated.delete(result.scenarioId);
            return updated;
          });
          // Refresh the list to confirm server state
          loadScenarios();
        } else {
          console.error('[ScenarioEditor] Failed to delete scenario:', result?.error);
          // Remove from deleting set and restore scenario by refreshing
          setDeletingScenarios(prev => {
            const updated = new Set(prev);
            updated.delete(result.scenarioId);
            return updated;
          });
          dispatch({
            type: 'SCENARIOS_ERROR',
            error: result?.error || "Failed to delete scenario"
          });
          // Refresh to restore the scenario in the list
          loadScenarios();
        }
      } else if (message.type === EnvelopeMessageType.MODEL_RUN_STATUS) {
        const statusData = message.data;

        if (statusData && statusData.scenarioId) {
          console.log('[ScenarioEditor] Received MODEL_RUN_STATUS:', {
            scenarioId: statusData.scenarioId,
            scenarioName: statusData.scenarioName,
            status: statusData.status
          });

          // Special handling for error scenarios
          if (statusData.scenarioId === 'error' && statusData.status === 'failed') {
            console.error('[ScenarioEditor] Simulation failed:', statusData.error);
            dispatch({
              type: 'SCENARIOS_ERROR',
              error: statusData.error || 'Simulation failed to start'
            });
            return; // Don't try to create/update scenario card
          }

          // Check if scenario exists in current state
          const existingScenario = scenarios.find(s => s.id === statusData.scenarioId);

          if (existingScenario) {
            // UPDATE existing scenario via Redux
            console.log('[ScenarioEditor] Updating existing scenario in Redux:', statusData.scenarioName);
            dispatch({
              type: 'SCENARIO_UPDATE_STATUS',
              scenarioId: statusData.scenarioId,
              runState: mapStatusToRunState(statusData.status),
              hasResults: statusData.status === 'completed' || statusData.hasResults || false
            });
          } else {
            // CREATE new scenario optimistically (only for initial statuses)
            if (statusData.status === 'queued' || statusData.status === 'processing') {
              console.log('[ScenarioEditor] Creating new optimistic scenario:', statusData.scenarioName);
              const newScenario: Scenario = {
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
              // Add to existing scenarios
              dispatch({
                type: 'SCENARIOS_SUCCESS',
                scenarios: sortScenarios([newScenario, ...scenarios])
              });
              // Auto-enable refresh when simulation starts
              setAutoRefreshMode('on');
              console.log('[ScenarioEditor] Auto-refresh switched to ON mode');
            } else {
              // Status came for unknown scenario that's not in initial state - ignore
              console.warn('[ScenarioEditor] Received status for unknown scenario (not QUEUED/PROCESSING):', statusData.scenarioId);
            }
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [documentId, loadScenarios, sortScenarios, dispatch, scenarios]);
  // Note: scenarios now needed since we check existingScenario directly

  // Load scenarios on mount (or when tab switching causes remount)
  // Uses smart skip: won't refetch if we have cached scenarios and none are running
  useEffect(() => {
    if (documentId) {
      loadScenarios(false); // Don't force refresh - use cache if appropriate
    }
  }, [documentId, loadScenarios]);

  // Detect when tab/window becomes visible
  useEffect(() => {
    const handleVisibility = () => {
      const visible = document.visibilityState === 'visible';
      setIsTabVisible(visible);

      // Refresh immediately when tab becomes visible
      if (visible && documentId) {
        console.log('[ScenarioEditor] Tab became visible, refreshing scenarios');
        loadScenarios();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [documentId, loadScenarios]);

  // Auto-refresh based on mode: off, smart, or on
  useEffect(() => {
    // Off mode: never auto-refresh
    if (autoRefreshMode === 'off') {
      console.log('[ScenarioEditor] Auto-refresh OFF');
      return;
    }

    if (!isTabVisible) {
      console.log('[ScenarioEditor] Tab not visible, skipping auto-refresh');
      return;
    }

    // Smart mode: only refresh when scenarios are running
    if (autoRefreshMode === 'smart') {
      const hasRunning = scenarios.some(s => s.runState === RunState.Running);
      if (!hasRunning) {
        console.log('[ScenarioEditor] Smart mode: No running scenarios, skipping auto-refresh');
        return;
      }
    }

    // On mode OR (Smart mode + hasRunning): set up interval
    console.log(`[ScenarioEditor] Auto-refresh active (${autoRefreshMode} mode)`);
    const interval = setInterval(() => {
      console.log('[ScenarioEditor] Auto-refreshing scenarios');
      loadScenarios();
    }, 10000); // 10 seconds

    return () => {
      console.log('[ScenarioEditor] Clearing auto-refresh interval');
      clearInterval(interval);
    };
  }, [autoRefreshMode, scenarios, isTabVisible, documentId, loadScenarios]);

  const handleDeleteScenario = useCallback((scenarioId: string) => {
    if (!documentId) {
      console.error('[ScenarioEditor] Cannot delete scenario: missing documentId');
      return;
    }

    console.log('[ScenarioEditor] Deleting scenario:', scenarioId);

    // Optimistic update: immediately add to deleting set and remove from list
    setDeletingScenarios(prev => new Set(prev).add(scenarioId));
    dispatch({
      type: 'SCENARIOS_SUCCESS',
      scenarios: scenarios.filter(s => s.id !== scenarioId)
    });

    // Send delete request
    deleteScenario(documentId, scenarioId);
    // Result will be handled in the message listener
  }, [documentId, deleteScenario, dispatch, scenarios]);

  // Helper to get badge color based on scenario count
  const getBadgeColor = () => {
    if (scenarios.length >= MAX_SCENARIOS) return "bg-red-100 text-red-800 border-red-300";
    if (scenarios.length === MAX_SCENARIOS - 1) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-green-100 text-green-800 border-green-300";
  };

  return (
    <div className="scenario-editor p-2">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div className={`px-2 py-1 text-xs font-medium border rounded ${getBadgeColor()}`}>
          Scenarios: {scenarios.length}/{MAX_SCENARIOS}
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
            onClick={() => loadScenarios()}
            disabled={loading}
            className="p-1 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh scenarios"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-600 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center p-8">
          <Loader className="w-6 h-6 animate-spin text-blue-600 mb-2" />
          <p className="text-xs text-gray-500">Loading scenarios...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error Loading Scenarios</h3>
              <p className="text-xs text-red-700 mt-1">{error}</p>
              <button
                onClick={() => loadScenarios()}
                className="mt-2 text-xs text-red-600 hover:text-red-700 underline"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && scenarios.length === 0 && (
        <div className="text-center p-8">
          <FileQuestion className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-sm font-medium text-gray-700">No scenarios found</p>
          <p className="text-xs text-gray-500 mt-1">
            Run a simulation to get started
          </p>
        </div>
      )}

      {/* Scenario List */}
      {!loading && !error && scenarios.length > 0 && (
        <div className="space-y-3">
          {scenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              documentId={documentId || ""}
              onDelete={handleDeleteScenario}
              onAnalyze={onAnalyze}
            />
          ))}
        </div>
      )}

      {/* Info Footer */}
      {!loading && !error && scenarios.length > 0 && (
        <>
          {scenarios.length >= MAX_SCENARIOS && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-800">
                <strong>Scenario Limit Reached:</strong> You have reached the maximum of {MAX_SCENARIOS} scenarios.
                Delete a scenario to run a new simulation.
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

export default ScenarioEditor;
