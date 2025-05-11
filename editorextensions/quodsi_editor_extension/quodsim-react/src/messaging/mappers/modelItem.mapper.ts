import { ModelItemData, SimulationObjectType, DiagramElementType } from "@quodsi/shared";
import { ElementShape } from "@quodsi/shared";
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
        version: element.metadata.version || '1.0',
        lastModified: element.metadata.lastModified || new Date().toISOString(),
        id: element.id,
        isUnconverted: element.metadata.isUnconverted
      },
      name: element.name || `Item ${element.id}`,
      isUnconverted: element.isUnconverted,
      q_meta: element.q_meta || element.userData?.q_meta || null
    };
  }
  
  // Check for LucidChart specific q_meta and q_data properties
  if (element.q_meta || element.userData?.q_meta) {
    let q_meta = element.q_meta ? element.q_meta : element.userData?.q_meta;
    let q_data = element.q_data ? element.q_data : element.userData?.q_data;
    
    // Parse q_meta if it's a string
    if (typeof q_meta === 'string') {
      try {
        q_meta = JSON.parse(q_meta);
        debugService.debug('[transformToModelItemData] Parsed q_meta from string:', q_meta);
      } catch (error) {
        debugService.debug('[transformToModelItemData] Failed to parse q_meta string:', error);
      }
    }
    
    // Parse q_data if it's a string
    if (typeof q_data === 'string') {
      try {
        q_data = JSON.parse(q_data);
        debugService.debug('[transformToModelItemData] Parsed q_data from string:', q_data);
      } catch (error) {
        debugService.debug('[transformToModelItemData] Failed to parse q_data string:', error);
      }
    }
    
    // If we have valid q_meta, use it
    if (q_meta && typeof q_meta === 'object' && q_meta.type) {
      debugService.debug('[transformToModelItemData] Using q_meta data for element type:', q_meta.type);
      return {
        id: element.id,
        data: q_data || { id: element.id },
        metadata: {
          type: q_meta.type as SimulationObjectType,
          version: q_meta.version || '1.0',
          lastModified: q_meta.lastModified || new Date().toISOString(),
          id: element.id,
          isUnconverted: false
        },
        name: q_data?.name || element.text || `Item ${element.id}`,
        isUnconverted: false,
        q_meta,
        q_data
      };
    }
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
        version: '1.0',
        lastModified: new Date().toISOString(),
        id: element.id,
        isUnconverted: false // Default to false
      },
      name: element.text || `Item ${element.id}`,
      isUnconverted: false,
      q_meta: element.q_meta || element.userData?.q_meta || null,
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
      version: '1.0',
      lastModified: new Date().toISOString(),
      id: element.id || 'unknown',
      isUnconverted: false
    },
    name: element.text || `Unknown Element`,
    isUnconverted: false,
    q_meta: element.q_meta || element.userData?.q_meta || null,
    q_data: element.q_data || element.userData?.q_data || null,
    type: element.type,
    text: element.text
  };
}