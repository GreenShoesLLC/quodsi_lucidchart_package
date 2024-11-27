import React, { useState } from "react";
import ModelEditor from "./ModelEditor";
import ExperimentEditor from "./ExperimentEditor";
import { OutputViewer } from "./OutputViewer";
import ModelUtilities from "./ModelUtilities";
import { Model, ModelUtils } from "src/shared/types/elements/model";

type TabType = "model" | "experiments" | "output" | "utilities";

interface ModelTabsProps {
  initialModel: Model;
}

export const ModelTabs: React.FC<ModelTabsProps> = ({ initialModel }) => {
  const [activeTab, setActiveTab] = useState<TabType>("model");
  const [model, setModel] = useState<Model>(() =>
    ModelUtils.validate(ModelUtils.createWithDefaults(initialModel))
  );

  const handleModelSave = (updatedModel: Model) => {
    const validatedModel = ModelUtils.validate(updatedModel);
    setModel(validatedModel);
    console.log("Model saved:", validatedModel);

    // Send the saved model data to the parent iframe
    window.parent.postMessage(
      {
        messagetype: "modelSaved",
        data: validatedModel,
      },
      "*"
    );
  };

  const handleModelCancel = () => {
    // Handle cancellation, e.g., reset the model to its original state
    console.log("Model editing cancelled");
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "model":
        return (
          <ModelEditor
            model={model}
            onSave={handleModelSave}
            onCancel={handleModelCancel}
          />
        );
      case "experiments":
        return <ExperimentEditor />;
      case "output":
        return <OutputViewer />;
      case "utilities":
        return (
          <ModelUtilities
            showConvertButton={false}
            showValidateButton={true}
            showRemoveButton={true}
            showSimulateButton={true}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <div>
        <button
          onClick={() => setActiveTab("model")}
          style={{ fontWeight: activeTab === "model" ? "bold" : "normal" }}
        >
          Model
        </button>
        <button
          onClick={() => setActiveTab("experiments")}
          style={{
            fontWeight: activeTab === "experiments" ? "bold" : "normal",
          }}
        >
          Experiments
        </button>
        <button
          onClick={() => setActiveTab("output")}
          style={{ fontWeight: activeTab === "output" ? "bold" : "normal" }}
        >
          Output
        </button>
        <button
          onClick={() => setActiveTab("utilities")}
          style={{ fontWeight: activeTab === "utilities" ? "bold" : "normal" }}
        >
          Utilities
        </button>
      </div>
      <div>{renderTabContent()}</div>
    </div>
  );
};
