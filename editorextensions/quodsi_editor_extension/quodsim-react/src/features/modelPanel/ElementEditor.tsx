import React from "react";
import {
  SimulationObjectType,
  EditorReferenceData,
  DiagramElementType,
  StateListManager,
  ISerializedTimePattern,
  ISerializedTimeDistributedConfig,
  ValidationResult,
} from "@quodsi/shared";
import { ExtendedModelItemData } from "../../types/ModelItemData";
import { getSimulationObjectType } from "../../utils/typeDetection";

import ModelEditor, { EditorTab } from "../editors/ModelEditor";
import ActivityEditor from "../editors/ActivityEditor";
import GeneratorEditor from "../editors/GeneratorEditor";
import ResourceEditor from "../editors/ResourceEditor";
import EntityEditor from "../editors/EntityEditor";
import ConnectorsEditor from "../editors/ConnectorsEditor";

interface ElementEditorProps {
  elementType: SimulationObjectType | string;
  elementData: any;
  onSave: (data: any) => void;
  onRemoveModel?: () => void;
  onValidate?: () => void;
  referenceData: EditorReferenceData;
  currentElement?: ExtendedModelItemData;
  states: StateListManager;
  onStatesChange: (states: StateListManager) => void;
  onTimePatternsChange?: (patterns: ISerializedTimePattern[]) => void;
  onTimeDistributedConfigsChange?: (configs: ISerializedTimeDistributedConfig[]) => void;
  resourceRequirements?: any[];
  outgoingConnectors?: any[];
  validationState?: ValidationResult | null;
  activeTab?: EditorTab;
  onTabChange?: (tab: EditorTab) => void;
}

/**
 * ElementEditor component that renders the appropriate editor based on element type
 */
export const ElementEditor: React.FC<ElementEditorProps> = ({
  elementType,
  elementData,
  onSave,
  onRemoveModel,
  onValidate,
  referenceData,
  currentElement,
  states,
  onStatesChange,
  onTimePatternsChange = () => {},
  onTimeDistributedConfigsChange = () => {},
  resourceRequirements,
  outgoingConnectors,
  validationState,
  activeTab,
  onTabChange,
}) => {
  // Simple cancel handler - no accordion state to manage
  const handleCancel = () => {
    // Editors handle their own cancel behavior
  };

  // Renders the appropriate editor component based on element type
  const renderEditor = () => {
    const safeElementType = getSimulationObjectType(elementType, currentElement, elementData);

    // Ensure element data has ID
    const safeElementData = {
      ...(elementData && typeof elementData === "object" ? elementData : {}),
      id: elementData?.id || currentElement?.id || "",
    };

    // Validate we have required data
    if (!safeElementData.id) {
      return (
        <div className="p-3 text-red-600 bg-red-50 border border-red-200 rounded text-sm">
          <div className="font-medium">Invalid element data</div>
          <div className="text-xs mt-1">Element ID missing</div>
        </div>
      );
    }

    // Render appropriate editor
    switch (safeElementType) {
      case SimulationObjectType.Model:
      case "Model":
        return (
          <ModelEditor
            model={safeElementData}
            onSave={onSave}
            onCancel={handleCancel}
            onRemoveModel={onRemoveModel}
            onValidate={onValidate}
            states={states}
            onStatesChange={onStatesChange}
            referenceData={referenceData}
            resourceRequirements={resourceRequirements}
            validationState={validationState}
            activeTab={activeTab}
            onTabChange={onTabChange}
          />
        );

      case SimulationObjectType.Activity:
      case "Activity":
        return (
          <ActivityEditor
            activity={safeElementData}
            onSave={onSave}
            onCancel={handleCancel}
            referenceData={referenceData}
            states={states}
            onStatesChange={onStatesChange}
            outgoingConnectors={outgoingConnectors}
          />
        );

      case SimulationObjectType.Generator:
      case "Generator":
        return (
          <GeneratorEditor
            generator={safeElementData}
            onSave={onSave}
            onCancel={handleCancel}
            referenceData={referenceData}
            states={states}
            onStatesChange={onStatesChange}
            onTimePatternsChange={onTimePatternsChange}
            onTimeDistributedConfigsChange={onTimeDistributedConfigsChange}
          />
        );

      case SimulationObjectType.Resource:
      case "Resource":
        return (
          <ResourceEditor
            resource={safeElementData}
            onSave={onSave}
            onCancel={handleCancel}
            states={states}
            onStatesChange={onStatesChange}
          />
        );

      case SimulationObjectType.Entity:
      case "Entity":
        return (
          <EntityEditor
            entity={safeElementData}
            onSave={onSave}
            onCancel={handleCancel}
            states={states}
            onStatesChange={onStatesChange}
          />
        );

      case SimulationObjectType.Connector:
      case "Connector":
        // Try to find source Activity for routing configuration
        const sourceActivityRef = referenceData.activities?.find(
          (a) => a.id === safeElementData.sourceId
        );

        if (sourceActivityRef) {
          // Show ConnectorsEditor with routing configuration
          // Note: We're passing a minimal activity object - ConnectorsEditor will handle it
          return (
            <ConnectorsEditor
              activity={sourceActivityRef as any}
              outgoingConnectors={outgoingConnectors || []}
              selectedConnectorId={safeElementData.id}
              onSave={onSave}
              onCancel={handleCancel}
              referenceData={referenceData}
              states={states}
            />
          );
        }

        // Check if source is a Generator instead
        const sourceGeneratorRef = referenceData.generators?.find(
          (g) => g.id === safeElementData.sourceId
        );

        if (sourceGeneratorRef) {
          // Generator connectors don't have routing configuration
          // Show read-only information
          const targetActivity = referenceData.activities?.find(
            (a) => a.id === safeElementData.targetId
          );

          return (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm space-y-2">
              <div className="font-medium text-blue-900">Generator Connector</div>
              <div className="text-xs text-blue-800 space-y-1">
                <div>
                  <span className="font-medium">Source:</span> {sourceGeneratorRef.name} (Generator)
                </div>
                <div>
                  <span className="font-medium">Target:</span> {targetActivity?.name || safeElementData.targetId} (Activity)
                </div>
                <div className="mt-2 pt-2 border-t border-blue-300 text-blue-700">
                  Generator connectors are simple point-to-point connections. They don't have routing
                  configuration like Activity connectors because Generators always send entities to
                  their designated target Activity.
                </div>
              </div>
            </div>
          );
        }

        // Error: Source not found in either Activities or Generators - data integrity issue
        console.error("[ElementEditor] Source not found for connector:", safeElementData.id, "sourceId:", safeElementData.sourceId);
        return (
          <div className="p-3 text-red-600 bg-red-50 border border-red-200 rounded text-sm">
            <div className="font-medium">Cannot edit connector</div>
            <div className="text-xs mt-1">
              Source element not found. This indicates a data integrity issue.
            </div>
          </div>
        );

      default:
        return (
          <div className="p-3 text-gray-500 text-sm">
            No editor available for: {safeElementType}
          </div>
        );
    }
  };

  const editorContent = renderEditor();

  if (!editorContent) {
    return null;
  }

  return (
    <div className="bg-white">
      {editorContent}
    </div>
  );
};
