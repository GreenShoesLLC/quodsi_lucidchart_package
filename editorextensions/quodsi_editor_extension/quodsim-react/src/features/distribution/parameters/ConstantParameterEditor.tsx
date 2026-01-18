import React, { useState, useEffect, useRef } from "react";
import {
  ConstantParameters,
  CONSTANT_PARAMETER_METADATA,
  ConstantDistribution,
} from "@quodsi/shared";
import { useParameterEditorState } from "../../../messaging/hooks/useParameterEditorState";

interface ConstantParameterEditorProps {
  parameters: ConstantParameters;
  onChange: (updatedParameters: ConstantParameters) => void;
  disabled?: boolean;
  elementId?: string; // Optional: for Redux save state integration
}

export const ConstantParameterEditor: React.FC<ConstantParameterEditorProps> = ({
  parameters,
  onChange,
  disabled = false,
  elementId,
}) => {
  // Get metadata for the parameter
  const metadata = CONSTANT_PARAMETER_METADATA.value;

  // Use stateful parameter editor with Redux integration
  const { localValue, setLocalValue, isDirty, setIsDirty, isSaving } =
    useParameterEditorState(parameters.value, elementId);

  // String state for input display (allows intermediate values like ".", "0.", ".5")
  const [inputValue, setInputValue] = useState(String(localValue));

  // Track focus state to prevent syncing while user is typing
  const isFocusedRef = useRef(false);

  // Sync input with localValue only when not focused
  useEffect(() => {
    if (!isFocusedRef.current && !isSaving) {
      setInputValue(String(localValue));
    }
  }, [localValue, isSaving]);

  const handleFocus = () => {
    isFocusedRef.current = true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Just store the raw value - don't validate or propagate yet
    setInputValue(e.target.value);
    setIsDirty(true);
  };

  const handleBlur = () => {
    isFocusedRef.current = false;

    const parsed = parseFloat(inputValue);

    if (isNaN(parsed) || inputValue.trim() === '') {
      // Reset to current valid value
      setInputValue(String(localValue));
      setIsDirty(false);
      return;
    }

    setInputValue(String(parsed));
    setLocalValue(parsed);
    setIsDirty(false);

    const updatedParams: ConstantParameters = {
      ...parameters,
      value: parsed
    };

    if (ConstantDistribution.validateParameters(updatedParams)) {
      onChange(updatedParams);
    }
  };

  return (
    <div>
      <label className="block text-xs text-gray-600 font-medium mb-0.5">
        {metadata.label}
        {isDirty && <span className="ml-1 text-orange-500 text-[10px]">*</span>}
        {isSaving && <span className="ml-1 text-blue-500 text-[10px]">(saving...)</span>}
      </label>
      <input
        type="number"
        value={inputValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled || isSaving}
        min={metadata.min}
        step={metadata.step}
        className={`w-full px-2 py-1 text-xs border rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none ${
          disabled || isSaving
            ? "border-gray-200 bg-gray-50 cursor-not-allowed"
            : "border-gray-300"
        }`}
      />
    </div>
  );
};