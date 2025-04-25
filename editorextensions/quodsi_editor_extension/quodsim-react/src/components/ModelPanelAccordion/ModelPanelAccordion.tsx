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
  needsInitialization?: boolean;
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
  needsInitialization = false,
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

  // Check if we're in a ready state to show content
  const hasContent = modelName || currentElement;
  
  return (
    <div className="flex flex-col h-full bg-white">
      {/* If we need initialization, show just the button */}
      {needsInitialization ? (
        <div className="h-full w-full flex items-center justify-center p-4">
          <button
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            onClick={onConvertPage}
          >
            Initialize Quodsi Model
          </button>
        </div>
      ) : 
      /* If we're waiting for data (not in initialization state and no content), show loading */
      !hasContent ? (
        <div className="h-full w-full flex items-center justify-center p-4">
          <div className="text-center">
            <div className="inline-block animate-pulse rounded-full h-4 w-4 bg-blue-500 mr-2"></div>
            <span className="text-gray-500">Initializing...</span>
          </div>
        </div>
      ) : (
        <>
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
          </div>
        </>
      )}
    </div>
  );
};
