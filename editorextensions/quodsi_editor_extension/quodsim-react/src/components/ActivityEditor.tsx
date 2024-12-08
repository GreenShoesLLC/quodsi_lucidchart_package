import React, { useState, useEffect } from "react";
import { Activity } from "@quodsi/shared";
import { SimulationObjectType } from "@quodsi/shared";

import BaseEditor from "./BaseEditor";
import { PeriodUnit } from "@quodsi/shared";
import { DurationType } from "@quodsi/shared";

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
        <div className="quodsi-form">
          <div className="quodsi-field">
            <label htmlFor="name" className="quodsi-label">
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className="quodsi-input"
              value={localData.name}
              onChange={handleChange}
              placeholder="Enter activity name"
            />
          </div>

          <div className="quodsi-field">
            <label htmlFor="capacity" className="quodsi-label">
              Capacity
            </label>
            <input
              type="number"
              id="capacity"
              name="capacity"
              className="quodsi-input"
              value={localData.capacity}
              onChange={handleChange}
              min="1"
              placeholder="Enter capacity"
            />
          </div>

          <div className="quodsi-field">
            <label htmlFor="inputBufferCapacity" className="quodsi-label">
              Input Buffer Capacity
            </label>
            <input
              type="number"
              id="inputBufferCapacity"
              name="inputBufferCapacity"
              className="quodsi-input"
              value={
                localData.inputBufferCapacity === Infinity
                  ? 999999
                  : localData.inputBufferCapacity
              }
              onChange={handleChange}
              min="0"
              max="999999"
              placeholder="Enter input buffer capacity"
            />
          </div>

          <div className="quodsi-field">
            <label htmlFor="outputBufferCapacity" className="quodsi-label">
              Output Buffer Capacity
            </label>
            <input
              type="number"
              id="outputBufferCapacity"
              name="outputBufferCapacity"
              className="quodsi-input"
              value={
                localData.outputBufferCapacity === Infinity
                  ? 999999
                  : localData.outputBufferCapacity
              }
              onChange={handleChange}
              min="0"
              max="999999"
              placeholder="Enter output buffer capacity"
            />
          </div>

          <div className="quodsi-field">
            <div className="quodsi-operation-step-header">
              <label className="quodsi-label">Operation Steps</label>
              <button
                type="button"
                className="quodsi-button quodsi-button-primary"
                onClick={handleAddOperationStep}
              >
                Add Operation Step
              </button>
            </div>

            {localData.operationSteps.map((step, index) => (
              <div key={index} className="quodsi-operation-step">
                <div className="quodsi-field">
                  <label
                    htmlFor={`durationLength-${index}`}
                    className="quodsi-label"
                  >
                    Duration Length
                  </label>
                  <input
                    type="number"
                    id={`durationLength-${index}`}
                    className="quodsi-input"
                    value={step.duration.durationLength}
                    onChange={(e) =>
                      handleOperationStepChange(index, "duration", {
                        ...step.duration,
                        durationLength: parseFloat(e.target.value),
                      })
                    }
                    placeholder="Enter duration length"
                  />
                </div>

                <div className="quodsi-field">
                  <label
                    htmlFor={`durationPeriodUnit-${index}`}
                    className="quodsi-label"
                  >
                    Duration Period Unit
                  </label>
                  <select
                    id={`durationPeriodUnit-${index}`}
                    className="quodsi-select"
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

                <div className="quodsi-field">
                  <label
                    htmlFor={`durationType-${index}`}
                    className="quodsi-label"
                  >
                    Duration Type
                  </label>
                  <select
                    id={`durationType-${index}`}
                    className="quodsi-select"
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
                  className="quodsi-button quodsi-button-danger"
                  onClick={() => handleRemoveOperationStep(index)}
                >
                  Remove Step
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
