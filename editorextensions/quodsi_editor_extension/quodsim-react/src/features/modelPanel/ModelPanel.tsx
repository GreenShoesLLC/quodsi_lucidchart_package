import React, { useState, useEffect, useMemo } from 'react';
import { useModelPanel } from '../../messaging/hooks/useModelPanel';
import { useModelOpsSender } from '../../messaging/senders/modelOpsSender';
import { PanelHeader } from './PanelHeader';
import { ElementEditor } from './ElementEditor';
import { ValidationPanel } from './ValidationPanel';
import { SimulationControls } from './SimulationControls';
import { SimulationObjectType, DiagramElementType, StateListManager, State, ComponentType, StateType } from '@quodsi/shared';
import { ExtendedModelItemData } from '../../types/ModelItemData';

/**
 * The main ModelPanel component that serves as the container for the model panel UI.
 * This component orchestrates the state and composition of child components.
 */
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
    simulationStatus,
    states: serializedStates,
    resourceRequirements: serializedResourceRequirements,
    outgoingConnectors,
    // Actions
    onElementUpdate,
    onElementTypeChange,
    onValidate,
    onSimulate,
    onRemoveModel,
    onConvertPage,
    onViewResults
  } = useModelPanel();

  // Get message sender for states
  const { updateStates: sendStatesUpdate } = useModelOpsSender();

  // Local UI state for accordion sections
  const [expandedSections, setExpandedSections] = useState({
    elementEditor: true, // Always start with element editor expanded
    validation: !!validationState?.summary?.errorCount,
    simulation: false
  });

  // Convert serialized states to StateListManager using useMemo to avoid recreating on every render
  const states = useMemo(() => {
    const stateListManager = new StateListManager();

    // Deserialize and add each state
    if (serializedStates && serializedStates.length > 0) {
      serializedStates.forEach((serializedState: any) => {
        const state = new State(
          serializedState.id,
          serializedState.name,
          serializedState.componentType as ComponentType,
          serializedState.dataType as StateType,
          serializedState.initialValue,
          {
            categoryValues: serializedState.categoryValues,
            description: serializedState.description,
            collectStatistics: serializedState.collectStatistics
          }
        );
        stateListManager.add(state);
      });
    }

    return stateListManager;
  }, [serializedStates]);

  const handleStatesChange = (updatedStates: StateListManager) => {
    // Serialize states and send to extension
    const serializedStates = updatedStates.getAll().map(state => ({
      id: state.id,
      name: state.name,
      componentType: state.componentType,
      dataType: state.dataType,
      initialValue: state.initialValue,
      categoryValues: state.categoryValues,
      description: state.description,
      collectStatistics: state.collectStatistics
    }));

    sendStatesUpdate(serializedStates);

    if (isDevelopment) {
      console.log('[ModelPanel] States updated and sent to extension:', serializedStates);
    }
  };

  // Only show debug features in development
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Toggle accordion sections
  const toggleSection = (section: keyof typeof expandedSections) => {
    if (isDevelopment) {
      console.log(`[ModelPanel] Toggling section: ${section}`);
    }
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Log important state changes for debugging (development only)
  useEffect(() => {
    if (isDevelopment) {
      console.log('[ModelPanel] Component mounted');
      return () => console.log('[ModelPanel] Component unmounted');
    }
  }, [isDevelopment]);
  
  // Log all key prop changes for better debugging (development only)
  useEffect(() => {
    if (isDevelopment) {
      console.log('[ModelPanel] Render with key props:', {
        modelName,
        hasCurrentElement: !!currentElement,
        currentElementId: currentElement?.id,
        currentElementType: currentElement?.metadata?.type,
        hasValidation: !!validationState,
        validationErrors: validationState?.summary?.errorCount,
        validationWarnings: validationState?.summary?.warningCount,
        isLoading,
        needsInitialization,
        diagramElementType,
        simulationStatus: simulationStatus ? {
          errorMessage: simulationStatus.errorMessage,
          lastChecked: simulationStatus.lastChecked
        } : null
      });
    }
  }, [modelName, currentElement, validationState, isLoading, needsInitialization, diagramElementType, simulationStatus, isDevelopment]);

  useEffect(() => {
    if (isDevelopment) {
      console.log('[ModelPanel] Model or selection changed - DETAILED:', {
        modelName,
        hasCurrentElement: !!currentElement,
        currentElementId: currentElement?.id,
        currentElementType: currentElement?.metadata?.type,
        elementType: currentElement?.type,  // Direct type property
        metadata: currentElement?.metadata,
        metadataType: currentElement?.metadata?.type,
        q_meta: currentElement?.q_meta,
        qMetaType: currentElement?.q_meta?.type,
        isModelType: currentElement?.metadata?.type === SimulationObjectType.Model,
        diagramElementType,
        isUnconverted: currentElement?.isUnconverted
      });
    }
    
    // Handle element type issues (keep this logic for functionality)
    if (currentElement && (!currentElement.metadata?.type || currentElement.metadata.type === SimulationObjectType.None)) {
      if (isDevelopment) {
        console.warn('[ModelPanel] Current element has no valid type:', currentElement);
      }
      
      // Try to check for q_meta type if metadata type is missing
      if (currentElement.q_meta?.type) {
        if (isDevelopment) {
          console.log('[ModelPanel] Using type from q_meta:', currentElement.q_meta.type);
        }
        if (!currentElement.metadata) {
          currentElement.metadata = {
            type: SimulationObjectType.None,
            version: '1.0',
            lastModified: new Date().toISOString(),
            id: currentElement.id
          };
        }
        currentElement.metadata.type = currentElement.q_meta.type as SimulationObjectType;
      }
      // Only if we don't have metadata or q_meta, then auto-map line to connector
      else if (diagramElementType === DiagramElementType.LINE) {
        if (isDevelopment) {
          console.log('[ModelPanel] Setting missing type to Connector for line element');
        }
        currentElement.metadata = currentElement.metadata || {
          type: SimulationObjectType.None,
          version: '1.0',
          lastModified: new Date().toISOString(),
          id: currentElement.id
        };
        currentElement.metadata.type = SimulationObjectType.Connector;
      }
      // For blocks, we do not automatically assign Activity type
      // Leave it to the user to select the appropriate type
    }
  }, [modelName, currentElement, diagramElementType, isDevelopment]);

  // Debug UI state decision making (development only)
  if (isDevelopment) {
    console.log('[ModelPanel] UI state decision:', {
      needsInitialization,
      isLoading,
      hasContent: !!(modelName || currentElement),
      renderingInitializationScreen: needsInitialization,
      renderingLoadingScreen: isLoading,
      renderingNoContentScreen: !needsInitialization && !isLoading && !(modelName || currentElement),
      renderingMainContent: !needsInitialization && !isLoading && !!(modelName || currentElement)
    });
  }
  
  // Handle initialization state
  if (needsInitialization) {
    return (
      <div className="h-full w-full flex items-center justify-center p-8 bg-gray-50 overflow-auto">
        <div className="text-center p-8 bg-white rounded-lg shadow-md border border-gray-200 max-w-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Initialize Model</h2>
          <p className="text-gray-600 mb-6">Create a new Quodsi simulation model from this document.</p>
          <button
            className="px-5 py-2.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm font-medium"
            onClick={onConvertPage}
          >
            Initialize Quodsi Model
          </button>
        </div>
      </div>
    );
  }

  // Handle loading state
  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center p-8 bg-gray-50 overflow-auto">
        <div className="text-center bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-center space-x-2">
            <div className="inline-block animate-pulse rounded-full h-3 w-3 bg-blue-600"></div>
            <div className="inline-block animate-pulse rounded-full h-3 w-3 bg-blue-600 animation-delay-150"></div>
            <div className="inline-block animate-pulse rounded-full h-3 w-3 bg-blue-600 animation-delay-300"></div>
          </div>
          <span className="mt-3 block text-gray-600 font-medium">Initializing...</span>
        </div>
      </div>
    );
  }

  // Check if we have any content to display - should always have content if isQuodsiModel is true
  const hasContent = modelName || currentElement;
  
  if (!hasContent) {
    return (
      <div className="h-full w-full flex items-center justify-center p-8 bg-gray-50 overflow-auto">
        <div className="text-center bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-gray-400 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
          </div>
          <span className="text-gray-600 font-medium">No model or element selected</span>
          <p className="text-gray-500 text-sm mt-2">Select an element in the diagram to view its properties</p>
        </div>
      </div>
    );
  }

  // Determine if the current element is the Model itself
  const isModelElement = currentElement?.metadata?.type === SimulationObjectType.Model;

  // Main content render
  return (
    <div className="flex flex-col h-full bg-white shadow-md rounded-sm overflow-auto border border-gray-200">
      <PanelHeader
        modelName={modelName}
        validationState={validationState}
        currentElement={currentElement}
        onValidate={onValidate}
        onSimulate={onSimulate}
        onRemoveModel={onRemoveModel}
        onElementTypeChange={onElementTypeChange}
        diagramElementType={diagramElementType}
        simulationStatus={simulationStatus}
        onViewResults={onViewResults}
      />
      
      <div className="flex-1 bg-gray-50">
        {/* If current element exists and is either not unconverted or is a Model type */}
        {currentElement && ((!currentElement.isUnconverted) || isModelElement) && (
          <ElementEditor
            elementData={{
              ...currentElement.data,
              id: currentElement.id // Ensure ID is included in elementData
            }}
            elementType={currentElement.metadata?.type || currentElement.q_meta?.type ||
              (diagramElementType === DiagramElementType.LINE ? SimulationObjectType.Connector :
               currentElement.type || SimulationObjectType.None)}
            onSave={data => onElementUpdate(currentElement.id, data)}
            referenceData={referenceData}
            isExpanded={expandedSections.elementEditor}
            onToggle={() => toggleSection('elementEditor')}
            currentElement={currentElement}
            states={states}
            onStatesChange={handleStatesChange}
            resourceRequirements={serializedResourceRequirements}
            outgoingConnectors={outgoingConnectors}
          />
        )}
        
        <ValidationPanel
          validationState={validationState}
          currentElementId={currentElement?.id}
          isExpanded={expandedSections.validation}
          onToggle={() => toggleSection('validation')}
        />
        
        {/* Show simulation controls if we're on a model element */}
        {isModelElement && (
          <SimulationControls
            status={simulationStatus}
            onSimulate={onSimulate}
            onViewResults={onViewResults}
            isExpanded={expandedSections.simulation}
            onToggle={() => toggleSection('simulation')}
          />
        )}
      </div>
    </div>
  );
};
