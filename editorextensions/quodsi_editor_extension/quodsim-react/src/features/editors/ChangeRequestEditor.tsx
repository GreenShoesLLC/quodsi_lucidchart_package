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
 * Maps each ScenarioObjectType to the ScenarioPropertyName values
 * that are valid for that object type.
 */
const PROPERTIES_BY_OBJECT_TYPE: Record<string, ScenarioPropertyName[]> = {
  [ScenarioObjectType.ACTIVITY]: [
    ScenarioPropertyName.ACTIVITY_CAPACITY,
    ScenarioPropertyName.INBOUND_QUEUE_CAPACITY,
    ScenarioPropertyName.OUTBOUND_QUEUE_CAPACITY,
  ],
  [ScenarioObjectType.RESOURCE]: [
    ScenarioPropertyName.CAPACITY,
  ],
  [ScenarioObjectType.GENERATOR]: [
    ScenarioPropertyName.INTERARRIVAL_TIMING,
    ScenarioPropertyName.MAX_ENTITIES,
    ScenarioPropertyName.ENTITIES_PER_CREATION,
  ],
  [ScenarioObjectType.CONNECTOR]: [
    ScenarioPropertyName.WEIGHT,
  ],
  [ScenarioObjectType.MODEL]: [
    ScenarioPropertyName.REPS,
    ScenarioPropertyName.SEED,
    ScenarioPropertyName.RUN_PERIOD,
  ],
};

/**
 * User-friendly display labels for ScenarioPropertyName enum values.
 */
const PROPERTY_LABELS: Record<string, string> = {
  [ScenarioPropertyName.CAPACITY]: "Capacity",
  [ScenarioPropertyName.DURATION]: "Duration",
  [ScenarioPropertyName.ACTIVITY_CAPACITY]: "Activity Capacity",
  [ScenarioPropertyName.INBOUND_QUEUE_CAPACITY]: "Inbound Queue Capacity",
  [ScenarioPropertyName.OUTBOUND_QUEUE_CAPACITY]: "Outbound Queue Capacity",
  [ScenarioPropertyName.WEIGHT]: "Weight",
  [ScenarioPropertyName.INTERVAL]: "Interval",
  [ScenarioPropertyName.MAX_ENTITIES]: "Max Entities",
  [ScenarioPropertyName.ENTITIES_PER_CREATION]: "Entities Per Creation",
  [ScenarioPropertyName.NAME]: "Name",
  [ScenarioPropertyName.REPS]: "Replications",
  [ScenarioPropertyName.SEED]: "Seed",
  [ScenarioPropertyName.RUN_PERIOD]: "Run Period",
  [ScenarioPropertyName.INTERARRIVAL_TIMING]: "Inter-arrival Timing",
};

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
 * target object, property, setter type, and value.
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
  // DERIVED DATA
  // ============================================================================

  const availableProperties = PROPERTIES_BY_OBJECT_TYPE[objectType] ?? [];
  const targetObjects = getTargetObjects(objectType, referenceData);
  const isModelType = objectType === ScenarioObjectType.MODEL;

  const isInterarrival =
    objectType === ScenarioObjectType.GENERATOR &&
    propertyName === ScenarioPropertyName.INTERARRIVAL_TIMING;

  const selectedGenerator = referenceData?.generators?.find((g) => g.name === targetName);
  const currentDist = selectedGenerator?.periodIntervalDuration;

  const md = changeRequest?.modificationDetails as any;
  const [durMode, setDurMode] = useState<"scaleRate" | "setDistribution">(
    md?.mode === "setDistribution" ? "setDistribution" : "scaleRate"
  );
  const [factor, setFactor] = useState<number>(
    typeof md?.factor === "number" ? md.factor : 2
  );
  const [swapPeriodUnit, setSwapPeriodUnit] = useState<PeriodUnit>(
    (md?.duration?.durationPeriodUnit ?? currentDist?.durationPeriodUnit ?? PeriodUnit.MINUTES) as PeriodUnit
  );
  const [swapDistribution, setSwapDistribution] = useState<Distribution>(
    (md?.duration?.distribution ?? currentDist?.distribution ??
      createDefaultDistribution(DistributionType.EXPONENTIAL)) as unknown as Distribution
  );

  // ============================================================================
  // EFFECTS
  // ============================================================================

  /**
   * When objectType changes, reset the target name and property to
   * the first available value for the new type (unless editing).
   */
  useEffect(() => {
    if (!isEditing) {
      // Reset target selection
      const objects = getTargetObjects(objectType, referenceData);
      setTargetName(objects.length > 0 ? objects[0].name : "");

      // Reset property selection to first available
      const props = PROPERTIES_BY_OBJECT_TYPE[objectType] ?? [];
      setPropertyName(props.length > 0 ? props[0] : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectType]);

  /**
   * When propertyName changes, reset setter type and duration mode.
   */
  useEffect(() => {
    setSetterType(ScenarioSetterType.EQUAL);
    setDurMode("scaleRate");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyName]);

  /**
   * When targetName changes, re-prefill the swap form from the selected
   * generator's current distribution. Skip once on mount so that edit-mode
   * initial values survive the first render.
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
  }, [targetName]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleObjectTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setObjectType(e.target.value);
  };

  const handleTargetNameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTargetName(e.target.value);
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
    const modificationDetails = isInterarrival
      ? (durMode === "scaleRate"
          ? { type: "duration", propertyName, mode: "scaleRate", factor }
          : {
              type: "duration",
              propertyName,
              mode: "setDistribution",
              duration: { durationPeriodUnit: swapPeriodUnit, distribution: swapDistribution },
            })
      : { type: "numeric", propertyName, setterType, newValue: numericValue };

    const cr: ISerializedScenarioChangeRequest = {
      id: changeRequest?.id ?? generateUUID(),
      objectType,
      objectMatchCriteria: isModelType ? { name: "*" } : { name: targetName },
      modificationDetails: modificationDetails as any,
      description: description.trim() || undefined,
    };
    onSave(cr);
  };

  // Value validation — only run for scalar (non-interarrival) properties;
  // INTERARRIVAL_TIMING has no PROPERTY_MIN_VALUE entry and can throw.
  const valueValidation =
    propertyName && !isInterarrival
      ? validateChangeRequestValue(
          propertyName as ScenarioPropertyName,
          setterType as ScenarioSetterType,
          numericValue
        )
      : { valid: true };

  const rateValidation = validateRateMultiplier(
    factor,
    currentDist?.distribution.distributionType as DistributionType | undefined
  );

  const useIntegerInput = propertyName && !isInterarrival
    ? isIntegerInput(propertyName as ScenarioPropertyName, setterType as ScenarioSetterType)
    : false;

  // Validation: require a target name for non-MODEL types + value/rate validation
  const isValid =
    propertyName !== "" &&
    (isModelType || targetName !== "") &&
    (isInterarrival
      ? (durMode === "scaleRate" ? rateValidation.valid : true)
      : valueValidation.valid);

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
          <label className="text-xs font-medium text-gray-700 block mb-0.5">
            Target Object
          </label>
          {targetObjects.length > 0 ? (
            <select
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

      {/* Property */}
      <div>
        <label className="text-xs font-medium text-gray-700 block mb-0.5">
          Property
        </label>
        <select
          className="w-full px-2 py-1 text-xs border rounded bg-white"
          value={propertyName}
          onChange={handlePropertyChange}
        >
          {availableProperties.map((prop) => (
            <option key={prop} value={prop}>
              {PROPERTY_LABELS[prop] ?? prop}
            </option>
          ))}
        </select>
      </div>

      {/* Value Section — interarrival sub-form vs scalar setter+value grid */}
      {isInterarrival ? (
        <div className="space-y-2">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-0.5">Change</label>
            <select
              className="w-full px-2 py-1 text-xs border rounded bg-white"
              value={durMode}
              onChange={(e) => setDurMode(e.target.value as "scaleRate" | "setDistribution")}
            >
              <option value="scaleRate">Arrival rate multiplier</option>
              <option value="setDistribution">Replace arrival distribution</option>
            </select>
          </div>
          {durMode === "scaleRate" ? (
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-0.5">
                Arrival rate multiplier
              </label>
              <input
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
                Higher = more arrivals (e.g. 2 = double the arrival rate).
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
              label="Arrival"
              periodUnit={swapPeriodUnit}
              distribution={swapDistribution}
              onChange={(pu, dist) => {
                setSwapPeriodUnit(pu);
                setSwapDistribution(dist);
              }}
            />
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
            <label className="text-xs font-medium text-gray-700 block mb-0.5">
              Value
            </label>
            <input
              type="number"
              className={`w-full px-2 py-1 text-xs border rounded ${
                valueValidation.error ? "border-red-400" : valueValidation.warning ? "border-yellow-400" : ""
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
