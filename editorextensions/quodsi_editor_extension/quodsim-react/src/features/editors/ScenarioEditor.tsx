import React, { useState, useEffect, useCallback } from "react";
import { PlaySquare, RefreshCw, Loader, FileQuestion, XCircle } from "lucide-react";
import ScenarioCard from "./ScenarioCard";
import { RunState, EnvelopeMessageType } from "@quodsi/shared";
import { useScenarioSender } from "../../messaging/senders/scenarioSender";

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

interface ScenarioDownloadInfo {
  zipUrl: string;
  fileSizeBytes: number;
  fileSizeMB: string;
  expiresAt: string;
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

const ScenarioEditor: React.FC<ScenarioEditorProps> = ({ documentId, onAnalyze }) => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [deletingScenarios, setDeletingScenarios] = useState<Set<string>>(new Set());
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
  const loadScenarios = useCallback(() => {
    if (!documentId) {
      setError("No document ID available");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use the proper sender hook
      listScenarios(documentId);
      // Response will be handled in the message listener below
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load scenarios");
      setLoading(false);
    }
  }, [documentId, listScenarios]);

  // Handle messages from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      // Check for envelope-formatted messages
      if (message.type === EnvelopeMessageType.SCENARIOS_LIST_RESULT) {
        const unsortedScenarios = message.data?.scenarios || [];
        setScenarios(sortScenarios(unsortedScenarios));
        setLoading(false);
        setError(null);
      } else if (message.type === "ERROR" && message.data?.relatedTo === EnvelopeMessageType.SCENARIOS_LIST_REQUEST) {
        setError(message.data?.message || "Failed to load scenarios");
        setLoading(false);
        setScenarios([]);
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
          setError(result?.error || "Failed to delete scenario");
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
            setError(statusData.error || 'Simulation failed to start');
            setLoading(false);
            return; // Don't try to create/update scenario card
          }

          // Use functional state update to access current scenarios without dependency
          setScenarios(prev => {
            const existingIndex = prev.findIndex(s => s.id === statusData.scenarioId);

            if (existingIndex >= 0) {
              // UPDATE existing scenario
              console.log('[ScenarioEditor] Updating existing scenario:', statusData.scenarioName);
              const updated = [...prev];
              updated[existingIndex] = {
                ...updated[existingIndex],
                runState: mapStatusToRunState(statusData.status),
                completedAt: statusData.lastChecked || statusData.queuedAt,
                hasResults: statusData.status === 'completed' || statusData.hasResults || false
              };
              return updated;
            } else {
              // CREATE new scenario (only for initial statuses)
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
                return sortScenarios([newScenario, ...prev]);
              }
              // Status came for unknown scenario that's not in initial state - ignore
              console.warn('[ScenarioEditor] Received status for unknown scenario (not QUEUED/PROCESSING):', statusData.scenarioId);
              return prev;
            }
          });
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [documentId, loadScenarios, sortScenarios]);
  // Note: 'scenarios' removed from dependencies to prevent event listener recreation
  // Use functional state updates (setScenarios(prev => ...)) to access current state

  // Load scenarios on mount
  useEffect(() => {
    if (documentId) {
      loadScenarios();
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

  // Auto-refresh when tab is visible AND scenarios are running
  useEffect(() => {
    if (!isTabVisible) {
      console.log('[ScenarioEditor] Tab not visible, skipping auto-refresh');
      return;
    }

    const hasRunning = scenarios.some(s => s.runState === RunState.Running);
    if (!hasRunning) {
      console.log('[ScenarioEditor] No running scenarios, skipping auto-refresh');
      return;
    }

    console.log('[ScenarioEditor] Setting up auto-refresh for running scenarios');
    const interval = setInterval(() => {
      console.log('[ScenarioEditor] Auto-refreshing running scenarios');
      loadScenarios();
    }, 10000); // 10 seconds for running scenarios

    return () => {
      console.log('[ScenarioEditor] Clearing auto-refresh interval');
      clearInterval(interval);
    };
  }, [scenarios, isTabVisible, documentId, loadScenarios]);

  const handleDeleteScenario = useCallback((scenarioId: string) => {
    if (!documentId) {
      console.error('[ScenarioEditor] Cannot delete scenario: missing documentId');
      return;
    }

    console.log('[ScenarioEditor] Deleting scenario:', scenarioId);

    // Optimistic update: immediately add to deleting set and remove from list
    setDeletingScenarios(prev => new Set(prev).add(scenarioId));
    setScenarios(prev => prev.filter(s => s.id !== scenarioId));

    // Send delete request
    deleteScenario(documentId, scenarioId);
    // Result will be handled in the message listener
  }, [documentId, deleteScenario]);

  return (
    <div className="scenario-editor p-2">
      {/* Header */}
      <div className="flex justify-end items-center mb-2">
        <button
          onClick={loadScenarios}
          disabled={loading}
          className="p-1 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh scenarios"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-gray-600 ${loading ? "animate-spin" : ""}`} />
        </button>
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
                onClick={loadScenarios}
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
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>Tip:</strong> Running scenarios auto-refresh every 10 seconds.
            Download links are refreshed automatically when they expire.
            Click Refresh to manually reload.
          </p>
        </div>
      )}
    </div>
  );
};

export default ScenarioEditor;
