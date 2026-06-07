import { EditorReferenceData } from '../types/EditorReferenceData';
import { SimulationObjectType } from '../types/elements/SimulationObjectType';
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
export declare function isNameUniqueInReferenceData(referenceData: EditorReferenceData, type: SimulationObjectType, name: string, excludeId?: string): boolean;
//# sourceMappingURL=nameValidation.d.ts.map