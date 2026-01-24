import React, { useState, useEffect, useMemo } from 'react';
import { useModelPanel } from '../../messaging/hooks/useModelPanel';
import { useConversionPreview } from '../../messaging/hooks/useConversionPreview';
import { useModelOpsSender } from '../../messaging/senders/modelOpsSender';
import { PanelHeader } from './PanelHeader';
import { ElementEditor } from './ElementEditor';
import { ConversionPreviewPanel } from '../conversionPreview/ConversionPreviewPanel';
import { SimulationObjectType, DiagramElementType, StateListManager, State, ComponentType, StateType, ISerializedTimePattern, ISerializedTimeDistributedConfig, EnvelopeMessageType, EnvelopeBase } from '@quodsi/shared';
import { ExtendedModelItemData } from '../../types/ModelItemData';
import { getSimulationObjectType } from '../../utils/typeDetection';
import { EditorTab } from '../editors/ModelEditor';
import { ModelDefinitionViewer } from './ModelDefinitionViewer';
import { useMessaging } from '../../messaging/MessageProvider';
import { consumePendingModelEditorTab } from '../../utils/pendingNavigation';

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

  // Get message senders
  const {
    updateStates: sendStatesUpdate,
    updateTimePatterns: sendTimePatternsUpdate,
    updateTimeDistributedConfigs: sendTimeDistributedConfigsUpdate,
    requestModelJson
  } = useModelOpsSender();

  // Get selection context for documentId
  const { selection } = useMessaging();

  // Get conversion preview state and actions
  const {
    isVisible: isPreviewVisible,
    isApplying,
    openPreview,
    applyDefaults
  } = useConversionPreview();

  // Tab state management for ModelEditor
  const [activeTab, setActiveTab] = useState<EditorTab>("basic");

  // Check for pending navigation tab when showing a Model element
  useEffect(() => {
    if (currentElement) {
      const elementType = getSimulationObjectType(
        currentElement.metadata?.type || currentElement.q_meta?.type || currentElement.type,
        currentElement,
        currentElement.data
      );

      // Only consume pending tab when showing Model editor
      if (elementType === SimulationObjectType.Model) {
        const pendingTab = consumePendingModelEditorTab();
        if (pendingTab) {
          setActiveTab(pendingTab);
        }
      }
    }
  }, [currentElement]);

  // State for Model JSON viewer modal
  const [isModelViewerOpen, setIsModelViewerOpen] = useState(false);
  const [modelJson, setModelJson] = useState<object | null>(null);

  // Wrap onSimulate to auto-switch to scenarios tab after simulation starts
  const handleSimulate = (scenarioName?: string) => {
    onSimulate(scenarioName);
    setActiveTab("scenarios");
  };

  // Handler for viewing model JSON
  const handleViewModelJson = () => {
    requestModelJson(selection.documentContext?.documentId || '');
  };

  // Listen for MODEL_JSON_RESPONSE
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data as EnvelopeBase;

      if (msg?.type === EnvelopeMessageType.MODEL_JSON_RESPONSE) {
        const data = msg.data as {
          success: boolean;
          modelJson?: any;
          error?: string;
        };

        if (data.success && data.modelJson) {
          setModelJson(data.modelJson);
          setIsModelViewerOpen(true);
        } else {
          console.error('[ModelPanel] Failed to get model JSON:', data.error);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

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
  };

  const handleTimePatternsChange = (updatedTimePatterns: ISerializedTimePattern[]) => {
    // Time patterns are already in serialized format, send directly to extension
    sendTimePatternsUpdate(updatedTimePatterns);
  };

  const handleTimeDistributedConfigsChange = (updatedConfigs: ISerializedTimeDistributedConfig[]) => {
    // Time distributed configs are already in serialized format, send directly to extension
    sendTimeDistributedConfigsUpdate(updatedConfigs);
  };

  useEffect(() => {
    // Handle element type issues
    if (currentElement && (!currentElement.metadata?.type || currentElement.metadata.type === SimulationObjectType.None)) {
      // Try to check for q_meta type if metadata type is missing
      if (currentElement.q_meta?.type) {
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
  
  // Show conversion preview panel when visible
  if (isPreviewVisible) {
    return <ConversionPreviewPanel onRemoveModel={onRemoveModel} />;
  }

  // Handle initialization state
  if (needsInitialization) {
    return (
      <div className="h-full w-full flex items-center justify-center p-4 bg-gray-50 overflow-auto">
        <div className="text-center p-5 bg-white rounded-lg shadow-md border border-gray-200 max-w-md">
          <h3 className="text-xl font-semibold text-gray-800 mb-5">
            Transform diagram into Simulation Model
          </h3>
          <button
            className="px-5 py-2.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-sm font-medium disabled:opacity-50"
            onClick={applyDefaults}
            disabled={isApplying}
          >
            {isApplying ? 'Converting...' : 'Convert Automatically'}
          </button>
          <p className="text-gray-500 text-sm mt-3">
            Uses Quodsi's best-practice assumptions.<br />
            You can edit everything later.
          </p>
          <div className="mt-5 pt-3 border-t border-gray-200">
            <button
              className="text-blue-600 hover:text-blue-800 text-sm hover:underline"
              onClick={openPreview}
            >
              Review & Convert: Preview, edit and convert
            </button>
          </div>
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
        onSimulate={handleSimulate}
        onRemoveModel={onRemoveModel}
        onOpenDiagramMapping={openPreview}
        onElementTypeChange={onElementTypeChange}
        diagramElementType={diagramElementType}
        simulationStatus={simulationStatus}
        onViewResults={onViewResults}
        referenceData={referenceData}
        onViewModelJson={handleViewModelJson}
      />

      <div className="flex-1 bg-gray-50 overflow-auto">
        {/* If current element exists and is either not unconverted or is a Model type */}
        {currentElement && ((!currentElement.isUnconverted) || isModelElement) && (
          <ElementEditor
            elementData={{
              ...currentElement.data,
              id: currentElement.id // Ensure ID is included in elementData
            }}
            elementType={getSimulationObjectType(
              currentElement.metadata?.type || currentElement.q_meta?.type || currentElement.type,
              currentElement,
              currentElement.data
            )}
            onSave={data => onElementUpdate(currentElement.id, data)}
            onRemoveModel={onRemoveModel}
            onValidate={onValidate}
            referenceData={referenceData}
            currentElement={currentElement}
            states={states}
            onStatesChange={handleStatesChange}
            resourceRequirements={serializedResourceRequirements}
            outgoingConnectors={outgoingConnectors}
            validationState={validationState}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onTimePatternsChange={handleTimePatternsChange}
            onTimeDistributedConfigsChange={handleTimeDistributedConfigsChange}
          />
        )}
      </div>

      {/* Model Definition Viewer Modal */}
      {isModelViewerOpen && modelJson && (
        <ModelDefinitionViewer
          modelJson={modelJson}
          onClose={() => setIsModelViewerOpen(false)}
        />
      )}
    </div>
  );
};
