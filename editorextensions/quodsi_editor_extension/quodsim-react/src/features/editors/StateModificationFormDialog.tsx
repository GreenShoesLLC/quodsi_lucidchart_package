import React, { useState, useEffect, useMemo } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import {
  StateModification,
  State,
  StateListManager,
  StateOperation,
  StateType,
  ComponentType,
  getSupportedOperationsForType,
} from "@quodsi/shared";

interface Props {
  isOpen: boolean;
  modification?: StateModification;
  states: StateListManager;
  onSave: (modification: StateModification) => void;
  onCancel: () => void;
  allowCrossComponent?: boolean;
  filterComponentType?: ComponentType;
}

const StateModificationFormDialog: React.FC<Props> = ({
  isOpen,
  modification,
  states,
  onSave,
  onCancel,
  allowCrossComponent = false,
  filterComponentType,
}) => {
  const isEditMode = !!modification;

  // Get available states (filtered if needed)
  const availableStates = useMemo(() => {
    const allStates = states.getAll();
    if (filterComponentType) {
      return allStates.filter((s) => s.componentType === filterComponentType);
    }
    return allStates;
  }, [states, filterComponentType]);

  // Form state
  const [selectedStateId, setSelectedStateId] = useState<string>(
    modification?.stateUniqueId || ""
  );
  const [operation, setOperation] = useState<StateOperation>(
    modification?.operation || StateOperation.ASSIGN
  );
  const [value, setValue] = useState<string>(
    modification?.value?.toString() || ""
  );
  const [showAdvanced, setShowAdvanced] = useState<boolean>(
    !!(modification?.componentUniqueId || modification?.targetComponentType)
  );
  const [targetComponentType, setTargetComponentType] = useState<string>(
    modification?.targetComponentType || ""
  );
  const [componentUniqueId, setComponentUniqueId] = useState<string>(
    modification?.componentUniqueId || ""
  );
  const [error, setError] = useState<string>("");

  // Get selected state
  const selectedState = useMemo(() => {
    return states.getByUniqueId(selectedStateId);
  }, [selectedStateId, states]);

  // Get supported operations for selected state
  const supportedOperations = useMemo(() => {
    if (!selectedState) return [StateOperation.ASSIGN];
    return getSupportedOperationsForType(selectedState.dataType);
  }, [selectedState]);

  // Reset operation if it's not supported by newly selected state
  useEffect(() => {
    if (selectedState && !supportedOperations.includes(operation)) {
      setOperation(StateOperation.ASSIGN);
    }
  }, [selectedState, supportedOperations, operation]);

  // Validation
  const validate = (): boolean => {
    setError("");

    if (!selectedStateId) {
      setError("Please select a state");
      return false;
    }

    if (!selectedState) {
      setError("Selected state not found");
      return false;
    }

    if (!value) {
      setError("Please enter a value");
      return false;
    }

    // Type-specific validation
    try {
      const parsedValue = parseValue(value, selectedState.dataType);
      selectedState.validateValue(parsedValue);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid value");
      return false;
    }

    return true;
  };

  // Parse value based on state type
  const parseValue = (
    val: string,
    dataType: StateType
  ): number | string | boolean => {
    switch (dataType) {
      case StateType.NUMBER:
        const num = parseFloat(val);
        if (isNaN(num)) {
          throw new Error("Invalid number");
        }
        return num;
      case StateType.BOOLEAN:
        return val === "true";
      case StateType.STRING:
      case StateType.CATEGORY:
        return val;
      default:
        return val;
    }
  };

  // Handle save
  const handleSave = () => {
    if (!validate() || !selectedState) return;

    try {
      const parsedValue = parseValue(value, selectedState.dataType);

      const newModification = new StateModification(
        selectedStateId,
        selectedState.name,
        operation,
        parsedValue,
        {
          componentUniqueId: componentUniqueId || undefined,
          targetComponentType: targetComponentType
            ? (targetComponentType as ComponentType)
            : undefined,
        }
      );

      onSave(newModification);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create modification");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">
            {isEditMode ? "Edit" : "Add"} State Modification
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* State Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              State *
            </label>
            <select
              className="w-full px-2 py-1.5 text-xs border rounded bg-white"
              value={selectedStateId}
              onChange={(e) => setSelectedStateId(e.target.value)}
            >
              <option value="">Select a state...</option>
              {availableStates.map((state) => (
                <option key={state.id} value={state.id}>
                  {state.name} ({state.componentType} - {state.dataType})
                </option>
              ))}
            </select>
            {availableStates.length === 0 && (
              <p className="text-xs text-orange-600 mt-1">
                No states defined yet. Create states first in the State Definitions section.
              </p>
            )}
          </div>

          {/* Operation Selection */}
          {selectedState && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Operation *
              </label>
              <select
                className="w-full px-2 py-1.5 text-xs border rounded bg-white"
                value={operation}
                onChange={(e) => setOperation(e.target.value as StateOperation)}
              >
                {supportedOperations.map((op) => (
                  <option key={op} value={op}>
                    {op === StateOperation.ASSIGN
                      ? "Assign"
                      : op === StateOperation.ADD
                      ? "Add"
                      : op === StateOperation.SUBTRACT
                      ? "Subtract"
                      : op === StateOperation.MULTIPLY
                      ? "Multiply"
                      : "Divide"} ({op})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {selectedState.dataType === StateType.NUMBER
                  ? "Arithmetic operations available for NUMBER states"
                  : "Only assignment (=) available for this state type"}
              </p>
            </div>
          )}

          {/* Value Input */}
          {selectedState && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Value *
              </label>
              {selectedState.dataType === StateType.BOOLEAN ? (
                <select
                  className="w-full px-2 py-1.5 text-xs border rounded bg-white"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : selectedState.dataType === StateType.CATEGORY ? (
                <select
                  className="w-full px-2 py-1.5 text-xs border rounded bg-white"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                >
                  <option value="">Select a category...</option>
                  {selectedState.categoryValues?.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              ) : selectedState.dataType === StateType.NUMBER ? (
                <input
                  type="number"
                  className="w-full px-2 py-1.5 text-xs border rounded"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Enter a number"
                  step="any"
                />
              ) : (
                <input
                  type="text"
                  className="w-full px-2 py-1.5 text-xs border rounded"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Enter a value"
                />
              )}
            </div>
          )}

          {/* Advanced Options */}
          {allowCrossComponent && (
            <div className="border-t pt-3">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
              >
                {showAdvanced ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
                Advanced: Cross-Component Access
              </button>

              {showAdvanced && (
                <div className="mt-3 space-y-3 pl-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Target Component Type
                    </label>
                    <select
                      className="w-full px-2 py-1.5 text-xs border rounded bg-white"
                      value={targetComponentType}
                      onChange={(e) => setTargetComponentType(e.target.value)}
                    >
                      <option value="">Auto (infer from state)</option>
                      {Object.values(ComponentType).map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Component Unique ID
                    </label>
                    <input
                      type="text"
                      className="w-full px-2 py-1.5 text-xs border rounded font-mono"
                      value={componentUniqueId}
                      onChange={(e) => setComponentUniqueId(e.target.value)}
                      placeholder="Specific component ID (optional)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty to target current component
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!selectedState || !value}
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isEditMode ? "Save Changes" : "Add Modification"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StateModificationFormDialog;
