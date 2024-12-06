import React, { useContext } from "react";

import BaseEditor from "./BaseEditor";
import DurationEditor from "./DurationEditor";
import { Duration } from "@quodsi/shared";
import { Generator } from "@quodsi/shared";
import { SimulationObjectType } from "@quodsi/shared";
import { ModelDefinition } from "@quodsi/shared";
import { EditorReferenceData } from "@quodsi/shared";

interface Props {
  generator: Generator;
  onSave: (generator: Generator) => void;
  onCancel: () => void;
  referenceData: EditorReferenceData;
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  durationSection: {
    border: "1px solid #e0e0e0",
    borderRadius: "4px",
    padding: "16px",
    marginBottom: "8px",
  },
  sectionTitle: {
    fontWeight: 500,
    marginBottom: "12px",
  },
  generationControls: {
    marginBottom: "16px",
  },
} as const;

const GeneratorEditor: React.FC<Props> = ({
  generator,
  onSave,
  onCancel,
  referenceData,
}) => {
  const entities = referenceData.entities || [];

  if (!generator || !generator.id) {
    console.error("Invalid generator data received:", generator);
    return <div>Invalid generator data</div>;
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
        <div style={styles.container}>
          <div style={styles.formGroup}>
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

          <div style={styles.formGroup}>
            <label htmlFor="entityId">Entity Type to Generate:</label>
            <select
              id="entityId"
              name="entityId"
              className="lucid-styling"
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

          <div style={styles.durationSection}>
            <div style={styles.sectionTitle}>Generation Interval</div>

            <div style={styles.generationControls}>
              <div style={styles.formGroup}>
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

              <div style={{ ...styles.formGroup, marginTop: "8px" }}>
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

          <div style={styles.durationSection}>
            <div style={styles.sectionTitle}>Start Delay</div>
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

          <div style={styles.formGroup}>
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
      )}
    </BaseEditor>
  );
};

export default GeneratorEditor;
