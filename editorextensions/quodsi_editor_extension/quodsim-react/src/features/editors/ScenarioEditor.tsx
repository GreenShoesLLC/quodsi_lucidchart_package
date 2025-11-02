import React, { useState, useEffect } from "react";
import { PlaySquare, RefreshCw, Loader, FileQuestion, XCircle } from "lucide-react";
import ScenarioCard from "./ScenarioCard";
import { RunState, EnvelopeMessageType } from "@quodsi/shared";
import { useScenarioSender } from "../../messaging/senders/scenarioSender";

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
}

const ScenarioEditor: React.FC<ScenarioEditorProps> = ({ documentId }) => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const scenarioSender = useScenarioSender();

  // Load scenarios function
  const loadScenarios = () => {
    if (!documentId) {
      setError("No document ID available");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use the proper sender hook
      scenarioSender.listScenarios(documentId);
      // Response will be handled in the message listener below
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load scenarios");
      setLoading(false);
    }
  };

  // Handle messages from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      // Check for envelope-formatted messages
      if (message.type === EnvelopeMessageType.SCENARIOS_LIST_RESULT) {
        setScenarios(message.data?.scenarios || []);
        setLoading(false);
        setError(null);
      } else if (message.type === "ERROR" && message.data?.relatedTo === EnvelopeMessageType.SCENARIOS_LIST_REQUEST) {
        setError(message.data?.message || "Failed to load scenarios");
        setLoading(false);
        setScenarios([]);
      } else if (message.type === EnvelopeMessageType.SCENARIO_DELETE_RESULT) {
        const result = message.data;
        if (result?.success) {
          console.log('[ScenarioEditor] Scenario deleted successfully, refreshing list');
          // Refresh the scenario list after successful deletion
          loadScenarios();
        } else {
          console.error('[ScenarioEditor] Failed to delete scenario:', result?.error);
          setError(result?.error || "Failed to delete scenario");
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [documentId]);

  // Load scenarios on mount
  useEffect(() => {
    if (documentId) {
      loadScenarios();
    }
  }, [documentId]);

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
  }, [documentId]);

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
  }, [scenarios, isTabVisible, documentId]);

  const handleDeleteScenario = (scenarioId: string) => {
    if (!documentId) {
      console.error('[ScenarioEditor] Cannot delete scenario: missing documentId');
      return;
    }

    console.log('[ScenarioEditor] Deleting scenario:', scenarioId);

    // Send delete request
    scenarioSender.deleteScenario(documentId, scenarioId);
    // Result will be handled in the message listener
  };

  return (
    <div className="scenario-editor p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <PlaySquare className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-900">Simulation Scenarios</h2>
        </div>
        <button
          onClick={loadScenarios}
          disabled={loading}
          className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
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
