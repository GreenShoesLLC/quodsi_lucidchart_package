import React, { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import {
  ISerializedScenario,
  EditorReferenceData,
  generateUUID,
} from "@quodsi/shared";
import ScenarioDefinitionCard from "./ScenarioDefinitionCard";

// ============================================================================
// TYPES
// ============================================================================

interface ScenarioDefinitionEditorProps {
  referenceData?: EditorReferenceData;
  onScenariosChange: (scenarios: ISerializedScenario[]) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * ScenarioDefinitionEditor - Main container for managing scenario definitions.
 *
 * Displays an implicit read-only "Baseline" scenario at the top, followed by
 * user-created scenarios rendered as ScenarioDefinitionCards. Provides an
 * "Add Scenario" button to create new scenarios with sensible defaults.
 *
 * All mutations to scenarios are propagated upward through `onScenariosChange`
 * with the full updated array.
 */
const ScenarioDefinitionEditor: React.FC<ScenarioDefinitionEditorProps> = ({
  referenceData,
  onScenariosChange,
}) => {
  // Track which scenario card is currently expanded
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Get the current scenarios from referenceData (source of truth)
  const scenarios: ISerializedScenario[] = referenceData?.scenarios ?? [];

  // ============================================================================
  // HANDLERS
  // ============================================================================

  /**
   * Creates a new scenario with a default name and empty change requests,
   * then notifies the parent.
   */
  const handleAddScenario = useCallback(() => {
    const newScenario: ISerializedScenario = {
      id: generateUUID(),
      name: `Scenario ${scenarios.length + 1}`,
      changeRequests: [],
    };
    const updated = [...scenarios, newScenario];
    onScenariosChange(updated);
    // Auto-expand the newly created scenario
    setExpandedId(newScenario.id);
  }, [scenarios, onScenariosChange]);

  /**
   * Updates a single scenario in the list by id and notifies the parent.
   */
  const handleUpdateScenario = useCallback(
    (updatedScenario: ISerializedScenario) => {
      const updated = scenarios.map((s) =>
        s.id === updatedScenario.id ? updatedScenario : s
      );
      onScenariosChange(updated);
    },
    [scenarios, onScenariosChange]
  );

  /**
   * Removes a scenario from the list by id and notifies the parent.
   */
  const handleDeleteScenario = useCallback(
    (scenarioId: string) => {
      const updated = scenarios.filter((s) => s.id !== scenarioId);
      onScenariosChange(updated);
      // Collapse if the deleted scenario was expanded
      if (expandedId === scenarioId) {
        setExpandedId(null);
      }
    },
    [scenarios, onScenariosChange, expandedId]
  );

  /**
   * Toggles the expanded state of a scenario card.
   * Only one card can be expanded at a time.
   */
  const handleToggleExpand = useCallback(
    (scenarioId: string) => {
      setExpandedId((prev) => (prev === scenarioId ? null : scenarioId));
    },
    []
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-2">
      {/* Baseline Scenario (always present, read-only) */}
      <div className="border border-gray-200 rounded-lg bg-gray-50 px-2 py-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-700">Baseline</span>
          <span className="text-[10px] text-gray-400">
            — no parameter changes
          </span>
        </div>
      </div>

      {/* User-Created Scenarios */}
      {scenarios.map((scenario) => (
        <ScenarioDefinitionCard
          key={scenario.id}
          scenario={scenario}
          referenceData={referenceData}
          onUpdate={handleUpdateScenario}
          onDelete={handleDeleteScenario}
          isExpanded={expandedId === scenario.id}
          onToggleExpand={() => handleToggleExpand(scenario.id)}
        />
      ))}

      {/* Add Scenario Button */}
      <button
        type="button"
        onClick={handleAddScenario}
        className="flex items-center gap-1 px-3 py-1.5 text-xs text-blue-600 border border-blue-300 rounded hover:bg-blue-50 w-full justify-center"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Scenario
      </button>
    </div>
  );
};

export default React.memo(ScenarioDefinitionEditor);
