import React, { useState, useEffect } from "react";
import ActivityEditor from "./components/ActivityEditor";
import EntityEditor from "./components/EntityEditor";
import ConnectorEditor from "./components/ConnectorEditor";

import { ModelTabs } from "./components/ModelTabs";

import ResourceEditor from "./components/ResourceEditor";
import {
  LucidChartMessage,
  LucidChartMessageClass,
} from "./shared/types/LucidChartMessage";
import ModelUtilities from "./components/ModelUtilities";

import GeneratorEditor from "./components/GeneratorEditor";
import { StatusMonitor } from "./components/StatusMonitor";
import { SimulationComponentSelector } from "./components/SimulationComponentSelector";
import {
  SimComponentFactory,
  SimComponentType,
} from "./types/simComponentTypes";
import { Model, ModelUtils } from "./shared/types/elements/model";
import { SimulationObjectType } from "./shared/types/elements/enums/simulationObjectType";
import { Resource } from "./shared/types/elements/resource";
import { Activity } from "./shared/types/elements/activity";
import { Entity } from "./shared/types/elements/entity";
import { Connector } from "./shared/types/elements/connector";
import { Generator } from "./shared/types/elements/generator";
import { PeriodUnit } from "./shared/types/elements/enums/PeriodUnit";
import { SimulationTimeType } from "./shared/types/elements/enums/simulation_time_type";


const initialModel = new Model(
  "blah",
  "blah",
  10, // reps
  30, // forecastDays
  42, // seed (optional)
  PeriodUnit.HOURS, // oneClockUnit (optional)
  SimulationTimeType.Clock, // simulationTimeType (optional)
  5, // warmupClockPeriod (optional)
  PeriodUnit.DAYS, // warmupClockPeriodUnit (optional)
  100, // runClockPeriod (optional)
  PeriodUnit.HOURS, // runClockPeriodUnit (optional)
  new Date("2024-01-01"), // warmupDateTime (optional)
  new Date("2024-01-02"), // startDateTime (optional)
  new Date("2024-01-03") // finishDateTime (optional)
);
const App: React.FC = () => {
  const [editor, setEditor] = useState<JSX.Element | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [currentComponentType, setCurrentComponentType] = useState<
    SimComponentType | undefined
  >();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentLucidId, setCurrentLucidId] = useState<string>("");

  const handleComponentTypeChange = (newType: SimComponentType) => {
    console.log("[App] Component type change requested:", {
      from: currentComponentType,
      to: newType,
      lucidId: currentLucidId,
      timestamp: new Date().toISOString(),
    });

    setIsProcessing(true);
    setCurrentComponentType(newType);

    // Create empty instance using factory
    const emptyInstanceData = SimComponentFactory.createEmpty(
      newType,
      currentLucidId
    );

    // Update the editor immediately with empty data
    const message: LucidChartMessage = {
      messagetype: "lucidchartdata",
      simtype: newType,
      version: "1",
      instancedata: JSON.stringify(emptyInstanceData),
      documentId: documentId || "",
      lucidId: currentLucidId,
    };

    // Update the editor component
    handleMessage(message);

    // Notify parent of type change
    window.parent.postMessage(
      {
        messagetype: "componentTypeChanged",
        simtype: newType,
        lucidId: currentLucidId,
      },
      "*"
    );
  };

  const handleMessage = (lucid_message: LucidChartMessage) => {
    console.log(
      "[App] handleMessage called with message type:",
      lucid_message.messagetype
    );

    if (lucid_message.messagetype === "lucidchartdata") {
      const newDocumentId = lucid_message.documentId;
      setCurrentLucidId(lucid_message.lucidId);
      let instanceData = {};

      try {
        instanceData = JSON.parse(lucid_message.instancedata || "{}");
        console.log("[App] Successfully parsed instance data:", {
          type: lucid_message.simtype,
          dataKeys: Object.keys(instanceData),
        });
      } catch (error) {
        console.error("[App] Error parsing instance data:", {
          error,
          rawData: lucid_message.instancedata,
        });
      }

      if (newDocumentId) {
        console.log("[App] Setting new documentId:", newDocumentId);
        setDocumentId(newDocumentId);
      }

      console.log("[App] Handling simtype:", lucid_message.simtype);
      setCurrentComponentType(lucid_message.simtype as SimComponentType);

      switch (lucid_message.simtype) {
        case "ValidateModel":
        case "ConvertPageToModel":
        case "model":
        case "resource":
        case "activity":
          console.log(
            "[App] Rendering editor with StatusMonitor, documentId:",
            newDocumentId
          );
          const editorComponent = (
            <>
              <SimulationComponentSelector
                currentType={lucid_message.simtype as SimComponentType}
                onTypeChange={handleComponentTypeChange}
                disabled={isProcessing}
              />
              {getEditorComponent(lucid_message, instanceData)}
              {newDocumentId && (
                <div>
                  <StatusMonitor documentId={newDocumentId} />
                </div>
              )}
            </>
          );
          console.log("[App] Setting editor component");
          setEditor(editorComponent);
          break;

        default:
          console.log("[App] Rendering editor without StatusMonitor");
          setEditor(
            <>
              <SimulationComponentSelector
                currentType={lucid_message.simtype as SimComponentType}
                onTypeChange={handleComponentTypeChange}
                disabled={isProcessing}
              />
              {getEditorComponent(lucid_message, instanceData)}
            </>
          );
          break;
      }
    } else if (lucid_message.messagetype === "componentTypeUpdateComplete") {
      setIsProcessing(false);
      if (!lucid_message.success) {
        console.error(
          "[App] Component type update failed:",
          lucid_message.error
        );
      }
    }
  };

  const getEditorComponent = (
    message: LucidChartMessage,
    instanceData: any
  ) => {
    console.log("[App] Getting editor component for simtype:", message.simtype);

    switch (message.simtype) {
      case "ValidateModel":
        return (
          <ModelUtilities
            showConvertButton={false}
            showValidateButton={true}
            showRemoveButton={true}
            showSimulateButton={true}
          />
        );
      case "ConvertPageToModel":
        return (
          <ModelUtilities
            showConvertButton={true}
            showValidateButton={false}
            showRemoveButton={false}
            showSimulateButton={false}
          />
        );
      case "rightpanel":
      case "contentdock":
        return <ModelTabs initialModel={initialModel} />;
      case "model":
        const completeModel = ModelUtils.createWithDefaults(instanceData);
        return <ModelTabs initialModel={completeModel} />;
      case "resource":
        return (
          <ResourceEditor
            key={message.lucidId}
            resource={instanceData as Resource}
            onSave={(resource) =>
              console.log("[App] Resource saved:", JSON.stringify(resource))
            }
            onCancel={() => {
              console.log("[App] Resource editor cancelled");
              setEditor(null);
            }}
          />
        );
      case "activity":
        return (
          <ActivityEditor
            key={message.lucidId}
            activity={instanceData as Activity}
            onSave={(activity) =>
              console.log("[App] Activity saved:", JSON.stringify(activity))
            }
            onCancel={() => {
              console.log("[App] Activity editor cancelled");
              setEditor(null);
            }}
          />
        );
      case "entity":
        return (
          <EntityEditor
            key={message.lucidId}
            entity={instanceData as Entity}
            onSave={(entity) =>
              console.log("[App] Entity saved:", JSON.stringify(entity))
            }
            onCancel={() => {
              console.log("[App] Entity editor cancelled");
              setEditor(null);
            }}
          />
        );
      case "connector":
        return (
          <ConnectorEditor
            key={message.lucidId}
            connector={instanceData as Connector}
            onSave={(connector) =>
              console.log("[App] Connector saved:", JSON.stringify(connector))
            }
            onCancel={() => {
              console.log("[App] Connector editor cancelled");
              setEditor(null);
            }}
          />
        );
      case "generator":
        console.log("[App] Creating generator editor with data:", instanceData);
        return (
          <GeneratorEditor
            key={message.lucidId}
            generator={instanceData as Generator}
            onSave={(generator) =>
              console.log("[App] Generator saved:", JSON.stringify(generator))
            }
            onCancel={() => {
              console.log("[App] Generator editor cancelled");
              setEditor(null);
            }}
          />
        );
      default:
        console.log("[App] Unknown simtype:", message.simtype);
        return null;
    }
  };

  useEffect(() => {
    console.log("[App] Setting up message event listener");

    const eventListener = (event: MessageEvent) => {
      console.log("[App] Received message event:", event.data);
      handleMessage(event.data as LucidChartMessage);
    };

    window.addEventListener("message", eventListener);

    const readyMessage = LucidChartMessageClass.createMessage(
      "reactAppReady",
      "{}",
      "",
      ""
    ).toObject();

    console.log("[App] Sending ready message to parent");
    window.parent.postMessage(readyMessage, "*");

    return () => {
      console.log("[App] Cleaning up message event listener");
      window.removeEventListener("message", eventListener);
    };
  }, []);

  return <div>{editor}</div>;
};

export default App;
