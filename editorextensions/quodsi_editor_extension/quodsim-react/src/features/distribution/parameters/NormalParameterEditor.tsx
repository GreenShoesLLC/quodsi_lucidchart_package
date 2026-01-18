import React, { useState, useEffect, useRef } from "react";
import { Info } from "lucide-react";
import {
  NormalParameters,
  NORMAL_PARAMETER_METADATA,
  NormalDistribution,
} from "@quodsi/shared";
import { useMultiParameterEditorState } from "../../../messaging/hooks/useParameterEditorState";

interface NormalParameterEditorProps {
  parameters: NormalParameters;
  onChange: (updatedParameters: NormalParameters) => void;
  disabled?: boolean;
  elementId?: string; // Optional: for Redux save state integration
}

export const NormalParameterEditor: React.FC<NormalParameterEditorProps> = ({
  parameters,
  onChange,
  disabled = false,
  elementId,
}) => {
  // State for error messages
  const [errors, setErrors] = useState<{mean?: string; std?: string}>({});

  // Use stateful parameter editor with Redux integration (for both mean and std)
  const { localParams, updateField, isDirty, setIsDirty, isSaving } =
    useMultiParameterEditorState(parameters, elementId);

  // String state for input display (allows intermediate values like ".", "0.", ".5")
  const [meanInput, setMeanInput] = useState(String(localParams.mean));
  const [stdInput, setStdInput] = useState(String(localParams.std));

  // Track focus state to prevent syncing while user is typing
  const meanFocusedRef = useRef(false);
  const stdFocusedRef = useRef(false);

  // Sync inputs with localParams only when not focused
  useEffect(() => {
    if (!meanFocusedRef.current && !isSaving) {
      setMeanInput(String(localParams.mean));
    }
    if (!stdFocusedRef.current && !isSaving) {
      setStdInput(String(localParams.std));
    }
  }, [localParams.mean, localParams.std, isSaving]);

  // Get metadata
  const meanMetadata = NORMAL_PARAMETER_METADATA.mean;
  const stdMetadata = NORMAL_PARAMETER_METADATA.std;

  const handleMeanFocus = () => {
    meanFocusedRef.current = true;
  };

  const handleMeanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Just store the raw value - don't validate or propagate yet
    setMeanInput(e.target.value);
    setIsDirty(true);
    setErrors(prev => ({...prev, mean: undefined}));
  };

  const handleMeanBlur = () => {
    meanFocusedRef.current = false;

    const parsed = parseFloat(meanInput);

    if (isNaN(parsed) || meanInput.trim() === '') {
      // Reset to current valid value
      setMeanInput(String(localParams.mean));
      setErrors(prev => ({...prev, mean: undefined}));
      return;
    }

    setMeanInput(String(parsed));
    updateField('mean', parsed);
    setIsDirty(false);

    const updatedParams: NormalParameters = {
      ...localParams,
      mean: parsed
    };

    if (NormalDistribution.validateParameters(updatedParams)) {
      onChange(updatedParams);
    }
  };

  const handleStdFocus = () => {
    stdFocusedRef.current = true;
  };

  const handleStdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Just store the raw value - don't validate or propagate yet
    setStdInput(e.target.value);
    setIsDirty(true);
    setErrors(prev => ({...prev, std: undefined}));
  };

  const handleStdBlur = () => {
    stdFocusedRef.current = false;

    const parsed = parseFloat(stdInput);

    if (isNaN(parsed) || stdInput.trim() === '') {
      // Reset to current valid value
      setStdInput(String(localParams.std));
      setErrors(prev => ({...prev, std: undefined}));
      return;
    }

    // Special handling for std to ensure it's always positive
    let finalValue = parsed;
    if (parsed <= 0) {
      finalValue = 0.1;
      setErrors(prev => ({...prev, std: 'Standard deviation must be greater than 0. Set to minimum value (0.1).'}));
    }

    setStdInput(String(finalValue));
    updateField('std', finalValue);
    setIsDirty(false);

    const updatedParams: NormalParameters = {
      ...localParams,
      std: finalValue
    };

    if (NormalDistribution.validateParameters(updatedParams)) {
      onChange(updatedParams);
    }
  };

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs text-gray-600 font-medium mb-0.5">
          <span className="inline-flex items-center gap-1">
            {meanMetadata.label}
            <span title="The average (center) value of the normal distribution. This is where the bell curve peaks.">
              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
            </span>
          </span>
          {isDirty && <span className="ml-1 text-orange-500 text-[10px]">*</span>}
          {isSaving && <span className="ml-1 text-blue-500 text-[10px]">(saving...)</span>}
        </label>
        <input
          type="number"
          value={meanInput}
          onChange={handleMeanChange}
          onFocus={handleMeanFocus}
          onBlur={handleMeanBlur}
          disabled={disabled || isSaving}
          min={meanMetadata.min}
          step={meanMetadata.step}
          className={`w-full px-2 py-1 text-xs border rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none ${
            disabled || isSaving
              ? "border-gray-200 bg-gray-50 cursor-not-allowed"
              : "border-gray-300"
          }`}
        />
        {errors.mean && <p className="text-xs text-red-500 mt-1">{errors.mean}</p>}
      </div>
      <div>
        <label className="block text-xs text-gray-600 font-medium mb-0.5">
          <span className="inline-flex items-center gap-1">
            {stdMetadata.label}
            <span title="Controls the spread of values around the mean. About 68% of values fall within 1 standard deviation, 95% within 2, and 99.7% within 3 standard deviations of the mean.">
              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
            </span>
          </span>
          {isDirty && <span className="ml-1 text-orange-500 text-[10px]">*</span>}
          {isSaving && <span className="ml-1 text-blue-500 text-[10px]">(saving...)</span>}
        </label>
        <input
          type="number"
          value={stdInput}
          onChange={handleStdChange}
          onFocus={handleStdFocus}
          onBlur={handleStdBlur}
          disabled={disabled || isSaving}
          min={stdMetadata.min}
          step={stdMetadata.step}
          className={`w-full px-2 py-1 text-xs border rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none ${
            disabled || isSaving
              ? "border-gray-200 bg-gray-50 cursor-not-allowed"
              : "border-gray-300"
          }`}
        />
        {errors.std && <p className="text-xs text-red-500 mt-1">{errors.std}</p>}
      </div>
    </div>
  );
};
