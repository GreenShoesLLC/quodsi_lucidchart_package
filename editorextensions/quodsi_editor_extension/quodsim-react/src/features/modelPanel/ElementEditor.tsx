import React from 'react';
import { SimulationObjectType, EditorReferenceData } from '@quodsi/shared';
import { AccordionSection } from '../shared/AccordionSection';
import ActivityEditor from '../../components/ActivityEditor';
import GeneratorEditor from '../../components/GeneratorEditor';
import ResourceEditor from '../../components/ResourceEditor';
import EntityEditor from '../../components/EntityEditor';
import ConnectorEditor from '../../components/ConnectorEditor';
import ModelEditor from '../../components/ModelEditor';

interface ElementEditorProps {
  elementType: SimulationObjectType | string;
  elementData: any;
  onSave: (data: any) => void;
  referenceData: EditorReferenceData;
  isExpanded: boolean;
  onToggle: () => void;
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
  onToggle
}) => {
  // Helper to get descriptive title for the accordion section
  const getElementTypeDisplay = () => {
    return elementType === SimulationObjectType.Model
      ? "Model Properties"
      : elementType
      ? `Edit ${elementType}`
      : "Element Editor";
  };

  // Handles edit cancellation
  const handleCancel = () => {
    console.log('[ElementEditor] Edit cancelled');
    if (isExpanded) {
      onToggle();
    }
  };

  // Renders the appropriate editor component based on element type
  const renderEditor = () => {
    if (elementType === "Model" || elementType === SimulationObjectType.Model) {
      return (
        <ModelEditor 
          model={elementData} 
          onSave={onSave} 
          onCancel={handleCancel} 
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
          <ActivityEditor
            activity={elementData}
            onSave={onSave}
            onCancel={handleCancel}
            referenceData={referenceData}
          />
        );
      case SimulationObjectType.Generator:
        return (
          <GeneratorEditor
            generator={elementData}
            onSave={onSave}
            onCancel={handleCancel}
            referenceData={referenceData}
          />
        );
      case SimulationObjectType.Resource:
        return (
          <ResourceEditor
            resource={elementData}
            onSave={onSave}
            onCancel={handleCancel}
          />
        );
      case SimulationObjectType.Entity:
        return (
          <EntityEditor
            entity={elementData}
            onSave={onSave}
            onCancel={handleCancel}
          />
        );
      case SimulationObjectType.Connector:
        return (
          <ConnectorEditor
            connector={elementData}
            onSave={onSave}
            onCancel={handleCancel}
          />
        );
      default:
        return (
          <div className="p-4 text-gray-500">
            No editor available for this element type: {elementType}
          </div>
        );
    }
  };

  // Get editor content based on type
  const editorContent = renderEditor();
  
  // If no editor content is available, return null
  if (!editorContent) return null;

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
