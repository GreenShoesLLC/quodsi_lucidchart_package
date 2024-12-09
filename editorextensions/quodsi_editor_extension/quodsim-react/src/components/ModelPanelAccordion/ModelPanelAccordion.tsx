import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Header } from "./Header";
import { ModelTreeView } from "./ModelTreeView";
import { ValidationMessageList } from "./ValidationMessageList";
import {
  ModelStructure,
  ValidationState,
  AccordionState,
} from "@quodsi/shared";
import { ElementEditor } from "./ElementEditor";
import { ValidationMessages } from "./ValidationMessages";

interface ModelPanelAccordionProps {
  modelStructure: ModelStructure | null;
  modelName: string;
  validationState: ValidationState | null;
  currentElement: {
    data: any;
    metadata: any;
  } | null;
  expandedNodes: Set<string>;
  onElementSelect: (elementId: string) => void;
  onValidate: () => void;
  onUpdate: (elementId: string, data: any) => void;
  onTreeNodeToggle: (nodeId: string, expanded: boolean) => void;
  onTreeStateUpdate: (nodes: string[]) => void;
  onExpandPath: (nodeId: string) => void;
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

  const filterModelElements = (elements: ModelStructure["elements"]) => {
    if (!searchTerm) return elements;

    return elements.filter((element) =>
      element.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const ModelTreeSection = () => {
    const rootElement = modelStructure?.elements.find((e) => e.id === "0_0");

    return (
      <div className="border-b">
        <button
          onClick={() => toggleSection("modelTree")}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
        >
          <span className="font-medium text-sm">Model Structure</span>
          {expandedSections.modelTree ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {expandedSections.modelTree && modelStructure && rootElement && (
          <div className="p-3 border-t">
            <div className="mb-2">
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearch}
                placeholder="Search elements..."
                className="w-full p-1 text-sm border rounded"
              />
            </div>
            <div className="max-h-60 overflow-y-auto">
              <ModelTreeView
                element={rootElement}
                modelStructure={modelStructure}
                selectedId={currentElement?.data?.id || null}
                onSelect={onElementSelect}
                expanded={expandedNodes}
                onToggleExpand={(nodeId) =>
                  onTreeNodeToggle(nodeId, !expandedNodes.has(nodeId))
                }
                level={0}
              />
            </div>
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
      />
      <div className="flex-1 overflow-y-auto">
        <ModelTreeSection />
        <ElementEditor
          elementData={currentElement?.data}
          elementType={currentElement?.metadata?.type}
          isExpanded={expandedSections.elementEditor}
          onToggle={() => toggleSection("elementEditor")}
          onUpdate={onUpdate}
        />
        <ValidationMessages
          validationState={validationState}
          currentElementId={currentElement?.data?.id}
          isExpanded={expandedSections.validation}
          onToggle={() => toggleSection("validation")}
        />
      </div>
    </div>
  );
};
