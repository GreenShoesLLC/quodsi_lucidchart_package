import React, { useState, useEffect, useRef } from "react";
import {
  SimulationObjectType,
  EditorReferenceData,
  DiagramElementType,
  StateListManager,
  ValidationResult,
  getLogger,
} from "@quodsi/lucid-shared";
import { ExtendedModelItemData } from "../../types/ModelItemData";
import { getSimulationObjectType } from "../../utils/typeDetection";

import { ConnectorRoutingView } from "quodsi_studio/platforms/shared";
import ModelEditor, { EditorTab } from "../editors/ModelEditor";
import { EntityRow } from "../editors/EntitiesEditor";
import ActivityEditor from "../editors/ActivityEditor";
import GeneratorEditor from "../editors/GeneratorEditor";
import { ResourceBlockEditor } from "../editors/ResourceBlockEditor";
import SwimLaneEditor from "../editors/SwimLaneEditor";
import { useReferenceDataAccessor } from "../../adapters/useReferenceDataAccessor";
import { useModelOpsSender } from "../../messaging/senders/modelOpsSender";

const log = getLogger("ElementEditor");

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
  entities: EntityRow[];
  onEntitiesChange: (entities: EntityRow[]) => void;
  resourceRequirements?: any[];
  outgoingConnectors?: any[];
  validationState?: ValidationResult | null;
  activeTab?: EditorTab;
  onTabChange?: (tab: EditorTab) => void;
  onSimulate?: (scenarioName?: string, scenarioDefinitionId?: string) => void;
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
  entities,
  onEntitiesChange,
  resourceRequirements,
  outgoingConnectors,
  validationState,
  activeTab,
  onTabChange,
  onSimulate,
}) => {
  // Track editor type for fade transition
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousEditorTypeRef = useRef<string | null>(null);

  // Unconditional (hook order): backs the Connector case's ConnectorRoutingView
  // below. This screen holds no draft of its own -- every routing edit made
  // here (weight/priority/condition/entity template/connect type) writes
  // straight through to storage via Task 2's ELEMENT_UPDATE sender, so no
  // shapeWriters are registered (compare ActivityEditor/GeneratorEditor,
  // which register one for the shape they already own a draft of).
  const { updateResourceRequirements, updateElement } = useModelOpsSender();
  const connectorAccessor = useReferenceDataAccessor(referenceData, {
    updateResourceRequirements,
    updateElement,
  });

  const currentEditorType = elementData?.className === 'AdvancedSwimLaneBlock'
    ? 'SwimLane'
    : getSimulationObjectType(elementType, currentElement, elementData);

  useEffect(() => {
    if (previousEditorTypeRef.current !== null && previousEditorTypeRef.current !== currentEditorType) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 200);
      return () => clearTimeout(timer);
    }
    previousEditorTypeRef.current = currentEditorType;
  }, [currentEditorType]);

  useEffect(() => {
    if (!isTransitioning) {
      previousEditorTypeRef.current = currentEditorType;
    }
  }, [isTransitioning, currentEditorType]);

  // Renders the appropriate editor component based on element type
  const renderEditor = () => {
    // Check for SwimLane type before SimulationObjectType normalization
    // (SwimLane is not a SimulationObjectType — it's a visual container)
    if (elementData?.className === 'AdvancedSwimLaneBlock') {
      const safeElementData = {
        ...(elementData && typeof elementData === "object" ? elementData : {}),
        id: elementData?.id || currentElement?.id || "",
      };
      return (
        <SwimLaneEditor
          elementData={safeElementData}
          onSave={onSave}
          referenceData={referenceData}
        />
      );
    }

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
            onRemoveModel={onRemoveModel}
            onValidate={onValidate}
            states={states}
            onStatesChange={onStatesChange}
            entities={entities}
            onEntitiesChange={onEntitiesChange}
            referenceData={referenceData}
            resourceRequirements={resourceRequirements}
            validationState={validationState}
            activeTab={activeTab}
            onTabChange={onTabChange}
            onSimulate={onSimulate}
          />
        );

      case SimulationObjectType.Activity:
      case "Activity":
        return (
          <ActivityEditor
            activity={safeElementData}
            onSave={onSave}
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
            referenceData={referenceData}
            states={states}
            onStatesChange={onStatesChange}
          />
        );

      // A Resource block is a POINTER at a model-level resource (Plan 2b):
      // its shape data carries only { id, type, resourceId }. Everything
      // editable -- name, capacity, financials, levers -- lives on the
      // model-root `resources` list and is edited through the SHARED Studio
      // panels ResourceBlockEditor mounts. Nothing here is onSave-driven any
      // more: those panels write through the accessor themselves.
      case SimulationObjectType.Resource:
      case "Resource":
        return (
          <ResourceBlockEditor
            blockId={safeElementData.id}
            resourceId={safeElementData.resourceId}
          />
        );

      case SimulationObjectType.Connector:
      case "Connector": {
        const sourceId = safeElementData.sourceId as string | undefined;
        const isActivitySource = !!referenceData.activities?.some((a) => a.id === sourceId);
        const isGeneratorSource = !isActivitySource && !!referenceData.generators?.some((g) => g.id === sourceId);

        if (!sourceId || (!isActivitySource && !isGeneratorSource)) {
          // Error: Source not found in either Activities or Generators - data integrity issue
          log.error("Source not found for connector:", safeElementData.id, "sourceId:", sourceId);
          return (
            <div className="p-3 text-red-600 bg-red-50 border border-red-200 rounded text-sm">
              <div className="font-medium">Cannot edit connector</div>
              <div className="text-xs mt-1">
                Source element not found. This indicates a data integrity issue.
              </div>
            </div>
          );
        }

        return (
          <ConnectorRoutingView
            sourceId={sourceId}
            sourceType={isActivitySource ? 'Activity' : 'Generator'}
            selectedConnectorId={safeElementData.id}
            accessor={connectorAccessor}
          />
        );
      }

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
    <div
      className="bg-white transition-opacity duration-200 ease-in-out"
      style={{ opacity: isTransitioning ? 0 : 1 }}
    >
      {editorContent}
    </div>
  );
};
