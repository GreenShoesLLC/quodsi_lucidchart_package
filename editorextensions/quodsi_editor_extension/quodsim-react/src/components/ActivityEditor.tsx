import React, { useState, useEffect } from "react";
import { Activity } from "src/shared/types/elements/Activity";
import { SimulationObjectType } from "src/shared/types/elements/SimulationObjectType";
import BaseEditor from "./BaseEditor";

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
      data={localActivity}
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
        </div>
      )}
    </BaseEditor>
  );
};

export default React.memo(ActivityEditor);
