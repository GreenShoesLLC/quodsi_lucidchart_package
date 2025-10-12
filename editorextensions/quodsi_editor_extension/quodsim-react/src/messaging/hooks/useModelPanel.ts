import { useMessaging } from '../MessageProvider';
import { transformToModelItemData } from '../mappers/modelItem.mapper';
import { transformToValidationState } from '../mappers/validation.mapper';
import { JsonObject, SimulationObjectType, DiagramElementType } from '@quodsi/shared';
import { useModelOpsSender } from '../senders/modelOpsSender';
import { useSimulationSender } from '../senders/simulationSender';
import { SimulationStatus } from '../../types/SimulationStatus';
import { debugService } from '../utils/debugService';

import { ExtendedModelItemData } from '../../types/ModelItemData';

// Create component-specific logger
const logger = debugService.forComponent('useModelPanel');

/**
 * Custom hook that brings together all the data and actions needed for the ModelPanel component.
 * Transforms data from the messaging system format to the format expected by UI components.
 * 
 * @returns An object containing all data and actions needed by the ModelPanel
 */
export function useModelPanel() {
  const messagingState = useMessaging();
  const { 
    selection, 
    validation, 
    simulation,
    app: { initialized }
  } = messagingState;
  
  // Enhanced logging for debugging messaging state
  logger.debug('Full messaging state overview:', {
    hasSelection: !!selection,
    hasValidation: !!validation,
    hasSimulation: !!simulation,
    isInitialized: initialized,
    selectionElementsCount: selection?.selectedElements?.length || 0,
    hasDocumentContext: !!selection?.documentContext
  });
  
  // Get sender hooks
  const modelOpsSender = useModelOpsSender();
  const simulationSender = useSimulationSender();

  // Extract document context safely with detailed logging
  const documentContext = selection.documentContext || {
    documentId: '',
    pageId: '',
    documentTitle: '',
    isQuodsiModel: false,
    totalElements: 0
  };

  logger.debug('Document context (raw):', selection.documentContext);
  logger.debug('Document context (with fallback):', documentContext);
  logger.debug('Selection state details:', {
    selectedElements: selection.selectedElements,
    selectedCount: selection.selectedElements?.length,
    hasDocContext: !!selection.documentContext,
    lastUpdated: selection.lastUpdated,
    firstElementId: selection.selectedElements?.[0]?.id,
    firstElementType: selection.selectedElements?.[0]?.type
  });
  
  // Log if we're using the fallback document context
  if (!selection.documentContext) {
    logger.warn('Using fallback document context - original is undefined/null');
  }
  
  // Extract current element based on appropriate case
  let modelItemData: ExtendedModelItemData | null = null;
  
  if (selection.selectedElements && selection.selectedElements.length > 0) {
    // If elements are selected, use the first one
    const selectedElement = selection.selectedElements[0];
    logger.debug('Using selected element (before transform):', selectedElement);
    modelItemData = transformToModelItemData(selectedElement);
    logger.debug('Transformed modelItemData result:', modelItemData);
  } else if (documentContext.isQuodsiModel) {
    // If no element is selected but we have a Quodsi model, 
    // check if we have modelItemData in the metadata
    if (documentContext.metadata?.modelItemData) {
      logger.debug('Using modelItemData from metadata:', documentContext.metadata.modelItemData);
      modelItemData = documentContext.metadata.modelItemData;
    } else {
      // Create a Model element from the page - similar to buildModelItemData in old code
      logger.debug('Creating Model element from page');
      
      modelItemData = {
        id: documentContext.documentId,
        data: {}, // Empty data object for now
        metadata: {
          type: SimulationObjectType.Model,
          version: '1.0',
          lastModified: new Date().toISOString(),
          id: documentContext.documentId
        },
        name: documentContext.documentTitle || 'Untitled Model'
      };
      
      logger.debug('Created Model element:', modelItemData);
    }
  }
  
  // Log important flags about modelItemData
  if (modelItemData) {
    logger.debug('ModelItemData details:', {
      id: modelItemData.id,
      name: modelItemData.name,
      hasData: !!modelItemData.data,
      hasMetadata: !!modelItemData.metadata,
      metadataType: modelItemData.metadata?.type,
      hasQMeta: !!modelItemData.q_meta,
      qMetaType: modelItemData.q_meta?.type,
      isUnconverted: modelItemData.isUnconverted
    });
  } else {
    logger.warn('No modelItemData created or found');
  }
  
  // Transform validation data
  const validationState = transformToValidationState(validation.errors ? {
    summary: {
      errorCount: validation.errors.filter(e => e.severity === 'error').length,
      warningCount: validation.errors.filter(e => e.severity === 'warning').length
    },
    messages: validation.errors.map(e => ({
      type: e.severity,
      message: e.message,
      elementId: e.elementId,
      code: e.id
    }))
  } : null);
  
  // Determine loading and initialization states with enhanced logging
  const isLoading = !initialized || !documentContext;
  const needsInitialization = documentContext 
    ? !documentContext.isQuodsiModel 
    : false;
    
  logger.debug('UI State determination:', {
    isLoading,
    needsInitialization,
    initialized,
    hasDocumentContext: !!documentContext,
    isQuodsiModel: documentContext?.isQuodsiModel
  });
  
  // Create action handlers using the sender hooks
  const onElementUpdate = (elementId: string, data: JsonObject) => {
    logger.log(`Updating element ${elementId} with data:`, data);
    
    // For model type, we need special handling
    if (modelItemData?.metadata?.type === SimulationObjectType.Model) {
      logger.log('Updating model properties');
      // Use the model update method
      modelOpsSender.updateElementData(elementId, 'Model', data);
    } else {
      // For regular elements
      const type = modelItemData?.metadata?.type as string || '';
      modelOpsSender.updateElementData(elementId, type, data);
    }
  };
  
  const onElementTypeChange = (elementId: string, newType: SimulationObjectType) => {
    logger.log(`Changing element ${elementId} to type ${newType}`);
    modelOpsSender.convertElement(elementId, newType);
  };
  
  const onValidate = () => {
    logger.log('Validating model');
    modelOpsSender.validateModel(documentContext.documentId);
  };
  
  const onSimulate = (scenarioName?: string) => {
    logger.log(`Simulating model with scenario name: ${scenarioName}`);
    simulationSender.requestSimulation(documentContext.documentId, scenarioName);
  };
  
  const onRemoveModel = () => {
    logger.log('Removing model');
    modelOpsSender.removeModel(documentContext.documentId);
  };
  
  const onConvertPage = () => {
    logger.log('Converting page to Quodsi model');
    modelOpsSender.convertPage();
  };
  
  const onViewResults = () => {
    logger.log('Viewing simulation results');
    simulationSender.viewResults(documentContext.documentId, simulation.jobId);
  };
  
  // Use reference data from selection state or provide empty default
  const referenceData = selection.referenceData || {
    activities: [],
    entities: [],
    resources: [],
    resourceRequirements: []
  };
  
  // Debug log the reference data to track the fix
  logger.debug('Reference data from selection state:', {
    hasReferenceData: !!selection.referenceData,
    activitiesCount: referenceData.activities?.length || 0,
    resourcesCount: referenceData.resources?.length || 0,
    entitiesCount: referenceData.entities?.length || 0,
    resourceRequirementsCount: referenceData.resourceRequirements?.length || 0,
    connectorsCount: referenceData.connectors?.length || 0
  });

  // Extract outgoing connectors from selection state
  const outgoingConnectors = selection.outgoingConnectors || [];
  logger.debug('Outgoing connectors from selection state:', {
    count: outgoingConnectors.length,
    connectors: outgoingConnectors
  });
  
  // Convert the string diagramElementType to the proper enum value if possible
  let typedDiagramElementType = DiagramElementType.BLOCK; // Default to BLOCK
  if (selection.selectedElements?.[0]?.type) {
    // Convert string type to DiagramElementType enum
    const elementType = selection.selectedElements[0].type.toLowerCase();
    if (elementType === 'block') {
      typedDiagramElementType = DiagramElementType.BLOCK;
      logger.debug('Detected BLOCK diagram element type');
    } else if (elementType === 'line') {
      typedDiagramElementType = DiagramElementType.LINE;
      logger.debug('Detected LINE diagram element type');
    }
  }
  
  // Ensure the modelItemData has a proper type value if needed
  if (modelItemData && (!modelItemData.metadata?.type || modelItemData.metadata.type === SimulationObjectType.None)) {
    // First check if q_meta contains type information
    if (modelItemData.q_meta && modelItemData.q_meta.type) {
      logger.debug('Using q_meta type:', modelItemData.q_meta.type);
      modelItemData.metadata = modelItemData.metadata || {
        type: SimulationObjectType.None,
        version: '1.0',
        lastModified: new Date().toISOString(),
        id: modelItemData.id
      };
      modelItemData.metadata.type = modelItemData.q_meta.type as SimulationObjectType;
    }
    // Only if no q_meta, then use diagram type to determine Connector (but not Activity)
    else if (typedDiagramElementType === DiagramElementType.LINE) {
      logger.debug('Setting missing type to Connector for line element');
      modelItemData.metadata = modelItemData.metadata || {
        type: SimulationObjectType.None,
        version: '1.0',
        lastModified: new Date().toISOString(),
        id: modelItemData.id
      };
      modelItemData.metadata.type = SimulationObjectType.Connector;
    }
    // Do not automatically set Activity for blocks - allow user to choose
  }
  
  // Create a proxy SimulationStatus object to match the expected interface
  // This transforms from the state SimulationStatus to the component SimulationStatus
  const simulationStatusProxy: SimulationStatus = {
    pageStatus: null,  // We don't have this in the state
    isPollingSimState: false,  // Default value
    errorMessage: simulation.error || null,
    lastChecked: simulation.lastUpdated ? new Date(simulation.lastUpdated).toISOString() : null,
    newResultsAvailable: false  // Default value
  };
  
  // Create the return values object for logging
  const returnValues = {
    // Model and document data
    modelName: documentContext.documentTitle || '',
    documentId: documentContext.documentId,
    
    // Element data
    currentElement: modelItemData, // Log the full object
    currentElementId: modelItemData?.id,
    currentElementType: modelItemData?.metadata?.type,
    lastElementUpdate: selection.lastUpdated?.toString(),
    diagramElementType: typedDiagramElementType,
    
    // UI state
    isLoading,
    needsInitialization,
    isQuodsiModel: documentContext?.isQuodsiModel
  };
  
  logger.debug('Final return values (key properties):', returnValues);
  
  return {
    // Model and document data
    modelName: documentContext.documentTitle || '',
    documentId: documentContext.documentId,

    // Element data
    currentElement: modelItemData as ExtendedModelItemData,
    lastElementUpdate: selection.lastUpdated?.toString(),
    diagramElementType: typedDiagramElementType,

    // State data
    validationState,
    simulationStatus: simulationStatusProxy,
    referenceData,
    states: selection.states || [],
    resourceRequirements: selection.resourceRequirements || [],
    outgoingConnectors,

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
