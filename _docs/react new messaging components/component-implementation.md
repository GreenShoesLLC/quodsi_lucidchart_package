# Component Implementation Guide

This document provides specific guidance for implementing each new component in the ModelPanel system.

## Core ModelPanel Component

The ModelPanel component serves as the main container and orchestrator for the UI.

### Implementation Steps

1. Create basic component structure
2. Implement the useModelPanel hook for data transformation
3. Handle different states (loading, initialization, normal)
4. Compose child components

### Sample Implementation

```tsx
// features/modelPanel/ModelPanel.tsx
import React, { useState } from 'react';
import { useModelPanel } from '../../messaging/hooks/useModelPanel';
import { PanelHeader } from './PanelHeader';
import { ElementEditor } from './ElementEditor';
import { ValidationPanel } from './ValidationPanel';
import { SimulationControls } from './SimulationControls';

export const ModelPanel: React.FC = () => {
  // Get transformed data and actions from hook
  const {
    modelName,
    currentElement,
    validationState,
    isLoading,
    needsInitialization,
    diagramElementType,
    referenceData,
    // Actions
    onElementUpdate,
    onElementTypeChange,
    onValidate,
    onSimulate,
    onRemoveModel,
    onConvertPage,
    onViewResults
  } = useModelPanel();

  // Local UI state
  const [expandedSections, setExpandedSections] = useState({
    elementEditor: true,
    validation: false
  });

  // Toggle accordion sections
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Handle initialization state
  if (needsInitialization) {
    return (
      <div className="h-full w-full flex items-center justify-center p-4">
        <button
          className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          onClick={onConvertPage}
        >
          Initialize Quodsi Model
        </button>
      </div>
    );
  }

  // Handle loading state
  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-pulse rounded-full h-4 w-4 bg-blue-500 mr-2"></div>
          <span className="text-gray-500">Initializing...</span>
        </div>
      </div>
    );
  }

  // Main content render
  return (
    <div className="flex flex-col h-full bg-white">
      <PanelHeader
        modelName={modelName}
        validationState={validationState}
        currentElement={currentElement}
        onValidate={onValidate}
        onSimulate={onSimulate}
        onRemoveModel={onRemoveModel}
        onElementTypeChange={onElementTypeChange}
        diagramElementType={diagramElementType}
      />
      
      <div className="flex-1 overflow-y-auto">
        {currentElement && !currentElement.isUnconverted && (
          <ElementEditor
            elementData={currentElement.data}
            elementType={currentElement.metadata.type}
            onSave={data => onElementUpdate(currentElement.id, data)}
            referenceData={referenceData}
            isExpanded={expandedSections.elementEditor}
            onToggle={() => toggleSection('elementEditor')}
          />
        )}
        
        <ValidationPanel
          validationState={validationState}
          currentElementId={currentElement?.id}
          isExpanded={expandedSections.validation}
          onToggle={() => toggleSection('validation')}
        />
      </div>
    </div>
  );
};
```

## useModelPanel Hook

The useModelPanel hook transforms data from the messaging system to the format needed by UI components.

### Sample Implementation

```tsx
// messaging/hooks/useModelPanel.ts
import { useMessaging } from '../useMessaging';
import { transformToModelItemData } from '../mappers/modelItem.mapper';
import { transformToValidationState } from '../mappers/validation.mapper';
import { EnvelopeMessageType } from '@quodsi/shared';

export function useModelPanel() {
  const { 
    selection, 
    validation, 
    simulation, 
    sendMessage,
    app: { initialized }
  } = useMessaging();

  // Extract current element from selection
  const selectedElement = selection.selectedElements[0];
  const modelItemData = selectedElement 
    ? transformToModelItemData(selectedElement) 
    : null;
  
  // Extract document context
  const { documentContext } = selection;
  
  // Transform validation data
  const validationState = transformToValidationState(validation.currentValidation);
  
  // Determine loading and initialization states
  const isLoading = !initialized || !documentContext;
  const needsInitialization = documentContext 
    ? !documentContext.isQuodsiModel 
    : false;
  
  // Create action handlers
  const onElementUpdate = (elementId: string, data: any) => {
    sendMessage(EnvelopeMessageType.UPDATE_ELEMENT_DATA, {
      elementId,
      data,
      type: modelItemData?.metadata?.type
    });
  };
  
  const onElementTypeChange = (elementId: string, newType: string) => {
    sendMessage(EnvelopeMessageType.CONVERT_ELEMENT, {
      elementId,
      type: newType
    });
  };
  
  const onValidate = () => {
    sendMessage(EnvelopeMessageType.VALIDATE_MODEL, {});
  };
  
  const onSimulate = (scenarioName?: string) => {
    sendMessage(EnvelopeMessageType.SIMULATE_MODEL, {
      scenarioName
    });
  };
  
  const onRemoveModel = () => {
    sendMessage(EnvelopeMessageType.REMOVE_MODEL, {});
  };
  
  const onConvertPage = () => {
    sendMessage(EnvelopeMessageType.CONVERT_PAGE, {});
  };
  
  const onViewResults = () => {
    sendMessage(EnvelopeMessageType.VIEW_SIMULATION_RESULTS, {
      documentId: documentContext?.documentId,
      scenarioId: simulation.currentScenarioId
    });
  };
  
  return {
    // Model and document data
    modelName: documentContext?.documentTitle || '',
    documentId: documentContext?.documentId,
    
    // Element data
    currentElement: modelItemData,
    lastElementUpdate: selection.lastUpdated?.toString(),
    diagramElementType: selectedElement?.diagramElementType,
    
    // State data
    validationState,
    simulationStatus: simulation.status,
    referenceData: {
      entities: selection.referenceData?.entities || [],
      resources: selection.referenceData?.resources || []
    },
    
    // UI state
    isLoading,
    needsInitialization,
    
    // Actions
    onElementUpdate,
    onElementTypeChange,
    onValidate,
    onSimulate,
    onRemoveModel,
    onConvertPage,
    onViewResults
  };
}
```

## PanelHeader Component

This component displays the model/element name and provides action buttons.

### Sample Implementation

```tsx
// features/modelPanel/PanelHeader.tsx
import React, { useState } from 'react';
import { SimulationComponentSelector } from '../shared/SimulationComponentSelector';
import { SimulationStatusMonitor } from '../shared/SimulationStatusMonitor';
import { Trash2 } from 'lucide-react';
import { getSimulationState } from '../../utils/simulationState';
import { 
  ValidationState,
  ModelItemData,
  DiagramElementType,
  SimulationObjectType
} from '@quodsi/shared';
import { SimulationStatus } from '../../types/SimulationStatus';

interface PanelHeaderProps {
  modelName: string;
  validationState: ValidationState | null;
  currentElement: ModelItemData | null;
  onValidate: () => void;
  onSimulate?: (scenarioName?: string) => void;
  onRemoveModel?: () => void;
  onElementTypeChange: (elementId: string, newType: SimulationObjectType) => void;
  diagramElementType?: DiagramElementType;
  simulationStatus?: SimulationStatus;
  onViewResults?: () => void;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({
  modelName,
  validationState,
  currentElement,
  onValidate,
  onSimulate,
  onRemoveModel,
  onElementTypeChange,
  diagramElementType,
  simulationStatus,
  onViewResults
}) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [scenarioName, setScenarioName] = useState('New Scenario');
  
  // Handler implementations similar to original Header component
  // ...
  
  return (
    <div className="p-2 space-y-2 border-b">
      {/* Header content similar to original */}
    </div>
  );
};
```

## ElementEditor Component

This component provides editing capability for different element types.

### Sample Implementation

```tsx
// features/modelPanel/ElementEditor.tsx
import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { SimulationObjectType, EditorReferenceData } from '@quodsi/shared';
import { ActivityEditor } from '../editors/ActivityEditor';
import { GeneratorEditor } from '../editors/GeneratorEditor';
import { ResourceEditor } from '../editors/ResourceEditor';
import { EntityEditor } from '../editors/EntityEditor';
import { ConnectorEditor } from '../editors/ConnectorEditor';
import { ModelEditor } from '../editors/ModelEditor';

interface ElementEditorProps {
  elementType: SimulationObjectType | 'Model';
  elementData: any;
  onSave: (data: any) => void;
  referenceData: EditorReferenceData;
  isExpanded: boolean;
  onToggle: () => void;
}

export const ElementEditor: React.FC<ElementEditorProps> = ({
  elementType,
  elementData,
  onSave,
  referenceData,
  isExpanded,
  onToggle
}) => {
  // Editor rendering logic similar to original
  // ...
  
  return (
    <div className="border-b">
      {/* Editor content similar to original */}
    </div>
  );
};
```

## ValidationPanel Component

This component displays validation messages for the model or selected element.

### Sample Implementation

```tsx
// features/modelPanel/ValidationPanel.tsx
import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ValidationState } from '@quodsi/shared';

interface ValidationPanelProps {
  validationState: ValidationState | null;
  currentElementId?: string;
  isExpanded: boolean;
  onToggle: () => void;
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({
  validationState,
  currentElementId,
  isExpanded,
  onToggle
}) => {
  // Message filtering and display logic
  // ...
  
  return (
    <div className="border-b">
      {/* Validation content similar to original */}
    </div>
  );
};
```

## SimulationControls Component

This component provides simulation control and status display.

### Sample Implementation

```tsx
// features/modelPanel/SimulationControls.tsx
import React from 'react';
import { SimulationStatus } from '../../types/SimulationStatus';

interface SimulationControlsProps {
  status: SimulationStatus;
  onSimulate: (scenarioName?: string) => void;
  onViewResults?: () => void;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  status,
  onSimulate,
  onViewResults
}) => {
  // Simulation control logic
  // ...
  
  return (
    <div className="space-y-2">
      {/* Simulation controls similar to original */}
    </div>
  );
};
```

## Shared Components

### AccordionSection

```tsx
// features/shared/AccordionSection.tsx
import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface AccordionSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export const AccordionSection: React.FC<AccordionSectionProps> = ({
  title,
  isExpanded,
  onToggle,
  children
}) => {
  return (
    <div className="border-b">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
      >
        <span className="font-medium text-sm">{title}</span>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      {isExpanded && <div className="p-3 border-t">{children}</div>}
    </div>
  );
};
```

### SimulationComponentSelector

```tsx
// features/shared/SimulationComponentSelector.tsx
import React from 'react';
import { SimulationObjectType, DiagramElementType } from '@quodsi/shared';

interface SimulationComponentSelectorProps {
  elementId: string;
  selectedType: SimulationObjectType;
  diagramElementType?: DiagramElementType;
  onTypeChange: (newType: SimulationObjectType, elementId: string) => void;
}

export const SimulationComponentSelector: React.FC<SimulationComponentSelectorProps> = ({
  elementId,
  selectedType,
  diagramElementType,
  onTypeChange
}) => {
  // Component type selection logic
  // ...
  
  return (
    <div className="flex flex-col space-y-2">
      {/* Component selector content */}
    </div>
  );
};
```

## Integration with LucidApp

```tsx
// components/LucidApp.tsx (updated)
import React from 'react';
import { ModelPanel } from '../features/modelPanel/ModelPanel';
import { useMessaging } from '../messaging/useMessaging';
import { AuthPanel } from './auth/AuthPanel';

interface LucidAppProps {
  panelType?: 'auth' | 'model';
}

export const LucidApp: React.FC<LucidAppProps> = ({ 
  panelType = 'model' 
}) => {
  const { auth } = useMessaging();
  
  // Auth panel content
  if (panelType === 'auth') {
    return (
      <div className="lucid-app">
        <div className="new-messaging-header bg-amber-300 mb-2 p-1 text-center font-bold">
          New Messaging Implementation
        </div>
        <AuthPanel />
      </div>
    );
  }
  
  // Model panel content - use the new ModelPanel component
  return (
    <div className="lucid-app">
      <div className="new-messaging-header bg-amber-300 mb-2 p-1 text-center font-bold">
        New Messaging Implementation
      </div>
      
      <ModelPanel />
      
      {/* Debug tools - can be kept during development */}
    </div>
  );
};
```
