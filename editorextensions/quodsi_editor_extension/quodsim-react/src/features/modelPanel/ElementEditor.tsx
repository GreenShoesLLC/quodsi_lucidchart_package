import React from "react";
import {
  SimulationObjectType,
  EditorReferenceData,
  DiagramElementType,
  StateListManager,
} from "@quodsi/shared";
import { AccordionSection } from "../shared/AccordionSection";
import { ExtendedModelItemData } from "../../types/ModelItemData";

import ModelEditor from "../editors/ModelEditor";
import ActivityEditor from "../editors/ActivityEditor";
import GeneratorEditor from "../editors/GeneratorEditor";
import ResourceEditor from "../editors/ResourceEditor";
import EntityEditor from "../editors/EntityEditor";
import ConnectorEditor from "../editors/ConnectorEditor";

interface ElementEditorProps {
  elementType: SimulationObjectType | string;
  elementData: any;
  onSave: (data: any) => void;
  referenceData: EditorReferenceData;
  isExpanded: boolean;
  onToggle: () => void;
  currentElement?: ExtendedModelItemData;
  states: StateListManager;
  onStatesChange: (states: StateListManager) => void;
}

/**
 * ElementEditor component that renders the appropriate editor based on element type
 */
export const ElementEditor: React.FC<ElementEditorProps> = ({
  elementType,
  elementData,
  onSave,
  referenceData,
  isExpanded,
  onToggle,
  currentElement,
  states,
  onStatesChange,
}) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Helper to get descriptive title for the accordion section
  const getElementTypeDisplay = () => {
    return elementType === SimulationObjectType.Model
      ? "Model Properties"
      : elementType
      ? `Edit ${elementType}`
      : "Element Editor";
  };

  // Handles edit cancellation
  const handleCancel = () => {
    if (isExpanded) {
      onToggle();
    }
  };

  // Determines the correct element type from various sources
  const getElementType = () => {
    // Check for resource type from multiple sources
    const isResource = 
      elementType === SimulationObjectType.Resource ||
      elementType === "Resource" ||
      currentElement?.type === "Resource" ||
      currentElement?.metadata?.type === SimulationObjectType.Resource ||
      currentElement?.metadata?.type === "Resource" ||
      currentElement?.q_meta?.type === "Resource" ||
      elementData?.type === "Resource";

    if (isResource) return SimulationObjectType.Resource;

    // Use metadata/q_meta type if available
    const metadataType = currentElement?.metadata?.type || currentElement?.q_meta?.type;
    if (metadataType && metadataType !== SimulationObjectType.None) {
      return metadataType;
    }

    // Handle diagram element types
    if (elementType === DiagramElementType.LINE || elementType === "line") {
      return SimulationObjectType.Connector;
    }

    // Return the provided element type
    return elementType;
  };

  // Renders the appropriate editor component based on element type
  const renderEditor = () => {
    const safeElementType = getElementType();
    
    // Ensure element data has ID
    const safeElementData = {
      ...(elementData && typeof elementData === "object" ? elementData : {}),
      id: elementData?.id || currentElement?.id || "",
    };

    if (isDevelopment) {
      console.log("[ElementEditor] Rendering:", safeElementType, safeElementData.id);
    }

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
            states={states}
            onStatesChange={onStatesChange}
          />
        );

      case SimulationObjectType.Activity:
      case "Activity":
      case DiagramElementType.BLOCK:
        return (
          <ActivityEditor
            activity={safeElementData}
            onSave={onSave}
            onCancel={handleCancel}
            referenceData={referenceData}
            states={states}
            onStatesChange={onStatesChange}
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
      case DiagramElementType.LINE:
        return (
          <ConnectorEditor
            connector={safeElementData}
            onSave={onSave}
            onCancel={handleCancel}
            referenceData={referenceData}
          />
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
    <AccordionSection
      title={getElementTypeDisplay()}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      {editorContent}
    </AccordionSection>
  );
};
