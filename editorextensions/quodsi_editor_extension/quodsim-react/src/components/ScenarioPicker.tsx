import React, { useState, useRef, useEffect } from "react";
import { X, Plus, ChevronDown } from "lucide-react";
import { SelectedScenario } from "../utils/scenarioDataMerge";

interface AvailableScenario {
  id: string;
  name: string;
}

interface ScenarioPickerProps {
  selectedScenarios: SelectedScenario[];
  availableScenarios: AvailableScenario[];
  onAdd: (scenarioId: string) => void;
  onRemove: (scenarioId: string) => void;
  maxScenarios?: number;
}

const ScenarioPicker: React.FC<ScenarioPickerProps> = ({
  selectedScenarios,
  availableScenarios,
  onAdd,
  onRemove,
  maxScenarios = 5,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedIds = new Set(selectedScenarios.map((s) => s.id));
  const unselected = availableScenarios.filter((s) => !selectedIds.has(s.id));
  const atMax = selectedScenarios.length >= maxScenarios;
  const canRemove = selectedScenarios.length > 1;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {selectedScenarios.map((scenario) => (
        <div
          key={scenario.id}
          className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs"
          title={scenario.id}
        >
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: scenario.color }}
          />
          <span className="truncate max-w-[100px]">{scenario.name}</span>
          {canRemove && (
            <button
              onClick={() => onRemove(scenario.id)}
              className="text-gray-400 hover:text-gray-600 ml-0.5"
              title="Remove from comparison"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}

      {unselected.length > 0 && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => !atMax && setDropdownOpen(!dropdownOpen)}
            disabled={atMax}
            className={`flex items-center gap-0.5 px-2 py-0.5 text-xs rounded border transition-colors ${
              atMax
                ? "border-gray-200 text-gray-300 cursor-not-allowed"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
            title={atMax ? `Maximum ${maxScenarios} scenarios` : "Add scenario to compare"}
          >
            <Plus className="w-3 h-3" />
            Add
            <ChevronDown className="w-3 h-3" />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-20 min-w-[160px] max-h-[200px] overflow-y-auto">
              {unselected.map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => {
                    onAdd(scenario.id);
                    setDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 transition-colors"
                  title={scenario.id}
                >
                  {scenario.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScenarioPicker;
