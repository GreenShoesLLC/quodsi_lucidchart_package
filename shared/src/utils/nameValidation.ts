import { EditorReferenceData } from '../types/EditorReferenceData';
import { SimulationObjectType } from '../types/elements/SimulationObjectType';

/**
 * Gets items array for a given type from reference data.
 */
function getItemsForType(
    data: EditorReferenceData,
    type: SimulationObjectType
): Array<{ id: string; name: string }> {
    switch (type) {
        case SimulationObjectType.Activity:
            return data.activities || [];
        case SimulationObjectType.Resource:
            return data.resources || [];
        case SimulationObjectType.Generator:
            return data.generators || [];
        case SimulationObjectType.Entity:
            return data.entities || [];
        default:
            return [];
    }
}

/**
 * Checks if a name is unique within the reference data for a given type.
 * Used by React editors for client-side validation without message round-trips.
 *
 * @param referenceData - The EditorReferenceData from the extension
 * @param type - The simulation object type
 * @param name - The name to check
 * @param excludeId - Current element ID (when editing existing element)
 * @returns true if the name is unique, false if it conflicts
 */
export function isNameUniqueInReferenceData(
    referenceData: EditorReferenceData,
    type: SimulationObjectType,
    name: string,
    excludeId?: string
): boolean {
    const items = getItemsForType(referenceData, type);
    return !items.some(item => item.name === name && item.id !== excludeId);
}
