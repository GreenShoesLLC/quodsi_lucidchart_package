import React from "react";
import BaseEditor from "./BaseEditor";
import { Resource, SimulationObjectType } from "@quodsi/shared";

interface Props {
  resource: Resource;
  onSave: (resource: Resource) => void;
  onCancel: () => void;
}

const ResourceEditor: React.FC<Props> = ({ resource, onSave, onCancel }) => {
  return (
    <BaseEditor
      data={{ ...resource, type: SimulationObjectType.Resource }}
      onSave={onSave}
      onCancel={onCancel}
      messageType="resourceSaved"
    >
      {(localResource, handleChange) => (
        <div>
          <div className="quodsi-field">
            <label htmlFor="name" className="quodsi-label">
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className="quodsi-input"
              value={localResource.name}
              onChange={handleChange}
            />
          </div>

          <div className="quodsi-field">
            <label htmlFor="capacity" className="quodsi-label">
              Capacity
            </label>
            <input
              type="number"
              id="capacity"
              name="capacity"
              className="quodsi-input"
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