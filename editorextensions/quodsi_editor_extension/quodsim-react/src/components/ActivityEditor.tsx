import React, { useState } from 'react';
import { Activity } from '../app/models';

interface Props {
  activity: Activity;
  onSave: (activity: Activity) => void;
  onCancel: () => void;
}

const ActivityEditor: React.FC<Props> = ({ activity, onSave, onCancel }) => {
  const [localActivity, setLocalActivity] = useState<Activity>(activity);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalActivity({ ...localActivity, [name]: value });
  };

  const handleSave = () => {
    
    onSave(localActivity);
    // Send message back to parent
 // eslint-disable-next-line no-restricted-globals
    parent.postMessage({
      messagetype: 'activitySaved',
      data: localActivity
    }, '*');
  };

  return (
    <div>
      <label>
        Name:
        <input type="text" name="name" value={localActivity.name} onChange={handleChange} />
      </label>
      <label>
        Capacity:
        <input type="number" name="capacity" value={localActivity.capacity} onChange={handleChange} />
      </label>
      <button onClick={handleSave}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  );
};

export default ActivityEditor;
