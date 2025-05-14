import React from "react";

import { Resource, SimulationObjectType } from "@quodsi/shared";
import BaseEditor from "./BaseEditor";

interface Props {
  resource: Resource;
  onSave: (resource: Resource) => void;
  onCancel: () => void;
}

const ResourceEditor: React.FC<Props> = ({ resource, onSave, onCancel }) => {
  return (
    <BaseEditor
      data={{
        ...resource,
        type: SimulationObjectType.Resource,
        // Ensure all Resource methods are available
        setLocation: (x: number, y: number) => resource.setLocation(x, y),
        getLocation: () => resource.getLocation(),
        hasLocation: () => resource.hasLocation(),
        clone: () => resource.clone(),
        resetLocation: () => resource.resetLocation(),
        toJSON: () => resource.toJSON(),
      }}
      onSave={(updatedData) => {
        // Create a new Resource instance to preserve class methods
        const updatedResource = new Resource(
          updatedData.id,
          updatedData.name,
          updatedData.capacity,
          updatedData.x,
          updatedData.y
        );

        onSave(updatedResource);
      }}
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
