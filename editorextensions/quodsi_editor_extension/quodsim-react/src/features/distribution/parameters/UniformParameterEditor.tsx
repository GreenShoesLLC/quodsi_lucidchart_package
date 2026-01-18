import React, { useState, useEffect, useRef } from "react";
import { Info } from "lucide-react";
import {
  UniformParameters,
  UNIFORM_PARAMETER_METADATA,
  UniformDistribution,
} from "@quodsi/shared";
import { useMultiParameterEditorState } from "../../../messaging/hooks/useParameterEditorState";

interface UniformParameterEditorProps {
  parameters: UniformParameters;
  onChange: (updatedParameters: UniformParameters) => void;
  disabled?: boolean;
  elementId?: string; // Optional: for Redux save state integration
}

export const UniformParameterEditor: React.FC<UniformParameterEditorProps> = ({
  parameters,
  onChange,
  disabled = false,
  elementId,
}) => {
  // State for error messages
  const [errors, setErrors] = useState<{low?: string; high?: string}>({});

  // Use stateful parameter editor with Redux integration (for both low and high)
  const { localParams, setLocalParams, isDirty, setIsDirty, isSaving } =
    useMultiParameterEditorState(parameters, elementId);

  // String state for input display (allows intermediate values like ".", "0.", ".5")
  const [lowInput, setLowInput] = useState(String(localParams.low));
  const [highInput, setHighInput] = useState(String(localParams.high));

  // Track focus state to prevent syncing while user is typing
  const lowFocusedRef = useRef(false);
  const highFocusedRef = useRef(false);

  // Sync inputs with localParams only when not focused
  useEffect(() => {
    if (!lowFocusedRef.current && !isSaving) {
      setLowInput(String(localParams.low));
    }
    if (!highFocusedRef.current && !isSaving) {
      setHighInput(String(localParams.high));
    }
  }, [localParams.low, localParams.high, isSaving]);

  // Get metadata
  const lowMetadata = UNIFORM_PARAMETER_METADATA.low;
  const highMetadata = UNIFORM_PARAMETER_METADATA.high;

  const handleLowFocus = () => {
    lowFocusedRef.current = true;
  };

  const handleLowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Just store the raw value - don't validate or propagate yet
    setLowInput(e.target.value);
    setIsDirty(true);
    setErrors(prev => ({...prev, low: undefined}));
  };

  const handleLowBlur = () => {
    lowFocusedRef.current = false;

    const parsed = parseFloat(lowInput);

    if (isNaN(parsed) || lowInput.trim() === '') {
      // Reset to current valid value
      setLowInput(String(localParams.low));
      setErrors(prev => ({...prev, low: undefined}));
      return;
    }

    let updatedParams: UniformParameters = {
      ...localParams,
      low: parsed
    };

    // If the new low value is greater than or equal to the high value,
    // automatically increase the high value to be low + 1
    if (parsed >= localParams.high) {
      updatedParams.high = parsed + 1;
      setLocalParams(updatedParams);
      setLowInput(String(parsed));
      setHighInput(String(parsed + 1));
      setErrors(prev => ({
        ...prev,
        high: `Maximum automatically adjusted to ${updatedParams.high} to maintain proper range.`
      }));
    } else {
      setLowInput(String(parsed));
      setLocalParams({ ...localParams, low: parsed });
    }

    setIsDirty(false);

    if (UniformDistribution.validateParameters(updatedParams)) {
      onChange(updatedParams);
    }
  };

  const handleHighFocus = () => {
    highFocusedRef.current = true;
  };

  const handleHighChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Just store the raw value - don't validate or propagate yet
    setHighInput(e.target.value);
    setIsDirty(true);
    setErrors(prev => ({...prev, high: undefined}));
  };

  const handleHighBlur = () => {
    highFocusedRef.current = false;

    const parsed = parseFloat(highInput);

    if (isNaN(parsed) || highInput.trim() === '') {
      // Reset to current valid value
      setHighInput(String(localParams.high));
      setErrors(prev => ({...prev, high: undefined}));
      return;
    }

    let updatedParams: UniformParameters = {
      ...localParams,
      high: parsed
    };

    // If the new high value is less than or equal to the low value,
    // automatically decrease the low value to be high - 1
    if (parsed <= localParams.low) {
      updatedParams.low = Math.max(0, parsed - 1);
      setLocalParams(updatedParams);
      setHighInput(String(parsed));
      setLowInput(String(updatedParams.low));
      setErrors(prev => ({
        ...prev,
        low: `Minimum automatically adjusted to ${updatedParams.low} to maintain proper range.`
      }));
    } else {
      setHighInput(String(parsed));
      setLocalParams({ ...localParams, high: parsed });
    }

    setIsDirty(false);

    if (UniformDistribution.validateParameters(updatedParams)) {
      onChange(updatedParams);
    }
  };

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs text-gray-600 font-medium mb-0.5">
          <span className="inline-flex items-center gap-1">
            {lowMetadata.label}
            <span title="The lower bound of the uniform distribution. Values will be randomly generated with equal probability between Minimum and Maximum.">
              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
            </span>
          </span>
          {isDirty && <span className="ml-1 text-orange-500 text-[10px]">*</span>}
          {isSaving && <span className="ml-1 text-blue-500 text-[10px]">(saving...)</span>}
        </label>
        <input
          type="number"
          value={lowInput}
          onChange={handleLowChange}
          onFocus={handleLowFocus}
          onBlur={handleLowBlur}
          disabled={disabled || isSaving}
          min={lowMetadata.min}
          step={lowMetadata.step}
          className={`w-full px-2 py-1 text-xs border rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none ${
            disabled || isSaving
              ? "border-gray-200 bg-gray-50 cursor-not-allowed"
              : "border-gray-300"
          }`}
        />
        {errors.low && <p className="text-xs text-red-500 mt-1">{errors.low}</p>}
      </div>
      <div>
        <label className="block text-xs text-gray-600 font-medium mb-0.5">
          <span className="inline-flex items-center gap-1">
            {highMetadata.label}
            <span title="The upper bound of the uniform distribution. Values will be randomly generated with equal probability between Minimum and Maximum.">
              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
            </span>
          </span>
          {isDirty && <span className="ml-1 text-orange-500 text-[10px]">*</span>}
          {isSaving && <span className="ml-1 text-blue-500 text-[10px]">(saving...)</span>}
        </label>
        <input
          type="number"
          value={highInput}
          onChange={handleHighChange}
          onFocus={handleHighFocus}
          onBlur={handleHighBlur}
          disabled={disabled || isSaving}
          min={highMetadata.min}
          step={highMetadata.step}
          className={`w-full px-2 py-1 text-xs border rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none ${
            disabled || isSaving
              ? "border-gray-200 bg-gray-50 cursor-not-allowed"
              : "border-gray-300"
          }`}
        />
        {errors.high && <p className="text-xs text-red-500 mt-1">{errors.high}</p>}
      </div>
    </div>
  );
};