import React from "react";
import BaseEditor from "./BaseEditor";
import { Entity } from "src/shared/types/elements/Entity";

interface Props {
  entity: Entity;
  onSave: (entity: Entity) => void;
  onCancel: () => void;
}

const EntityEditor: React.FC<Props> = ({ entity, onSave, onCancel }) => {
  return (
    <BaseEditor
      data={entity}
      onSave={onSave}
      onCancel={onCancel}
      messageType="entitySaved"
    >
      {(localEntity, handleChange) => (
        <div className="editor-container">
          <div className="editor-field">
            <label htmlFor="name">Entity Name:</label>
            <input
              type="text"
              id="name"
              name="name"
              className="lucid-styling"
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
