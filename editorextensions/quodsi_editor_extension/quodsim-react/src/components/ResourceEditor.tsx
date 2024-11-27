// Update ResourceEditor.tsx
import React from "react";
import BaseEditor from "./BaseEditor";
import { Resource } from "src/shared/types/elements/resource";

interface Props {
  resource: Resource;
  onSave: (resource: Resource) => void;
  onCancel: () => void;
}

const ResourceEditor: React.FC<Props> = ({ resource, onSave, onCancel }) => {
  return (
    <BaseEditor
      data={resource}
      onSave={onSave}
      onCancel={onCancel}
      messageType="resourceSaved"
    >
      {(localResource, handleChange) => (
        <div className="editor-container">
          <div className="editor-field">
            <label htmlFor="name">Name:</label>
            <input
              type="text"
              id="name"
              name="name"
              className="lucid-styling"
              value={localResource.name}
              onChange={handleChange}
            />
          </div>

          <div className="editor-field">
            <label htmlFor="capacity">Capacity:</label>
            <input
              type="number"
              id="capacity"
              name="capacity"
              className="lucid-styling"
              value={localResource.capacity}
              onChange={handleChange}
            />
          </div>
        </div>
      )}
    </BaseEditor>
  );
};

export default React.memo(ResourceEditor);
