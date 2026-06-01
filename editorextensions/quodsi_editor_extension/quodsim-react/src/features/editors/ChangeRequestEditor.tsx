import React, { useState, useEffect, useRef } from "react";
import {
  ISerializedScenarioChangeRequest,
  ScenarioObjectType,
  ScenarioPropertyName,
  ScenarioSetterType,
  EditorReferenceData,
  generateUUID,
  validateChangeRequestValue,
  isIntegerInput,
  DistributionType,
  createDefaultDistribution,
  validateRateMultiplier,
  Distribution,
  PeriodUnit,
  PROPERTIES_BY_OBJECT_TYPE,
  PROPERTY_DISPLAY_LABELS,
} from "@quodsi/shared";
import { EnhancedDurationEditor } from "./EnhancedDurationEditor";

// ============================================================================
// TYPES
// ============================================================================

interface ChangeRequestEditorProps {
  changeRequest?: ISerializedScenarioChangeRequest;
  referenceData?: EditorReferenceData;
  onSave: (cr: ISerializedScenarioChangeRequest) => void;
  onCancel: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * User-friendly display labels for ScenarioSetterType enum values.
 */
const SETTER_TYPE_LABELS: Record<string, string> = {
  [ScenarioSetterType.EQUAL]: "Set to (=)",
  [ScenarioSetterType.ADD]: "Add (+)",
  [ScenarioSetterType.SUBTRACT]: "Subtract (-)",
  [ScenarioSetterType.MULTIPLY]: "Multiply (x)",
  [ScenarioSetterType.DIVIDE]: "Divide (/)",
  [ScenarioSetterType.MINIMUM]: "Minimum",
  [ScenarioSetterType.MAXIMUM]: "Maximum",
};

/**
 * User-friendly display labels for ScenarioObjectType enum values.
 */
const OBJECT_TYPE_LABELS: Record<string, string> = {
  [ScenarioObjectType.ACTIVITY]: "Activity",
  [ScenarioObjectType.RESOURCE]: "Resource",
  [ScenarioObjectType.GENERATOR]: "Generator",
  [ScenarioObjectType.CONNECTOR]: "Connector",
  [ScenarioObjectType.MODEL]: "Model",
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Human-readable label for an action type string.
 */
function actionTypeLabel(t: string): string {
  switch (t) {
    case "DELAY": return "Delay";
    case "DELAY_WITH_RESOURCE": return "Delay with Resource";
    case "SEIZE": return "Seize";
    case "RELEASE": return "Release";
    default: return t;
  }
}

/**
 * Returns the list of target objects from referenceData for the given object type.
 */
function getTargetObjects(
  objectType: string,
  referenceData?: EditorReferenceData
): Array<{ id: string; name: string }> {
  if (!referenceData) return [];
  switch (objectType) {
    case ScenarioObjectType.ACTIVITY:
      return (referenceData.activities ?? []).map((a) => ({ id: a.id, name: a.name }));
    case ScenarioObjectType.RESOURCE:
      return (referenceData.resources ?? []).map((r) => ({ id: r.id, name: r.name }));
    case ScenarioObjectType.GENERATOR:
      return (referenceData.generators ?? []).map((g) => ({ id: g.id, name: g.name }));
    case ScenarioObjectType.CONNECTOR:
      return (referenceData.connectors ?? []).map((c: any) => ({
        id: c.id,
        name: c.name || `Connector ${c.id.substring(0, 6)}`,
      }));
    default:
      return [];
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * ChangeRequestEditor - Form component for adding or editing a single
 * scenario change request. Provides cascading dropdowns for object type,
 * target object, (action — activity only), property, setter type, and value.
 */
const ChangeRequestEditor: React.FC<ChangeRequestEditorProps> = ({
  changeRequest,
  referenceData,
  onSave,
  onCancel,
}) => {
  // Determine whether we are editing an existing change request or creating new
  const isEditing = !!changeRequest;

  // ============================================================================
  // STATE
  // ============================================================================

  const [objectType, setObjectType] = useState<string>(
    changeRequest?.objectType ?? ScenarioObjectType.ACTIVITY
  );
  const [targetName, setTargetName] = useState<string>(
    changeRequest?.objectMatchCriteria?.name ?? ""
  );
  const [actionId, setActionId] = useState<string>(
    (changeRequest as any)?.actionId ?? ""
  );
  const [propertyName, setPropertyName] = useState<string>(
    changeRequest?.modificationDetails?.propertyName ?? ""
  );
  const [setterType, setSetterType] = useState<string>(
    changeRequest?.modificationDetails?.setterType ?? ScenarioSetterType.EQUAL
  );
  const [numericValue, setNumericValue] = useState<number>(
    typeof changeRequest?.modificationDetails?.newValue === "number"
      ? changeRequest.modificationDetails.newValue
      : 0
  );
  const [description, setDescription] = useState<string>(
    changeRequest?.description ?? ""
  );

  // ============================================================================
  // DERIVED DATA — activity/action
  // ============================================================================

  const isActivity = objectType === ScenarioObjectType.ACTIVITY;
  const isModelType = objectType === ScenarioObjectType.MODEL;
  const targetObjects = getTargetObjects(objectType, referenceData);

  /** The full activity entry (with actions) for the selected target. */
  const selectedActivity = isActivity
    ? (referenceData?.activities ?? []).find((a) => a.name === targetName)
    : undefined;
  const activityActions = selectedActivity?.actions ?? [];
  const selectedAction = activityActions.find((a) => a.id === actionId);

  /** Properties available for the selected action (if any). */
  function actionProps(a?: typeof selectedAction): ScenarioPropertyName[] {
    if (!a) return [];
    const props: ScenarioPropertyName[] = [];
    if (a.duration != null) props.push(ScenarioPropertyName.DURATION);
    if (a.resourceRequirementId !== undefined && a.resourceRequirementId !== null)
      props.push(ScenarioPropertyName.RESOURCE_REQUIREMENT);
    return props;
  }

  /** Activity-level (capacity) properties — shown when no action is selected. */
  const activityLevelProps: ScenarioPropertyName[] = [
    ScenarioPropertyName.ACTIVITY_CAPACITY,
    ScenarioPropertyName.INBOUND_QUEUE_CAPACITY,
    ScenarioPropertyName.OUTBOUND_QUEUE_CAPACITY,
  ];

  /**
   * Properties available in the property dropdown — depends on objectType and
   * (for activities) whether an action is selected.
   * Replaces the old local PROPERTIES_BY_OBJECT_TYPE (now imported from shared).
   */
  const availableProperties: ScenarioPropertyName[] = isActivity
    ? (actionId === "" ? activityLevelProps : actionProps(selectedAction))
    : (PROPERTIES_BY_OBJECT_TYPE[objectType as ScenarioObjectType] ?? []);

  // ============================================================================
  // DERIVED DATA — sub-form flags
  // ============================================================================

  const isInterarrival =
    objectType === ScenarioObjectType.GENERATOR &&
    propertyName === ScenarioPropertyName.INTERARRIVAL_TIMING;

  const isActionDuration =
    isActivity && actionId !== "" && propertyName === ScenarioPropertyName.DURATION;
  const isActionResource =
    isActivity && actionId !== "" && propertyName === ScenarioPropertyName.RESOURCE_REQUIREMENT;
  /** Covers both generator interarrival and action duration sub-forms. */
  const isDuration = isInterarrival || isActionDuration;

  const selectedGenerator = (referenceData?.generators ?? []).find(
    (g) => g.name === targetName
  );
  /**
   * currentDist drives pre-filling the swap form and rate-validation.
   * Points to the generator's interarrival duration OR the action's duration.
   */
  const currentDist = isInterarrival
    ? selectedGenerator?.periodIntervalDuration
    : (isActionDuration ? selectedAction?.duration : undefined);

  // ============================================================================
  // STATE — duration + resource swap sub-forms
  // ============================================================================

  const md = changeRequest?.modificationDetails as any;
  const [durMode, setDurMode] = useState<"scaleRate" | "setDistribution">(
    md?.mode === "setDistribution" ? "setDistribution" : "scaleRate"
  );
  const [factor, setFactor] = useState<number>(
    typeof md?.factor === "number" ? md.factor : 2
  );
  const [swapPeriodUnit, setSwapPeriodUnit] = useState<PeriodUnit>(
    (md?.duration?.durationPeriodUnit ??
      currentDist?.durationPeriodUnit ??
      PeriodUnit.MINUTES) as PeriodUnit
  );
  const [swapDistribution, setSwapDistribution] = useState<Distribution>(
    (md?.duration?.distribution ??
      currentDist?.distribution ??
      createDefaultDistribution(DistributionType.EXPONENTIAL)) as unknown as Distribution
  );

  /**
   * Resource-requirement swap: pre-filled from existing CR or action's current value.
   */
  const [swapRequirementId, setSwapRequirementId] = useState<string>(
    md?.resourceRequirementId ?? (selectedAction?.resourceRequirementId ?? "")
  );

  // ============================================================================
  // EFFECTS
  // ============================================================================

  /**
   * Cascading reset: objectType change resets target + property (skip-once so
   * edit-mode initial render does NOT reset values).
   */
  const skipObjectTypeReset = useRef(true);
  useEffect(() => {
    if (skipObjectTypeReset.current) {
      skipObjectTypeReset.current = false;
      return;
    }
    const objects = getTargetObjects(objectType, referenceData);
    setTargetName(objects.length > 0 ? objects[0].name : "");
    // Property will be reset by the objectType→targetName→actionId cascade.
    const props = PROPERTIES_BY_OBJECT_TYPE[objectType as ScenarioObjectType] ?? [];
    setPropertyName(props.length > 0 ? props[0] : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectType]);

  /**
   * targetName change: reset actionId (skip-once for edit-mode restore).
   */
  const skipActionReset = useRef(true);
  useEffect(() => {
    if (skipActionReset.current) {
      skipActionReset.current = false;
      return;
    }
    setActionId("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetName]);

  /**
   * actionId change: reset propertyName to first available (skip-once for edit-mode restore).
   */
  const skipActionPropReset = useRef(true);
  useEffect(() => {
    if (skipActionPropReset.current) {
      skipActionPropReset.current = false;
      return;
    }
    setPropertyName(availableProperties.length > 0 ? availableProperties[0] : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionId]);

  /**
   * propertyName change: reset setterType + durMode (skip-once for edit-mode restore).
   * Prev-value compare (NOT skip-once) so it's robust to React 18 StrictMode.
   */
  const prevPropertyNameRef = useRef(propertyName);
  useEffect(() => {
    if (prevPropertyNameRef.current === propertyName) return;
    prevPropertyNameRef.current = propertyName;
    setSetterType(ScenarioSetterType.EQUAL);
    setDurMode("scaleRate");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyName]);

  /**
   * Re-prefill the swap-distribution form when the selected source duration changes
   * (target for generators; target+actionId+propertyName for actions).
   * Skip-once so the mount render preserves the useState initializers (edit-mode restore).
   */
  const skipSwapPrefill = useRef(true);
  useEffect(() => {
    if (skipSwapPrefill.current) {
      skipSwapPrefill.current = false;
      return;
    }
    if (currentDist) {
      setSwapPeriodUnit(currentDist.durationPeriodUnit as PeriodUnit);
      setSwapDistribution(currentDist.distribution as unknown as Distribution);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetName, actionId, propertyName]);

  /**
   * Re-prefill swapRequirementId when actionId changes (skip-once for edit-mode restore).
   */
  const skipRrPrefill = useRef(true);
  useEffect(() => {
    if (skipRrPrefill.current) {
      skipRrPrefill.current = false;
      return;
    }
    setSwapRequirementId(selectedAction?.resourceRequirementId ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionId]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleObjectTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setObjectType(e.target.value);
  };

  const handleTargetNameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTargetName(e.target.value);
  };

  const handleActionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActionId(e.target.value);
  };

  const handlePropertyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPropertyName(e.target.value);
  };

  const handleSetterTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSetterType(e.target.value);
  };

  const handleNumericValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNumericValue(parseFloat(e.target.value) || 0);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDescription(e.target.value);
  };

  const handleSave = () => {
    let modificationDetails: Record<string, unknown>;
    if (isDuration) {
      modificationDetails =
        durMode === "scaleRate"
          ? { type: "duration", propertyName, mode: "scaleRate", factor }
          : {
              type: "duration",
              propertyName,
              mode: "setDistribution",
              duration: { durationPeriodUnit: swapPeriodUnit, distribution: swapDistribution },
            };
    } else if (isActionResource) {
      modificationDetails = {
        type: "reference",
        propertyName,
        resourceRequirementId: swapRequirementId,
      };
    } else {
      modificationDetails = {
        type: "numeric",
        propertyName,
        setterType,
        newValue: numericValue,
      };
    }

    const cr: ISerializedScenarioChangeRequest = {
      id: changeRequest?.id ?? generateUUID(),
      objectType,
      objectMatchCriteria: isModelType ? { name: "*" } : { name: targetName },
      modificationDetails: modificationDetails as any,
      description: description.trim() || undefined,
      ...(isActivity && actionId !== "" ? { actionId } : {}),
    } as ISerializedScenarioChangeRequest;
    onSave(cr);
  };

  // ============================================================================
  // VALIDATION
  // ============================================================================

  const rateValidation = validateRateMultiplier(
    factor,
    currentDist?.distribution.distributionType as DistributionType | undefined
  );

  const resourceValidation = swapRequirementId === ""
    ? { valid: false, error: "Select a resource requirement" }
    : { valid: true };

  // Scalar validation only runs for true numeric properties (not duration/resource sub-forms).
  const valueValidation =
    propertyName && !isDuration && !isActionResource
      ? validateChangeRequestValue(
          propertyName as ScenarioPropertyName,
          setterType as ScenarioSetterType,
          numericValue
        )
      : { valid: true };

  const useIntegerInput =
    propertyName && !isDuration && !isActionResource
      ? isIntegerInput(propertyName as ScenarioPropertyName, setterType as ScenarioSetterType)
      : false;

  // Overall validity
  const activeValidation = isDuration
    ? (durMode === "scaleRate" ? rateValidation : { valid: true })
    : isActionResource
    ? resourceValidation
    : valueValidation;

  const isValid =
    propertyName !== "" &&
    (isModelType || targetName !== "") &&
    activeValidation.valid;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-2 p-2 bg-gray-50 border border-gray-200 rounded">
      {/* Object Type */}
      <div>
        <label className="text-xs font-medium text-gray-700 block mb-0.5">
          Object Type
        </label>
        <select
          className="w-full px-2 py-1 text-xs border rounded bg-white"
          value={objectType}
          onChange={handleObjectTypeChange}
        >
          {Object.values(ScenarioObjectType)
            .filter((t) => t !== ScenarioObjectType.ENTITY)
            .map((type) => (
              <option key={type} value={type}>
                {OBJECT_TYPE_LABELS[type] ?? type}
              </option>
            ))}
        </select>
      </div>

      {/* Target Object (hidden for MODEL) */}
      {!isModelType && (
        <div>
          <label
            htmlFor="cr-target"
            className="text-xs font-medium text-gray-700 block mb-0.5"
          >
            Target Object
          </label>
          {targetObjects.length > 0 ? (
            <select
              id="cr-target"
              className="w-full px-2 py-1 text-xs border rounded bg-white"
              value={targetName}
              onChange={handleTargetNameChange}
            >
              {targetObjects.map((obj) => (
                <option key={obj.id} value={obj.name}>
                  {obj.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-xs text-gray-400 italic py-1">
              No {OBJECT_TYPE_LABELS[objectType]?.toLowerCase() ?? "objects"} available
            </div>
          )}
        </div>
      )}

      {/* Action picker — Activity only, when a target is selected */}
      {isActivity && targetName !== "" && (
        <div>
          <label
            htmlFor="cr-action"
            className="text-xs font-medium text-gray-700 block mb-0.5"
          >
            Action
          </label>
          <select
            id="cr-action"
            className="w-full px-2 py-1 text-xs border rounded bg-white"
            value={actionId}
            onChange={handleActionChange}
          >
            <option value="">(activity-level — capacity/queues)</option>
            {activityActions.map((a, i) => (
              <option key={a.id} value={a.id}>
                {`${i + 1}. ${actionTypeLabel(a.actionType)}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Property */}
      <div>
        <label
          htmlFor="cr-property"
          className="text-xs font-medium text-gray-700 block mb-0.5"
        >
          Property
        </label>
        <select
          id="cr-property"
          className="w-full px-2 py-1 text-xs border rounded bg-white"
          value={propertyName}
          onChange={handlePropertyChange}
        >
          {availableProperties.map((prop) => (
            <option key={prop} value={prop}>
              {PROPERTY_DISPLAY_LABELS[prop] ?? prop}
            </option>
          ))}
        </select>
      </div>

      {/* Value Section */}
      {isDuration ? (
        /* Duration sub-form: covers generator interarrival AND action duration */
        <div className="space-y-2">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-0.5">Change</label>
            <select
              className="w-full px-2 py-1 text-xs border rounded bg-white"
              value={durMode}
              onChange={(e) => setDurMode(e.target.value as "scaleRate" | "setDistribution")}
            >
              <option value="scaleRate">
                {isInterarrival ? "Arrival rate multiplier" : "Duration multiplier"}
              </option>
              <option value="setDistribution">
                {isInterarrival ? "Replace arrival distribution" : "Replace duration distribution"}
              </option>
            </select>
          </div>
          {durMode === "scaleRate" ? (
            <div>
              <label
                htmlFor="cr-multiplier"
                className="text-xs font-medium text-gray-700 block mb-0.5"
              >
                {isInterarrival ? "Arrival rate multiplier" : "Duration multiplier"}
              </label>
              <input
                id="cr-multiplier"
                type="number"
                step="0.1"
                min="0"
                className={`w-full px-2 py-1 text-xs border rounded ${
                  rateValidation.error
                    ? "border-red-400"
                    : rateValidation.warning
                    ? "border-yellow-400"
                    : ""
                }`}
                value={factor}
                onChange={(e) => setFactor(parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-gray-500 mt-0.5">
                {isInterarrival
                  ? "Higher = more arrivals (e.g. 2 = double the arrival rate)."
                  : "Higher = longer processing (e.g. 2 = double the time)."}
              </p>
              {rateValidation.error && (
                <p className="text-xs text-red-600 mt-0.5">{rateValidation.error}</p>
              )}
              {rateValidation.warning && !rateValidation.error && (
                <p className="text-xs text-yellow-600 mt-0.5">{rateValidation.warning}</p>
              )}
            </div>
          ) : (
            <EnhancedDurationEditor
              label={isInterarrival ? "Arrival" : "Duration"}
              periodUnit={swapPeriodUnit}
              distribution={swapDistribution}
              onChange={(pu, dist) => {
                setSwapPeriodUnit(pu);
                setSwapDistribution(dist);
              }}
            />
          )}
        </div>
      ) : isActionResource ? (
        /* Resource-requirement swap sub-form */
        <div>
          <label
            htmlFor="cr-rr"
            className="text-xs font-medium text-gray-700 block mb-0.5"
          >
            Resource Requirement
          </label>
          <select
            id="cr-rr"
            className="w-full px-2 py-1 text-xs border rounded bg-white"
            value={swapRequirementId}
            onChange={(e) => setSwapRequirementId(e.target.value)}
          >
            <option value="">(required)</option>
            {(referenceData?.resourceRequirements ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          {resourceValidation.error && (
            <p className="text-xs text-red-600 mt-0.5">{resourceValidation.error}</p>
          )}
        </div>
      ) : (
        /* Scalar: Setter Type + Value grid */
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-0.5">
              Setter Type
            </label>
            <select
              className="w-full px-2 py-1 text-xs border rounded bg-white"
              value={setterType}
              onChange={handleSetterTypeChange}
            >
              {Object.values(ScenarioSetterType).map((st) => (
                <option key={st} value={st}>
                  {SETTER_TYPE_LABELS[st] ?? st}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="cr-value"
              className="text-xs font-medium text-gray-700 block mb-0.5"
            >
              Value
            </label>
            <input
              id="cr-value"
              type="number"
              className={`w-full px-2 py-1 text-xs border rounded ${
                valueValidation.error
                  ? "border-red-400"
                  : valueValidation.warning
                  ? "border-yellow-400"
                  : ""
              }`}
              value={numericValue}
              onChange={handleNumericValueChange}
              step={useIntegerInput ? "1" : "any"}
            />
            {valueValidation.error && (
              <p className="text-xs text-red-600 mt-0.5">{valueValidation.error}</p>
            )}
            {valueValidation.warning && !valueValidation.error && (
              <p className="text-xs text-yellow-600 mt-0.5">{valueValidation.warning}</p>
            )}
          </div>
        </div>
      )}

      {/* Description */}
      <div>
        <label className="text-xs font-medium text-gray-700 block mb-0.5">
          Description (optional)
        </label>
        <input
          type="text"
          className="w-full px-2 py-1 text-xs border rounded"
          value={description}
          onChange={handleDescriptionChange}
          placeholder="Brief description of this change"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 text-xs border rounded hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!isValid}
          className={`px-3 py-1 text-xs rounded ${
            isValid
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          {isEditing ? "Update" : "Add"}
        </button>
      </div>
    </div>
  );
};

export default React.memo(ChangeRequestEditor);
