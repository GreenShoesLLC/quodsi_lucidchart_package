import React from "react";
import BaseEditor from "./BaseEditor";
import { Connector } from "src/shared/types/elements/connector";
import { ConnectType } from "src/shared/types/elements/enums/connectType";

interface Props {
  connector: Connector;
  onSave: (connector: Connector) => void;
  onCancel: () => void;
}

const ConnectorEditor: React.FC<Props> = ({ connector, onSave, onCancel }) => {
  return (
    <BaseEditor
      data={connector}
      onSave={onSave}
      onCancel={onCancel}
      messageType="connectorSaved"
    >
      {(localConnector, handleChange) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label htmlFor="name">Name:</label>
            <input
              type="text"
              id="name"
              name="name"
              className="lucid-styling"
              value={localConnector.name}
              onChange={handleChange}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label htmlFor="probability">Probability:</label>
            <input
              type="number"
              id="probability"
              name="probability"
              className="lucid-styling"
              value={localConnector.probability}
              onChange={handleChange}
              step="0.01"
              min="0"
              max="1"
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label htmlFor="connectType">Connect Type:</label>
            <select
              id="connectType"
              name="connectType"
              className="lucid-styling"
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
