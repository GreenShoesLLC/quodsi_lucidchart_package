import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { SimulationObjectType, EditorReferenceData } from "@quodsi/shared";
import ActivityEditorOld from "../ActivityEditorOld";
import GeneratorEditorOld from "../GeneratorEditorOld";
import ResourceEditorOld from "../ResourceEditorOld";

import ModelEditorOld from "../ModelEditorOld";
import EntityEditorOld from "../EntityEditorOld";

interface ElementEditorProps {
  elementType: SimulationObjectType | "Model";
  elementData: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  referenceData: EditorReferenceData;
  isExpanded: boolean;
  onToggle: () => void;
}

const ElementEditorOld: React.FC<ElementEditorProps> = ({
  elementType,
  elementData,
  onSave,
  onCancel,
  referenceData,
  isExpanded,
  onToggle,
}) => {
  const getElementTypeDisplay = () => {
    return elementType === "Model"
      ? "Model Properties"
      : elementType
      ? `Edit ${elementType}`
      : "Element Editor";
  };

  const renderEditor = () => {
    if (elementType === "Model") {
      return (
        <ModelEditorOld
          model={elementData}
          onSave={onSave}
          onCancel={onCancel}
        />
      );
    }

    if (!elementData?.id && elementType) {
      return (
        <div className="p-4 text-red-600">Invalid element data received</div>
      );
    }

    switch (elementType) {
      case SimulationObjectType.Activity:
        return (
          <ActivityEditorOld
            activity={elementData}
            onSave={onSave}
            onCancel={onCancel}
            referenceData={referenceData}
          />
        );
      case SimulationObjectType.Generator:
        return (
          <GeneratorEditorOld
            generator={elementData}
            onSave={onSave}
            onCancel={onCancel}
            referenceData={referenceData}
          />
        );
      case SimulationObjectType.Resource:
        return (
          <ResourceEditorOld
            resource={elementData}
            onSave={onSave}
            onCancel={onCancel}
          />
        );
      case SimulationObjectType.Entity:
        return (
          <EntityEditorOld
            entity={elementData}
            onSave={onSave}
            onCancel={onCancel}
          />
        );
      default:
        return null;
    }
  };

  const editorContent = renderEditor();
  if (!editorContent) return null;

  return (
    <div className="border-b">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
      >
        <span className="font-medium text-sm">{getElementTypeDisplay()}</span>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      {isExpanded && <div className="p-3 border-t">{editorContent}</div>}
    </div>
  );
};

export default ElementEditorOld;
