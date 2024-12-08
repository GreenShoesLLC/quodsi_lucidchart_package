import React from "react";
import { createSerializableMessage, MessageTypes } from "@quodsi/shared";

interface ModelUtilitiesProps {
  showConvertButton?: boolean;
  showValidateButton?: boolean;
  showRemoveButton?: boolean;
  showSimulateButton?: boolean;
}

const ModelUtilities: React.FC<ModelUtilitiesProps> = ({
  showConvertButton = false,
  showValidateButton = false,
  showRemoveButton = false,
  showSimulateButton = false,
}) => {
  const sendMessage = (messageType: string) => {
    switch (messageType) {
      case "ConvertPageToModel":
        window.parent.postMessage(
          createSerializableMessage(MessageTypes.CONVERT_PAGE),
          "*"
        );
        break;
      case "ValidateModel":
        window.parent.postMessage(
          createSerializableMessage(MessageTypes.VALIDATE_MODEL),
          "*"
        );
        break;
      case "RemoveModel":
        window.parent.postMessage(
          createSerializableMessage(MessageTypes.REMOVE_MODEL),
          "*"
        );
        break;
      case "SimulateModel":
        window.parent.postMessage(
          createSerializableMessage(MessageTypes.SIMULATE_MODEL),
          "*"
        );
        break;
    }
  };

  return (
    <div className="quodsi-form">
      <div className="quodsi-field">
        {showConvertButton && (
          <button
            className="quodsi-button quodsi-button-primary"
            onClick={() => sendMessage("ConvertPageToModel")}
          >
            Convert Page to Model
          </button>
        )}
        {showValidateButton && (
          <button
            className="quodsi-button quodsi-button-secondary"
            onClick={() => sendMessage("ValidateModel")}
          >
            Validate Model
          </button>
        )}
        {showRemoveButton && (
          <button
            className="quodsi-button quodsi-button-danger"
            onClick={() => sendMessage("RemoveModel")}
          >
            Remove Model
          </button>
        )}
        {showSimulateButton && (
          <button
            className="quodsi-button quodsi-button-secondary"
            onClick={() => sendMessage("SimulateModel")}
          >
            Simulate
          </button>
        )}
      </div>
    </div>
  );
};

export default ModelUtilities;