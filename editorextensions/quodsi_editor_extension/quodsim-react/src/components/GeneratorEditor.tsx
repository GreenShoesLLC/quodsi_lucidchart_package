import React from "react";

import BaseEditor from "./BaseEditor";
import DurationEditor from "./DurationEditor";
import { Duration } from "src/shared/types/elements/duration";
import { Generator } from "src/shared/types/elements/generator";
interface Props {
  generator: Generator;
  onSave: (generator: Generator) => void;
  onCancel: () => void;
}

const GeneratorEditor: React.FC<Props> = ({ generator, onSave, onCancel }) => {
  console.log(
    "GeneratorEditor received generator:",
    JSON.stringify(generator, null, 2)
  );
  // Ensure we have valid data
  if (!generator || !generator.id) {
    console.error("Invalid generator data received:", generator);
    return <div>Invalid generator data</div>;
  }
  const handleDurationChange = (name: string, updatedDuration: Duration) => {
    onSave({ ...generator, [name]: updatedDuration });
  };

  return (
    // <div style={{ padding: '10px', margin: '10px' }}> {/* Debug border */}
    //   <div>GeneratorEditor Debug</div> {/* Debug text */}
    <BaseEditor
      data={generator}
      onSave={onSave}
      onCancel={onCancel}
      messageType="generatorSaved"
    >
      {(localGenerator, handleChange) => (
        console.log(
          "GeneratorEditor render function with localGenerator:",
          JSON.stringify(localGenerator, null, 2)
        ),
        (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label htmlFor="activityKeyId">Generate at Activity:</label>
              <input
                type="text"
                id="activityKeyId"
                name="activityKeyId"
                className="lucid-styling"
                value={localGenerator.activityKeyId}
                onChange={handleChange}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <label htmlFor="entityType">Entity Type to Generate:</label>
              <input
                type="text"
                id="entityType"
                name="entityType"
                className="lucid-styling"
                value={localGenerator.entityType}
                onChange={handleChange}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <label htmlFor="entitiesPerCreation">
                Entities Per Generation:
              </label>
              <input
                type="number"
                id="entitiesPerCreation"
                name="entitiesPerCreation"
                className="lucid-styling"
                value={localGenerator.entitiesPerCreation}
                onChange={handleChange}
                min="1"
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <label htmlFor="periodicOccurrences">Generation Count:</label>
              <input
                type="number"
                id="periodicOccurrences"
                name="periodicOccurrences"
                className="lucid-styling"
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
            />

            <DurationEditor
              duration={localGenerator.periodicStartDuration}
              onChange={(updatedDuration) =>
                handleDurationChange("periodicStartDuration", updatedDuration)
              }
            />

            <div style={{ display: "flex", flexDirection: "column" }}>
              <label htmlFor="maxEntities">Max Entities:</label>
              <input
                type="number"
                id="maxEntities"
                name="maxEntities"
                className="lucid-styling"
                value={localGenerator.maxEntities}
                onChange={handleChange}
                min="1"
              />
            </div>
          </div>
        )
      )}
    </BaseEditor>
  );
};

export default GeneratorEditor;
