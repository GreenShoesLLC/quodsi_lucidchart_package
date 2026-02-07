import { SimulationObjectType, DiagramElementType } from '@quodsi/shared';
import { ExtendedModelItemData } from '../types/ModelItemData';

/**
 * Determines the correct SimulationObjectType from various sources.
 *
 * This utility centralizes the logic for detecting element types by checking
 * multiple possible sources in priority order:
 * 1. Resource-specific checks (highest priority due to common type confusion)
 * 2. metadata.type (authoritative source)
 * 3. DiagramElementType.LINE → Connector mapping
 * 4. Provided elementType parameter
 *
 * @param elementType - The element type from props or selection
 * @param currentElement - The current element with metadata
 * @param elementData - The element's data object
 * @returns The determined SimulationObjectType
 */
export function getSimulationObjectType(
  elementType: SimulationObjectType | string | undefined,
  currentElement?: ExtendedModelItemData,
  elementData?: any
): SimulationObjectType {
  // Check for resource type from multiple sources
  // This is checked first because Resource types are commonly misidentified
  const isResource =
    elementType === SimulationObjectType.Resource ||
    elementType === "Resource" ||
    currentElement?.type === "Resource" ||
    currentElement?.metadata?.type === SimulationObjectType.Resource ||
    currentElement?.metadata?.type === "Resource" ||
    elementData?.type === "Resource";

  if (isResource) {
    return SimulationObjectType.Resource;
  }

  // Use metadata type if available (most authoritative)
  const metadataType = currentElement?.metadata?.type;
  if (metadataType && metadataType !== SimulationObjectType.None) {
    // Ensure it's a valid SimulationObjectType
    if (typeof metadataType === 'number') {
      return metadataType as SimulationObjectType;
    }
    // If it's a string, try to convert it
    if (typeof metadataType === 'string') {
      const enumKeys = Object.keys(SimulationObjectType).filter(k => isNaN(Number(k)));
      for (const key of enumKeys) {
        if (key === metadataType || key.toLowerCase() === metadataType.toLowerCase()) {
          return SimulationObjectType[key as keyof typeof SimulationObjectType];
        }
      }
    }
  }

  // Handle diagram element types (visual representation)
  if (elementType === DiagramElementType.LINE || elementType === "line") {
    return SimulationObjectType.Connector;
  }

  // Return the provided element type if it's a valid SimulationObjectType
  if (typeof elementType === 'number') {
    return elementType as SimulationObjectType;
  }

  // Try to parse string element types
  if (typeof elementType === 'string') {
    // Check if it matches a SimulationObjectType key
    const enumKeys = Object.keys(SimulationObjectType).filter(k => isNaN(Number(k)));
    for (const key of enumKeys) {
      if (key.toLowerCase() === elementType.toLowerCase()) {
        return SimulationObjectType[key as keyof typeof SimulationObjectType];
      }
    }
  }

  // Default to None if no type could be determined
  return SimulationObjectType.None;
}
