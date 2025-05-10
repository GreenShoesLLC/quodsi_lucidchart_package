import { ModelItemData, SimulationObjectType } from "@quodsi/shared";
import { ElementShape } from "@quodsi/shared";

/**
 * Transforms an element object from the selection message to the ModelItemData format
 * expected by UI components
 * 
 * @param element The element from the selection message
 * @returns ModelItemData formatted object
 */
export function transformToModelItemData(element: ElementShape | any): ModelItemData {
  // If the element already has the required structure (not an ElementShape from selection), use it directly
  if (element.id && element.data && element.metadata) {
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
      isUnconverted: element.isUnconverted
    };
  }
  
  // Handle ElementShape objects
  if ('type' in element && 'id' in element) {
    // This is likely an ElementShape object from selection
    return {
      id: element.id,
      data: {}, // ElementShape doesn't have data, so use empty object
      metadata: {
        type: (element.type as unknown) as SimulationObjectType, // Type cast string to SimulationObjectType
        version: '1.0',
        lastModified: new Date().toISOString(),
        id: element.id,
        isUnconverted: false // Default to false
      },
      name: element.text || `Item ${element.id}`,
      isUnconverted: false
    };
  }
  
  // Fallback for unknown format
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
    isUnconverted: false
  };
}
