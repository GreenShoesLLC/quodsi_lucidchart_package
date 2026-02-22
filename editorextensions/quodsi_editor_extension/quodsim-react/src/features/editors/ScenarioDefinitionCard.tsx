import React, { useState } from "react";
import { Trash2, Plus, ChevronDown, ChevronRight } from "lucide-react";
import {
  ISerializedScenario,
  ISerializedScenarioChangeRequest,
  ScenarioSetterType,
  EditorReferenceData,
} from "@quodsi/shared";
import ChangeRequestEditor from "./ChangeRequestEditor";

// ============================================================================
// TYPES
// ============================================================================

interface ScenarioDefinitionCardProps {
  scenario: ISerializedScenario;
  referenceData?: EditorReferenceData;
  onUpdate: (scenario: ISerializedScenario) => void;
  onDelete: (scenarioId: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * User-friendly label for a setter type value.
 */
const SETTER_LABELS: Record<string, string> = {
  [ScenarioSetterType.EQUAL]: "=",
  [ScenarioSetterType.ADD]: "+",
  [ScenarioSetterType.SUBTRACT]: "-",
  [ScenarioSetterType.MULTIPLY]: "x",
  [ScenarioSetterType.DIVIDE]: "/",
  [ScenarioSetterType.MINIMUM]: "min",
  [ScenarioSetterType.MAXIMUM]: "max",
};

/**
 * Produces a concise human-readable summary of a change request for display
 * in the collapsed change request row.
 */
function formatChangeRequestSummary(cr: ISerializedScenarioChangeRequest): string {
  const target = cr.objectMatchCriteria?.name
    ? `${cr.objectType}: ${cr.objectMatchCriteria.name}`
    : cr.objectType;

  const prop = cr.modificationDetails.propertyName;

  if (cr.modificationDetails.type === "boolean") {
    const val = cr.modificationDetails.newValue ? "true" : "false";
    return `${target} / ${prop} = ${val}`;
  }

  const setter = SETTER_LABELS[cr.modificationDetails.setterType ?? "EQUAL"] ?? "=";
  const val = cr.modificationDetails.newValue;
  return `${target} / ${prop} ${setter} ${val}`;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * ScenarioDefinitionCard - Displays a single scenario definition with inline editing.
 *
 * When collapsed, shows the scenario name and a badge with the count of change requests.
 * When expanded, allows editing the name, description, and change request list, as well
 * as adding new change requests via the inline ChangeRequestEditor.
 */
const ScenarioDefinitionCard: React.FC<ScenarioDefinitionCardProps> = ({
  scenario,
  referenceData,
  onUpdate,
  onDelete,
  isExpanded = false,
  onToggleExpand,
}) => {
  const [showAddCR, setShowAddCR] = useState(false);

  // ============================================================================
  // HANDLERS
  // ============================================================================

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

  const handleCancelAdd = () => {
    setShowAddCR(false);
  };

  const handleToggle = () => {
    if (onToggleExpand) {
      onToggleExpand();
    }
  };

  const handleDeleteScenario = () => {
    onDelete(scenario.id);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      {/* Header (always visible) */}
      <div
        className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-gray-50"
        onClick={handleToggle}
      >
        {/* Expand/Collapse icon */}
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
        )}

        {/* Scenario name */}
        <span className="text-xs font-medium text-gray-800 truncate flex-1">
          {scenario.name}
        </span>

        {/* Change request count badge */}
        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded-full flex-shrink-0">
          {scenario.changeRequests.length}{" "}
          {scenario.changeRequests.length === 1 ? "change" : "changes"}
        </span>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-gray-100 px-2 py-2 space-y-2">
          {/* Name input */}
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-0.5">
              Scenario Name
            </label>
            <input
              type="text"
              className="w-full px-2 py-1 text-xs border rounded"
              value={scenario.name}
              onChange={handleNameChange}
              placeholder="Scenario name"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Description textarea */}
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-0.5">
              Description (optional)
            </label>
            <textarea
              className="w-full px-2 py-1 text-xs border rounded resize-none"
              rows={2}
              value={scenario.description ?? ""}
              onChange={handleDescriptionChange}
              placeholder="Describe what this scenario tests"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Change Request List */}
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">
              Change Requests
            </label>

            {scenario.changeRequests.length === 0 ? (
              <div className="text-xs text-gray-400 italic py-1">
                No change requests yet
              </div>
            ) : (
              <div className="space-y-1">
                {scenario.changeRequests.map((cr) => (
                  <div
                    key={cr.id}
                    className="flex items-center gap-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700"
                  >
                    <span className="flex-1 truncate" title={formatChangeRequestSummary(cr)}>
                      {formatChangeRequestSummary(cr)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteChangeRequest(cr.id)}
                      className="text-red-400 hover:text-red-600 flex-shrink-0 p-0.5"
                      title="Remove change request"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Change Request */}
          {showAddCR ? (
            <ChangeRequestEditor
              referenceData={referenceData}
              onSave={handleAddChangeRequest}
              onCancel={handleCancelAdd}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowAddCR(true)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 border border-blue-300 rounded hover:bg-blue-50 w-full justify-center"
            >
              <Plus className="w-3 h-3" />
              Add Change Request
            </button>
          )}

          {/* Delete Scenario */}
          <div className="pt-1 border-t border-gray-100">
            <button
              type="button"
              onClick={handleDeleteScenario}
              className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50 w-full justify-center"
            >
              <Trash2 className="w-3 h-3" />
              Delete Scenario
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(ScenarioDefinitionCard);
