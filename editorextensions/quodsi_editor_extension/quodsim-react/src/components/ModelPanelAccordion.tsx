import React, { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import {
  ModelStructure,
  ValidationState,
  ValidationResult,
  EditorReferenceData,
  SimulationObjectType,
} from "@quodsi/shared";
import TreeNode from "./TreeNode";

import { ValidationSection } from "./ValidationSection/ValidationSection";
import ElementEditor from "./ModelPanelAccordion/ElementEditor";

interface ModelPanelAccordionProps {
  modelStructure: ModelStructure | null;
  modelName: string;
  validationState: ValidationState | null;
  currentElement: {
    data: any;
    metadata: any;
  } | null;
  expandedNodes: Set<string>;
  referenceData: EditorReferenceData;
  onElementSelect: (elementId: string) => void;
  onValidate: () => void;
  onUpdate: (elementId: string, data: any) => void;
  onTreeNodeToggle: (nodeId: string, expanded: boolean) => void;
  onTreeStateUpdate: (expandedNodes: string[]) => void;
  onExpandPath: (nodeId: string) => void;
}

const ModelPanelAccordion: React.FC<ModelPanelAccordionProps> = ({
  modelStructure,
  modelName,
  validationState,
  currentElement,
  expandedNodes,
  referenceData,
  onElementSelect,
  onValidate,
  onUpdate,
  onTreeNodeToggle,
  onTreeStateUpdate,
  onExpandPath,
}) => {
  const [openSections, setOpenSections] = useState<string[]>(["structure"]);

  useEffect(() => {
    console.log("ModelPanelAccordion validation state:", validationState);
  }, [validationState]);

  const toggleSection = (section: string) => {
    console.log("Toggling section:", section);
    setOpenSections((prev) => {
      const newSections = prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section];
      console.log("New open sections:", newSections);
      return newSections;
    });
  };

  const validationResult: ValidationResult | null = validationState
    ? {
        isValid: validationState.summary.errorCount === 0,
        errorCount: validationState.summary.errorCount,
        warningCount: validationState.summary.warningCount,
        messages: validationState.messages,
      }
    : null;

  console.log("Converted validation result:", validationResult);

  return (
    <div className="w-full bg-white rounded shadow border">
      <div className="border-b">
        <button
          onClick={() => toggleSection("structure")}
          className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50 transition-colors"
        >
          <span className="font-medium">Model Structure</span>
          <ChevronDown
            className={`w-4 h-4 transform transition-transform ${
              openSections.includes("structure") ? "rotate-180" : ""
            }`}
          />
        </button>
        {openSections.includes("structure") && modelStructure && (
          <div className="p-2">
            <div className="border rounded max-h-[400px] overflow-y-auto">
              {modelStructure.elements.map((node) => (
                <TreeNode key={node.id} node={node} level={0} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-b">
        <button
          onClick={() => toggleSection("editor")}
          className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50 transition-colors"
        >
          <span className="font-medium">Element Editor</span>
          <ChevronDown
            className={`w-4 h-4 transform transition-transform ${
              openSections.includes("editor") ? "rotate-180" : ""
            }`}
          />
        </button>
        {openSections.includes("editor") && currentElement && (
          <div className="p-4">
            <ElementEditor
              elementType={currentElement.metadata.type || "Model"}
              elementData={currentElement.data}
              onSave={(data) => onUpdate(currentElement.data.id, data)}
              onCancel={() => toggleSection("editor")}
              referenceData={referenceData}
              isExpanded={true}
              onToggle={() => toggleSection("editor")}
            />
          </div>
        )}
      </div>

      <div>
        <button
          onClick={() => toggleSection("validation")}
          className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <span className="font-medium">Validation</span>
            {validationResult &&
              (validationResult.errorCount > 0 ||
                validationResult.warningCount > 0) && (
                <div className="flex items-center space-x-2">
                  {validationResult.errorCount > 0 && (
                    <span className="text-red-500 text-sm">
                      {validationResult.errorCount} ⚠️
                    </span>
                  )}
                  {validationResult.warningCount > 0 && (
                    <span className="text-yellow-500 text-sm">
                      {validationResult.warningCount} ⚠️
                    </span>
                  )}
                </div>
              )}
          </div>
          <ChevronDown
            className={`w-4 h-4 transform transition-transform ${
              openSections.includes("validation") ? "rotate-180" : ""
            }`}
          />
        </button>
        {openSections.includes("validation") && validationResult && (
          <div className="p-4">
            <ValidationSection
              validationResult={validationResult}
              selectedElementId={currentElement?.data?.id}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelPanelAccordion;
