import React, { useState, useEffect } from 'react';
import { useModelPanel } from '../../messaging/hooks/useModelPanel';
import { PanelHeader } from './PanelHeader';
import { ElementEditor } from './ElementEditor';
import { ValidationPanel } from './ValidationPanel';
import { SimulationControls } from './SimulationControls';
import { SimulationObjectType, DiagramElementType } from '@quodsi/shared';
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
    // Actions
    onElementUpdate,
    onElementTypeChange,
    onValidate,
    onSimulate,
    onRemoveModel,
    onConvertPage,
    onViewResults
  } = useModelPanel();

  // Local UI state for accordion sections
  const [expandedSections, setExpandedSections] = useState({
    elementEditor: true, // Always start with element editor expanded
    validation: !!validationState?.summary?.errorCount,
    simulation: false
  });

  // Toggle accordion sections
  const toggleSection = (section: keyof typeof expandedSections) => {
    console.log(`[ModelPanel] Toggling section: ${section}`);
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Log important state changes for debugging
  useEffect(() => {
    console.log('[ModelPanel] Component mounted');
    return () => console.log('[ModelPanel] Component unmounted');
  }, []);
  
  // Log all key prop changes for better debugging
  useEffect(() => {
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
  }, [modelName, currentElement, validationState, isLoading, needsInitialization, diagramElementType, simulationStatus]);

  useEffect(() => {
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
    
    // Extra debug to check element type issues
    if (currentElement && (!currentElement.metadata?.type || currentElement.metadata.type === SimulationObjectType.None)) {
      console.warn('[ModelPanel] Current element has no valid type:', currentElement);
      
      // Try to check for q_meta type if metadata type is missing
      if (currentElement.q_meta?.type) {
        console.log('[ModelPanel] Using type from q_meta:', currentElement.q_meta.type);
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
        console.log('[ModelPanel] Setting missing type to Connector for line element');
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
  }, [modelName, currentElement, diagramElementType]);

  // Debug UI state decision making
  console.log('[ModelPanel] UI state decision:', {
    needsInitialization,
    isLoading,
    hasContent: !!(modelName || currentElement),
    renderingInitializationScreen: needsInitialization,
    renderingLoadingScreen: isLoading,
    renderingNoContentScreen: !needsInitialization && !isLoading && !(modelName || currentElement),
    renderingMainContent: !needsInitialization && !isLoading && !!(modelName || currentElement)
  });
  
  // Handle initialization state
  if (needsInitialization) {
    console.log('[ModelPanel] Rendering initialization screen');
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
    console.log('[ModelPanel] Rendering loading screen');
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
    console.log('[ModelPanel] Rendering no content screen');
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
  console.log('[ModelPanel] Rendering main content');
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
      
      <div className="flex-1 overflow-auto bg-gray-50">
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
