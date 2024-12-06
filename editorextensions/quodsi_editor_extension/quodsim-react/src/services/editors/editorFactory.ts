import React from 'react';
import { SimulationObjectType } from "@quodsi/shared";
import { SimComponentType } from "@quodsi/shared";
import ActivityEditor from "../../components/ActivityEditor";
import EntityEditor from "../../components/EntityEditor";
import ConnectorEditor from "../../components/ConnectorEditor";
import GeneratorEditor from "../../components/GeneratorEditor";
import ResourceEditor from "../../components/ResourceEditor";
import { ModelDefinition } from '@quodsi/shared';
import { EditorReferenceData } from '@quodsi/shared';

interface EditorHandlers {
  onSave: (data: any) => void;
  onCancel: () => void;
  onTypeChange: (type: SimComponentType, elementId: string) => void;
  elementId: string;
  referenceData: EditorReferenceData;  // Add this
}

export const createEditorComponent = (
  elementType: SimulationObjectType,
  elementData: any,
  handlers: EditorHandlers,
  isProcessing: boolean
): React.ReactElement | null => {
  const { onSave, onCancel, referenceData } = handlers;

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
        onCancel: onCancel,
        referenceData: referenceData  // Pass reference data
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