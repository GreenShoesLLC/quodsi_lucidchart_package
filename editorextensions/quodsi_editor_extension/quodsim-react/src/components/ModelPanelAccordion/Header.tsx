import React from "react";
import { DiagramElementType, SimulationObjectType } from "@quodsi/shared";
import { ValidationState } from "@quodsi/shared/dist/types/accordion/ValidationState";
import { ModelItemData } from "@quodsi/shared/dist/types/messaging/payloads/ModelItemData";
import { SimulationComponentSelector } from "../SimulationComponentSelector";
import { SimulationStatusMonitor } from "../SimulationStatusMonitor";
import { Trash2 } from "lucide-react";
import { getSimulationState } from "src/utils/simulationState";
import { SimulationStatus } from "src/types/SimulationStatus";

interface HeaderProps {
  modelName: string;
  validationState: ValidationState | null;
  onValidate: () => void;
  modelItemData: ModelItemData | null;
  showModelName: boolean;
  showModelItemName: boolean;
  elementType?: SimulationObjectType;
  diagramElementType?: DiagramElementType;
  onTypeChange: (elementId: string, newType: SimulationObjectType) => void;
  onRemoveComponent?: (elementId: string) => void;
  onSimulate?: (scenarioName?: string) => void;
  onRemoveModel?: () => void;
  onConvertPage?: () => void;
  simulationStatus: SimulationStatus;
  onViewResults?: () => void;
}

interface HeaderState {
  isSimulating: boolean;
  scenarioName: string;
}

export class Header extends React.Component<HeaderProps, HeaderState> {
  constructor(props: HeaderProps) {
    super(props);
    this.state = {
      isSimulating: false,
      scenarioName: "New Scenario", // Default name
    };
  }

  // Reset the simulation button state when status changes
  componentDidUpdate(prevProps: HeaderProps) {
    if (
      prevProps.simulationStatus.pageStatus !==
        this.props.simulationStatus.pageStatus &&
      this.state.isSimulating
    ) {
      // Check if the simulation is no longer running
      const scenarioStatus =
        this.props.simulationStatus.pageStatus?.scenarios?.[0];
      if (
        scenarioStatus?.runState === "RAN_SUCCESSFULLY" ||
        scenarioStatus?.runState === "RAN_WITH_ERRORS"
      ) {
        this.setState({ isSimulating: false });
      }
    }
  }

  handleTypeChange = (newType: SimulationObjectType, elementId: string) => {
    if (this.props.onTypeChange) {
      this.props.onTypeChange(elementId, newType);
    }
  };

  handleRemoveComponent = () => {
    const { modelItemData, onRemoveComponent } = this.props;
    if (modelItemData?.id && onRemoveComponent) {
      onRemoveComponent(modelItemData.id);
    }
  };

  handleSimulateClick = () => {
    this.setState({ isSimulating: true });
    if (this.props.onSimulate) {
      this.props.onSimulate(this.state.scenarioName);
    }
  };

  getDisplayName = (modelItemData: ModelItemData | null): string => {
    if (!modelItemData) return "No Selection";

    // Try to get name from the data object first (SimulationObject data)
    const simulationObjectName = (modelItemData.data as { name?: string })
      ?.name;
    if (simulationObjectName) return simulationObjectName;

    // Fall back to ModelItemData.name if data.name isn't available
    if (modelItemData.name) return modelItemData.name;

    // Final fallback to id
    return `Item ${modelItemData.id}`;
  };

  renderModelName() {
    const { modelName, modelItemData, showModelName, showModelItemName } =
      this.props;
    if (!modelItemData && !showModelName) return null;

    return (
      <div className="flex items-center gap-2">
        {showModelName && (
          <span className="text-sm font-medium">{modelName}</span>
        )}
        {showModelItemName && modelItemData && (
          <span className="text-xs text-gray-500">
            Item {this.getDisplayName(modelItemData)}
          </span>
        )}
      </div>
    );
  }

  // Add a scenario name input field
  renderScenarioNameInput() {
    const { modelItemData } = this.props;
    const isModel =
      modelItemData?.metadata?.type === SimulationObjectType.Model;

    if (!isModel) return null;

    return (
      <div className="flex items-center mb-2">
        <label htmlFor="scenario-name" className="text-xs mr-2">
          Scenario Name:
        </label>
        <input
          id="scenario-name"
          type="text"
          className="text-xs p-1 border rounded flex-grow"
          value={this.state.scenarioName}
          onChange={(e) => this.setState({ scenarioName: e.target.value })}
          disabled={this.state.isSimulating}
        />
      </div>
    );
  }

  renderButtons() {
    const {
      modelItemData,
      onValidate,
      onSimulate,
      onRemoveModel,
      onConvertPage,
      elementType: propsElementType,
      diagramElementType,
      simulationStatus,
    } = this.props;

    // Define fixed width for buttons - ensuring all three buttons have the same width
    const buttonStyle = {
      minWidth: "110px",
      width: "33%",
      textAlign: "center" as const,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "32px",
    };

    // Handle case when no modelItemData exists (Convert button)
    if (!modelItemData) {
      return (
        onConvertPage && (
          <button
            style={buttonStyle}
            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={onConvertPage}
          >
            Initialize Quodsi Model
          </button>
        )
      );
    }

    const elementType =
      (modelItemData.metadata?.type as SimulationObjectType) ||
      propsElementType ||
      SimulationObjectType.None;

    // Handle Model type buttons (Simulate, Remove Model, Validate)
    if (elementType === SimulationObjectType.Model) {
      return (
        <div className="flex items-center justify-between gap-2 w-full">
          {onSimulate && (
            <button
              style={buttonStyle}
              className={`px-2 py-1 text-xs ${
                this.state.isSimulating
                  ? "bg-blue-500 cursor-not-allowed"
                  : "bg-green-500 hover:bg-green-600"
              } text-white rounded`}
              onClick={this.handleSimulateClick}
              disabled={this.state.isSimulating}
            >
              {this.state.isSimulating
                ? "Running..."
                : getSimulationState(
                    simulationStatus.pageStatus,
                    simulationStatus.isPollingSimState
                  ).buttonLabel}
            </button>
          )}
          {onRemoveModel && (
            <button
              style={buttonStyle}
              className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
              onClick={onRemoveModel}
            >
              Remove Model
            </button>
          )}
          {/* {onValidate && (
            <button
              style={buttonStyle}
              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={onValidate}
            >
              Validate
            </button>
          )} */}
        </div>
      );
    }

    // Handle unconverted items (Component Selector)
    if (modelItemData.isUnconverted) {
      return (
        <SimulationComponentSelector
          elementId={modelItemData.id}
          selectedType={elementType}
          diagramElementType={diagramElementType}
          onTypeChange={this.handleTypeChange}
        />
      );
    }

    // Handle converted items (Component Selector and Remove button)
    return (
      <div className="flex items-center gap-2">
        <SimulationComponentSelector
          elementId={modelItemData.id}
          selectedType={elementType}
          diagramElementType={diagramElementType}
          onTypeChange={this.handleTypeChange}
        />
        {!modelItemData.isUnconverted && this.props.onRemoveComponent && (
          <button
            className="p-2 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            onClick={this.handleRemoveComponent}
            title="Remove Simulation Component"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    );
  }

  render() {
    const { modelItemData, simulationStatus, onViewResults } = this.props;
    const isModel =
      modelItemData?.metadata?.type === SimulationObjectType.Model;

    return (
      <div className="p-2 space-y-2 border-b">
        {this.renderModelName()}
        <div className="flex flex-col space-y-2">
          {this.renderScenarioNameInput()}
          {this.renderButtons()}

          {/* Show SimulationStatusMonitor only when viewing a model */}
          {isModel && (
            <>
              <div className="border-t my-2" />
              <SimulationStatusMonitor
                status={simulationStatus.pageStatus}
                isPollingSimState={simulationStatus.isPollingSimState}
                error={simulationStatus.errorMessage}
                newResultsAvailable={simulationStatus.newResultsAvailable}
                onViewResults={onViewResults}
              />
            </>
          )}
        </div>
      </div>
    );
  }
}
