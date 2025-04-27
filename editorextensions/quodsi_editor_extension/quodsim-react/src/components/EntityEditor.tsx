import React from "react";
import BaseEditor from "./BaseEditor";
import { Entity, SimulationObjectType } from "@quodsi/shared";

interface Props {
  entity: Entity;
  onSave: (entity: Entity) => void;
  onCancel: () => void;
}

const EntityEditor: React.FC<Props> = ({ entity, onSave, onCancel }) => {
  return (
    <BaseEditor
      data={{ 
        ...entity,
        type: SimulationObjectType.Entity,
        // Ensure all Entity methods are available
        setLocation: (x: number, y: number) => entity.setLocation(x, y),
        getLocation: () => entity.getLocation(),
        hasLocation: () => entity.hasLocation(),
        clone: () => entity.clone(),
        resetLocation: () => entity.resetLocation(),
        toJSON: () => entity.toJSON()
      }}
      onSave={(updatedData) => {
        // Create a new Entity instance to preserve class methods
        const updatedEntity = new Entity(
          updatedData.id,
          updatedData.name,
          updatedData.x,
          updatedData.y
        );

        onSave(updatedEntity);
      }}
      onCancel={onCancel}
      messageType="entitySaved"
    >
      {(localEntity, handleChange) => (
        <div>
          <div className="quodsi-field">
            <label htmlFor="name" className="quodsi-label">
              Entity Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className="quodsi-input"
              value={localEntity.name}
              onChange={handleChange}
            />
          </div>
        </div>
      )}
    </BaseEditor>
  );
};

export default React.memo(EntityEditor);