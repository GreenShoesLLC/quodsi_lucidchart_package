import React, { useState, useEffect } from "react";
import { CheckCircle, Clock, XCircle, AlertCircle, Copy, Check, FileText, Trash2, Download, TrendingUp, ChevronDown, ChevronUp, AlertTriangle, RefreshCw } from "lucide-react";
import { RunState, ScenarioDownloadInfo } from "@quodsi/shared";
import { useModelOpsSender } from "../../messaging/senders/modelOpsSender";
import { useScenarioSender } from "../../messaging/senders/scenarioSender";

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
  // Progress tracking
  currentReplication?: number;
  // Error fields
  error?: string;
  errorType?: string;
  errorDetails?: string;
  errorSuggestions?: string[];
}

interface ScenarioCardProps {
  scenario: Scenario;
  documentId: string;
  onDelete?: (scenarioId: string) => void;
  onAnalyze?: (scenarioId: string) => void;
}

const ScenarioCard: React.FC<ScenarioCardProps> = ({ scenario, documentId, onDelete, onAnalyze }) => {
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [relativeTime, setRelativeTime] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [errorExpanded, setErrorExpanded] = useState<boolean>(false);
  const [detailsExpanded, setDetailsExpanded] = useState<boolean>(false);
  const [showResimulateConfirm, setShowResimulateConfirm] = useState<boolean>(false);
  const modelOpsSender = useModelOpsSender();
  const scenarioSender = useScenarioSender();

  // Update expiry countdown
  useEffect(() => {
    if (!scenario.downloadInfo?.expiresAt) {
      setTimeRemaining("");
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const expiry = new Date(scenario.downloadInfo!.expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeRemaining("Expired");
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        if (minutes > 0) {
          setTimeRemaining(`Expires in ${minutes} min`);
        } else {
          setTimeRemaining(`Expires in ${seconds} sec`);
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [scenario.downloadInfo?.expiresAt]);

  // Update relative time for completedAt
  useEffect(() => {
    if (!scenario.completedAt) {
      setRelativeTime("");
      return;
    }

    const updateRelativeTime = () => {
      const now = Date.now();
      const completed = new Date(scenario.completedAt!).getTime();
      const diff = now - completed;

      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) {
        setRelativeTime(`${days} day${days > 1 ? 's' : ''} ago`);
      } else if (hours > 0) {
        setRelativeTime(`${hours} hour${hours > 1 ? 's' : ''} ago`);
      } else if (minutes > 0) {
        setRelativeTime(`${minutes} minute${minutes > 1 ? 's' : ''} ago`);
      } else {
        setRelativeTime("Just now");
      }
    };

    updateRelativeTime();
    const interval = setInterval(updateRelativeTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [scenario.completedAt]);

  const handleCopyExcelLink = () => {
    if (!scenario.downloadInfo?.excelUrl) return;

    try {
      // Use old-school execCommand approach for sandboxed iframes
      const textarea = document.createElement('textarea');
      textarea.value = scenario.downloadInfo.excelUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);

      if (successful) {
        console.log('[ScenarioCard] Excel link copied to clipboard using execCommand');

        // Show "Copied!" feedback for 2 seconds
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        console.error('[ScenarioCard] execCommand copy failed');
      }
    } catch (error) {
      console.error('[ScenarioCard] Failed to copy Excel link:', error);
    }
  };

  const handleCreateResultsPage = () => {
    console.log('[ScenarioCard] Create results page requested for scenario:', scenario.id);

    // Validate we have required data
    if (!documentId) {
      console.error('[ScenarioCard] Cannot create results page: missing documentId');
      return;
    }

    if (!scenario.id) {
      console.error('[ScenarioCard] Cannot create results page: missing scenario.id (jobId)');
      return;
    }

    // Generate page title with timestamp
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    const pageTitle = `Results - ${scenario.name} - ${dateStr}`;

    console.log('[ScenarioCard] Creating results page:', {
      jobId: scenario.id,
      documentId,
      pageTitle
    });

    // Call the createResultsPage function (scenario.id is the jobId)
    modelOpsSender.createResultsPage(scenario.id, documentId, pageTitle);
  };

  const handleAnalyze = () => {
    console.log('[ScenarioCard] Analyze button clicked for scenario:', scenario.id);
    if (onAnalyze) {
      onAnalyze(scenario.id);
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (onDelete) {
      onDelete(scenario.id);
    }
    setShowDeleteConfirm(false);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleResimulate = () => {
    scenarioSender.resimulateScenario(documentId, scenario.id, scenario.name);
    setShowResimulateConfirm(false);
  };

  const cancelResimulate = () => {
    setShowResimulateConfirm(false);
  };

  // Get status icon and color
  const getStatusDisplay = () => {
    switch (scenario.runState) {
      case RunState.RanSuccessfully:
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          color: "text-green-600",
          bgColor: "bg-white",
          borderColor: "border-gray-200",
          leftBorderColor: "border-l-green-500",
          label: "Done"
        };
      case RunState.Running:
        return {
          icon: <Clock className="w-4 h-4 animate-pulse" />,
          color: "text-blue-600",
          bgColor: "bg-white",
          borderColor: "border-gray-200",
          leftBorderColor: "border-l-blue-500",
          label: "Running"
        };
      case RunState.RanWithErrors:
        return {
          icon: <XCircle className="w-4 h-4" />,
          color: "text-red-600",
          bgColor: "bg-white",
          borderColor: "border-gray-200",
          leftBorderColor: "border-l-red-500",
          label: "Failed"
        };
      case RunState.NotRun:
      default:
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          color: "text-gray-600",
          bgColor: "bg-white",
          borderColor: "border-gray-200",
          leftBorderColor: "border-l-gray-400",
          label: "Not Started"
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className={`border ${statusDisplay.borderColor} border-l-4 ${statusDisplay.leftBorderColor} rounded-lg p-1.5 ${statusDisplay.bgColor}`}>
      {/* Header with compact status badge */}
      <div className="flex items-center gap-2 mb-0.5">
        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${statusDisplay.color} bg-gray-50 border border-gray-200`}>
          {statusDisplay.icon}
          <span className="text-xs font-semibold">{statusDisplay.label}</span>
        </div>
        <h3 className="text-sm font-medium text-gray-900 truncate">{scenario.name}</h3>
      </div>

      {/* Metadata */}
      <div className="text-xs text-gray-600 space-y-0.5 mb-1.5">
        <div>
          <span className="font-medium">Reps:</span> {scenario.reps} •{" "}
          <span className="font-medium">Duration:</span> {scenario.runClockPeriod} {scenario.runClockPeriodUnit}
        </div>
        {scenario.completedAt && (
          <div>
            <span className="font-medium">
              {scenario.runState === RunState.Running ? "Started" : "Completed"}:
            </span> {relativeTime}
          </div>
        )}
      </div>

      {/* Progress Bar - Show when Running */}
      {scenario.runState === RunState.Running && scenario.currentReplication && scenario.reps > 0 && (
        <div className="border-t border-gray-200 pt-1.5 mt-1.5">
          <div className="flex items-center justify-between text-xs text-gray-700 mb-1">
            <span className="font-medium">Progress:</span>
            <span className="font-semibold">{scenario.currentReplication} / {scenario.reps}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((scenario.currentReplication / scenario.reps) * 100, 100)}%` }}
            />
          </div>
          <div className="text-xs text-center text-gray-600 mt-0.5">
            {Math.round((scenario.currentReplication / scenario.reps) * 100)}% Complete
          </div>
        </div>
      )}

      {/* Error Section - Show when RanWithErrors */}
      {scenario.runState === RunState.RanWithErrors && scenario.error && (
        <div className="border-t border-gray-200 pt-1.5 mt-1.5">
          <div
            className="bg-red-50 border border-red-200 rounded-lg overflow-hidden"
          >
            {/* Error Header - Collapsible */}
            <button
              onClick={() => setErrorExpanded(!errorExpanded)}
              className="w-full px-2 py-1.5 flex items-center justify-between hover:bg-red-100 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span className="text-xs font-semibold text-red-900 text-left">
                  {scenario.error}
                </span>
              </div>
              {errorExpanded ? (
                <ChevronUp className="w-4 h-4 text-red-600 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-red-600 flex-shrink-0" />
              )}
            </button>

            {/* Expanded Error Details */}
            {errorExpanded && (
              <div className="px-2 pb-2 space-y-1.5 border-t border-red-200 bg-white">
                {/* Error Type Badge */}
                {scenario.errorType && (
                  <div className="pt-1.5">
                    <span className="inline-block px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded border border-red-300">
                      {scenario.errorType}
                    </span>
                  </div>
                )}

                {/* Error Suggestions */}
                {scenario.errorSuggestions && scenario.errorSuggestions.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-900 mb-1">
                      Suggested Fixes:
                    </div>
                    <ul className="space-y-0.5">
                      {scenario.errorSuggestions.map((suggestion, index) => (
                        <li key={index} className="text-xs text-gray-700 bg-yellow-50 px-2 py-1 rounded border border-yellow-200">
                          • {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Technical Details - Nested Accordion */}
                {scenario.errorDetails && (
                  <div>
                    <button
                      onClick={() => setDetailsExpanded(!detailsExpanded)}
                      className="w-full flex items-center justify-between px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      <span className="text-xs font-semibold text-gray-900">
                        Technical Details
                      </span>
                      {detailsExpanded ? (
                        <ChevronUp className="w-3 h-3 text-gray-600" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-gray-600" />
                      )}
                    </button>
                    {detailsExpanded && (
                      <div className="mt-1 px-2 py-1.5 bg-gray-50 border border-gray-300 rounded">
                        <pre className="text-xs text-gray-800 font-mono whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                          {scenario.errorDetails}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/*
        TODO: Re-run Simulation feature temporarily disabled
        The backend submitSimulationJobAction was fixed to pass scenarioName correctly,
        but the feature is still not working. Hidden until root cause is identified.

        Original code:
        {(scenario.runState === RunState.RanSuccessfully ||
          scenario.runState === RunState.RanWithErrors) && (
          <div className="border-t border-gray-200 pt-1.5 mt-1.5">
            {!showResimulateConfirm ? (
              <button
                onClick={() => setShowResimulateConfirm(true)}
                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-300 rounded hover:bg-blue-100 transition-colors"
                title="Re-run this simulation (overwrites existing results)"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Re-run Simulation
              </button>
            ) : (
              <div className="p-2 bg-yellow-50 border border-yellow-300 rounded">
                <div className="text-xs font-medium text-yellow-900 mb-1.5">
                  Re-run "{scenario.name}"?
                </div>
                <div className="text-xs text-yellow-800 mb-2">
                  This will overwrite existing results with a new simulation run.
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={handleResimulate}
                    className="flex-1 px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Yes, Re-run
                  </button>
                  <button
                    onClick={cancelResimulate}
                    className="flex-1 px-2 py-1 text-xs font-medium bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      */}

      {/* Action Buttons */}
      {scenario.hasResults && scenario.downloadInfo && (
        <div className="border-t border-gray-200 pt-1.5">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-xs font-medium text-gray-700">Results</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {/* Primary action - most encouraged */}
            <button
              onClick={handleCopyExcelLink}
              title={copied ? "Copied!" : `Copy Excel file URL to clipboard${timeRemaining ? ` (${timeRemaining})` : ''}`}
              className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded transition-colors shadow-md ${
                copied
                  ? 'bg-green-600 text-white hover:bg-green-700 ring-2 ring-green-300'
                  : 'bg-blue-600 text-white hover:bg-blue-700 ring-2 ring-blue-300'
              }`}
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span className="text-[9px] font-bold">XLS</span>
                </>
              )}
            </button>
            {/* Secondary action - close second priority */}
            <button
              onClick={handleAnalyze}
              title="Analyze simulation results with interactive charts"
              className="flex items-center justify-center p-1.5 rounded bg-orange-600 text-white hover:bg-orange-700 transition-colors shadow-sm ring-1 ring-orange-300"
            >
              <TrendingUp className="w-4 h-4" />
            </button>
            {/* Preview feature button - temporarily hidden
            <button
              onClick={handleCreateResultsPage}
              title="Create results page in LucidChart (Preview Feature)"
              className="relative flex items-center justify-center p-1.5 rounded bg-purple-100 text-purple-600 border border-purple-300 hover:bg-purple-200 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 px-1 py-0.5 text-[9px] font-bold bg-purple-500 text-white rounded-sm shadow-sm">
                PREVIEW
              </span>
            </button>
            */}
          </div>
        </div>
      )}

      {/* No Results Message */}
      {!scenario.hasResults && scenario.runState === RunState.Running && (
        <div className="border-t border-gray-200 pt-1 text-xs text-center text-gray-500">
          Results will be available when simulation completes
        </div>
      )}

      {/* Delete Confirmation / Delete Button */}
      {onDelete && (
        <div className="border-t border-gray-200 pt-1.5 mt-1.5">
          {showDeleteConfirm ? (
            <div className="p-2 bg-red-50 border border-red-200 rounded">
              <div className="text-xs font-medium text-red-900 mb-1">
                Delete "{scenario.name}"?
              </div>
              <div className="text-xs text-red-700 mb-2">
                This will permanently delete all scenario data. This action cannot be undone.
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors font-medium"
                >
                  Delete Scenario
                </button>
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleDelete}
              className="w-full flex items-center justify-center gap-1 px-2 py-1 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ScenarioCard;
