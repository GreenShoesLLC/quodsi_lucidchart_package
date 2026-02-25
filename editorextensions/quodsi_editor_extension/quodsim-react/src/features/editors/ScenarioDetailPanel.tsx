import React, { useState, useEffect } from "react";
import { ISerializedScenario, ISerializedScenarioChangeRequest, EditorReferenceData, RunState } from "@quodsi/shared";
import ChangeRequestEditor from "./ChangeRequestEditor";
import { ScenarioRunStatus } from "./ScenarioCard";
import { Trash2, Plus, Download, Check, Pencil, Info } from "lucide-react";

interface ScenarioDetailPanelProps {
  scenario: ISerializedScenario;
  referenceData?: EditorReferenceData;
  runStatus?: ScenarioRunStatus;
  onUpdate: (updated: ISerializedScenario) => void;
  onAnalyze?: (scenarioId: string) => void;
}

export const ScenarioDetailPanel: React.FC<ScenarioDetailPanelProps> = ({
  scenario,
  referenceData,
  runStatus,
  onUpdate,
  onAnalyze,
}) => {
  const [showAddCR, setShowAddCR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expiryText, setExpiryText] = useState<string | null>(null);
  const status = runStatus?.status ?? RunState.NotRun;
  const hasResults = runStatus?.hasResults ?? false;
  const downloadInfo = runStatus?.downloadInfo;

  const handleCopyExcelLink = async () => {
    if (!downloadInfo?.excelUrl) return;
    try {
      await navigator.clipboard.writeText(downloadInfo.excelUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
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

  // Expiry countdown timer
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

  return (
    <div className="flex flex-col flex-1 border-t bg-white">
      {/* Section header bar */}
      <div className="px-3 py-1.5 bg-gray-100 border-b flex items-center gap-1.5">
        {scenario.isBaseline ? (
          <>
            <Info className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">Baseline</span>
          </>
        ) : (
          <>
            <Pencil className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs font-medium text-gray-700 truncate">{scenario.name}</span>
          </>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {/* Baseline message or editable fields */}
      {scenario.isBaseline ? (
        <div className="text-xs text-gray-500 italic">
          Baseline scenario — no parameter changes applied
        </div>
      ) : (
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

          {/* Change Requests List */}
          <div>
            <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
              Change Requests ({scenario.changeRequests.length})
            </label>
            {scenario.changeRequests.length === 0 && !showAddCR && (
              <p className="text-[10px] text-gray-400 mt-1">No change requests defined</p>
            )}
            {scenario.changeRequests.map((cr) => (
              <div key={cr.id} className="flex items-center justify-between py-1 px-2 mt-1 bg-gray-50 rounded text-[10px]">
                <span className="text-gray-700 truncate">
                  {cr.objectType} → {cr.modificationDetails?.propertyName}: {cr.modificationDetails?.setterType} {cr.modificationDetails?.newValue}
                </span>
                <button
                  onClick={() => handleDeleteChangeRequest(cr.id)}
                  className="text-gray-300 hover:text-red-500 ml-2 flex-shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Add Change Request */}
            {showAddCR ? (
              <div className="mt-2">
                <ChangeRequestEditor
                  referenceData={referenceData}
                  onSave={handleAddChangeRequest}
                  onCancel={() => setShowAddCR(false)}
                />
              </div>
            ) : (
              <button
                onClick={() => setShowAddCR(true)}
                className="flex items-center gap-1 mt-2 text-[10px] text-blue-600 hover:text-blue-800"
              >
                <Plus className="w-3 h-3" />
                Add Change Request
              </button>
            )}
          </div>
        </>
      )}

      {/* Run Status Summary */}
      <div className="pt-2 border-t">
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
    </div>
  );
};

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
