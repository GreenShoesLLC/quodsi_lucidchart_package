import React, { useState, useEffect } from "react";
import { Activity } from "src/shared/types/elements/Activity";
import { SimulationObjectType } from "src/shared/types/elements/SimulationObjectType";

import BaseEditor from "./BaseEditor";
import { PeriodUnit } from "src/shared/types/elements/PeriodUnit";
import { DurationType } from "src/shared/types/elements/DurationType";

interface Props {
  activity: any;
  onSave: (activity: Activity) => void;
  onCancel: () => void;
}

// Helper to convert null/undefined to Infinity for the UI
const bufferToDisplay = (value: number | null | undefined): number => {
  if (value === null || value === undefined) return Infinity;
  return value;
};

// Helper to convert Infinity to null for the API
const displayToBuffer = (value: number): number => {
  if (value >= 999999) return Infinity;
  return value;
};

const ActivityEditor: React.FC<Props> = ({ activity, onSave, onCancel }) => {
  // Extract the actual activity data from the nested structure
  const extractActivityData = (act: any): Activity => {
    const data = act.data || act;
    return {
      id: data.id || "",
      name: data.name || "New Activity",
      type: SimulationObjectType.Activity,
      capacity: data.capacity || 1,
      inputBufferCapacity: bufferToDisplay(data.inputBufferCapacity),
      outputBufferCapacity: bufferToDisplay(data.outputBufferCapacity),
      operationSteps: data.operationSteps || [],
      connectors: [],
    };
  };

  // Create local state for the activity
  const [localActivity, setLocalActivity] = useState<Activity>(
    extractActivityData(activity)
  );

  useEffect(() => {
    console.log("ActivityEditor: Received activity data:", activity);
    const extractedData = extractActivityData(activity);
    console.log("ActivityEditor: Extracted activity data:", extractedData);
    setLocalActivity(extractedData);
  }, [activity]);

  const handleSave = (updatedActivity: Activity) => {
    console.log("ActivityEditor: Preparing to save activity:", updatedActivity);

    // Ensure all required fields are present and properly typed
    const activityToSave: Activity = {
      ...updatedActivity,
      id: updatedActivity.id,
      type: SimulationObjectType.Activity,
      name: updatedActivity.name || "New Activity",
      capacity: updatedActivity.capacity || 1,
      inputBufferCapacity: displayToBuffer(updatedActivity.inputBufferCapacity),
      outputBufferCapacity: displayToBuffer(
        updatedActivity.outputBufferCapacity
      ),
      operationSteps: updatedActivity.operationSteps || [],
    };

    console.log(
      "ActivityEditor: Saving activity with prepared data:",
      activityToSave
    );
    onSave(activityToSave);
  };

  const handleOperationStepChange = (
    index: number,
    field: string,
    value: any
  ) => {
    setLocalActivity((prev) => ({
      ...prev,
      operationSteps: prev.operationSteps.map((step, i) =>
        i === index ? { ...step, [field]: value } : step
      ),
    }));
  };

  const handleAddOperationStep = () => {
    const newOperationStep = {
      resourceSetRequest: null,
      duration: {
        durationLength: 0,
        durationPeriodUnit: PeriodUnit.MINUTES,
        durationType: DurationType.CONSTANT,
        distribution: null,
      },
    };
    setLocalActivity((prev) => ({
      ...prev,
      operationSteps: [...prev.operationSteps, newOperationStep],
    }));
  };

  const handleRemoveOperationStep = (index: number) => {
    setLocalActivity((prev) => ({
      ...prev,
      operationSteps: prev.operationSteps.filter((_, i) => i !== index),
    }));
  };

  // Validate the extracted data
  if (!localActivity?.id) {
    console.error("Invalid activity data received:", activity);
    return (
      <div className="p-4 text-red-600">
        Invalid activity data. Please try selecting the activity again.
      </div>
    );
  }

  return (
    <BaseEditor
      data={{ ...localActivity, type: SimulationObjectType.Activity }}
      onSave={handleSave}
      onCancel={onCancel}
      messageType="activitySaved"
    >
      {(localData, handleChange) => (
        <div className="space-y-4">
          <div className="form-field">
            <label htmlFor="name" className="block text-sm font-medium">
              Name:
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className="lucid-styling w-full"
              value={localData.name}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label htmlFor="capacity" className="block text-sm font-medium">
              Capacity:
            </label>
            <input
              type="number"
              id="capacity"
              name="capacity"
              className="lucid-styling w-full"
              value={localData.capacity}
              onChange={handleChange}
              min="1"
            />
          </div>

          <div className="form-field">
            <label
              htmlFor="inputBufferCapacity"
              className="block text-sm font-medium"
            >
              Input Buffer Capacity:
            </label>
            <input
              type="number"
              id="inputBufferCapacity"
              name="inputBufferCapacity"
              className="lucid-styling w-full"
              value={
                localData.inputBufferCapacity === Infinity
                  ? 999999
                  : localData.inputBufferCapacity
              }
              onChange={handleChange}
              min="0"
              max="999999"
            />
          </div>

          <div className="form-field">
            <label
              htmlFor="outputBufferCapacity"
              className="block text-sm font-medium"
            >
              Output Buffer Capacity:
            </label>
            <input
              type="number"
              id="outputBufferCapacity"
              name="outputBufferCapacity"
              className="lucid-styling w-full"
              value={
                localData.outputBufferCapacity === Infinity
                  ? 999999
                  : localData.outputBufferCapacity
              }
              onChange={handleChange}
              min="0"
              max="999999"
            />
          </div>

          {/* Bringing back the Operation Steps section */}
          <div className="form-field">
            <label className="block text-sm font-medium">
              Operation Steps:
            </label>
            <button
              type="button"
              className="lucid-styling tertiary mt-2"
              onClick={handleAddOperationStep}
            >
              Add Operation Step
            </button>
            {localData.operationSteps.map((step, index) => (
              <div
                key={index}
                className="editor-operation-step mt-4 p-2 border rounded-md"
              >
                <div className="form-field">
                  <label
                    htmlFor={`durationLength-${index}`}
                    className="block text-sm font-medium"
                  >
                    Duration Length:
                  </label>
                  <input
                    type="number"
                    id={`durationLength-${index}`}
                    className="lucid-styling w-full"
                    value={step.duration.durationLength}
                    onChange={(e) =>
                      handleOperationStepChange(index, "duration", {
                        ...step.duration,
                        durationLength: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="form-field">
                  <label
                    htmlFor={`durationPeriodUnit-${index}`}
                    className="block text-sm font-medium"
                  >
                    Duration Period Unit:
                  </label>
                  <select
                    id={`durationPeriodUnit-${index}`}
                    className="lucid-styling w-full"
                    value={step.duration.durationPeriodUnit}
                    onChange={(e) =>
                      handleOperationStepChange(index, "duration", {
                        ...step.duration,
                        durationPeriodUnit: e.target.value as PeriodUnit,
                      })
                    }
                  >
                    {Object.values(PeriodUnit).map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label
                    htmlFor={`durationType-${index}`}
                    className="block text-sm font-medium"
                  >
                    Duration Type:
                  </label>
                  <select
                    id={`durationType-${index}`}
                    className="lucid-styling w-full"
                    value={step.duration.durationType}
                    onChange={(e) =>
                      handleOperationStepChange(index, "duration", {
                        ...step.duration,
                        durationType: e.target.value as DurationType,
                      })
                    }
                  >
                    {Object.values(DurationType).map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="lucid-styling secondary mt-2"
                  onClick={() => handleRemoveOperationStep(index)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </BaseEditor>
  );
};

export default React.memo(ActivityEditor);
