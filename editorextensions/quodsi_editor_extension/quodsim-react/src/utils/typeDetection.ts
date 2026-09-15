import { SimulationObjectType, DiagramElementType, parseSimulationObjectType } from '@quodsi/lucid-shared';
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
  const metadataType = parseSimulationObjectType(currentElement?.metadata?.type);
  if (metadataType !== SimulationObjectType.None) {
    return metadataType;
  }

  // Handle diagram element types (visual representation)
  if (elementType === DiagramElementType.LINE || elementType === "line") {
    return SimulationObjectType.Connector;
  }

  // Match the provided element type by name; None if nothing matches
  return parseSimulationObjectType(elementType);
}
