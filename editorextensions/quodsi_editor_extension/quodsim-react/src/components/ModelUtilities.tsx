import React from "react";
import styles from "./ModelUtilities.module.css";
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
  // Utility function to create and send a message
    const sendMessage = (messageType: string) => {
      // Map the button action to the correct MessageType
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
    <div className={styles["button-container"]}>
      {showConvertButton && (
        <button
          className={`${styles["lucid-styling"]} ${styles["primary"]}`}
          onClick={() => sendMessage("ConvertPageToModel")}
        >
          Convert Page to Model
        </button>
      )}
      {showValidateButton && (
        <button
          className={`${styles["lucid-styling"]} ${styles["secondary"]}`}
          onClick={() => sendMessage("ValidateModel")}
        >
          Validate Model
        </button>
      )}
      {showRemoveButton && (
        <button
          className={`${styles["lucid-styling"]} ${styles["tertiary"]}`}
          onClick={() => sendMessage("RemoveModel")}
        >
          Remove Model
        </button>
      )}
      {showSimulateButton && (
        <button
          className={`${styles["lucid-styling"]} ${styles["secondary"]}`}
          onClick={() => sendMessage("SimulateModel")}
        >
          Simulate
        </button>
      )}
    </div>
  );
};

export default ModelUtilities;
