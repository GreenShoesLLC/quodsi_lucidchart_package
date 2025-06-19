import React from "react";
import { Settings, Layout, Plus, Layers } from "lucide-react";
import {
  Activity,
  OperationStep,
  PeriodUnit,
  SimulationObjectType,
  createOperationStep,
  ConstantDistribution,
  EditorReferenceData,
  Duration,
} from "@quodsi/shared";
import BaseEditor from "./BaseEditor";
import { OperationStepEditor } from "./OperationStepEditor";


// Main Activity Editor Component
interface ActivityEditorProps {
  activity: any;
  onSave: (activity: Activity) => void;
  onCancel: () => void;
  referenceData?: EditorReferenceData;
}

const ActivityEditor: React.FC<ActivityEditorProps> = ({
  activity,
  onSave,
  onCancel,
  referenceData,
}) => {
  // Helper functions
  const bufferToDisplay = (value: number | null | undefined): number =>
    value === null || value === undefined ? 999999 : value;

  const displayToBuffer = (value: number): number =>
    value >= 999999 ? Infinity : value;

  const extractActivityData = (act: any): Activity => {
    // Handle completely missing data case
    if (!act) {
      return new Activity(
        "", // Empty ID
        "New Activity",
        1, // Default capacity
        bufferToDisplay(null),
        bufferToDisplay(null),
        [],
        0,
        0
      );
    }

    // Extract data safely
    const data = act.data || act;
    const id = data.id || act.id || "";

    return new Activity(
      id,
      data.name || "New Activity",
      data.capacity || 1,
      bufferToDisplay(data.inputBufferCapacity),
      bufferToDisplay(data.outputBufferCapacity),
      data.operationSteps || [],
      data.x || 0,
      data.y || 0
    );
  };

  // Extract and prepare activity data for BaseEditor
  const extractedActivity = React.useMemo(() => extractActivityData(activity), [activity]);

  // Handlers
  const handleSave = (updatedActivity: Activity) => {
    const activityToSave = new Activity(
      updatedActivity.id,
      updatedActivity.name,
      updatedActivity.capacity,
      displayToBuffer(updatedActivity.inputBufferCapacity),
      displayToBuffer(updatedActivity.outputBufferCapacity),
      updatedActivity.operationSteps,
      updatedActivity.x,
      updatedActivity.y
    );

    onSave(activityToSave);
  };

  const handleOperationStepChange = (
    index: number,
    updatedStep: OperationStep,
    localData: Activity,
    handleChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => void
  ) => {
    const newOperationSteps = [...localData.operationSteps];
    newOperationSteps[index] = updatedStep;

    handleChange({
      target: {
        name: "operationSteps",
        value: newOperationSteps,
      },
    } as any);
  };

  const handleAddOperationStep = (
    localData: Activity,
    handleChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => void
  ) => {
    // Create a new operation step with a default constant distribution
    const newStep = createOperationStep(
      new Duration(PeriodUnit.MINUTES, ConstantDistribution.create(1))
    );

    const newOperationSteps = [...localData.operationSteps, newStep];
    handleChange({
      target: {
        name: "operationSteps",
        value: newOperationSteps,
      },
    } as any);
  };

  const handleOperationStepDelete = React.useCallback(
    (
      index: number,
      localData: Activity,
      handleChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
      ) => void
    ) => {
      const newOperationSteps = localData.operationSteps.filter(
        (_, i) => i !== index
      );
      handleChange({
        target: {
          name: "operationSteps",
          value: newOperationSteps,
        },
      } as any);
    },
    []
  );

  if (!extractedActivity?.id) {
    return (
      <div className="p-2 bg-red-50 border border-red-200 rounded text-sm">
        <div className="text-red-600 font-medium">Invalid activity data</div>
        <div className="text-xs text-red-500 mt-1">Activity data missing required properties</div>
      </div>
    );
  }

  return (
    <BaseEditor
      data={{
        ...extractedActivity,
        type: SimulationObjectType.Activity,
        // Ensure all Activity methods are available
        setLocation: (x: number, y: number) => extractedActivity.setLocation(x, y),
        getLocation: () => extractedActivity.getLocation(),
        hasLocation: () => extractedActivity.hasLocation(),
        clone: () => extractedActivity.clone(),
        resetLocation: () => extractedActivity.resetLocation(),
        toJSON: () => extractedActivity.toJSON(),
      }}
      onSave={(updatedData) => {
        // Create a new Activity instance to preserve class methods
        const updatedActivity = new Activity(
          updatedData.id,
          updatedData.name,
          updatedData.capacity,
          displayToBuffer(updatedData.inputBufferCapacity),
          displayToBuffer(updatedData.outputBufferCapacity),
          updatedData.operationSteps,
          updatedData.x,
          updatedData.y
        );

        onSave(updatedActivity);
      }}
      onCancel={onCancel}
      messageType="activitySaved"
    >
      {(localData, handleChange) => (
        <div className="space-y-2">
          {/* Basic Info */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Settings className="w-3 h-3 text-blue-500" />
              <span className="text-xs font-medium text-gray-700">Basic Settings</span>
            </div>
            <div className="space-y-1">
              <input
                type="text"
                name="name"
                className="w-full px-2 py-1 text-xs border rounded"
                value={localData.name}
                onChange={handleChange}
                placeholder="Activity Name"
              />
              <div className="grid grid-cols-3 gap-1">
                <div>
                  <label className="block text-xs text-gray-600">Capacity</label>
                  <input
                    type="number"
                    name="capacity"
                    className="w-full px-1 py-0.5 text-xs border rounded"
                    value={localData.capacity}
                    onChange={handleChange}
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Input Buf</label>
                  <input
                    type="number"
                    name="inputBufferCapacity"
                    className="w-full px-1 py-0.5 text-xs border rounded"
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
                <div>
                  <label className="block text-xs text-gray-600">Output Buf</label>
                  <input
                    type="number"
                    name="outputBufferCapacity"
                    className="w-full px-1 py-0.5 text-xs border rounded"
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
            </div>
          </div>

          {/* Operation Steps */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <Layers className="w-3 h-3 text-blue-500" />
                <span className="text-xs font-medium text-gray-700">Operation Steps</span>
              </div>
              <button
                type="button"
                onClick={() => handleAddOperationStep(localData, handleChange)}
                className="flex items-center gap-1 px-1 py-0.5 text-xs text-white bg-blue-500 rounded hover:bg-blue-600"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
            <div className="space-y-1">
              {localData.operationSteps.map((step, index) => (
                <OperationStepEditor
                  key={index}
                  step={step}
                  index={index}
                  onChange={(updatedStep) =>
                    handleOperationStepChange(
                      index,
                      updatedStep,
                      localData,
                      handleChange
                    )
                  }
                  onDelete={() =>
                    handleOperationStepDelete(index, localData, handleChange)
                  }
                  resourceRequirements={referenceData?.resourceRequirements}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </BaseEditor>
  );
};

export default React.memo(ActivityEditor);
