import { useMessaging } from '../MessageProvider';
import { transformToModelItemData } from '../mappers/modelItem.mapper';
import { transformToValidationState } from '../mappers/validation.mapper';
import { JsonObject, SimulationObjectType, DiagramElementType } from '@quodsi/shared';
import { useModelOpsSender } from '../senders/modelOpsSender';
import { useSimulationSender } from '../senders/simulationSender';
import { SimulationStatus } from '../../types/SimulationStatus';
import { ModelItemData } from '@quodsi/shared';

/**
 * Custom hook that brings together all the data and actions needed for the ModelPanel component.
 * Transforms data from the messaging system format to the format expected by UI components.
 * 
 * @returns An object containing all data and actions needed by the ModelPanel
 */
export function useModelPanel() {
  const { 
    selection, 
    validation, 
    simulation,
    app: { initialized }
  } = useMessaging();
  
  // Get sender hooks
  const modelOpsSender = useModelOpsSender();
  const simulationSender = useSimulationSender();

  // Extract document context safely
  const documentContext = selection.documentContext || {
    documentId: '',
    pageId: '',
    documentTitle: '',
    isQuodsiModel: false,
    totalElements: 0
  };

  console.log('[useModelPanel] Document context:', documentContext);
  console.log('[useModelPanel] Selection state:', selection);
  
  // Extract current element based on appropriate case
  let modelItemData: ModelItemData | null = null;
  
  if (selection.selectedElements && selection.selectedElements.length > 0) {
    // If elements are selected, use the first one
    const selectedElement = selection.selectedElements[0];
    console.log('[useModelPanel] Using selected element:', selectedElement);
    modelItemData = transformToModelItemData(selectedElement);
  } else if (documentContext.isQuodsiModel) {
    // If no element is selected but we have a Quodsi model, 
    // check if we have modelItemData in the metadata
    if (documentContext.metadata?.modelItemData) {
      console.log('[useModelPanel] Using modelItemData from metadata:', documentContext.metadata.modelItemData);
      modelItemData = documentContext.metadata.modelItemData;
    } else {
      // Create a Model element from the page - similar to buildModelItemData in old code
      console.log('[useModelPanel] Creating Model element from page');
      
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
      
      console.log('[useModelPanel] Created Model element:', modelItemData);
    }
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
  
  // Determine loading and initialization states
  const isLoading = !initialized || !documentContext;
  const needsInitialization = documentContext 
    ? !documentContext.isQuodsiModel 
    : false;
  
  // Create action handlers using the sender hooks
  const onElementUpdate = (elementId: string, data: JsonObject) => {
    console.log(`[useModelPanel] Updating element ${elementId} with data:`, data);
    
    // For model type, we need special handling
    if (modelItemData?.metadata?.type === SimulationObjectType.Model) {
      console.log('[useModelPanel] Updating model properties');
      // Use the model update method
      modelOpsSender.updateElementData(elementId, 'Model', data);
    } else {
      // For regular elements
      const type = modelItemData?.metadata?.type as string || '';
      modelOpsSender.updateElementData(elementId, type, data);
    }
  };
  
  const onElementTypeChange = (elementId: string, newType: SimulationObjectType) => {
    console.log(`[useModelPanel] Changing element ${elementId} to type ${newType}`);
    modelOpsSender.convertElement(elementId, newType);
  };
  
  const onValidate = () => {
    console.log('[useModelPanel] Validating model');
    modelOpsSender.validateModel(documentContext.documentId);
  };
  
  const onSimulate = (scenarioName?: string) => {
    console.log(`[useModelPanel] Simulating model with scenario name: ${scenarioName}`);
    simulationSender.requestSimulation(documentContext.documentId, scenarioName);
  };
  
  const onRemoveModel = () => {
    console.log('[useModelPanel] Removing model');
    modelOpsSender.removeModel(documentContext.documentId);
  };
  
  const onConvertPage = () => {
    console.log('[useModelPanel] Converting page to Quodsi model');
    modelOpsSender.convertPage();
  };
  
  const onViewResults = () => {
    console.log('[useModelPanel] Viewing simulation results');
    simulationSender.viewResults(documentContext.documentId, simulation.jobId);
  };
  
  // Use an empty default for reference data
  const referenceData = {
    entities: [],
    resources: []
  };
  
  // Convert the string diagramElementType to the proper enum value if possible
  let typedDiagramElementType: DiagramElementType | undefined;
  if (selection.selectedElements?.[0]?.type) {
    // Convert string type to DiagramElementType enum
    if (selection.selectedElements[0].type.toLowerCase() === 'block') {
      typedDiagramElementType = DiagramElementType.BLOCK;
    } else if (selection.selectedElements[0].type.toLowerCase() === 'line') {
      typedDiagramElementType = DiagramElementType.LINE;
    }
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
  
  return {
    // Model and document data
    modelName: documentContext.documentTitle || '',
    documentId: documentContext.documentId,
    
    // Element data
    currentElement: modelItemData,
    lastElementUpdate: selection.lastUpdated?.toString(),
    diagramElementType: typedDiagramElementType,
    
    // State data
    validationState,
    simulationStatus: simulationStatusProxy,
    referenceData,
    
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
