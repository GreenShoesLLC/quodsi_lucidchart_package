import React from "react";
import BaseEditor from "./BaseEditor";
import DurationEditor from "./DurationEditor";
import { Duration, Generator, SimulationObjectType, EditorReferenceData } from "@quodsi/shared";

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

  if (!generator || !generator.id) {
    console.error("Invalid generator data received:", generator);
    return <div className="quodsi-error-message">Invalid generator data</div>;
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
        <div>
          <div className="quodsi-field">
            <label htmlFor="activityKeyId" className="quodsi-label">
              Generate at Activity
            </label>
            <input
              type="text"
              id="activityKeyId"
              name="activityKeyId"
              className="quodsi-input"
              value={localGenerator.activityKeyId}
              onChange={handleChange}
            />
          </div>

          <div className="quodsi-field">
            <label htmlFor="entityId" className="quodsi-label">
              Entity Type to Generate
            </label>
            <select
              id="entityId"
              name="entityId"
              className="quodsi-select"
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

          <div className="quodsi-operation-step">
            <h3 className="quodsi-label">Generation Interval</h3>
            <div className="quodsi-field">
              <label htmlFor="entitiesPerCreation" className="quodsi-label">
                Entities Per Generation
              </label>
              <input
                type="number"
                id="entitiesPerCreation"
                name="entitiesPerCreation"
                className="quodsi-input"
                value={localGenerator.entitiesPerCreation}
                onChange={handleChange}
                min="1"
              />
            </div>

            <div className="quodsi-field">
              <label htmlFor="periodicOccurrences" className="quodsi-label">
                Generation Count
              </label>
              <input
                type="number"
                id="periodicOccurrences"
                name="periodicOccurrences"
                className="quodsi-input"
                value={localGenerator.periodicOccurrences}
                onChange={handleChange}
                min="0"
              />
            </div>

            <DurationEditor
              duration={localGenerator.periodIntervalDuration}
              onChange={(updatedDuration) =>
                handleDurationChange("periodIntervalDuration", updatedDuration)
              }
              lengthLabel="Interarrival Time"
              periodUnitLabel="Time Unit"
              durationTypeLabel="Time Type"
            />
          </div>

          <div className="quodsi-operation-step">
            <h3 className="quodsi-label">Start Delay</h3>
            <DurationEditor
              duration={localGenerator.periodicStartDuration}
              onChange={(updatedDuration) =>
                handleDurationChange("periodicStartDuration", updatedDuration)
              }
              lengthLabel="Generate Start Time"
              periodUnitLabel="Time Unit"
              durationTypeLabel="Time Type"
            />
          </div>

          <div className="quodsi-field">
            <label htmlFor="maxEntities" className="quodsi-label">
              Max Entities
            </label>
            <input
              type="number"
              id="maxEntities"
              name="maxEntities"
              className="quodsi-input"
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