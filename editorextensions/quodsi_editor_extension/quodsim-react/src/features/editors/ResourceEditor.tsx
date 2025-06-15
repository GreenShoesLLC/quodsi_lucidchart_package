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
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Name</label>
            <input
              type="text"
              name="name"
              className="w-full px-2 py-1 text-xs border rounded"
              value={localResource.name}
              onChange={handleChange}
              placeholder="Resource Name"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Capacity</label>
            <input
              type="number"
              name="capacity"
              className="w-full px-2 py-1 text-xs border rounded"
              value={localResource.capacity}
              onChange={handleChange}
              min="1"
            />
          </div>
        </div>
      )}
    </BaseEditor>
  );
};

export default React.memo(ResourceEditor);
