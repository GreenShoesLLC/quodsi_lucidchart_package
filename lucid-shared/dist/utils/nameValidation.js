"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNameUniqueInReferenceData = void 0;
var SimulationObjectType_1 = require("../types/elements/SimulationObjectType");
/**
 * Gets items array for a given type from reference data.
 */
function getItemsForType(data, type) {
    switch (type) {
        case SimulationObjectType_1.SimulationObjectType.Activity:
            return data.activities || [];
        case SimulationObjectType_1.SimulationObjectType.Resource:
            return data.resources || [];
        case SimulationObjectType_1.SimulationObjectType.Generator:
            return data.generators || [];
        case SimulationObjectType_1.SimulationObjectType.Entity:
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
function isNameUniqueInReferenceData(referenceData, type, name, excludeId) {
    var items = getItemsForType(referenceData, type);
    return !items.some(function (item) { return item.name === name && item.id !== excludeId; });
}
exports.isNameUniqueInReferenceData = isNameUniqueInReferenceData;
