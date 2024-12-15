import React, { useState } from "react";
import ModelEditor from "./ModelEditor";
import ExperimentEditor from "./ExperimentEditor";
import { OutputViewer } from "./OutputViewer";
import { Model, ModelUtils } from "@quodsi/shared";

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
    window.parent.postMessage(
      {
        messagetype: "modelSaved",
        data: validatedModel,
      },
      "*"
    );
  };

  const handleModelCancel = () => {
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
      default:
        return null;
    }
  };

  return (
    <div className="quodsi-form">
      <div className="quodsi-button-group">
        <button
          onClick={() => setActiveTab("model")}
          className={`quodsi-button ${activeTab === "model" ? 'quodsi-button-primary' : 'quodsi-button-secondary'}`}
        >
          Model
        </button>
        <button
          onClick={() => setActiveTab("experiments")}
          className={`quodsi-button ${activeTab === "experiments" ? 'quodsi-button-primary' : 'quodsi-button-secondary'}`}
        >
          Experiments
        </button>
        <button
          onClick={() => setActiveTab("output")}
          className={`quodsi-button ${activeTab === "output" ? 'quodsi-button-primary' : 'quodsi-button-secondary'}`}
        >
          Output
        </button>
        <button
          onClick={() => setActiveTab("utilities")}
          className={`quodsi-button ${activeTab === "utilities" ? 'quodsi-button-primary' : 'quodsi-button-secondary'}`}
        >
          Utilities
        </button>
      </div>
      <div className="quodsi-field">
        {renderTabContent()}
      </div>
    </div>
  );
};
