import React, { useState, useEffect } from 'react';
import { useModelPanel } from '../../messaging/hooks/useModelPanel';
import { PanelHeader } from './PanelHeader';
import { ElementEditor } from './ElementEditor';
import { ValidationPanel } from './ValidationPanel';
import { SimulationControls } from './SimulationControls';
import { SimulationObjectType } from '@quodsi/shared';

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

  useEffect(() => {
    console.log('[ModelPanel] Model or selection changed:', {
      modelName,
      hasCurrentElement: !!currentElement,
      currentElementId: currentElement?.id,
      currentElementType: currentElement?.metadata?.type,
      isModelType: currentElement?.metadata?.type === SimulationObjectType.Model
    });
  }, [modelName, currentElement]);

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

  // Check if we have any content to display - should always have content if isQuodsiModel is true
  const hasContent = modelName || currentElement;
  
  if (!hasContent) {
    return (
      <div className="h-full w-full flex items-center justify-center p-4">
        <div className="text-center">
          <span className="text-gray-500">No model or element selected</span>
        </div>
      </div>
    );
  }

  // Determine if the current element is the Model itself
  const isModelElement = currentElement?.metadata?.type === SimulationObjectType.Model;

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
        simulationStatus={simulationStatus}
        onViewResults={onViewResults}
      />
      
      <div className="flex-1 overflow-y-auto">
        {/* If current element exists and is either not unconverted or is a Model type */}
        {currentElement && ((!currentElement.isUnconverted) || isModelElement) && (
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
