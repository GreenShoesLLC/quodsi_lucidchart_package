import React from "react";
import {
  SimulationObjectType,
  EditorReferenceData,
  DiagramElementType,
  StateListManager,
  ValidationState,
} from "@quodsi/shared";
import { ExtendedModelItemData } from "../../types/ModelItemData";
import { getSimulationObjectType } from "../../utils/typeDetection";

import ModelEditor from "../editors/ModelEditor";
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
  referenceData: EditorReferenceData;
  currentElement?: ExtendedModelItemData;
  states: StateListManager;
  onStatesChange: (states: StateListManager) => void;
  resourceRequirements?: any[];
  outgoingConnectors?: any[];
  validationState?: ValidationState | null;
}

/**
 * ElementEditor component that renders the appropriate editor based on element type
 */
export const ElementEditor: React.FC<ElementEditorProps> = ({
  elementType,
  elementData,
  onSave,
  onRemoveModel,
  referenceData,
  currentElement,
  states,
  onStatesChange,
  resourceRequirements,
  outgoingConnectors,
  validationState,
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
            states={states}
            onStatesChange={onStatesChange}
            referenceData={referenceData}
            resourceRequirements={resourceRequirements}
            validationState={validationState}
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

        // Error: Source Activity not found - data integrity issue
        console.error("[ElementEditor] Source Activity not found for connector:", safeElementData.id, "sourceId:", safeElementData.sourceId);
        return (
          <div className="p-3 text-red-600 bg-red-50 border border-red-200 rounded text-sm">
            <div className="font-medium">Cannot edit connector</div>
            <div className="text-xs mt-1">
              Source Activity not found. This indicates a data integrity issue.
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
