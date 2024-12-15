import React from "react";
import BaseEditor from "./BaseEditor";
import {
  Duration,
  Generator,
  SimulationObjectType,
  EditorReferenceData,

} from "@quodsi/shared";
import { Clock, Users, Timer, PlayCircle } from "lucide-react";
import { CompactDurationEditor } from "./CompactDurationEditor";

interface Props {
  generator: Generator;
  onSave: (generator: Generator) => void;
  onCancel: () => void;
  referenceData: EditorReferenceData;
}

const GeneratorEditor: React.FC<Props> = ({
  generator,
  onSave,
  onCancel,
  referenceData,
}) => {
  const entities = referenceData.entities || [];

  if (!generator?.id) {
    return <div className="text-red-500 text-sm">Invalid generator data</div>;
  }

  const handleDurationChange = (name: string, updatedDuration: Duration) => {
    onSave({ ...generator, [name]: updatedDuration });
  };

  return (
    <BaseEditor
      data={{ ...generator, type: SimulationObjectType.Generator }}
      onSave={onSave}
      onCancel={onCancel}
      messageType="generatorSaved"
    >
      {(localGenerator, handleChange) => (
        <div className="space-y-3 p-2">
          {/* Basic Settings */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <PlayCircle className="w-4 h-4 text-blue-500" />
              <label className="text-xs font-medium text-gray-700">
                Generate at Activity
              </label>
            </div>
            <input
              type="text"
              name="activityKeyId"
              className="w-full px-2 py-1 text-sm border rounded"
              value={localGenerator.activityKeyId}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-blue-500" />
              <label className="text-xs font-medium text-gray-700">
                Entity Type
              </label>
            </div>
            <select
              name="entityId"
              className="w-full px-2 py-1 text-sm border rounded"
              value={localGenerator.entityId}
              onChange={handleChange}
            >
              {entities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.name}
                </option>
              ))}
            </select>
          </div>

          {/* Generation Settings */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Timer className="w-4 h-4 text-blue-500" />
                <label className="text-xs font-medium text-gray-700">
                  Per Generation
                </label>
              </div>
              <input
                type="number"
                name="entitiesPerCreation"
                className="w-full px-2 py-1 text-sm border rounded"
                value={localGenerator.entitiesPerCreation}
                onChange={handleChange}
                min="1"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-blue-500" />
                <label className="text-xs font-medium text-gray-700">
                  Count
                </label>
              </div>
              <input
                type="number"
                name="periodicOccurrences"
                className="w-full px-2 py-1 text-sm border rounded"
                value={localGenerator.periodicOccurrences}
                onChange={handleChange}
                min="0"
              />
            </div>
          </div>

          {/* Timing Settings */}
          <div className="space-y-3 pt-1">
            <CompactDurationEditor
              duration={localGenerator.periodIntervalDuration}
              onChange={(updatedDuration) =>
                handleDurationChange("periodIntervalDuration", updatedDuration)
              }
              lengthLabel="Interarrival Time"
            />

            <CompactDurationEditor
              duration={localGenerator.periodicStartDuration}
              onChange={(updatedDuration) =>
                handleDurationChange("periodicStartDuration", updatedDuration)
              }
              lengthLabel="Start Delay"
            />
          </div>

          {/* Max Entities */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700">
              Max Entities
            </label>
            <input
              type="number"
              name="maxEntities"
              className="w-full px-2 py-1 text-sm border rounded"
              value={localGenerator.maxEntities}
              onChange={handleChange}
              min="1"
            />
          </div>
        </div>
      )}
    </BaseEditor>
  );
};

export default GeneratorEditor;
