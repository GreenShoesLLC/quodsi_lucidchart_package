import React from "react";
import {
  SimulationObjectType,
  EditorReferenceData,
  DiagramElementType,
} from "@quodsi/shared";
import { AccordionSection } from "../shared/AccordionSection";
import ActivityEditor from "../../_deprecated/ActivityEditor";
import GeneratorEditor from "../../_deprecated/GeneratorEditor";
import ResourceEditor from "../../_deprecated/ResourceEditor";

import ModelEditor from "../../_deprecated/ModelEditor";
import { ExtendedModelItemData } from "../../types/ModelItemData";
import EntityEditor from "src/_deprecated/EntityEditor";
import ConnectorEditor from "src/_deprecated/ConnectorEditor";

interface ElementEditorProps {
  elementType: SimulationObjectType | string;
  elementData: any;
  onSave: (data: any) => void;
  referenceData: EditorReferenceData;
  isExpanded: boolean;
  onToggle: () => void;
  currentElement?: ExtendedModelItemData;
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
}) => {
  // Log component props on mount for debugging
  React.useEffect(() => {
    console.log("[ElementEditor] Component mounted with props:", {
      elementType,
      elementTypeType: typeof elementType,
      hasElementData: !!elementData,
      isExpanded,
      hasCurrentElement: !!currentElement,
      currentElementId: currentElement?.id,
      currentElementMetadataType: currentElement?.metadata?.type,
      currentElementQMetaType: currentElement?.q_meta?.type,
    });
  }, []);

  // Helper to get descriptive title for the accordion section
  const getElementTypeDisplay = () => {
    const displayText =
      elementType === SimulationObjectType.Model
        ? "Model Properties"
        : elementType
        ? `Edit ${elementType}`
        : "Element Editor";

    console.log("[ElementEditor] Accordion title:", displayText, {
      elementType,
      isModelType: elementType === SimulationObjectType.Model,
    });

    return displayText;
  };

  // Handles edit cancellation
  const handleCancel = () => {
    console.log("[ElementEditor] Edit cancelled");
    if (isExpanded) {
      onToggle();
    }
  };

  // Renders the appropriate editor component based on element type
  const renderEditor = () => {
    console.log(
      `[ElementEditor] Rendering editor for element type: ${elementType}, currentElement:`,
      currentElement
    );
    console.log(`[ElementEditor] Element data: ${JSON.stringify(elementData)}`);

    // Debug logging for editor rendering decision
    console.log("[ElementEditor] EDITOR SELECTION - Detailed type info:", {
      receivedElementType: elementType,
      currentElementType: currentElement?.type,
      currentElementMetadataType: currentElement?.metadata?.type,
      currentElementQMetaType: currentElement?.q_meta?.type,
      elementDataType: elementData?.type,
      isElementTypeSimObjType: Object.values(SimulationObjectType).includes(
        elementType as SimulationObjectType
      ),
      typedElementType: typeof elementType,
      isUnconverted: currentElement?.isUnconverted,
      // Use type assertion to avoid TypeScript error for property that exists at runtime but not in type
      diagramElementType: (currentElement as any)?.diagramElementType,
    });

    // Multiple Resource type checks with explicit logging
    let isResource = false;
    let resourceDetectionSource = "";

    if (
      elementType === SimulationObjectType.Resource ||
      elementType === "Resource"
    ) {
      console.log("[ElementEditor] Resource detected from elementType prop");
      isResource = true;
      resourceDetectionSource = "elementType prop";
    } else if (currentElement?.type === "Resource") {
      console.log("[ElementEditor] Resource detected from currentElement.type");
      isResource = true;
      resourceDetectionSource = "currentElement.type";
    } else if (
      currentElement?.metadata?.type === SimulationObjectType.Resource ||
      currentElement?.metadata?.type === "Resource"
    ) {
      console.log(
        "[ElementEditor] Resource detected from currentElement.metadata.type"
      );
      isResource = true;
      resourceDetectionSource = "currentElement.metadata.type";
    } else if (currentElement?.q_meta?.type === "Resource") {
      console.log(
        "[ElementEditor] Resource detected from currentElement.q_meta.type"
      );
      isResource = true;
      resourceDetectionSource = "currentElement.q_meta.type";
    } else if (elementData?.type === "Resource") {
      console.log("[ElementEditor] Resource detected from elementData.type");
      isResource = true;
      resourceDetectionSource = "elementData.type";
    }

    console.log("[ElementEditor] Resource detection result:", {
      isResource,
      resourceDetectionSource,
    });

    // Additional safety to ensure we never have block/line as element types
    let safeElementType = isResource
      ? SimulationObjectType.Resource
      : elementType;

    // Check if q_meta or metadata is available for this element
    const metadataType =
      !isResource &&
      (currentElement?.metadata?.type || currentElement?.q_meta?.type);

    if (metadataType) {
      console.log(
        "[ElementEditor] Using type from metadata/q_meta:",
        metadataType
      );
      safeElementType = metadataType as SimulationObjectType;
    }
    // Only if we don't have metadata type and not a resource, then use element type fallbacks
    else if (
      !isResource &&
      (elementType === DiagramElementType.BLOCK || elementType === "block") &&
      currentElement
    ) {
      console.warn(
        "[ElementEditor] Block type without metadata classification",
        {
          currentElementId: currentElement?.id,
          elementTypeValue: elementType,
          isPrimitive: typeof elementType === "string",
          hasMetadata: !!currentElement?.metadata,
          hasQMeta: !!currentElement?.q_meta,
        }
      );
      // Leave safeElementType as is - don't default to Activity
    } else if (
      !isResource &&
      (elementType === DiagramElementType.LINE || elementType === "line") &&
      currentElement
    ) {
      console.warn("[ElementEditor] Converting line type to Connector", {
        currentElementId: currentElement?.id,
        elementTypeValue: elementType,
        isPrimitive: typeof elementType === "string",
      });
      safeElementType = SimulationObjectType.Connector;
      // Update current element metadata if available
      if (currentElement && !currentElement.metadata) {
        currentElement.metadata = {
          type: SimulationObjectType.Connector,
          version: "1.0",
          lastModified: new Date().toISOString(),
          id: currentElement.id,
        };
        console.log("[ElementEditor] Created new metadata for Connector");
      } else if (currentElement && currentElement.metadata) {
        const oldType = currentElement.metadata.type;
        currentElement.metadata.type = SimulationObjectType.Connector;
        console.log(
          "[ElementEditor] Updated metadata type from",
          oldType,
          "to",
          SimulationObjectType.Connector
        );
      }
    }

    // Safety check to ensure we have a valid element editor
    console.log("[ElementEditor] Editor type determination:", {
      initialElementType: elementType,
      isResource,
      safeElementType,
      metadataType,
      finalEditorType: safeElementType,
    });

    // Always ensure ID is present in elementData
    const safeElementData =
      elementData && typeof elementData === "object"
        ? { ...elementData, id: elementData.id || currentElement?.id || "" }
        : { id: currentElement?.id || "" };

    console.log("[ElementEditor] Prepared safe element data:", {
      id: safeElementData.id,
      hasOriginalId: !!elementData?.id,
      usedFallbackId: !elementData?.id && !!currentElement?.id,
      properties: Object.keys(safeElementData),
    });

    if (
      safeElementType === "Model" ||
      safeElementType === SimulationObjectType.Model
    ) {
      console.log("[ElementEditor] Rendering ModelEditor");
      return (
        <ModelEditor
          model={safeElementData}
          onSave={onSave}
          onCancel={handleCancel}
        />
      );
    }

    if (!safeElementData?.id && elementType) {
      console.error("[ElementEditor] Missing element ID", {
        safeElementData,
        elementType,
        currentElementId: currentElement?.id,
      });
      return (
        <div className="p-4 text-red-600 bg-red-50 border border-red-200 rounded-md shadow-sm">
          <div className="font-medium mb-2">Invalid element data received</div>
          <div className="text-sm text-red-500">
            Element ID missing or data incomplete
          </div>
        </div>
      );
    }

    // Force resource check here too
    if (isResource) {
      console.log(
        "[ElementEditor] Rendering ResourceEditor because isResource flag is true",
        {
          elementId: safeElementData?.id,
          resourceDetectionSource,
        }
      );
      return (
        <ResourceEditor
          resource={safeElementData}
          onSave={onSave}
          onCancel={handleCancel}
        />
      );
    }

    switch (safeElementType) {
      case SimulationObjectType.Activity:
      case "Activity":
      case DiagramElementType.BLOCK: // Handle when elementType is directly passed as block
        console.log(
          "[ElementEditor] Rendering ActivityEditor for type:",
          safeElementType,
          {
            elementId: safeElementData?.id,
            elementDataName: safeElementData?.name,
            fromBlockType: safeElementType === DiagramElementType.BLOCK,
          }
        );
        return (
          <ActivityEditor
            activity={safeElementData}
            onSave={onSave}
            onCancel={handleCancel}
            referenceData={referenceData}
          />
        );
      case SimulationObjectType.Generator:
      case "Generator":
        console.log(
          "[ElementEditor] Rendering GeneratorEditor for type:",
          safeElementType
        );
        return (
          <GeneratorEditor
            generator={safeElementData}
            onSave={onSave}
            onCancel={handleCancel}
            referenceData={referenceData}
          />
        );
      case SimulationObjectType.Resource:
      case "Resource":
        console.log(
          "[ElementEditor] Rendering ResourceEditor for type:",
          safeElementType
        );
        return (
          <ResourceEditor
            resource={safeElementData}
            onSave={onSave}
            onCancel={handleCancel}
          />
        );
      case SimulationObjectType.Entity:
      case "Entity":
        console.log(
          "[ElementEditor] Rendering EntityEditor for type:",
          safeElementType
        );
        return (
          <EntityEditor
            entity={safeElementData}
            onSave={onSave}
            onCancel={handleCancel}
          />
        );
      case SimulationObjectType.Connector:
      case "Connector":
      case DiagramElementType.LINE: // Handle when elementType is directly passed as line
        console.log(
          "[ElementEditor] Rendering ConnectorEditor for type:",
          safeElementType
        );
        return (
          <ConnectorEditor
            connector={safeElementData}
            onSave={onSave}
            onCancel={handleCancel}
          />
        );
      default:
        console.warn(
          "[ElementEditor] No matching editor found for element type:",
          safeElementType,
          {
            elementId: safeElementData?.id,
            originalType: elementType,
          }
        );
        return (
          <div className="p-4 text-gray-500">
            No editor available for this element type: {safeElementType}
          </div>
        );
    }
  };

  // Get editor content based on type
  const editorContent = renderEditor();

  // If no editor content is available, return null
  if (!editorContent) {
    console.warn("[ElementEditor] No editor content available, returning null");
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
