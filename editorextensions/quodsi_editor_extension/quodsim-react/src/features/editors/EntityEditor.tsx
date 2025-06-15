import React from "react";

import { Entity, SimulationObjectType } from "@quodsi/shared";
import BaseEditor from "./BaseEditor";

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
        toJSON: () => entity.toJSON(),
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
          <label className="block text-xs text-gray-600 mb-1">Entity Name</label>
          <input
            type="text"
            name="name"
            className="w-full px-2 py-1 text-xs border rounded"
            value={localEntity.name}
            onChange={handleChange}
            placeholder="Entity Name"
          />
        </div>
      )}
    </BaseEditor>
  );
};

export default React.memo(EntityEditor);
