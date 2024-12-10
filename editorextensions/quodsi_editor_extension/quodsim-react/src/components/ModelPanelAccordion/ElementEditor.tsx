import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { SimulationObjectType, EditorReferenceData } from "@quodsi/shared";
import ActivityEditor from "../ActivityEditor";
import GeneratorEditor from "../GeneratorEditor";
import ResourceEditor from "../ResourceEditor";
import EntityEditor from "../EntityEditor";
import ConnectorEditor from "../ConnectorEditor";
import ModelEditor from "../ModelEditor";

interface ElementEditorProps {
  elementType: SimulationObjectType | "Model";
  elementData: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  referenceData: EditorReferenceData;
  isExpanded: boolean;
  onToggle: () => void;
}

const ElementEditor: React.FC<ElementEditorProps> = ({
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
        <ModelEditor model={elementData} onSave={onSave} onCancel={onCancel} />
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
          <ActivityEditor
            activity={elementData}
            onSave={onSave}
            onCancel={onCancel}
          />
        );
      case SimulationObjectType.Generator:
        return (
          <GeneratorEditor
            generator={elementData}
            onSave={onSave}
            onCancel={onCancel}
            referenceData={referenceData}
          />
        );
      case SimulationObjectType.Resource:
        return (
          <ResourceEditor
            resource={elementData}
            onSave={onSave}
            onCancel={onCancel}
          />
        );
      case SimulationObjectType.Entity:
        return (
          <EntityEditor
            entity={elementData}
            onSave={onSave}
            onCancel={onCancel}
          />
        );
      case SimulationObjectType.Connector:
        return (
          <ConnectorEditor
            connector={elementData}
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

export default ElementEditor;
