import React from "react";
import { Connector, ConnectType, SimulationObjectType } from "@quodsi/shared";
import BaseEditor from "./BaseEditor";

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
        setSourceLocation: (x: number, y: number) =>
          connector.setSourceLocation(x, y),
        setTargetLocation: (x: number, y: number) =>
          connector.setTargetLocation(x, y),
        setLocation: (x: number, y: number) => connector.setLocation(x, y),
        getLocation: () => connector.getLocation(),
        hasLocation: () => connector.hasLocation(),
        clone: () => connector.clone(),
        resetLocation: () => connector.resetLocation(),
        toJSON: () => connector.toJSON(),
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
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Connect Type</label>
            <select
              name="connectType"
              className="w-full px-2 py-1 text-xs border rounded bg-white"
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

          <div>
            <label className="block text-xs text-gray-600 mb-1">Probability</label>
            <input
              type="number"
              name="probability"
              className="w-full px-2 py-1 text-xs border rounded"
              value={localConnector.probability}
              onChange={handleChange}
              step="0.01"
              min="0"
              max="1"
              placeholder="0.0 - 1.0"
            />
          </div>
        </div>
      )}
    </BaseEditor>
  );
};

export default ConnectorEditor;
