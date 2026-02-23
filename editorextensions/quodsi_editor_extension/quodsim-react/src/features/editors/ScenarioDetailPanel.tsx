import React, { useState } from "react";
import { ISerializedScenario, ISerializedScenarioChangeRequest, EditorReferenceData, RunState } from "@quodsi/shared";
import ChangeRequestEditor from "./ChangeRequestEditor";
import { ScenarioRunStatus } from "./ScenarioCard";
import { Trash2, Plus } from "lucide-react";

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
  const status = runStatus?.status ?? RunState.NotRun;
  const hasResults = runStatus?.hasResults ?? false;

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
    <div className="flex-1 overflow-y-auto p-3 space-y-3 border-t bg-white">
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
