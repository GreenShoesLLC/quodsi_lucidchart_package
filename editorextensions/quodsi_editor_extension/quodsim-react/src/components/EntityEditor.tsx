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
      }}
      onSave={onSave}
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