import React from "react";
import {
  State,
  StateCondition,
  StateComparison,
  StateType,
  getSupportedComparisonsForType,
} from "@quodsi/lucid-shared";

interface StateConditionEditorProps {
  condition: StateCondition | null;
  states: State[];
  onChange: (condition: StateCondition) => void;
  onClear?: () => void;
  disabled?: boolean;
  label?: string;
  required?: boolean;
  compact?: boolean;
}

const COMPARISON_LABELS: Record<StateComparison, string> = {
  [StateComparison.EQUAL]: "==",
  [StateComparison.NOT_EQUAL]: "!=",
  [StateComparison.GREATER_THAN]: ">",
  [StateComparison.GREATER_EQUAL]: ">=",
  [StateComparison.LESS_THAN]: "<",
  [StateComparison.LESS_EQUAL]: "<=",
};

function getDefaultValueForType(state: State): number | string | boolean {
  switch (state.dataType) {
    case StateType.NUMBER:
      return 0;
    case StateType.BOOLEAN:
      return true;
    case StateType.CATEGORY:
      return state.categoryValues?.[0] ?? "";
    case StateType.STRING:
    default:
      return "";
  }
}

export const StateConditionEditor: React.FC<StateConditionEditorProps> = ({
  condition,
  states,
  onChange,
  onClear,
  disabled = false,
  label = "Condition",
  required = false,
  compact = false,
}) => {
  const selectedState = condition
    ? states.find((s) => s.name === condition.stateName)
    : null;

  const supportedComparisons = selectedState
    ? getSupportedComparisonsForType(selectedState.dataType)
    : Object.values(StateComparison);

  const handleStateChange = (stateName: string) => {
    const state = states.find((s) => s.name === stateName);
    if (!state) return;

    const newComparison =
      condition && supportedComparisons.includes(condition.comparison)
        ? condition.comparison
        : StateComparison.EQUAL;

    // Check if new state type supports current comparison
    const newSupported = getSupportedComparisonsForType(state.dataType);
    const comparison = newSupported.includes(newComparison)
      ? newComparison
      : StateComparison.EQUAL;

    onChange(
      new StateCondition(stateName, comparison, getDefaultValueForType(state))
    );
  };

  const handleComparisonChange = (comparison: StateComparison) => {
    if (!condition) return;
    onChange(new StateCondition(condition.stateName, comparison, condition.value));
  };

  const handleValueChange = (value: number | string | boolean) => {
    if (!condition) return;
    onChange(
      new StateCondition(condition.stateName, condition.comparison, value)
    );
  };

  const renderValueInput = () => {
    if (!selectedState || !condition) {
      return (
        <input
          type="text"
          value=""
          disabled
          placeholder="Value"
          className={compact ? "w-full px-1 py-0.5 text-xs border rounded" : "w-full px-2 py-1 text-xs border rounded"}
        />
      );
    }

    const inputClass = compact
      ? "w-full px-1 py-0.5 text-xs border rounded"
      : "w-full px-2 py-1 text-xs border rounded";
    const selectClass = compact
      ? "w-full px-1 py-0.5 text-xs border rounded bg-white"
      : "w-full px-2 py-1 text-xs border rounded bg-white";

    switch (selectedState.dataType) {
      case StateType.NUMBER:
        return (
          <input
            type="number"
            value={typeof condition.value === "number" ? condition.value : ""}
            onChange={(e) => {
              const parsed = parseFloat(e.target.value);
              handleValueChange(isNaN(parsed) ? 0 : parsed);
            }}
            placeholder="Value"
            className={inputClass}
            disabled={disabled}
          />
        );
      case StateType.BOOLEAN:
        return (
          <select
            value={String(condition.value)}
            onChange={(e) => handleValueChange(e.target.value === "true")}
            className={selectClass}
            disabled={disabled}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        );
      case StateType.CATEGORY:
        return (
          <select
            value={String(condition.value)}
            onChange={(e) => handleValueChange(e.target.value)}
            className={selectClass}
            disabled={disabled}
          >
            <option value="">Select a value...</option>
            {(selectedState.categoryValues || []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      case StateType.STRING:
      default:
        return (
          <input
            type="text"
            value={String(condition.value)}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="Value"
            className={inputClass}
            disabled={disabled}
          />
        );
    }
  };

  if (compact) {
    return (
      <div className="space-y-1">
        <select
          value={condition?.stateName || ""}
          onChange={(e) => handleStateChange(e.target.value)}
          className="w-full px-1 py-0.5 text-xs border rounded bg-white"
          disabled={disabled}
        >
          <option value="">Select state...</option>
          {states.map((state) => (
            <option key={state.id} value={state.name}>
              {state.name} ({state.dataType})
            </option>
          ))}
        </select>

        {condition?.stateName && (
          <div className="flex gap-1">
            <select
              value={condition?.comparison || StateComparison.EQUAL}
              onChange={(e) =>
                handleComparisonChange(e.target.value as StateComparison)
              }
              className="w-14 px-1 py-0.5 text-xs border rounded bg-white flex-shrink-0"
              disabled={disabled}
            >
              {supportedComparisons.map((comp) => (
                <option key={comp} value={comp}>
                  {COMPARISON_LABELS[comp]}
                </option>
              ))}
            </select>

            <div className="flex-1 min-w-0">
              {renderValueInput()}
            </div>
          </div>
        )}

        {onClear && condition && (
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] text-red-500 hover:text-red-700"
          >
            Clear condition
          </button>
        )}
      </div>
    );
  }

  // Non-compact (stacked) layout
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs text-gray-600 mb-0.5">
          <span className="inline-flex items-center gap-1">
            {label}
            {required && <span className="text-red-500">*</span>}
          </span>
        </label>
      )}

      <div>
        <label className="block text-xs text-gray-600 mb-1">State</label>
        <select
          className={`w-full px-2 py-1 text-xs border rounded bg-white ${
            required && !condition?.stateName ? "border-red-300 bg-red-50" : ""
          }`}
          value={condition?.stateName || ""}
          onChange={(e) => handleStateChange(e.target.value)}
          disabled={disabled}
        >
          <option value="">Select a state...</option>
          {states.map((state) => (
            <option key={state.id} value={state.name}>
              {state.name} ({state.dataType})
            </option>
          ))}
        </select>
      </div>

      {condition?.stateName && (
        <div>
          <label className="block text-xs text-gray-600 mb-1">Comparison</label>
          <select
            className="w-full px-2 py-1 text-xs border rounded bg-white"
            value={condition.comparison}
            onChange={(e) =>
              handleComparisonChange(e.target.value as StateComparison)
            }
            disabled={disabled}
          >
            {supportedComparisons.map((comp) => (
              <option key={comp} value={comp}>
                {COMPARISON_LABELS[comp]}
              </option>
            ))}
          </select>
        </div>
      )}

      {condition?.stateName && (
        <div>
          <label className="block text-xs text-gray-600 mb-1">Value</label>
          {renderValueInput()}
        </div>
      )}

      {onClear && condition && (
        <button
          type="button"
          onClick={onClear}
          className="text-[10px] text-red-500 hover:text-red-700"
        >
          Clear condition
        </button>
      )}
    </div>
  );
};

export default StateConditionEditor;
