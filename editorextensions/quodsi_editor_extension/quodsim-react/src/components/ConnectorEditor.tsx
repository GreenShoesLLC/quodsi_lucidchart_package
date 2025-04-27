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
      data={{ 
        ...connector, 
        type: SimulationObjectType.Connector,
        // Ensure all Connector methods are available
        setSourceLocation: (x: number, y: number) => connector.setSourceLocation(x, y),
        setTargetLocation: (x: number, y: number) => connector.setTargetLocation(x, y),
        setLocation: (x: number, y: number) => connector.setLocation(x, y),
        getLocation: () => connector.getLocation(),
        hasLocation: () => connector.hasLocation(),
        clone: () => connector.clone(),
        resetLocation: () => connector.resetLocation(),
        toJSON: () => connector.toJSON()
      }}
      onSave={(updatedData) => {
        // Create a new Connector instance to preserve class methods
        const updatedConnector = new Connector(
          updatedData.id,
          updatedData.name,
          updatedData.sourceId,
          updatedData.targetId,
          updatedData.probability,
          updatedData.connectType,
          updatedData.operationSteps,
          updatedData.sourceX,
          updatedData.sourceY,
          updatedData.targetX,
          updatedData.targetY,
          updatedData.x,
          updatedData.y
        );

        onSave(updatedConnector);
      }}
      onCancel={onCancel}
      messageType="connectorSaved"
    >
      {(localConnector, handleChange) => (
        <div>
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
        </div>
      )}
    </BaseEditor>
  );
};

export default ConnectorEditor;