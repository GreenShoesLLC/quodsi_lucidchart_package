import React from 'react';
import { SimulationObjectType } from "../../shared/types/elements/SimulationObjectType";
import { SimComponentType } from "../../shared/types/simComponentType";
import ActivityEditor from "../../components/ActivityEditor";
import EntityEditor from "../../components/EntityEditor";
import ConnectorEditor from "../../components/ConnectorEditor";
import GeneratorEditor from "../../components/GeneratorEditor";
import ResourceEditor from "../../components/ResourceEditor";

interface EditorHandlers {
  onSave: (data: any) => void;
  onCancel: () => void;
  onTypeChange: (type: SimComponentType, elementId: string) => void;
  elementId: string; 
}

export const createEditorComponent = (
  elementType: SimulationObjectType,
  elementData: any,
  handlers: EditorHandlers,
  isProcessing: boolean
): React.ReactElement | null => {
  const { onSave, onCancel } = handlers;

  switch (elementType) {
    case SimulationObjectType.Activity:
      return React.createElement(ActivityEditor, {
        activity: elementData,
        onSave: onSave,
        onCancel: onCancel
      });

    case SimulationObjectType.Entity:
      return React.createElement(EntityEditor, {
        entity: elementData,
        onSave: onSave,
        onCancel: onCancel
      });

    case SimulationObjectType.Connector:
      return React.createElement(ConnectorEditor, {
        connector: elementData,
        onSave: onSave,
        onCancel: onCancel
      });

    case SimulationObjectType.Generator:
      return React.createElement(GeneratorEditor, {
        generator: elementData,
        onSave: onSave,
        onCancel: onCancel
      });

    case SimulationObjectType.Resource:
      return React.createElement(ResourceEditor, {
        resource: elementData,
        onSave: onSave,
        onCancel: onCancel
      });

    default:
      console.warn("[EditorFactory] Unknown element type:", elementType);
      return null;
  }
};