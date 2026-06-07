import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Info } from "lucide-react";
import { State, StateType, ComponentType, StateListManager } from "@quodsi/lucid-shared";

interface Props {
  isOpen: boolean;
  state?: State; // If provided, we're editing; otherwise, adding
  defaultComponentType: ComponentType;
  stateListManager: StateListManager;
  onSave: (state: State) => void;
  onCancel: () => void;
}

const StateFormDialog: React.FC<Props> = ({
  isOpen,
  state,
  defaultComponentType,
  stateListManager,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState("");
  const [componentType, setComponentType] = useState<ComponentType>(defaultComponentType);
  const [dataType, setDataType] = useState<StateType>(StateType.NUMBER);
  const [description, setDescription] = useState("");
  const [initialValue, setInitialValue] = useState<string>("");
  const [collectStatistics, setCollectStatistics] = useState(true);
  const [categoryValues, setCategoryValues] = useState<string[]>([""]);
  const [errors, setErrors] = useState<string[]>([]);

  // Reset form when dialog opens/closes or state changes
  useEffect(() => {
    if (isOpen) {
      if (state) {
        // Editing existing state
        setName(state.name);
        setComponentType(state.componentType);
        setDataType(state.dataType);
        setDescription(state.description || "");
        setInitialValue(String(state.initialValue));
        setCollectStatistics(state.collectStatistics);
        setCategoryValues(
          state.dataType === StateType.CATEGORY && state.categoryValues
            ? [...state.categoryValues]
            : [""]
        );
      } else {
        // Adding new state
        setName("");
        setComponentType(defaultComponentType);
        setDataType(StateType.NUMBER);
        setDescription("");
        setInitialValue("0");
        setCollectStatistics(true);
        setCategoryValues([""]);
      }
      setErrors([]);
    }
  }, [isOpen, state, defaultComponentType]);

  // Update initialValue when dataType changes
  useEffect(() => {
    switch (dataType) {
      case StateType.NUMBER:
        setInitialValue("0");
        break;
      case StateType.BOOLEAN:
        setInitialValue("true");
        break;
      case StateType.STRING:
        setInitialValue("");
        break;
      case StateType.CATEGORY:
        setInitialValue("");
        break;
    }
  }, [dataType]);

  const validateForm = (): boolean => {
    const validationErrors: string[] = [];

    // Validate name
    if (!name.trim()) {
      validationErrors.push("Name is required");
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      validationErrors.push("Name must be a valid identifier (start with letter/underscore, contain only letters/numbers/underscores)");
    } else {
      // Check for name conflicts (except when editing the same state)
      const existingState = stateListManager.get(name);
      if (existingState && (!state || existingState.name !== state.name)) {
        if (existingState.componentType === componentType) {
          validationErrors.push(`A ${componentType} state named "${name}" already exists`);
        }
      }
    }

    // Validate initial value based on data type
    if (!initialValue.trim()) {
      validationErrors.push("Initial value is required");
    } else {
      switch (dataType) {
        case StateType.NUMBER:
          if (isNaN(Number(initialValue))) {
            validationErrors.push("Initial value must be a valid number");
          }
          break;
        case StateType.BOOLEAN:
          if (!["true", "false"].includes(initialValue.toLowerCase())) {
            validationErrors.push("Initial value must be 'true' or 'false'");
          }
          break;
        case StateType.CATEGORY:
          const validCategories = categoryValues.filter((v) => v.trim() !== "");
          if (validCategories.length === 0) {
            validationErrors.push("At least one category value is required");
          } else if (!validCategories.includes(initialValue)) {
            validationErrors.push("Initial value must be one of the category values");
          }
          break;
      }
    }

    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    // Convert initial value to correct type
    let typedInitialValue: number | string | boolean;
    switch (dataType) {
      case StateType.NUMBER:
        typedInitialValue = Number(initialValue);
        break;
      case StateType.BOOLEAN:
        typedInitialValue = initialValue.toLowerCase() === "true";
        break;
      default:
        typedInitialValue = initialValue;
    }

    // Create the state object
    const stateId = state?.id || `state-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newState = new State(
      stateId,
      name,
      componentType,
      dataType,
      typedInitialValue,
      {
        description: description || undefined,
        collectStatistics,
        categoryValues:
          dataType === StateType.CATEGORY
            ? categoryValues.filter((v) => v.trim() !== "")
            : undefined,
      }
    );

    onSave(newState);
  };

  const handleAddCategoryValue = () => {
    setCategoryValues([...categoryValues, ""]);
  };

  const handleRemoveCategoryValue = (index: number) => {
    setCategoryValues(categoryValues.filter((_, i) => i !== index));
  };

  const handleCategoryValueChange = (index: number, value: string) => {
    const updated = [...categoryValues];
    updated[index] = value;
    setCategoryValues(updated);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-sm font-semibold text-gray-900">
            {state ? "Edit State" : "Add New State"}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded p-2">
              {errors.map((error, index) => (
                <p key={index} className="text-xs text-red-600">
                  {error}
                </p>
              ))}
            </div>
          )}

          {/* Name */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <label className="text-xs font-medium text-gray-700">
                Name *
              </label>
              <span title="Must start with letter or underscore, and contain only letters, numbers, or underscores (e.g., entityCount, isActive, _internalState)">
                <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
              </span>
            </div>
            <input
              type="text"
              className="w-full px-2 py-1.5 text-xs border rounded"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., entityCount, isActive"
            />
          </div>

          {/* Component Type */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <label className="text-xs font-medium text-gray-700">
                Component Type *
              </label>
              <span title="Determines which component type can access and modify this state. Activity states are specific to an activity, while Entity, Resource, and Model states can be accessed across components.">
                <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
              </span>
            </div>
            <select
              className="w-full px-2 py-1.5 text-xs border rounded bg-white"
              value={componentType}
              onChange={(e) => setComponentType(e.target.value as ComponentType)}
            >
              {Object.values(ComponentType).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Data Type */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <label className="text-xs font-medium text-gray-700">
                Data Type *
              </label>
              <span title="Select the type of data this state will store. Number for numeric values, String for text, Boolean for true/false, or Category for a predefined set of values.">
                <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
              </span>
            </div>
            <select
              className="w-full px-2 py-1.5 text-xs border rounded bg-white"
              value={dataType}
              onChange={(e) => setDataType(e.target.value as StateType)}
            >
              {Object.values(StateType).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="w-full px-2 py-1.5 text-xs border rounded"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>

          {/* Category Values (only for CATEGORY type) */}
          {dataType === StateType.CATEGORY && (
            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="text-xs font-medium text-gray-700">
                  Category Values *
                </label>
                <span title="Define the allowed values for this category state. The state can only be set to one of these predefined values during simulation.">
                  <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                </span>
              </div>
              <div className="space-y-1">
                {categoryValues.map((value, index) => (
                  <div key={index} className="flex gap-1">
                    <input
                      type="text"
                      className="flex-1 px-2 py-1.5 text-xs border rounded"
                      value={value}
                      onChange={(e) => handleCategoryValueChange(index, e.target.value)}
                      placeholder={`Value ${index + 1}`}
                    />
                    {categoryValues.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCategoryValue(index)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddCategoryValue}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Plus className="w-3 h-3" />
                  Add Value
                </button>
              </div>
            </div>
          )}

          {/* Initial Value */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <label className="text-xs font-medium text-gray-700">
                Initial Value *
              </label>
              <span title="The starting value for this state when the simulation begins. For Category types, must be one of the defined category values.">
                <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
              </span>
            </div>
            {dataType === StateType.BOOLEAN ? (
              <select
                className="w-full px-2 py-1.5 text-xs border rounded bg-white"
                value={initialValue}
                onChange={(e) => setInitialValue(e.target.value)}
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : dataType === StateType.CATEGORY ? (
              <select
                className="w-full px-2 py-1.5 text-xs border rounded bg-white"
                value={initialValue}
                onChange={(e) => setInitialValue(e.target.value)}
              >
                <option value="">Select a value...</option>
                {categoryValues
                  .filter((v) => v.trim() !== "")
                  .map((value, index) => (
                    <option key={index} value={value}>
                      {value}
                    </option>
                  ))}
              </select>
            ) : (
              <input
                type={dataType === StateType.NUMBER ? "number" : "text"}
                className="w-full px-2 py-1.5 text-xs border rounded"
                value={initialValue}
                onChange={(e) => setInitialValue(e.target.value)}
                placeholder={dataType === StateType.NUMBER ? "0" : "Initial value"}
              />
            )}
          </div>

          {/* Collect Statistics */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="collectStatistics"
              className="w-3 h-3"
              checked={collectStatistics}
              onChange={(e) => setCollectStatistics(e.target.checked)}
            />
            <label htmlFor="collectStatistics" className="text-xs text-gray-700">
              Collect statistics for this state
            </label>
            <span title="When enabled, the simulation will track statistical information (min, max, mean, standard deviation) for this state variable over time. Useful for analyzing state behavior across simulation runs.">
              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs border rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {state ? "Save Changes" : "Add State"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StateFormDialog;
