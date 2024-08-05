import React, { useState } from 'react';
import { Resource } from '../app/models/resource';

interface Props {
  resource: Resource;
  onSave: (resource: Resource) => void;
  onCancel: () => void;
}

const ResourceEditor: React.FC<Props> = ({ resource, onSave, onCancel }) => {
  const [localResource, setLocalResource] = useState<Resource>(resource);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalResource({ 
      ...localResource, 
      [name]: name === 'capacity' ? Number(value) : value 
    });
  };

  const handleSave = () => {
    onSave(localResource);
    // Send message back to parent
    window.parent.postMessage({
      messagetype: 'resourceSaved',
      data: localResource
    }, '*');
  };


  return (
    <div>
      <label>
        Name:
        <input 
          type="text" 
          name="name" 
          value={localResource.name} 
          onChange={handleChange} 
        />
      </label>
      <label>
        Capacity:
        <input 
          type="number" 
          name="capacity" 
          value={localResource.capacity} 
          onChange={handleChange} 
        />
      </label>
      <button onClick={handleSave}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  );
};

export default ResourceEditor;