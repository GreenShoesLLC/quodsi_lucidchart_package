import React, { useState } from 'react';
import { Connector } from '../app/models/connector';


interface Props {
  connector: Connector;
  onSave: (connector: Connector) => void;
  onCancel: () => void;
}

const ConnectorEditor: React.FC<Props> = ({ connector, onSave, onCancel }) => {
  const [localConnector, setLocalConnector] = useState<Connector>(connector);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalConnector({ ...localConnector, [name]: value });
  };

  const handleSave = () => {
    onSave(localConnector);
  };

  return (
    <div>
      <label>
        Name:
        <input type="text" name="name" value={localConnector.name} onChange={handleChange} />
      </label>
      <label>
        From Activity ID:
        <input type="text" name="fromActivityId" value={localConnector.fromActivityId} onChange={handleChange} />
      </label>
      <label>
        To Activity ID:
        <input type="text" name="toActivityId" value={localConnector.toActivityId} onChange={handleChange} />
      </label>
      <button onClick={handleSave}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  );
};

export default ConnectorEditor;
