import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Header } from "./Header";
import { ModelTreeView } from "./ModelTreeView";
import { ValidationMessageList } from "./ValidationMessageList";

import { typeMappers } from "../../utils/typeMappers";

import {
  ModelStructure,
  ValidationState,
  AccordionState,
  EditorReferenceData,
  SelectionType,
  SimComponentType,
  ModelItemData,
  JsonObject,
  MetaData,
} from "@quodsi/shared";
import ElementEditor from "./ElementEditor";
import { ValidationMessages } from "./ValidationMessages";
import { SimulationComponentSelector } from "../SimulationComponentSelector";

interface ModelPanelAccordionProps {
  modelStructure: ModelStructure | null;
  modelName: string;
  validationState: ValidationState | null;
  currentElement: ModelItemData | null;
  expandedNodes: Set<string>;
  onElementSelect: (elementId: string) => void;
  onValidate: () => void;
  onUpdate: (elementId: string, data: JsonObject) => void;
  onTreeNodeToggle: (nodeId: string, expanded: boolean) => void;
  onTreeStateUpdate: (nodes: string[]) => void;
  onExpandPath: (nodeId: string) => void;
  referenceData: EditorReferenceData;
}

export const ModelPanelAccordion: React.FC<ModelPanelAccordionProps> = ({
  modelStructure,
  modelName,
  validationState,
  currentElement,
  expandedNodes,
  onElementSelect,
  onValidate,
  onUpdate,
  onTreeNodeToggle,
  onTreeStateUpdate,
  onExpandPath,
  referenceData,
}) => {
  const [expandedSections, setExpandedSections] = useState({
    modelTree: !currentElement,
    elementEditor: !!currentElement,
    validation: !!validationState?.summary?.errorCount,
    conversion: currentElement?.isUnconverted ?? false,
  });

  const [searchTerm, setSearchTerm] = useState("");

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleEditorCancel = () => {
    toggleSection("elementEditor");
  };

  const handleTypeChange = (newType: SimComponentType, elementId: string) => {
    console.log("[ModelPanelAccordion] Type change requested:", {
      elementId,
      newType,
    });
    onUpdate(elementId, { type: newType });
  };

  const ModelTreeSection = () => {
    const rootElement = modelStructure?.elements.find((e) => e.id === "0_0");

    console.log("[ModelPanelAccordion] Rendering tree section:", {
      expandedNodes: Array.from(expandedNodes),
      modelTreeExpanded: expandedSections.modelTree,
      rootElement,
    });

    return (
      <div className="border-b">
        <button
          onClick={() => toggleSection("modelTree")}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
        >
          <span className="font-medium text-sm">Model Definition</span>
          {expandedSections.modelTree ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {expandedSections.modelTree && modelStructure && rootElement && (
          <div className="p-3 border-t">
            <ModelTreeView
              element={rootElement}
              modelStructure={modelStructure}
              selectedId={currentElement?.id || null}
              onSelect={(id) => {
                console.log("[ModelPanelAccordion] Tree node selected:", id);
                onElementSelect(id);
              }}
              expanded={expandedNodes}
              onToggleExpand={(nodeId, expanded) => {
                console.log("[ModelPanelAccordion] Tree node toggle:", {
                  nodeId,
                  expanded,
                });
                onTreeNodeToggle(nodeId, expanded);
              }}
              level={0}
            />
          </div>
        )}
      </div>
    );
  };

  const ConversionSection = () => {
    if (!currentElement?.isUnconverted) return null;

    return (
      <div className="border-b">
        <button
          onClick={() => toggleSection("conversion")}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
        >
          <span className="font-medium text-sm">Convert Element</span>
          {expandedSections.conversion ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {expandedSections.conversion && currentElement && (
          <div className="p-3 border-t">
            <SimulationComponentSelector
              elementId={currentElement.id}
              onTypeChange={handleTypeChange}
              currentType={typeMappers.mapSimulationTypeToComponentType(
                currentElement.metadata.type
              )}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <Header
        modelName={modelName || "New Model"}
        validationState={validationState}
        onValidate={onValidate}
        currentElement={currentElement}
      />
      <div className="flex-1 overflow-y-auto">
        <ConversionSection />
        {!currentElement?.isUnconverted && currentElement && (
          <ElementEditor
            elementData={currentElement.data}
            elementType={currentElement.metadata.type}
            onSave={(data) => onUpdate(currentElement.id, data)}
            onCancel={handleEditorCancel}
            referenceData={referenceData}
            isExpanded={expandedSections.elementEditor}
            onToggle={() => toggleSection("elementEditor")}
          />
        )}
        <ModelTreeSection />
        <ValidationMessages
          validationState={validationState}
          currentElementId={currentElement?.id}
          isExpanded={expandedSections.validation}
          onToggle={() => toggleSection("validation")}
        />
      </div>
    </div>
  );
};
