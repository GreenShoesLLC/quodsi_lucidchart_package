import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  ModelStructure,
  ValidationState,
  EditorReferenceData,
  ModelItemData,
  JsonObject,
  SimulationObjectType,
  DiagramElementType,
} from "@quodsi/shared";
import { ModelTreeView } from "./ModelTreeView";
import ElementEditor from "./ElementEditor";
import { ValidationMessages } from "./ValidationMessages";
import { Header } from "./Header";
import { SimulationStatus } from "src/types/SimulationStatus";

interface ModelPanelAccordionProps {
  modelStructure: ModelStructure | null;
  modelName: string;
  validationState: ValidationState | null;
  currentElement: ModelItemData | null;
  lastElementUpdate: string | null; // Add this line
  diagramElementType?: DiagramElementType;
  expandedNodes: Set<string>;
  onElementSelect: (elementId: string) => void;
  onValidate: () => void;
  onElementUpdate: (elementId: string, data: JsonObject) => void;
  onTreeNodeToggle: (nodeId: string, expanded: boolean) => void;
  onTreeStateUpdate: (nodes: string[]) => void;
  onExpandPath: (nodeId: string) => void;
  referenceData: EditorReferenceData;
  showModelName?: boolean;
  showModelItemName?: boolean;
  visibleSections: {
    header: boolean;
    validation: boolean;
    editor: boolean;
    modelTree: boolean;
  };
  onSimulate?: () => void;
  onRemoveModel?: () => void;
  onConvertPage?: () => void;
  onElementTypeChange: (
    elementId: string,
    newType: SimulationObjectType
  ) => void;
  simulationStatus: SimulationStatus;
}

export const ModelPanelAccordion: React.FC<ModelPanelAccordionProps> = ({
  modelStructure,
  modelName,
  validationState,
  currentElement,
  lastElementUpdate,
  diagramElementType,
  expandedNodes,
  onElementSelect,
  onValidate,
  onElementUpdate,
  onTreeNodeToggle,
  onTreeStateUpdate,
  onExpandPath,
  referenceData,
  showModelName = true,
  showModelItemName = true,
  visibleSections,
  onSimulate,
  onRemoveModel,
  onConvertPage,
  onElementTypeChange,
  simulationStatus,
}) => {
  const [expandedSections, setExpandedSections] = useState({
    modelTree: !currentElement,
    elementEditor: !!currentElement,
    validation: !!validationState?.summary?.errorCount,
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

  const handleTypeChange = (
    elementId: string,
    newType: SimulationObjectType
  ) => {
    onElementTypeChange(elementId, newType);
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
          <span className="font-medium text-sm">Object Explorer</span>
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

  return (
    <div className="flex flex-col h-full bg-white">
      {visibleSections.header && (
        <Header
          modelName={modelName}
          validationState={validationState}
          onValidate={onValidate}
          modelItemData={currentElement}
          showModelName={showModelName}
          showModelItemName={showModelItemName}
          onSimulate={onSimulate}
          onRemoveModel={onRemoveModel}
          onConvertPage={onConvertPage}
          onTypeChange={handleTypeChange}
          elementType={currentElement?.metadata?.type}
          diagramElementType={diagramElementType}
          simulationStatus={simulationStatus}
        />
      )}
      <div className="flex-1 overflow-y-auto">
        {visibleSections.editor &&
          !currentElement?.isUnconverted &&
          currentElement && (
            <ElementEditor
              key={`${currentElement.id}-${lastElementUpdate}`}
              elementData={currentElement.data}
              elementType={currentElement.metadata.type}
              onSave={(data) => onElementUpdate(currentElement.id, data)}
              onCancel={handleEditorCancel}
              referenceData={referenceData}
              isExpanded={expandedSections.elementEditor}
              onToggle={() => toggleSection("elementEditor")}
            />
          )}
        {visibleSections.validation && (
          <ValidationMessages
            validationState={validationState}
            currentElementId={currentElement?.id}
            isExpanded={expandedSections.validation}
            onToggle={() => toggleSection("validation")}
          />
        )}
        {visibleSections.modelTree && <ModelTreeSection />}
      </div>
    </div>
  );
};
