import React, { useState, useEffect } from "react";
import {
  ISerializedScenario,
  ISerializedScenarioChangeRequest,
  EditorReferenceData,
  RunState,
  SimulationRunDownloadInfo,
} from "@quodsi/shared";
import {
  Play,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Plus,
  Download,
  Check,
  AlertTriangle,
  Edit2,
  BarChart3,
  Info,
} from "lucide-react";
import ChangeRequestEditor from "./ChangeRequestEditor";
import { useEntitlements } from "../../messaging/MessageContext";
import {
  canSubmitSimulation,
  simulationsRemaining,
} from "../../messaging/state/entitlementsSlice";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScenarioRunStatus {
  scenarioId: string;
  status: RunState;
  hasResults: boolean;
  downloadInfo?: SimulationRunDownloadInfo;
  // Error fields (restored from SimulationRunInfo)
  error?: string;
  errorType?: string;
  errorDetails?: string;
  errorSuggestions?: string[];
  // Progress tracking
  currentReplication?: number;
  reps?: number;
}

interface ScenarioCardProps {
  scenario: ISerializedScenario;
  runStatus?: ScenarioRunStatus;
  referenceData?: EditorReferenceData;
  expanded: boolean;
  onToggleExpand: () => void;
  onPlay: (enableAnimation: boolean) => void;
  /**
   * True when this scenario can't be run because the
   * `scenarios_per_model` cap is full and this scenario is "new"
   * (never been run before). Re-runs are always allowed; the parent
   * is expected to set this to false when the scenario already has
   * any non-deleted runs.
   */
  runCapBlocked?: boolean;
  /** Tooltip text to show on the disabled Play button when
   * `runCapBlocked` is true. */
  runCapTooltip?: string;
  onDelete?: () => void;
  onUpdate: (updated: ISerializedScenario) => void;
  onAnalyze?: (scenarioId: string) => void;
}

// ---------------------------------------------------------------------------
// Status display config
// ---------------------------------------------------------------------------

const statusDisplay: Record<string, { label: string; color: string }> = {
  [RunState.NotRun]: { label: "No run", color: "text-gray-400" },
  [RunState.Queued]: { label: "Queued", color: "text-yellow-600" },
  [RunState.Running]: { label: "Running", color: "text-blue-600" },
  [RunState.RanSuccessfully]: { label: "Ready", color: "text-green-600" },
  [RunState.RanWithErrors]: { label: "Error", color: "text-red-600" },
};

// ---------------------------------------------------------------------------
// RunStatusBadge (moved from ScenarioDetailPanel)
// ---------------------------------------------------------------------------

const RunStatusBadge: React.FC<{ status: RunState }> = ({ status }) => {
  const config: Record<string, { label: string; bg: string; text: string }> = {
    [RunState.NotRun]: { label: "Not run", bg: "bg-gray-100", text: "text-gray-500" },
    [RunState.Queued]: { label: "Queued", bg: "bg-yellow-100", text: "text-yellow-700" },
    [RunState.Running]: { label: "Running", bg: "bg-blue-100", text: "text-blue-700" },
    [RunState.RanSuccessfully]: { label: "Completed", bg: "bg-green-100", text: "text-green-700" },
    [RunState.RanWithErrors]: { label: "Error", bg: "bg-red-100", text: "text-red-700" },
  };
  const c = config[status] ?? config[RunState.NotRun];
  return (
    <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
};

// ---------------------------------------------------------------------------
// ScenarioCard
// ---------------------------------------------------------------------------

export const ScenarioCard: React.FC<ScenarioCardProps> = ({
  scenario,
  runStatus,
  referenceData,
  expanded,
  onToggleExpand,
  onPlay,
  runCapBlocked = false,
  runCapTooltip,
  onDelete,
  onUpdate,
  onAnalyze,
}) => {
  // --- derived values ---
  const status = runStatus?.status ?? RunState.NotRun;
  const display = statusDisplay[status] ?? statusDisplay[RunState.NotRun];
  const isActive = status === RunState.Queued || status === RunState.Running;
  const changeCount = scenario.changeRequests?.length ?? 0;
  const hasResults = runStatus?.hasResults ?? false;
  const downloadInfo = runStatus?.downloadInfo;

  // --- entitlement gating ---
  const entitlements = useEntitlements();
  const canRun = canSubmitSimulation(entitlements);
  const remaining = simulationsRemaining(entitlements);
  const quotaExhausted = !canRun && entitlements.loaded;
  const playDisabled = isActive || quotaExhausted || runCapBlocked;

  // --- local state ---
  const [showAddCR, setShowAddCR] = useState(false);
  const [editingCRId, setEditingCRId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expiryText, setExpiryText] = useState<string | null>(null);
  const [errorExpanded, setErrorExpanded] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  // Opt-in: generate animation data for this run (first replication only). Default off.
  const [animate, setAnimate] = useState(false);

  // --- Expiry countdown timer (from ScenarioDetailPanel) ---
  useEffect(() => {
    if (!downloadInfo?.expiresAt) {
      setExpiryText(null);
      return;
    }
    const updateExpiry = () => {
      const now = Date.now();
      const expires = new Date(downloadInfo.expiresAt!).getTime();
      const diff = expires - now;
      if (diff <= 0) {
        setExpiryText("Expired");
        return;
      }
      const mins = Math.floor(diff / 60000);
      if (mins >= 1) {
        setExpiryText(`${mins}m left`);
      } else {
        setExpiryText("<1m left");
      }
    };
    updateExpiry();
    const interval = setInterval(updateExpiry, 30000);
    return () => clearInterval(interval);
  }, [downloadInfo?.expiresAt]);

  // --- handlers (from ScenarioDetailPanel) ---
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...scenario, name: e.target.value });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ ...scenario, description: e.target.value || undefined });
  };

  const handleDeleteChangeRequest = (crId: string) => {
    onUpdate({
      ...scenario,
      changeRequests: scenario.changeRequests.filter((cr) => cr.id !== crId),
    });
  };

  const handleAddChangeRequest = (cr: ISerializedScenarioChangeRequest) => {
    onUpdate({
      ...scenario,
      changeRequests: [...scenario.changeRequests, cr],
    });
    setShowAddCR(false);
  };

  const handleUpdateChangeRequest = (updated: ISerializedScenarioChangeRequest) => {
    onUpdate({
      ...scenario,
      changeRequests: scenario.changeRequests.map((cr) =>
        cr.id === editingCRId ? updated : cr
      ),
    });
    setEditingCRId(null);
  };

  const handleCopyExcelLink = async () => {
    if (!downloadInfo?.excelUrl) return;
    try {
      await navigator.clipboard.writeText(downloadInfo.excelUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = downloadInfo.excelUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="bg-white rounded border border-gray-200 overflow-hidden">
      {/* ---- Summary Row ---- */}
      <div
        onClick={onToggleExpand}
        className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
          expanded ? "bg-blue-50" : "hover:bg-gray-50"
        }`}
      >
        {/* Play button */}
        <button
          onClick={(e) => { e.stopPropagation(); onPlay(animate); }}
          disabled={playDisabled}
          className={`flex-shrink-0 p-1 rounded transition-colors ${
            playDisabled
              ? "text-gray-300 cursor-not-allowed"
              : "text-green-600 hover:bg-green-50"
          }`}
          title={
            isActive
              ? "Simulation in progress"
              : quotaExhausted
              ? "Monthly simulation quota reached — upgrade to run more"
              : runCapBlocked
              ? (runCapTooltip ?? "You've reached the limit of distinct scenarios that can be run for this model. Re-run an existing one or upgrade to add more.")
              : remaining !== null && remaining <= 2
              ? `${remaining} simulation${remaining === 1 ? "" : "s"} remaining this month`
              : hasResults
              ? "Re-run simulation (replaces existing results)"
              : "Run simulation"
          }
        >
          {isActive ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </button>

        {/* Name + badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span
              className="text-xs font-medium text-gray-800 truncate"
              title={scenario.id}
            >
              {scenario.name}
            </span>
            {scenario.isBaseline && (
              <span className="text-[10px] px-1 py-0.5 bg-gray-100 text-gray-500 rounded">
                default
              </span>
            )}
          </div>
          {changeCount > 0 && (
            <span className="text-[10px] text-gray-400">
              {changeCount} change{changeCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Status / View Results */}
        {hasResults && onAnalyze && runStatus?.scenarioId ? (
          <button
            onClick={(e) => { e.stopPropagation(); onAnalyze(runStatus.scenarioId); }}
            className="flex-shrink-0 p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
            title="View Results"
          >
            <BarChart3 className="w-3.5 h-3.5" />
          </button>
        ) : (
          <span className={`text-[10px] font-medium ${display.color}`}>
            {display.label}
          </span>
        )}

        {/* Delete button */}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="flex-shrink-0 p-1 text-gray-300 hover:text-red-500 transition-colors"
            title="Delete scenario"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}

        {/* Expand/collapse chevron */}
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        )}
      </div>

      {/* ---- Expanded Content ---- */}
      {expanded && (
        <div className="p-3 border-t border-gray-200 space-y-3">
          {/* Run options */}
          <div>
            <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
              Run Options
            </label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="checkbox"
                id={`animate-${scenario.id}`}
                checked={animate}
                onChange={(e) => setAnimate(e.target.checked)}
                className="w-3 h-3"
              />
              <label htmlFor={`animate-${scenario.id}`} className="text-xs text-gray-700">
                Generate animation
              </label>
              <span title="Records the first replication for playback in the animation viewer. Adds some run time.">
                <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
              </span>
            </div>
          </div>

          {/* A. Editing area */}
          {/* Name & Description — non-Baseline only */}
          {!scenario.isBaseline && (
            <>
              <div>
                <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                  Name
                </label>
                <input
                  type="text"
                  value={scenario.name}
                  onChange={handleNameChange}
                  className="w-full px-2 py-1 text-xs border rounded mt-0.5"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                  Description
                </label>
                <textarea
                  value={scenario.description || ""}
                  onChange={handleDescriptionChange}
                  rows={2}
                  className="w-full px-2 py-1 text-xs border rounded mt-0.5 resize-none"
                  placeholder="Optional description"
                />
              </div>
            </>
          )}

          {/* Change Requests — all scenarios including Baseline */}
          <div>
            <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
              Change Requests ({scenario.changeRequests.length})
            </label>
            {scenario.changeRequests.length === 0 && !showAddCR && (
              <p className="text-[10px] text-gray-400 mt-1">No change requests defined</p>
            )}
            {scenario.changeRequests.map((cr) => (
              <div key={cr.id} className="mt-1">
                {editingCRId === cr.id ? (
                  <ChangeRequestEditor
                    referenceData={referenceData}
                    changeRequest={cr}
                    onSave={handleUpdateChangeRequest}
                    onCancel={() => setEditingCRId(null)}
                  />
                ) : (
                  <div className="flex items-center justify-between py-1 px-2 bg-gray-50 rounded text-[10px]">
                    <span className="text-gray-700 truncate">
                      {cr.objectType} → {cr.modificationDetails?.propertyName}: {cr.modificationDetails?.setterType} {cr.modificationDetails?.newValue}
                    </span>
                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                      <button
                        onClick={() => { setEditingCRId(cr.id); setShowAddCR(false); }}
                        className="text-gray-300 hover:text-blue-500"
                        title="Edit change request"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteChangeRequest(cr.id)}
                        className="text-gray-300 hover:text-red-500"
                        title="Delete change request"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {showAddCR ? (
              <div className="mt-2">
                <ChangeRequestEditor
                  referenceData={referenceData}
                  onSave={handleAddChangeRequest}
                  onCancel={() => setShowAddCR(false)}
                />
              </div>
            ) : !editingCRId && (
              <button
                onClick={() => { setShowAddCR(true); setEditingCRId(null); }}
                className="flex items-center gap-1 mt-2 text-[10px] text-blue-600 hover:text-blue-800"
              >
                <Plus className="w-3 h-3" />
                Add Change Request
              </button>
            )}
          </div>

          {/* B. Progress bar (restored from old ScenarioCard) */}
          {status === RunState.Running && runStatus?.currentReplication && runStatus.reps && runStatus.reps > 0 && (
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-700 mb-1">
                <span className="font-medium">Progress:</span>
                <span className="font-semibold">{runStatus.currentReplication} / {runStatus.reps}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((runStatus.currentReplication / runStatus.reps) * 100, 100)}%` }}
                />
              </div>
              <div className="text-xs text-center text-gray-600 mt-0.5">
                {Math.round((runStatus.currentReplication / runStatus.reps) * 100)}% Complete
              </div>
            </div>
          )}

          {/* C. Error section (restored from old ScenarioCard) */}
          {status === RunState.RanWithErrors && runStatus?.error && (
            <div className="pt-2 border-t border-gray-200">
              <div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden">
                {/* Error Header - Collapsible */}
                <button
                  onClick={() => setErrorExpanded(!errorExpanded)}
                  className="w-full px-2 py-1.5 flex items-center justify-between hover:bg-red-100 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span className="text-xs font-semibold text-red-900 text-left">
                      {runStatus.error}
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
                    {runStatus.errorType && (
                      <div className="pt-1.5">
                        <span className="inline-block px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded border border-red-300">
                          {runStatus.errorType}
                        </span>
                      </div>
                    )}

                    {/* Error Suggestions */}
                    {runStatus.errorSuggestions && runStatus.errorSuggestions.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-gray-900 mb-1">
                          Suggested Fixes:
                        </div>
                        <ul className="space-y-0.5">
                          {runStatus.errorSuggestions.map((suggestion, index) => (
                            <li key={index} className="text-xs text-gray-700 bg-yellow-50 px-2 py-1 rounded border border-yellow-200">
                              • {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Technical Details - Nested Accordion */}
                    {runStatus.errorDetails && (
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
                              {runStatus.errorDetails}
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

          {/* D. Run status + downloads */}
          <div className="pt-2 border-t border-gray-200">
            <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
              Run Status
            </label>
            <div className="mt-1 flex items-center gap-2">
              <RunStatusBadge status={status} />
              {hasResults && onAnalyze && runStatus?.scenarioId && (
                <button
                  onClick={() => onAnalyze(runStatus.scenarioId)}
                  className="text-[10px] text-blue-600 hover:underline"
                >
                  View Results
                </button>
              )}
              {downloadInfo?.excelUrl && (
                <button
                  onClick={handleCopyExcelLink}
                  className="flex items-center gap-0.5 text-[10px] text-green-700 hover:text-green-900 bg-green-50 hover:bg-green-100 px-1.5 py-0.5 rounded transition-colors"
                  title={copied ? "Copied!" : "Copy Excel download link to clipboard"}
                >
                  {copied ? <Check className="w-3 h-3" /> : <Download className="w-3 h-3" />}
                  {copied ? "Copied" : "XLS"}
                </button>
              )}
              {downloadInfo?.excelUrl && expiryText && (
                <span className={`text-[9px] ${expiryText === "Expired" ? "text-red-500" : "text-gray-400"}`}>
                  {expiryText}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
