import { ModelItemData, SimulationObjectType, DiagramElementType, getLogger } from "@quodsi/lucid-shared";
import { ElementShape } from "@quodsi/lucid-shared";
import { ExtendedModelItemData } from '../../types/ModelItemData';

const logger = getLogger('ModelItemMapper');

/**
 * Transforms an element object from the selection message to the ModelItemData format
 * expected by UI components
 * 
 * @param element The element from the selection message
 * @returns ModelItemData formatted object
 */
export function transformToModelItemData(element: ElementShape | any): ExtendedModelItemData {
  logger.debug('Processing element:', element);

  // If the element already has the required structure (not an ElementShape from selection), use it directly
  if (element.id && element.data && element.metadata && element.metadata.type) {
    logger.debug('Using existing element structure');
    return {
      id: element.id,
      data: element.data,
      metadata: {
        type: element.metadata.type,
        id: element.id,
        mappingSource: element.metadata.mappingSource
      },
      name: element.name || `Item ${element.id}`,
      isUnconverted: element.isUnconverted
    };
  }

  // Determine diagram element type
  let diagramElementType = DiagramElementType.BLOCK; // Default to BLOCK
  if ('type' in element) {
    const elementType = (element.type || '').toLowerCase();
    if (elementType === 'block') {
      diagramElementType = DiagramElementType.BLOCK;
    } else if (elementType === 'line') {
      diagramElementType = DiagramElementType.LINE;
    }
  }
  logger.debug('Diagram element type:', diagramElementType);

  // Map diagram type to simulation object type if not already set in metadata
  let simulationType = SimulationObjectType.None;
  
  // First check if metadata already contains a type
  if (element.metadata && element.metadata.type && element.metadata.type !== SimulationObjectType.None) {
    simulationType = element.metadata.type;
    logger.debug('Using type from metadata:', simulationType);
  } 
  // Check if there's a quodsiType in metadata
  else if (element.metadata && element.metadata.quodsiType) {
    simulationType = element.metadata.quodsiType;
    logger.debug('Using quodsiType from metadata:', simulationType);
  }
  // Default mapping based on diagram element type - BUT DO NOT AUTOMATICALLY MAP BLOCK TO ACTIVITY
  // Instead log a warning and keep it as None, so the user must explicitly set the type
  else if (diagramElementType === DiagramElementType.BLOCK) {
    // For blocks, we'll leave it as None and warn
    simulationType = SimulationObjectType.None;
    logger.debug('Block element without type classification - NOT auto-mapping to Activity');
  } 
  else if (diagramElementType === DiagramElementType.LINE) {
    simulationType = SimulationObjectType.Connector;
    logger.debug('Mapping line to Connector');
  }
  
  // Handle ElementShape objects
  if ('type' in element && 'id' in element) {
    logger.debug('Processing ElementShape with simulationType:', simulationType);
    
    return {
      id: element.id,
      data: {
        id: element.id,  // Include ID in the data object
        name: element.text || `Item ${element.id}`
      },
      metadata: {
        type: simulationType,
        id: element.id
      },
      name: element.text || `Item ${element.id}`,
      isUnconverted: false,
      q_data: element.q_data || element.userData?.q_data || null,
      type: element.type,
      text: element.text
    };
  }

  // Fallback for unknown format
  logger.debug('Using fallback for unknown format');
  return {
    id: element.id || 'unknown',
    data: {},
    metadata: {
      type: SimulationObjectType.None,
      id: element.id || 'unknown'
    },
    name: element.text || `Unknown Element`,
    isUnconverted: false,
    q_data: element.q_data || element.userData?.q_data || null,
    type: element.type,
    text: element.text
  };
}