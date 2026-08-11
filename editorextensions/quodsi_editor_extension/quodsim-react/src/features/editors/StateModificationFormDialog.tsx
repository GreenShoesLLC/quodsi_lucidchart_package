import React, { useState, useEffect, useMemo } from "react";
import { X, ChevronDown, ChevronUp, Info } from "lucide-react";
import {
  StateModification,
  State,
  StateListManager,
  StateOperation,
  StateType,
  ComponentType,
  getSupportedOperationsForType,
  parseExpression,
  collectStateNames,
  inferExpressionType,
  findArityError,
  expressionHint,
} from "@quodsi/lucid-shared";
import { SampleDistributionEditor } from "./sample";

type OperandMode = "literal" | "expression";

/** Expression mode is only offered for target types the parser/inferencer can
 *  type-check an operand against: NUMBER and BOOLEAN. CATEGORY/STRING targets
 *  never see the toggle (mirrors StateExpressionValidation step 5). */
const supportsExpression = (dataType: StateType | undefined): boolean =>
  dataType === StateType.NUMBER || dataType === StateType.BOOLEAN;

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
  const [operandMode, setOperandMode] = useState<OperandMode>(
    modification?.valueExpression ? "expression" : "literal"
  );
  const [valueExpression, setValueExpression] = useState<string>(
    modification?.valueExpression ?? ""
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

  // SAMPLE operation state
  const [distributionType, setDistributionType] = useState<string>(
    modification?.distributionType || ""
  );
  const [distributionParameters, setDistributionParameters] = useState<Record<string, any>>(
    modification?.distributionParameters || {}
  );

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

  // Expression mode is only offered for NUMBER/BOOLEAN targets, and never for
  // SAMPLE. Switching the target state to a CATEGORY/STRING state, or the
  // operation to SAMPLE, must not strand the draft in expression mode —
  // Save would otherwise emit a valueExpression the target/operation cannot
  // accept, which StateModification.fromJSON (and three separate validators)
  // reject.
  const expressionSupported = supportsExpression(selectedState?.dataType);

  useEffect(() => {
    if (operandMode === "expression" && (!expressionSupported || operation === StateOperation.SAMPLE)) {
      setOperandMode("literal");
    }
  }, [expressionSupported, operation, operandMode]);

  // States an expression may read: ENTITY/MODEL-scoped only — mirrors
  // StateExpressionValidation step 2 (RESOURCE/ACTIVITY states are
  // per-instance and have no single value an expression can read). Sourced
  // from the full model (not `availableStates`, which may be trimmed by
  // `filterComponentType` for the *target* dropdown) since an expression may
  // read any ENTITY/MODEL state regardless of what this dialog's target
  // picker is scoped to.
  const readableStates = useMemo(
    () =>
      states
        .getAll()
        .filter((s) => s.componentType === ComponentType.ENTITY || s.componentType === ComponentType.MODEL),
    [states]
  );

  // Fix round 2, Finding 1: surrounding whitespace is not part of the
  // expression, and a LEADING space or tab is an outright engine rejection —
  // Python parses in `eval` mode, where an indented logical line is an
  // IndentationError reported as E_SYNTAX. Trim once, here, so a pasted
  // `" qty * 2"` simply works rather than erroring, and so the text that is
  // validated is exactly the text that is saved.
  const trimmedExpression = valueExpression.trim();

  const expressionError = useMemo<string | null>(() => {
    if (operandMode !== "expression") return null;
    if (!trimmedExpression) return "Enter an expression";

    const { node, issues } = parseExpression(trimmedExpression);
    if (issues.length > 0) return issues[0].message;
    if (node === null) return "Expression could not be parsed";

    const typesByName = new Map(readableStates.map((s) => [s.name, s.dataType]));
    // Array.from, not `for...of` directly over the Set — this project's
    // tsconfig targets es5 without downlevelIteration, so iterating a Set
    // in place fails to compile (TS2802).
    for (const name of Array.from(collectStateNames(trimmedExpression))) {
      if (typesByName.has(name)) continue;
      const elsewhere = states.getAll().find((s) => s.name === name);
      return elsewhere
        ? `State '${name}' is ${elsewhere.componentType}-scoped. Only ENTITY and ` +
            `MODEL states can be read in an expression.`
        : `Unknown state '${name}'`;
    }

    const resultType = inferExpressionType(node, typesByName);
    if (resultType === null) {
      // Check findArityError before falling back to the generic message:
      // inferExpressionType collapses a wrong-arity call to the same `null`
      // as a genuine type mismatch, but "mixes incompatible types" actively
      // misleads for e.g. min(qty) — the operand is fine, the real fault is
      // the argument count.
      const arityError = findArityError(node);
      return arityError ?? "Expression mixes incompatible types";
    }
    if (selectedState && resultType !== selectedState.dataType) {
      return (
        `Expression produces ${resultType}, but '${selectedState.name}' is ` +
        `${selectedState.dataType}`
      );
    }
    return null;
  }, [operandMode, trimmedExpression, readableStates, selectedState, states]);

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

    // For SAMPLE operations, validate distribution config instead of value
    if (operation === StateOperation.SAMPLE) {
      if (!distributionType) {
        setError("Please configure the distribution");
        return false;
      }
      // Additional validation based on state type
      if (selectedState.dataType === StateType.CATEGORY) {
        const probs = distributionParameters?.probabilities;
        if (!probs || Object.keys(probs).length === 0) {
          setError("Please set probabilities for all category values");
          return false;
        }
        const sum = Object.values(probs).reduce((acc: number, val) => acc + (val as number), 0);
        if (Math.abs(sum - 1.0) > 1e-6) {
          setError("Probabilities must sum to 1.0");
          return false;
        }
      } else if (selectedState.dataType === StateType.BOOLEAN) {
        const p = distributionParameters?.p;
        if (p === undefined || p < 0 || p > 1) {
          setError("Probability must be between 0 and 1");
          return false;
        }
      }
      return true;
    }

    // For non-SAMPLE operations in expression mode, validate the expression
    // instead of the literal value — `value` carries no meaning here.
    if (operandMode === "expression") {
      if (expressionError) {
        setError(expressionError);
        return false;
      }
      return true;
    }

    // For non-SAMPLE operations in literal mode, validate value
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

  // Handle distribution change from SampleDistributionEditor
  const handleDistributionChange = (type: string, params: Record<string, any>) => {
    setDistributionType(type);
    setDistributionParameters(params);
  };

  // Handle save
  const handleSave = () => {
    if (!validate() || !selectedState) return;

    // Expression mode never applies to SAMPLE — even if operandMode were
    // somehow left as "expression" from a prior state, SAMPLE must not
    // carry a valueExpression (StateModification.fromJSON's invariant).
    const isExpression = operation !== StateOperation.SAMPLE && operandMode === "expression";

    try {
      // For SAMPLE operations, use a placeholder value (it's ignored at
      // runtime). In expression mode, `value` carries no meaning — exactly
      // one of value/valueExpression is emitted below.
      const parsedValue = operation === StateOperation.SAMPLE
        ? getDefaultValueForType(selectedState.dataType)
        : isExpression
        ? undefined
        : parseValue(value, selectedState.dataType);

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
          distributionType: operation === StateOperation.SAMPLE ? distributionType : undefined,
          distributionParameters: operation === StateOperation.SAMPLE ? distributionParameters : undefined,
          valueExpression: isExpression ? trimmedExpression : undefined,
        }
      );

      onSave(newModification);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create modification");
    }
  };

  // Get default placeholder value for a state type (used for SAMPLE operations)
  const getDefaultValueForType = (dataType: StateType): number | string | boolean => {
    switch (dataType) {
      case StateType.NUMBER:
        return 0;
      case StateType.BOOLEAN:
        return false;
      case StateType.STRING:
      case StateType.CATEGORY:
      default:
        return "";
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
              <div className="flex items-center gap-1 mb-1">
                <label className="text-xs font-medium text-gray-700">
                  Operation *
                </label>
                <span title="Choose how to modify the state value. Arithmetic operations (Add, Subtract, Multiply, Divide) are available for NUMBER states. Other state types only support assignment (=).">
                  <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                </span>
              </div>
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
                      : op === StateOperation.DIVIDE
                      ? "Divide"
                      : op === StateOperation.SAMPLE
                      ? "Sample from Distribution"
                      : op} ({op})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* SAMPLE Distribution Configuration */}
          {selectedState && operation === StateOperation.SAMPLE && (
            <div className="border-t pt-3">
              <SampleDistributionEditor
                state={selectedState}
                distributionType={distributionType}
                distributionParameters={distributionParameters}
                onChange={handleDistributionChange}
              />
            </div>
          )}

          {/* Literal/Expression toggle — NUMBER/BOOLEAN targets only, never for SAMPLE */}
          {selectedState && expressionSupported && operation !== StateOperation.SAMPLE && (
            <div className="flex gap-4">
              <label className="flex items-center gap-1 text-xs text-gray-700">
                <input
                  type="radio"
                  name="operandMode"
                  checked={operandMode === "literal"}
                  onChange={() => setOperandMode("literal")}
                />
                Value
              </label>
              <label className="flex items-center gap-1 text-xs text-gray-700">
                <input
                  type="radio"
                  name="operandMode"
                  checked={operandMode === "expression"}
                  onChange={() => setOperandMode("expression")}
                />
                Expression
              </label>
            </div>
          )}

          {/* Expression Input (non-SAMPLE operations, expression mode) */}
          {selectedState && operation !== StateOperation.SAMPLE && operandMode === "expression" && (
            <div>
              <label
                className="block text-xs font-medium text-gray-700 mb-1"
                htmlFor="state-modification-expression-input"
              >
                Expression value
              </label>
              <input
                id="state-modification-expression-input"
                aria-label="Expression value"
                type="text"
                className="w-full px-2 py-1.5 text-xs border rounded font-mono"
                list="expression-state-names"
                value={valueExpression}
                onChange={(e) => setValueExpression(e.target.value)}
                placeholder="qty * unit_price"
              />
              <datalist id="expression-state-names">
                {readableStates.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
              {expressionError && (
                <p className="text-xs text-red-600 mt-1">{expressionError}</p>
              )}
              {/* Shown WITH the error, not instead of it: the vocabulary is
                  most useful exactly when the expression doesn't parse. */}
              <p className="text-xs text-gray-500 mt-1">{expressionHint()}</p>
            </div>
          )}

          {/* Value Input (for non-SAMPLE operations, literal mode) */}
          {selectedState && operation !== StateOperation.SAMPLE && operandMode === "literal" && (
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
                    <div className="flex items-center gap-1 mb-1">
                      <label className="text-xs font-medium text-gray-700">
                        Component Unique ID
                      </label>
                      <span title="Specify a unique component ID to modify states on a different component. Leave empty to target the current component's state.">
                        <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                      </span>
                    </div>
                    <input
                      type="text"
                      className="w-full px-2 py-1.5 text-xs border rounded font-mono"
                      value={componentUniqueId}
                      onChange={(e) => setComponentUniqueId(e.target.value)}
                      placeholder="Specific component ID (optional)"
                    />
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
            disabled={
              !selectedState ||
              (operation !== StateOperation.SAMPLE &&
                (operandMode === "expression" ? expressionError !== null : !value))
            }
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
