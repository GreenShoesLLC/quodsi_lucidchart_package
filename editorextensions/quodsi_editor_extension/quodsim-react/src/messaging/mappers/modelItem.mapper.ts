import { ModelItemData, SimulationObjectType, DiagramElementType } from "@quodsi/lucid-shared";
import { ElementShape } from "@quodsi/lucid-shared";
import { debugService } from '../utils/debugService';
import { ExtendedModelItemData } from '../../types/ModelItemData';

/**
 * Transforms an element object from the selection message to the ModelItemData format
 * expected by UI components
 * 
 * @param element The element from the selection message
 * @returns ModelItemData formatted object
 */
export function transformToModelItemData(element: ElementShape | any): ExtendedModelItemData {
  debugService.debug('[transformToModelItemData] Processing element:', element);

  // If the element already has the required structure (not an ElementShape from selection), use it directly
  if (element.id && element.data && element.metadata && element.metadata.type) {
    debugService.debug('[transformToModelItemData] Using existing element structure');
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
  debugService.debug('[transformToModelItemData] Diagram element type:', diagramElementType);

  // Map diagram type to simulation object type if not already set in metadata
  let simulationType = SimulationObjectType.None;
  
  // First check if metadata already contains a type
  if (element.metadata && element.metadata.type && element.metadata.type !== SimulationObjectType.None) {
    simulationType = element.metadata.type;
    debugService.debug('[transformToModelItemData] Using type from metadata:', simulationType);
  } 
  // Check if there's a quodsiType in metadata
  else if (element.metadata && element.metadata.quodsiType) {
    simulationType = element.metadata.quodsiType;
    debugService.debug('[transformToModelItemData] Using quodsiType from metadata:', simulationType);
  }
  // Default mapping based on diagram element type - BUT DO NOT AUTOMATICALLY MAP BLOCK TO ACTIVITY
  // Instead log a warning and keep it as None, so the user must explicitly set the type
  else if (diagramElementType === DiagramElementType.BLOCK) {
    // For blocks, we'll leave it as None and warn
    simulationType = SimulationObjectType.None;
    debugService.debug('[transformToModelItemData] Block element without type classification - NOT auto-mapping to Activity');
  } 
  else if (diagramElementType === DiagramElementType.LINE) {
    simulationType = SimulationObjectType.Connector;
    debugService.debug('[transformToModelItemData] Mapping line to Connector');
  }
  
  // Handle ElementShape objects
  if ('type' in element && 'id' in element) {
    debugService.debug('[transformToModelItemData] Processing ElementShape with simulationType:', simulationType);
    
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
  debugService.debug('[transformToModelItemData] Using fallback for unknown format');
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