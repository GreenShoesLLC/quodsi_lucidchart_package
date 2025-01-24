import React from "react";
import {
  Activity,
  OperationStep,
  Duration,
  PeriodUnit,
  DurationType,
  SimulationObjectType,
  createOperationStep,
  EditorReferenceData,
} from "@quodsi/shared";
import { Settings, Layout, Plus, Layers } from "lucide-react";
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
    const data = act.data || act;
    return {
      id: data.id || "",
      name: data.name || "New Activity",
      type: SimulationObjectType.Activity,
      capacity: data.capacity || 1,
      inputBufferCapacity: bufferToDisplay(data.inputBufferCapacity),
      outputBufferCapacity: bufferToDisplay(data.outputBufferCapacity),
      operationSteps: data.operationSteps || [],
    };
  };

  // Create state
  const [localActivity, setLocalActivity] = React.useState<Activity>(
    extractActivityData(activity)
  );

  // Handlers
  const handleSave = (updatedActivity: Activity) => {
      console.log("ActivityEditor - Before Save:", {
        updatedActivity,
        operationSteps: updatedActivity.operationSteps,
      });

    const activityToSave: Activity = {
      ...updatedActivity,
      type: SimulationObjectType.Activity,
      inputBufferCapacity: displayToBuffer(updatedActivity.inputBufferCapacity),
      outputBufferCapacity: displayToBuffer(
        updatedActivity.outputBufferCapacity
      ),
    };

    console.log("ActivityEditor - After Save Transform:", {
      activityToSave,
      operationSteps: activityToSave.operationSteps,
    });

    onSave(activityToSave);
  };

  const handleOperationStepChange = (
    index: number,
    updatedStep: OperationStep
  ) => {
    setLocalActivity((prev) => ({
      ...prev,
      operationSteps: prev.operationSteps.map((step, i) =>
        i === index ? updatedStep : step
      ),
    }));
  };

  const handleAddOperationStep = () => {
    const newStep = createOperationStep(
      new Duration(0, PeriodUnit.MINUTES, DurationType.CONSTANT)
    );
    setLocalActivity((prev) => ({
      ...prev,
      operationSteps: [...prev.operationSteps, newStep],
    }));
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


  if (!localActivity?.id) {
    return (
      <div className="p-2 text-sm text-red-600">Invalid activity data</div>
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
        <div className="space-y-4 p-2">
          {/* Basic Info Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-1 mb-1">
              <Settings className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-gray-700">
                Basic Settings
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <input
                  type="text"
                  name="name"
                  className="w-full px-2 py-1 text-sm border rounded"
                  value={localData.name}
                  onChange={handleChange}
                  placeholder="Activity Name"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Capacity
                </label>
                <input
                  type="number"
                  name="capacity"
                  className="w-full px-2 py-1 text-sm border rounded"
                  value={localData.capacity}
                  onChange={handleChange}
                  min="1"
                />
              </div>
            </div>
          </div>

          {/* Buffer Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-1 mb-1">
              <Layout className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-gray-700">
                Buffer Capacities
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Input
                </label>
                <input
                  type="number"
                  name="inputBufferCapacity"
                  className="w-full px-2 py-1 text-sm border rounded"
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
                <label className="block text-xs text-gray-600 mb-1">
                  Output
                </label>
                <input
                  type="number"
                  name="outputBufferCapacity"
                  className="w-full px-2 py-1 text-sm border rounded"
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

          {/* Operation Steps Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <Layers className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-medium text-gray-700">
                  Operation Steps
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddOperationStep}
                className="flex items-center gap-1 px-2 py-1 text-xs text-white bg-blue-500 rounded hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Step
              </button>
            </div>
            <div className="space-y-2">
              {localData.operationSteps.map((step, index) => (
                <OperationStepEditor
                  key={index}
                  step={step}
                  index={index}
                  onChange={(updatedStep) =>
                    handleOperationStepChange(index, updatedStep)
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
