import React, { useState, useEffect, useRef } from "react";
import { Info } from "lucide-react";
import {
  TriangularParameters,
  TRIANGULAR_PARAMETER_METADATA,
  TriangularDistribution,
} from "@quodsi/shared";
import { useMultiParameterEditorState } from "../../../messaging/hooks/useParameterEditorState";

interface TriangularParameterEditorProps {
  parameters: TriangularParameters;
  onChange: (updatedParameters: TriangularParameters) => void;
  disabled?: boolean;
  elementId?: string; // Optional: for Redux save state integration
}

export const TriangularParameterEditor: React.FC<TriangularParameterEditorProps> = ({
  parameters,
  onChange,
  disabled = false,
  elementId,
}) => {
  // Use stateful parameter editor with Redux integration (for left, mode, right)
  const { localParams, setLocalParams, isDirty, setIsDirty, isSaving } =
    useMultiParameterEditorState(parameters, elementId);

  // String state for input display (allows intermediate values like ".", "0.", ".5")
  const [leftInput, setLeftInput] = useState(String(localParams.left));
  const [modeInput, setModeInput] = useState(String(localParams.mode));
  const [rightInput, setRightInput] = useState(String(localParams.right));

  // Track focus state to prevent syncing while user is typing
  const leftFocusedRef = useRef(false);
  const modeFocusedRef = useRef(false);
  const rightFocusedRef = useRef(false);

  // Sync inputs with localParams only when not focused
  useEffect(() => {
    if (!leftFocusedRef.current && !isSaving) {
      setLeftInput(String(localParams.left));
    }
    if (!modeFocusedRef.current && !isSaving) {
      setModeInput(String(localParams.mode));
    }
    if (!rightFocusedRef.current && !isSaving) {
      setRightInput(String(localParams.right));
    }
  }, [localParams.left, localParams.mode, localParams.right, isSaving]);

  // Get metadata
  const leftMetadata = TRIANGULAR_PARAMETER_METADATA.left;
  const modeMetadata = TRIANGULAR_PARAMETER_METADATA.mode;
  const rightMetadata = TRIANGULAR_PARAMETER_METADATA.right;

  const handleLeftFocus = () => {
    leftFocusedRef.current = true;
  };

  const handleLeftChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Just store the raw value - don't validate or propagate yet
    setLeftInput(e.target.value);
    setIsDirty(true);
  };

  const handleLeftBlur = () => {
    leftFocusedRef.current = false;

    const parsed = parseFloat(leftInput);

    if (isNaN(parsed) || leftInput.trim() === '') {
      setLeftInput(String(localParams.left));
      return;
    }

    const updatedParams: TriangularParameters = {
      ...localParams,
      left: parsed
    };

    // If left becomes greater than mode, cascade adjustments with 0.01-unit spacing
    if (parsed > localParams.mode) {
      updatedParams.mode = parsed + 0.01;

      if (updatedParams.mode > localParams.right) {
        updatedParams.right = updatedParams.mode + 0.01;
      }
    }

    setLocalParams(updatedParams);
    setLeftInput(String(updatedParams.left));
    setModeInput(String(updatedParams.mode));
    setRightInput(String(updatedParams.right));
    setIsDirty(false);

    if (TriangularDistribution.validateParameters(updatedParams)) {
      onChange(updatedParams);
    }
  };

  const handleModeFocus = () => {
    modeFocusedRef.current = true;
  };

  const handleModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Just store the raw value - don't validate or propagate yet
    setModeInput(e.target.value);
    setIsDirty(true);
  };

  const handleModeBlur = () => {
    modeFocusedRef.current = false;

    const parsed = parseFloat(modeInput);

    if (isNaN(parsed) || modeInput.trim() === '') {
      setModeInput(String(localParams.mode));
      return;
    }

    const updatedParams: TriangularParameters = {
      ...localParams,
      mode: parsed
    };

    // If mode becomes greater than right, set right to mode + 0.01
    if (parsed > localParams.right) {
      updatedParams.right = parsed + 0.01;
    }

    // If mode becomes less than left, set left to mode - 0.01 (but not below 0)
    if (parsed < localParams.left) {
      updatedParams.left = Math.max(0, parsed - 0.01);
    }

    setLocalParams(updatedParams);
    setLeftInput(String(updatedParams.left));
    setModeInput(String(updatedParams.mode));
    setRightInput(String(updatedParams.right));
    setIsDirty(false);

    if (TriangularDistribution.validateParameters(updatedParams)) {
      onChange(updatedParams);
    }
  };

  const handleRightFocus = () => {
    rightFocusedRef.current = true;
  };

  const handleRightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Just store the raw value - don't validate or propagate yet
    setRightInput(e.target.value);
    setIsDirty(true);
  };

  const handleRightBlur = () => {
    rightFocusedRef.current = false;

    const parsed = parseFloat(rightInput);

    if (isNaN(parsed) || rightInput.trim() === '') {
      setRightInput(String(localParams.right));
      return;
    }

    const updatedParams: TriangularParameters = {
      ...localParams,
      right: parsed
    };

    // If right becomes less than mode, cascade adjustments with 0.01-unit spacing
    if (parsed < localParams.mode) {
      updatedParams.mode = Math.max(0, parsed - 0.01);

      if (updatedParams.mode < localParams.left) {
        updatedParams.left = Math.max(0, updatedParams.mode - 0.01);
      }
    }

    setLocalParams(updatedParams);
    setLeftInput(String(updatedParams.left));
    setModeInput(String(updatedParams.mode));
    setRightInput(String(updatedParams.right));
    setIsDirty(false);

    if (TriangularDistribution.validateParameters(updatedParams)) {
      onChange(updatedParams);
    }
  };

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs text-gray-600 font-medium mb-0.5">
          <span className="inline-flex items-center gap-1">
            {leftMetadata.label}
            <span title="The minimum possible value of the triangular distribution. This is the lower bound of the range.">
              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
            </span>
          </span>
          {isDirty && <span className="ml-1 text-orange-500 text-[10px]">*</span>}
          {isSaving && <span className="ml-1 text-blue-500 text-[10px]">(saving...)</span>}
        </label>
        <input
          type="number"
          value={leftInput}
          onChange={handleLeftChange}
          onFocus={handleLeftFocus}
          onBlur={handleLeftBlur}
          disabled={disabled || isSaving}
          min={leftMetadata.min}
          step={leftMetadata.step}
          className={`w-full px-2 py-1 text-xs border rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none ${
            disabled || isSaving
              ? "border-gray-200 bg-gray-50 cursor-not-allowed"
              : "border-gray-300"
          }`}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-600 font-medium mb-0.5">
          <span className="inline-flex items-center gap-1">
            {modeMetadata.label}
            <span title="The most likely (peak) value of the triangular distribution. Values near the mode occur more frequently than values near the minimum or maximum.">
              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
            </span>
          </span>
          {isDirty && <span className="ml-1 text-orange-500 text-[10px]">*</span>}
          {isSaving && <span className="ml-1 text-blue-500 text-[10px]">(saving...)</span>}
        </label>
        <input
          type="number"
          value={modeInput}
          onChange={handleModeChange}
          onFocus={handleModeFocus}
          onBlur={handleModeBlur}
          disabled={disabled || isSaving}
          min={modeMetadata.min}
          step={modeMetadata.step}
          className={`w-full px-2 py-1 text-xs border rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none ${
            disabled || isSaving
              ? "border-gray-200 bg-gray-50 cursor-not-allowed"
              : "border-gray-300"
          }`}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-600 font-medium mb-0.5">
          <span className="inline-flex items-center gap-1">
            {rightMetadata.label}
            <span title="The maximum possible value of the triangular distribution. This is the upper bound of the range.">
              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
            </span>
          </span>
          {isDirty && <span className="ml-1 text-orange-500 text-[10px]">*</span>}
          {isSaving && <span className="ml-1 text-blue-500 text-[10px]">(saving...)</span>}
        </label>
        <input
          type="number"
          value={rightInput}
          onChange={handleRightChange}
          onFocus={handleRightFocus}
          onBlur={handleRightBlur}
          disabled={disabled || isSaving}
          min={rightMetadata.min}
          step={rightMetadata.step}
          className={`w-full px-2 py-1 text-xs border rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none ${
            disabled || isSaving
              ? "border-gray-200 bg-gray-50 cursor-not-allowed"
              : "border-gray-300"
          }`}
        />
      </div>
    </div>
  );
};
