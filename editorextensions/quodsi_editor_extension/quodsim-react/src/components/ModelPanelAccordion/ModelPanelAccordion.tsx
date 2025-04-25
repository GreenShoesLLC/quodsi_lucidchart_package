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
import ElementEditor from "./ElementEditor";
import { ValidationMessages } from "./ValidationMessages";
import { Header } from "./Header";
import { SimulationStatus } from "src/types/SimulationStatus";

interface ModelPanelAccordionProps {
  modelName: string;
  validationState: ValidationState | null;
  currentElement: ModelItemData | null;
  lastElementUpdate: string | null;
  diagramElementType?: DiagramElementType;
  onValidate: () => void;
  onElementUpdate: (elementId: string, data: JsonObject) => void;
  referenceData: EditorReferenceData;
  showModelName?: boolean;
  showModelItemName?: boolean;
  visibleSections: {
    header: boolean;
    validation: boolean;
    editor: boolean;
    modelTree: boolean; // Keeping this to avoid changing dependent code initially
  };
  onSimulate?: (scenarioName?: string) => void;
  onRemoveModel?: () => void;
  onConvertPage?: () => void;
  onElementTypeChange: (
    elementId: string,
    newType: SimulationObjectType
  ) => void;
  simulationStatus: SimulationStatus;
  onViewResults?: () => void;
}

export const ModelPanelAccordion: React.FC<ModelPanelAccordionProps> = ({
  modelName,
  validationState,
  currentElement,
  lastElementUpdate,
  diagramElementType,
  onValidate,
  onElementUpdate,
  referenceData,
  showModelName = true,
  showModelItemName = true,
  visibleSections,
  onSimulate,
  onRemoveModel,
  onConvertPage,
  onElementTypeChange,
  simulationStatus,
  onViewResults,
}) => {
  const [expandedSections, setExpandedSections] = useState({
    elementEditor: !!currentElement,
    validation: !!validationState?.summary?.errorCount,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
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
          onViewResults={onViewResults}
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
        {/* ModelTreeSection has been removed */}
      </div>
    </div>
  );
};
