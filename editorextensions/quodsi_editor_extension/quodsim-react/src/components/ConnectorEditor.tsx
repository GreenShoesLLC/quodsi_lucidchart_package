import React from "react";
import BaseEditor from "./BaseEditor";
import { Connector, ConnectType, SimulationObjectType } from "@quodsi/shared";

interface Props {
  connector: Connector;
  onSave: (connector: Connector) => void;
  onCancel: () => void;
}

const ConnectorEditor: React.FC<Props> = ({ connector, onSave, onCancel }) => {
  return (
    <BaseEditor
      data={{ ...connector, type: SimulationObjectType.Connector }}
      onSave={onSave}
      onCancel={onCancel}
      messageType="connectorSaved"
    >
      {(localConnector, handleChange) => (
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
              value={localConnector.name}
              onChange={handleChange}
            />
          </div>

          <div className="quodsi-field">
            <label htmlFor="probability" className="quodsi-label">
              Probability
            </label>
            <input
              type="number"
              id="probability"
              name="probability"
              className="quodsi-input"
              value={localConnector.probability}
              onChange={handleChange}
              step="0.01"
              min="0"
              max="1"
            />
          </div>

          <div className="quodsi-field">
            <label htmlFor="connectType" className="quodsi-label">
              Connect Type
            </label>
            <select
              id="connectType"
              name="connectType"
              className="quodsi-select"
              value={localConnector.connectType}
              onChange={handleChange}
            >
              {Object.keys(ConnectType).map((key) => (
                <option
                  key={key}
                  value={ConnectType[key as keyof typeof ConnectType]}
                >
                  {key}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </BaseEditor>
  );
};

export default ConnectorEditor;