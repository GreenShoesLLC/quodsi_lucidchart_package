import React, { useState } from 'react';
import { Entity } from '../app/models';

interface Props {
  entity: Entity;
  onSave: (entity: Entity) => void;
  onCancel: () => void;
}

const EntityEditor: React.FC<Props> = ({ entity, onSave, onCancel }) => {
  const [localEntity, setLocalEntity] = useState<Entity>(entity);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalEntity({ ...localEntity, [name]: value });
  };

  const handleSave = () => {
    onSave(localEntity);
  };

  return (
    <div>
      <label>
        Name:
        <input type="text" name="name" value={localEntity.name} onChange={handleChange} />
      </label>
      <button onClick={handleSave}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  );
};

export default EntityEditor;
